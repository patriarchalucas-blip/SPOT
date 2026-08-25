import{quemEsta,podeGastar}from './_auth.js';

// Cloudflare Pages Function — foto de uma cidade, via Unsplash.
//
// Existe por dois motivos, e o segundo é o que mais importa:
//
// 1. A chave do Unsplash estava no index.html. Testei: ela funciona de
//    qualquer lugar, sem restrição de origem — qualquer pessoa copiava do
//    código e usava a cota. Agora ela vive só aqui, como env var.
//
// 2. O limite do Unsplash é de 50 requisições por HORA para a chave inteira,
//    compartilhado entre TODOS os usuários. O cache antes era no localStorage,
//    ou seja POR APARELHO: dez pessoas abrindo "Split" gastavam dez
//    requisições pela mesma foto. Aqui o cache é no KV, compartilhado — a
//    mesma cidade custa UMA requisição pra todo mundo, pra sempre.
//
// Teto mensal como as outras: a cota é por hora, mas um contador mensal
// impede que um laço queime tudo repetidamente.
const MONTHLY_CAP = 1200;
const USER_CAP = 80;

// Foto de cidade não muda: 6 meses. Falha guarda por 1 hora, nunca 6 meses —
// erro cacheado por muito tempo condena a cidade a nunca mais ter foto (foi
// exatamente o defeito que a /api/climate tinha).
const TTL_OK = 60 * 60 * 24 * 180;
const TTL_FALHA = 60 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const query = String(body.query || '').trim();
  if (!query) return json({ error: 'missing_query' }, 400);
  if (!env.UNSPLASH_KEY || !env.SPOT_KV) return json({ url: '', configured: false });

  const cacheKey = 'cityphoto_' + normKey(query);
  const cached = await env.SPOT_KV.get(cacheKey);
  // Cache liberado sem login, igual à /api/climate: responder daqui não gasta
  // cota nem expõe nada, e é o caminho da maioria das chamadas.
  if (cached) return json(JSON.parse(cached));

  // Daqui pra baixo gasta cota de verdade — só pra quem está logado.
  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ url: '', unauthorized: true }, 401);
  if (!await podeGastar(env, 'unsplash', quem.uid, 1, USER_CAP)) {
    return json({ url: '', capped: true, scope: 'user' });
  }

  const mes = new Date().toISOString().slice(0, 7);
  const contador = 'unsplash_count_' + mes;
  const usado = parseInt((await env.SPOT_KV.get(contador)) || '0', 10);
  if (usado >= MONTHLY_CAP) return json({ url: '', capped: true });

  let r;
  try {
    r = await fetch('https://api.unsplash.com/search/photos?per_page=10&orientation=landscape&query='
      + encodeURIComponent(query) + '&client_id=' + env.UNSPLASH_KEY);
  } catch (e) {
    return json({ url: '' }); // sem cachear: rede falhou, não é resposta do Unsplash
  }
  // conta a tentativa: é a chamada que consome a cota, não a resposta
  await env.SPOT_KV.put(contador, String(usado + 1), { expirationTtl: 60 * 60 * 24 * 40 });

  // 403/429 = cota da hora esgotada. Guarda por 10 min só pra não martelar.
  if (r.status === 403 || r.status === 429) {
    const espera = { url: '', quotaExceeded: true };
    await env.SPOT_KV.put(cacheKey, JSON.stringify(espera), { expirationTtl: 600 });
    return json(espera);
  }
  if (!r.ok) return json({ url: '' });

  let d;
  try { d = await r.json() } catch (e) { return json({ url: '' }) }
  const results = (d && d.results) || [];
  // Mesma escolha de antes: sorteia entre os 6 primeiros pra duas cidades
  // parecidas não caírem sempre na mesma foto. Sem Math.random no servidor —
  // deriva do próprio nome, então a escolha é estável (e o cache faz sentido).
  const pool = results.slice(0, 6);
  const url = pool.length ? (pool[hashNum(query) % pool.length].urls || {}).regular || '' : '';

  const resultado = { url: url };
  await env.SPOT_KV.put(cacheKey, JSON.stringify(resultado), { expirationTtl: url ? TTL_OK : TTL_FALHA });
  return json(resultado);
}

function hashNum(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function normKey(s) {
  return String(s).toLowerCase().normalize('NFD').replace(new RegExp('[\u0300-\u036f]','g'),'').replace(/[^a-z0-9]+/g, '_');
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
}
