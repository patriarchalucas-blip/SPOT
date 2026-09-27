import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestPost, organizarSugestoes, idValido } from '../functions/api/lugar.js';

// Sugestões de lugar no Explorar (27/09): "Itapura" é a cidade OU a rua.

function ambiente() {
  const kv = new Map();
  return { env: { GOOGLE_PLACES_KEY: 'k', SPOT_KV: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v) } } }, kv };
}
const pedido = (corpo, comLogin) => new Request('https://meuspot.app/api/lugar', {
  method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, comLogin === false ? {} : { Authorization: 'Bearer a.b.c' }), body: JSON.stringify(corpo)
});
const PRED = (id, main, sec, types) => ({ placePrediction: { placeId: id, types, structuredFormat: { mainText: { text: main }, secondaryText: { text: sec } } } });

test('sem login nao consulta o Google', async () => {
  const { env } = ambiente();
  const antigo = globalThis.fetch; let google = 0;
  globalThis.fetch = async (u) => { if (String(u).includes('googleapis')) google++; return new Response('{}', { status: 401 }) };
  try {
    const r = await onRequestPost({ request: pedido({ op: 'sugerir', texto: 'Itapura' }, false), env, waitUntil: () => {} });
    assert.strictEqual(r.status, 401);
    assert.strictEqual(google, 0);
  } finally { globalThis.fetch = antigo }
});

test('a mesma palavra e paga uma vez so, e vem a rua e a cidade', async () => {
  const { env } = ambiente();
  const antigo = globalThis.fetch; let google = 0;
  globalThis.fetch = async (u) => {
    const s = String(u);
    if (s.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
    if (s.includes('places:autocomplete')) {
      google++;
      return new Response(JSON.stringify({ suggestions: [
        PRED('ChIJrua_itapura_0001', 'Rua Itapura', 'Vila Gomes Cardim, São Paulo - SP', ['route', 'geocode']),
        PRED('ChIJcidade_itapura01', 'Itapura', 'SP, Brasil', ['locality', 'political', 'geocode'])] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };
  try {
    const r1 = await (await onRequestPost({ request: pedido({ op: 'sugerir', texto: 'Itapura' }), env, waitUntil: () => {} })).json();
    const r2 = await (await onRequestPost({ request: pedido({ op: 'sugerir', texto: 'itapura' }), env, waitUntil: () => {} })).json();
    assert.strictEqual(r1.sugestoes.length, 2);
    assert.strictEqual(r1.sugestoes[0].titulo, 'Rua Itapura');
    assert.deepStrictEqual(r2, r1);
    assert.strictEqual(google, 1, 'pagou duas vezes a mesma palavra');
  } finally { globalThis.fetch = antigo }
});

test('sem filtro do Google, estabelecimento fica de fora da lista', () => {
  const l = organizarSugestoes([
    PRED('ChIJhospital_000001', 'Hospital Santa Casa', 'São Paulo', ['hospital', 'establishment']),
    PRED('ChIJcidade_sp_00001', 'São Paulo', 'SP, Brasil', ['locality', 'political'])], true);
  assert.strictEqual(l.length, 1);
  assert.strictEqual(l[0].titulo, 'São Paulo');
});

test('id de lugar invalido e recusado', () => {
  assert.strictEqual(idValido('../../etc'), false);
  assert.strictEqual(idValido('ChIJ0WGkg4FEzpQRrlsz_whLqZs'), true);
});
