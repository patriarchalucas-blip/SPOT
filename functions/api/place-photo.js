// Cloudflare Pages Function — foto de um estabelecimento, via Google Places.
//
// A URL de foto do Places carrega a chave no próprio endereço
// (.../media?maxWidthPx=400&key=XXX). Como essa URL ia parar no `src` de um
// <img> — e ainda por cima era gravada em spots.photo_url no banco — a chave
// ficava à vista de qualquer um que abrisse o inspetor. Aqui ela fica no
// servidor e o navegador só vê /api/place-photo?ref=...
//
// COMO FUNCIONA: o Places responde a /media com um 302 para o CDN do Google
// (lh3.googleusercontent.com), e ESSE endereço não tem chave nenhuma. Então a
// function pede o 302 sem segui-lo, lê o destino e reencaminha o navegador
// pra lá. A imagem vem direto do CDN, sem passar bytes por aqui.
//
// LIMITE QUE EU NÃO CONSIGO FECHAR, e é melhor estar escrito: <img src> não
// manda cabeçalho de Authorization, então esta rota NÃO pode exigir login como
// a /api/places exige. O que existe no lugar:
//   - o `ref` tem formato fixo e só se consegue um válido fazendo uma busca,
//     que é autenticada;
//   - o destino resolvido fica no KV, então repetir a mesma foto custa zero —
//     é o que tira o volume normal do app de cima da API paga;
//   - Origin/Referer de fora do site é recusado (barra hotlink casual, não
//     alguém determinado — cabeçalho se falsifica);
//   - teto mensal global como freio final.

const CAP_MENSAL = 30000;
const TTL_OK = 60 * 60 * 24 * 7;   // o link do CDN não é eterno; 7 dias é conservador
const TTL_FALHA = 60 * 10;

export const REF_OK = /^places\/[A-Za-z0-9_-]{1,120}\/photos\/[A-Za-z0-9_-]{1,300}$/;

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const ref = url.searchParams.get('ref') || '';
  if (!REF_OK.test(ref)) return vazio(400);

  let largura = parseInt(url.searchParams.get('w') || '400', 10);
  if (!isFinite(largura)) largura = 400;
  largura = Math.min(1600, Math.max(100, largura));

  // Só o próprio site. Chamada sem Origin nem Referer (um <img> de outra aba,
  // por exemplo) passa — recusar isso quebraria caso legítimo.
  const origem = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (origem && origem.indexOf(url.origin) !== 0) return vazio(403);

  if (!env.GOOGLE_PLACES_KEY) return vazio(404);

  const kv = env.SPOT_KV;
  const chave = 'placephoto_' + largura + '_' + (await hash(ref));
  if (kv) {
    try {
      const guardado = await kv.get(chave);
      if (guardado === 'X') return vazio(404);       // falha conhecida, não retenta agora
      if (guardado) return redirecionar(guardado);
    } catch (e) { /* KV fora: segue e resolve */ }
  }

  if (kv) {
    const mes = new Date().toISOString().slice(0, 7);
    const contador = 'placephoto_count_' + mes;
    try {
      const usado = parseInt((await kv.get(contador)) || '0', 10);
      if (usado >= CAP_MENSAL) return vazio(429);
      await kv.put(contador, String(usado + 1), { expirationTtl: 60 * 60 * 24 * 40 });
    } catch (e) {}
  }

  let r;
  try {
    r = await fetch(
      'https://places.googleapis.com/v1/' + ref + '/media?maxWidthPx=' + largura +
      '&key=' + env.GOOGLE_PLACES_KEY,
      { redirect: 'manual' }   // o 302 é o que a gente quer, não a imagem
    );
  } catch (e) {
    return vazio(502); // rede falhou: não guarda falha, não é resposta do Google
  }

  const destino = r.headers.get('Location') || '';
  if (!destino || !/^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//i.test(destino)) {
    if (kv) { try { await kv.put(chave, 'X', { expirationTtl: TTL_FALHA }) } catch (e) {} }
    return vazio(404);
  }

  if (kv) { try { await kv.put(chave, destino, { expirationTtl: TTL_OK }) } catch (e) {} }
  return redirecionar(destino);
}

function redirecionar(destino) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: destino,
      // O navegador guarda o redirecionamento, então rolar a lista de novo
      // nem chega a bater aqui.
      'Cache-Control': 'public, max-age=21600'
    }
  });
}

function vazio(status) {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function hash(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
