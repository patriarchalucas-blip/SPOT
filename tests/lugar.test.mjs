import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestPost, organizarSugestoes, organizarSpots, idValido } from '../functions/api/lugar.js';

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
    // Dois pedidos na primeira vez (lugares + spots), nenhum na segunda.
    assert.strictEqual(google, 2, 'pagou duas vezes a mesma palavra');
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

test('nome de restaurante vem no grupo Spots, e cidade no grupo Lugares (05/10)', async () => {
  const { env } = ambiente();
  const antigo = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    const s = String(u);
    if (s.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
    if (s.includes('places:autocomplete')) {
      const corpo = JSON.parse(o.body);
      const tipo = (corpo.includedPrimaryTypes || [])[0];
      if (tipo === 'establishment') return new Response(JSON.stringify({ suggestions: [
        PRED('ChIJmani_restaurante1', 'Maní', 'Rua Joaquim Antunes, Jardins, São Paulo', ['restaurant', 'food', 'establishment'])] }), { status: 200 });
      return new Response(JSON.stringify({ suggestions: [
        PRED('ChIJmanila_cidade_001', 'Manila', 'Filipinas', ['locality', 'political', 'geocode'])] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };
  try {
    const r = await (await onRequestPost({ request: pedido({ op: 'sugerir', texto: 'Mani' }), env, waitUntil: () => {} })).json();
    assert.deepStrictEqual(r.sugestoes.map(x => x.titulo), ['Manila']);
    assert.deepStrictEqual(r.spots.map(x => x.titulo), ['Maní']);
    assert.ok(r.spots[0].tipos.includes('restaurant'));
  } finally { globalThis.fetch = antigo }
});

test('sem filtro do Google, cidade nao entra no grupo Spots', () => {
  const l = organizarSpots([
    PRED('ChIJhospital_000001', 'Hospital Santa Casa', 'São Paulo', ['hospital', 'establishment']),
    PRED('ChIJcidade_sp_00001', 'São Paulo', 'SP, Brasil', ['locality', 'political'])], true);
  assert.deepStrictEqual(l.map(x => x.titulo), ['Hospital Santa Casa']);
});

test('sugestao de lugar leva o tipo (o onboarding filtra cidade)', () => {
  const l = organizarSugestoes([PRED('ChIJsaopaulo_cidade01', 'São Paulo', 'SP, Brasil', ['locality', 'political', 'geocode'])], false);
  assert.ok(l[0].tipos.includes('locality'));
});

// BUSCA BARATA DO ADICIONAR SPOT (11/11): sugestão no lugar da busca de texto.
test('buscar devolve no formato da busca de texto, com a foto, e paga uma vez so', async () => {
  const { env } = ambiente();
  const antigo = globalThis.fetch; let sugestao = 0, detalhe = 0, corpoVisto = null, mascara = '';
  globalThis.fetch = async (u, o) => {
    const s = String(u);
    if (s.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
    if (s.includes('places:autocomplete')) {
      sugestao++; corpoVisto = JSON.parse(o.body);
      return new Response(JSON.stringify({ suggestions: [
        PRED('ChIJmani_restaurante1', 'Maní', 'Rua Joaquim Antunes, Jardins, São Paulo', ['restaurant', 'food', 'establishment'])] }), { status: 200 });
    }
    if (s.includes('/v1/places/ChIJmani_restaurante1')) {
      detalhe++; mascara = o.headers['X-Goog-FieldMask'];
      return new Response(JSON.stringify({ photos: [{ name: 'places/ChIJmani_restaurante1/photos/abc', widthPx: 4000, heightPx: 3000, authorAttributions: [{ displayName: 'Ana', uri: 'https://maps.google.com/x' }] }, { name: 'places/x/photos/2' }] }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  };
  try {
    const corpo = { op: 'buscar', texto: 'Maní', centro: { latitude: -23.5614, longitude: -46.6559 }, raio: 30000 };
    const r1 = await (await onRequestPost({ request: pedido(corpo), env, waitUntil: () => {} })).json();
    // Outra pessoa na mesma cidade, a 2 km: mesma resposta guardada.
    const r2 = await (await onRequestPost({ request: pedido(Object.assign({}, corpo, { centro: { latitude: -23.5801, longitude: -46.6702 } })), env, waitUntil: () => {} })).json();
    assert.strictEqual(r1.places.length, 1);
    assert.strictEqual(r1.places[0].displayName.text, 'Maní');
    assert.strictEqual(r1.places[0].formattedAddress, 'Rua Joaquim Antunes, Jardins, São Paulo');
    assert.deepStrictEqual(r1.places[0].types, ['restaurant', 'food', 'establishment']);
    assert.strictEqual(r1.places[0].photos.length, 1);
    assert.strictEqual(r1.places[0].photos[0].name, 'places/ChIJmani_restaurante1/photos/abc');
    assert.deepStrictEqual(r2, r1);
    assert.strictEqual(sugestao, 1, 'pagou duas vezes a mesma busca');
    assert.strictEqual(detalhe, 1);
    // So `photos`: qualquer outro campo tira o detalhe da faixa sem cobranca.
    assert.strictEqual(mascara, 'photos');
    // A posicao vai arredondada (~10 km) e sem token de sessao.
    assert.deepStrictEqual(corpoVisto.locationBias.circle.center, { latitude: -23.6, longitude: -46.7 });
    assert.strictEqual(corpoVisto.sessionToken, undefined);
  } finally { globalThis.fetch = antigo }
});

test('buscar: falha do Google nao e guardada, e sem login nao consulta', async () => {
  const { env, kv } = ambiente();
  const antigo = globalThis.fetch; let google = 0;
  globalThis.fetch = async (u) => {
    const s = String(u);
    if (s.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
    if (s.includes('googleapis')) { google++; return new Response('{}', { status: 503 }) }
    return new Response('{}', { status: 200 });
  };
  try {
    const r = await (await onRequestPost({ request: pedido({ op: 'buscar', texto: 'Maní' }), env, waitUntil: () => {} })).json();
    assert.strictEqual(r.erro, true);
    assert.strictEqual([...kv.keys()].some((k) => k.startsWith('lugar_bus1_')), false);
    const antes = google;
    const semLogin = await onRequestPost({ request: pedido({ op: 'buscar', texto: 'Maní' }, false), env, waitUntil: () => {} });
    assert.strictEqual(semLogin.status, 401);
    assert.strictEqual(google, antes);
  } finally { globalThis.fetch = antigo }
});
