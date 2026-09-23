import { quemEsta, podeGastar } from './_auth.js';

// Cloudflare Pages Function — imagem de mapa, via Google Static Maps.
//
// POR QUE ESTA PEÇA EXISTE, E NÃO UM MAPA DE VERDADE NO NAVEGADOR
//
// Os dois desenhos novos pedem mapa: o mini-mapa da Ficha e o mapa com pins
// do Perfil. O caminho óbvio seria a biblioteca do Google (ou Mapbox, ou
// MapKit) rodando no navegador — e todas elas exigem a CHAVE NO CLIENT, que é
// exatamente o que este projeto passou meses tirando de lá. Chave de Maps
// exposta é alvo conhecido e a fatura é de quem paga a conta; restringir por
// referrer ajuda, mas não é o mesmo que a chave não estar lá.
//
// O Static Maps devolve uma IMAGEM. Isso pode ser pedido do servidor, com a
// chave aqui dentro, e o navegador só recebe um PNG. Perde-se arrastar e dar
// zoom no lugar — e nos dois usos previstos não faz falta: o mini-mapa da
// Ficha é referência visual (o toque abre o Maps de verdade), e o mapa do
// Perfil é panorama, com "abrir em tela cheia" ao lado.
//
// CACHE. A mesma coordenada devolve sempre a mesma imagem, então o KV guarda
// por 30 dias. Um lugar visto dez vezes custa uma requisição.
//
// ESTILO. As cores vêm da direção F: água e fundo em --map-bg, ruas em
// --base, sem ponto de interesse e sem transporte — o mapa é pano de fundo do
// pin, não um mapa pra navegar.

const CAP_MENSAL = 8000;
const CAP_USUARIO = 400;
const TTL = 60 * 60 * 24 * 30;

// Só o que o app desenha. Qualquer outro valor é recusado em vez de repassado
// — sem isto, /api/mapa viraria um gerador de imagem pago aberto ao mundo.
const TAMANHOS_OK = new Set(['350x230', '350x360', '344x120', '160x120']);

// Tira os pontos de interesse, o transporte e os rótulos de negócio, e pinta
// o resto com a paleta do app.
const ESTILO = [
  'feature:all|element:labels.icon|visibility:off',
  'feature:poi|visibility:off',
  'feature:transit|visibility:off',
  'feature:administrative|element:geometry|visibility:off',
  'feature:landscape|element:geometry|color:0xE4E8E4',
  'feature:water|element:geometry|color:0xD7DDD8',
  'feature:road|element:geometry|color:0xF5F5F3',
  'feature:road|element:labels|visibility:off',
  'feature:all|element:labels.text.fill|color:0x6B6B67',
  'feature:all|element:labels.text.stroke|visibility:off'
];

function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Coordenada válida e com no máximo 5 casas: mais que isso não muda a imagem
// e só multiplica as chaves de cache.
function coord(v, limite) {
  const n = Number(v);
  if (!isFinite(n) || Math.abs(n) > limite) return null;
  return Math.round(n * 1e5) / 1e5;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const u = new URL(request.url);

  const lat = coord(u.searchParams.get('lat'), 90);
  const lng = coord(u.searchParams.get('lng'), 180);
  if (lat === null || lng === null) return json({ error: 'coordenada_invalida' }, 400);

  const tam = String(u.searchParams.get('tam') || '344x120');
  if (!TAMANHOS_OK.has(tam)) return json({ error: 'tamanho_invalido' }, 400);

  const zoom = Math.min(18, Math.max(1, parseInt(u.searchParams.get('z') || '15', 10) || 15));

  const chave = 'mapa_' + lat + '_' + lng + '_' + tam + '_' + zoom;
  const kv = env.SPOT_KV;
  if (kv) {
    try {
      const guardado = await kv.get(chave, 'arrayBuffer');
      // Servir do cache não gasta nada e não expõe nada: é imagem de rua
      // pública, não dado de ninguém. Por isso vem antes do login.
      if (guardado) return imagem(guardado);
    } catch (e) { /* KV fora do ar: segue */ }
  }

  // Daqui pra baixo custa dinheiro — só pra quem está logado.
  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ error: 'sem_sessao' }, 401);
  if (!env.GOOGLE_PLACES_KEY) return json({ configured: false }, 200);
  if (!await podeGastar(env, 'mapa', quem.uid, 1, CAP_USUARIO)) {
    return json({ capped: true, scope: 'user' }, 200);
  }
  if (kv) {
    const mes = new Date().toISOString().slice(0, 7);
    const contador = 'mapa_count_' + mes;
    try {
      const usado = parseInt((await kv.get(contador)) || '0', 10);
      if (usado >= CAP_MENSAL) return json({ capped: true, scope: 'global' }, 200);
      await kv.put(contador, String(usado + 1), { expirationTtl: 60 * 60 * 24 * 40 });
    } catch (e) { /* contador indisponível não bloqueia */ }
  }

  const alvo = new URL('https://maps.googleapis.com/maps/api/staticmap');
  alvo.searchParams.set('center', lat + ',' + lng);
  alvo.searchParams.set('zoom', String(zoom));
  alvo.searchParams.set('size', tam);
  alvo.searchParams.set('scale', '2');
  alvo.searchParams.set('maptype', 'roadmap');
  alvo.searchParams.set('language', 'pt-BR');
  // Pin verde do app, não o balão vermelho do Google.
  alvo.searchParams.set('markers', 'color:0x0B3D2E|' + lat + ',' + lng);
  ESTILO.forEach(s => alvo.searchParams.append('style', s));
  alvo.searchParams.set('key', env.GOOGLE_PLACES_KEY);

  let r;
  try { r = await fetch(alvo.toString()) }
  catch (e) { return json({ erro_rede: true }, 200) }
  if (!r.ok) {
    // A mensagem do Google às vezes cita o projeto e a chave: fica aqui.
    return json({ erro: true, status: r.status }, 200);
  }

  const bytes = await r.arrayBuffer();
  if (kv) {
    try { await kv.put(chave, bytes, { expirationTtl: TTL }) } catch (e) {}
  }
  return imagem(bytes);
}

function imagem(bytes) {
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=2592000'
    }
  });
}
