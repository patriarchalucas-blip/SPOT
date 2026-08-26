import { quemEsta, podeGastar } from './_auth.js';

// Cloudflare Pages Function — busca de lugares, via Google Places (New).
//
// POR QUE ISSO EXISTE
// A chave do Places estava no index.html e funcionava a partir de qualquer
// site, sem restrição. Diferente do Unsplash (que só tem cota), o Places
// COBRA POR REQUISIÇÃO no cartão do dono da conta — e Text Search é a chamada
// cara do catálogo. Com 6 amigos ninguém procura; aberto ao público, chave de
// Maps exposta é alvo conhecido, e a fatura é de quem paga a conta.
//
// NÃO É UM PROXY ABERTO. Se fosse só repassar o corpo que o navegador manda,
// a chave estaria escondida e o problema continuaria igual: qualquer um
// chamaria /api/places com o que quisesse. Por isso aqui:
//   - só duas operações existem (searchText e searchNearby);
//   - cada campo do corpo é copiado por nome, com limite — o que não está na
//     lista não chega ao Google;
//   - a FieldMask é filtrada contra os campos que o app realmente usa (pedir
//     campo a mais no Places sobe o preço da requisição).
//
// CACHE. Duas pessoas buscando "restaurantes em Split" custavam duas
// requisições. Agora a segunda sai do KV, de graça. É o que mais derruba a
// conta num app onde todo mundo procura os mesmos lugares.
//
// searchNearby NÃO é cacheado de propósito: a chave de cache teria que conter
// a coordenada de quem chamou, e localização de usuário não vai pro KV.

const CAP_MENSAL = 20000;  // teto global — o freio que existe mesmo se o resto falhar
const CAP_USUARIO = 600;   // por conta, por mês: uma conta criada de propósito não queima a de todos
const TTL_BUSCA = 60 * 60 * 24 * 7;

// Campos que o app usa hoje. Pedir além disso custa mais caro por requisição,
// então o que não está aqui é descartado em vez de repassado.
const CAMPOS_OK = new Set([
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.addressComponents',
  'places.location', 'places.photos', 'places.rating', 'places.userRatingCount',
  'places.websiteUri', 'places.googleMapsUri', 'places.types', 'places.primaryType',
  'places.nationalPhoneNumber'
]);

const OPS = {
  searchText: 'https://places.googleapis.com/v1/places:searchText',
  searchNearby: 'https://places.googleapis.com/v1/places:searchNearby'
};

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }

  // Validação de entrada ANTES de qualquer outra coisa. A checagem da env var
  // ficava aqui em cima e engolia as recusas: sem a chave configurada, um
  // pedido malformado voltava 200 {configured:false} e não dava pra testar
  // nenhuma das defesas antes de a chave existir.
  const op = String(body.op || '');
  if (!OPS[op]) return json({ error: 'op_invalida' }, 400);

  const mascara = filtrarMascara(body.fields);
  if (!mascara) return json({ error: 'sem_campos' }, 400);

  const payload = op === 'searchText' ? montarTexto(body) : montarPerto(body);
  if (!payload) return json({ error: 'parametros_invalidos' }, 400);

  const kv = env.SPOT_KV;
  const cacheavel = op === 'searchText' && kv;
  let chave = null;
  if (cacheavel) {
    chave = 'places_' + (await hash(op + '|' + mascara + '|' + JSON.stringify(payload)));
    try {
      const guardado = await kv.get(chave);
      // Cache liberado sem login: responder daqui não gasta nada e não expõe
      // nada — é resultado público do Google, não dado de ninguém.
      if (guardado) return json(JSON.parse(guardado));
    } catch (e) { /* KV fora do ar: segue e consulta */ }
  }

  // Daqui pra baixo custa dinheiro de verdade — só pra quem está logado.
  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ places: [], unauthorized: true }, 401);
  if (!env.GOOGLE_PLACES_KEY) return json({ places: [], configured: false });
  if (!await podeGastar(env, 'places', quem.uid, 1, CAP_USUARIO)) {
    return json({ places: [], capped: true, scope: 'user' });
  }

  if (kv) {
    const mes = new Date().toISOString().slice(0, 7);
    const contador = 'places_count_' + mes;
    try {
      const usado = parseInt((await kv.get(contador)) || '0', 10);
      if (usado >= CAP_MENSAL) return json({ places: [], capped: true, scope: 'global' });
      await kv.put(contador, String(usado + 1), { expirationTtl: 60 * 60 * 24 * 40 });
    } catch (e) { /* contador indisponível não bloqueia o usuário */ }
  }

  let r;
  try {
    r = await fetch(OPS[op], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
        'X-Goog-FieldMask': mascara
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return json({ places: [], erro_rede: true }); // sem cachear: não é resposta do Google
  }

  let dados;
  try { dados = await r.json() } catch (e) { return json({ places: [] }) }
  if (!r.ok) {
    // Erro do Google não vai cru pro navegador: a mensagem dele às vezes cita
    // o projeto e a chave. O status basta pro app decidir o que fazer.
    return json({ places: [], erro: true, status: r.status });
  }

  const saida = { places: Array.isArray(dados.places) ? dados.places : [] };
  if (cacheavel && chave) {
    try { await kv.put(chave, JSON.stringify(saida), { expirationTtl: TTL_BUSCA }) } catch (e) {}
  }
  return json(saida);
}

// ── validação de entrada ─────────────────────────────────────────────────────
// Cada campo é copiado por nome e com teto. O que o navegador mandar além
// disso não existe daqui pra frente.

function montarTexto(b) {
  const q = String(b.textQuery || '').trim().slice(0, 200);
  if (!q) return null;
  const p = { textQuery: q, maxResultCount: limitar(b.maxResultCount, 1, 20, 10) };
  if (b.languageCode) p.languageCode = String(b.languageCode).slice(0, 10);
  if (b.includedType) p.includedType = String(b.includedType).slice(0, 40);
  if (b.strictTypeFiltering === true) p.strictTypeFiltering = true;
  return p;
}

function montarPerto(b) {
  const tipos = Array.isArray(b.includedTypes)
    ? b.includedTypes.slice(0, 10).map(t => String(t).slice(0, 40)) : [];
  if (!tipos.length) return null;
  const c = b.locationRestriction && b.locationRestriction.circle;
  const lat = Number(c && c.center && c.center.latitude);
  const lng = Number(c && c.center && c.center.longitude);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const p = {
    includedTypes: tipos,
    maxResultCount: limitar(b.maxResultCount, 1, 20, 10),
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius: limitar(c.radius, 1, 50000, 500) }
    }
  };
  if (b.languageCode) p.languageCode = String(b.languageCode).slice(0, 10);
  return p;
}

function filtrarMascara(campos) {
  const lista = String(campos || '').split(',').map(s => s.trim()).filter(s => CAMPOS_OK.has(s));
  return lista.length ? [...new Set(lista)].join(',') : null;
}

function limitar(v, min, max, padrao) {
  const n = Number(v);
  if (!isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.round(n)));
}

async function hash(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
