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

// O endereço do CDN termina num sufixo de tamanho (=s4800-w800) que dá pra
// reescrever à vontade: o mesmo endereço serve qualquer largura, e com -rw
// serve WebP (medido: 94 KB contra 136 KB na mesma foto). Por isso o que fica
// guardado é o endereço SEM sufixo, uma entrada por foto.
//
// Antes era uma entrada por foto E por largura, e trocar de tamanho custava
// uma ida ao Google inteira — medido entre 1,3 e 2,9 SEGUNDOS, enquanto uma
// foto já conhecida sai em 0,08. Era isso que fazia a lista parecer travada.
const CAP_MENSAL = 30000;
const TTL_OK = 60 * 60 * 24 * 7;   // o link do CDN não é eterno; 7 dias é conservador
const TTL_FALHA = 60 * 10;

// O id da foto que o Google devolve hoje tem ~436 caracteres (medido no
// Botanikafé). O limite anterior era 300, e isso recusava com 400 TODA foto
// real antes de chegar em qualquer outra checagem — foi o que apagou as fotos
// de restaurante do app inteiro quando o cliente passou a usar este proxy.
// 1000 dá folga pra o Google crescer o id sem voltar a quebrar aqui.
export const REF_OK = /^places\/[A-Za-z0-9_-]{1,120}\/photos\/[A-Za-z0-9_-]{1,1000}$/;

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

  // WebP só pra quem disser que aceita. Quem não disser recebe JPEG, que é
  // exatamente o que recebia antes — ninguém fica sem foto por causa disto.
  const webp = (request.headers.get('Accept') || '').indexOf('image/webp') >= 0;

  const kv = env.SPOT_KV;
  const chave = 'placephoto2_' + (await hash(ref));

  // A CACHE DA BORDA vem antes do KV de propósito. Ler e gravar nela não tem
  // limite diário; o KV do plano grátis para de aceitar GRAVAÇÃO depois de mil
  // por dia, e parou de verdade — no dia em que trocar o formato da chave
  // obrigou a refazer todas as entradas de uma vez.
  //
  // A chave da borda carrega o tamanho e o formato, porque a mesma foto sai
  // diferente em cada um. É um endereço inventado, que nunca é servido: serve
  // só de etiqueta.
  const borda = caches.default;
  const etiqueta = new Request(
    url.origin + '/_foto/' + chave + '/' + largura + (webp ? '/webp' : '/jpeg')
  );
  try {
    const naBorda = await borda.match(etiqueta);
    if (naBorda) return naBorda;
  } catch (e) { /* borda fora: segue pro KV */ }

  if (kv) {
    try {
      const guardado = await kv.get(chave);
      if (guardado === 'X') return vazio(404);       // falha conhecida, não retenta agora
      if (guardado) return pelaBorda(context, borda, etiqueta, redirecionar(comTamanho(guardado, largura, webp)));
    } catch (e) { /* KV fora: segue e resolve */ }
  }

  if (kv) {
    const mes = new Date().toISOString().slice(0, 7);
    const contador = 'placephoto_count_' + mes;
    try {
      const usado = parseInt((await kv.get(contador)) || '0', 10);
      if (usado >= CAP_MENSAL) return vazio(429);
      // Ler custa barato, gravar é o que é escasso: conta de dez em dez,
      // sorteando. O teto continua valendo, com erro de dez pra mais ou menos
      // num teto de trinta mil.
      if (Math.random() < 0.1) {
        await kv.put(contador, String(usado + 10), { expirationTtl: 60 * 60 * 24 * 40 });
      }
    } catch (e) {}
  }

  let r;
  try {
    r = await fetch(
      // Pede grande de propósito: o que interessa desta resposta é o endereço
      // do CDN, e o tamanho a gente decide depois, sem gastar outra chamada.
      'https://places.googleapis.com/v1/' + ref + '/media?maxWidthPx=1600' +
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

  const base = semTamanho(destino);
  if (kv) { try { await kv.put(chave, base, { expirationTtl: TTL_OK }) } catch (e) {} }
  return pelaBorda(context, borda, etiqueta, redirecionar(comTamanho(base, largura, webp)));
}

// Guarda na borda sem fazer ninguém esperar por isso, e devolve a resposta
// original. Se a borda recusar, a foto sai igual — só sem o atalho.
function pelaBorda(context, borda, etiqueta, resposta) {
  try { context.waitUntil(borda.put(etiqueta, resposta.clone())) } catch (e) {}
  return resposta;
}

// O sufixo de tamanho vem depois do ÚLTIMO '=' do endereço. Se um dia vier
// sem sufixo nenhum, guarda o endereço inteiro e o de baixo só acrescenta.
function semTamanho(u) {
  const i = u.lastIndexOf('=');
  const j = u.lastIndexOf('/');
  return i > j ? u.slice(0, i) : u;
}

function comTamanho(base, largura, webp) {
  return base + '=w' + largura + (webp ? '-rw' : '');
}

function redirecionar(destino) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: destino,
      // O navegador guarda o redirecionamento, então rolar a lista de novo
      // nem chega a bater aqui.
      'Cache-Control': 'public, max-age=21600',
      // A resposta muda conforme o Accept (WebP ou JPEG): sem isto um cache
      // no meio do caminho entregaria WebP pra quem não aceita.
      Vary: 'Accept'
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
