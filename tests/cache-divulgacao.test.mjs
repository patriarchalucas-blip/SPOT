import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestPost as places } from '../functions/api/places.js';
import { onRequestPost as buscaIA } from '../functions/api/busca-ia.js';

// Preparação pra divulgação (25/11): a mesma busca, feita por pessoas
// diferentes, é paga UMA vez. Aqui o Google e o Supabase são falsos e contam
// quantas vezes foram chamados.

function kvFalso() {
  const m = new Map();
  return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, String(v)) } };
}
const TOKEN = 'aaa.bbb.ccc', TOKEN_B = 'ddd.eee.fff';
function pedido(corpo, token) {
  return new Request('https://x/api', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
}
function instalarFetch(conta) {
  globalThis.fetch = async (url, op) => {
    url = String(url);
    if (url.includes('/auth/v1/user')) {
      const t = op.headers.Authorization.slice(7);
      return Response.json({ id: t === TOKEN ? 'uid-a' : 'uid-b' });
    }
    if (url.includes('places:searchText')) {
      conta.google++;
      const b = JSON.parse(op.body);
      const pg = b.pageToken ? Number(b.pageToken.replace('tok', '')) : 1;
      return Response.json({
        places: [{ id: 'p' + pg, displayName: { text: 'Lugar ' + pg }, rating: 4.5 }],
        ...(pg < 3 ? { nextPageToken: 'tok' + (pg + 1) } : {})
      });
    }
    if (url.includes('api.anthropic.com')) {
      conta.ia++;
      return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ etiquetas: ['Japonês'], consulta: 'restaurante japonês', lugar: '', perto: true, categoria: 'food', preco_max: 0 }) }] });
    }
    throw new Error('fetch inesperado: ' + url);
  };
}

const BASE = { op: 'searchText', fields: 'places.id,places.displayName,places.rating,nextPageToken', textQuery: 'japonês', languageCode: 'pt-BR', pageSize: 20,
  locationRestriction: { rectangle: { low: { latitude: -23.57, longitude: -46.7 }, high: { latitude: -23.55, longitude: -46.68 } } } };

test('Explorar: a 2ª pessoa recebe páginas 1 e 2 do guardado, sem pagar o Google', async () => {
  const conta = { google: 0, ia: 0 };
  instalarFetch(conta);
  const env = { SPOT_KV: kvFalso(), GOOGLE_PLACES_KEY: 'k' };
  const ctx = (c, t) => ({ request: pedido(c, t), env, waitUntil() {} });

  // A paga a 1 e a 2 (com o marcador do Google e o número da página).
  const a1 = await (await places(ctx(BASE, TOKEN))).json();
  assert.strictEqual(a1.nextPageToken, 'tok2');
  const a2 = await (await places(ctx({ ...BASE, pageToken: 'tok2', pagina: 2 }, TOKEN))).json();
  assert.strictEqual(a2.places[0].id, 'p2');
  assert.strictEqual(conta.google, 2);

  // B: a 1 vem guardada e aponta pra 2 guardada; a 3 não existe guardada → fim.
  const b1 = await (await places(ctx(BASE, TOKEN_B))).json();
  assert.strictEqual(b1.places[0].id, 'p1');
  assert.strictEqual(b1.nextPageToken, 'cache2');
  const b2 = await (await places(ctx({ ...BASE, pageToken: 'cache2', pagina: 2 }, TOKEN_B))).json();
  assert.strictEqual(b2.places[0].id, 'p2');
  assert.strictEqual(b2.nextPageToken, undefined, 'página 3 ninguém pagou ainda');
  const b3 = await (await places(ctx({ ...BASE, pageToken: 'cache3', pagina: 3 }, TOKEN_B))).json();
  assert.deepStrictEqual(b3.places, []);
  assert.strictEqual(conta.google, 2, 'B não pode ter custado nada');
});

test('Explorar: marcador do Google sem número da página não usa o guardado (app antigo)', async () => {
  const conta = { google: 0, ia: 0 };
  instalarFetch(conta);
  const env = { SPOT_KV: kvFalso(), GOOGLE_PLACES_KEY: 'k' };
  const ctx = (c) => ({ request: pedido(c, TOKEN), env, waitUntil() {} });
  await places(ctx(BASE));
  const r = await (await places(ctx({ ...BASE, pageToken: 'tok2' }))).json();
  assert.strictEqual(r.places[0].id, 'p2', 'tem que ir ao Google, não devolver a página 1');
  assert.strictEqual(conta.google, 2);
});

test('Busca com IA: pedido escrito diferente, mesmo entendimento → Google pago uma vez', async () => {
  const conta = { google: 0, ia: 0 };
  instalarFetch(conta);
  const env = { SPOT_KV: kvFalso(), GOOGLE_PLACES_KEY: 'k', ANTHROPIC_API_KEY: 'a' };
  const ctx = (c, t) => ({ request: pedido(c, t), env, waitUntil() {} });
  const r1 = await (await buscaIA(ctx({ q: 'japa perto', lat: -23.5612, lng: -46.6901 }, TOKEN))).json();
  assert.ok(r1.lugares.length);
  // Outra pessoa, outro texto, a uns 300 m: a IA roda (texto novo), o Google não.
  const r2 = await (await buscaIA(ctx({ q: 'japonês aqui perto', lat: -23.5590, lng: -46.6880 }, TOKEN_B))).json();
  assert.deepStrictEqual(r2.lugares, r1.lugares);
  assert.strictEqual(conta.google, 1);
  assert.strictEqual(conta.ia, 2);
  // O mesmo texto de novo, com acento diferente: nem IA.
  await buscaIA(ctx({ q: 'Japa  perto', lat: -23.5612, lng: -46.6901 }, TOKEN_B));
  assert.strictEqual(conta.ia, 2);
  assert.strictEqual(conta.google, 1);
});
