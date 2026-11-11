// Foto do Google guardada por LUGAR, não pelo código (12/10/2026): em 1–12/10
// todo o gasto do Google foi de foto. O mesmo retrato chegando com outro
// código (outra busca) não pode virar outra ida paga ao Google.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, idDaFoto, ID_OK } from '../functions/api/place-photo.js';

function ambiente() {
  const kv = new Map();
  const borda = new Map();
  globalThis.caches = { default: {
    match: async (r) => { const v = borda.get(r.url); return v ? v.clone() : undefined },
    put: async (r, resp) => { borda.set(r.url, resp) },
  } };
  let chamadasAoGoogle = 0;
  const mortos = new Set();
  const codigosMortos = new Set(['CODIGO_VENCIDO']);
  globalThis.fetch = async (u, o) => {
    // Conferência do link guardado (11/11): o CDN do Google, grátis — não conta.
    if (o && o.method === 'HEAD') {
      assert.match(String(u), /^https:\/\/lh3\.googleusercontent\.com\//);
      return new Response(null, { status: [...mortos].some((m) => String(u).startsWith(m)) ? 403 : 200 });
    }
    chamadasAoGoogle++;
    assert.match(String(u), /^https:\/\/places\.googleapis\.com\/v1\/places\//);
    // Detalhe do lugar (11/11): a foto atual dele.
    if (/\/v1\/places\/[^/?]+\?key=/.test(String(u))) {
      return new Response(JSON.stringify({ photos: [{ name: String(u).match(/places\/([^/?]+)/)[0] + '/photos/ATUAL' }] }), { status: 200 });
    }
    if ([...codigosMortos].some((c) => String(u).includes(c))) return new Response('{}', { status: 400 });
    if (String(u).includes('/photos/ATUAL/')) return new Response(null, { status: 302, headers: { Location: 'https://lh3.googleusercontent.com/foto-atual=s1600' } });
    return new Response(null, { status: 302, headers: { Location: 'https://lh3.googleusercontent.com/foto-do-lugar=s1600' } });
  };
  const env = { GOOGLE_PLACES_KEY: 'k', SPOT_KV: {
    get: async (k) => kv.get(k) ?? null,
    put: async (k, v) => { kv.set(k, v) },
  } };
  const pedir = async (qs, limparBorda = true) => {
    if (limparBorda) borda.clear();   // simula outro ponto da borda / borda vencida: só o KV sobra
    const espera = [];
    const r = await onRequestGet({ request: new Request('https://meuspot.app/api/place-photo?' + qs, { headers: { Accept: 'image/webp' } }), env, waitUntil: (p) => espera.push(p) });
    await Promise.all(espera);
    return r;
  };
  return { pedir, google: () => chamadasAoGoogle, matar: (prefixo) => mortos.add(prefixo) };
}

test('link do Google guardado que venceu: busca de novo em vez de mandar pro 403', async () => {
  const { pedir, google, matar } = ambiente();
  const ref = encodeURIComponent('places/ChIJlugar/photos/X');
  assert.equal((await pedir('ref=' + ref + '&w=400')).status, 302);
  assert.equal(google(), 1);
  matar('https://lh3.googleusercontent.com/foto-do-lugar');
  const r = await pedir('ref=' + ref + '&w=400');
  assert.equal(r.status, 302);
  assert.equal(google(), 2, 'link morto tem que ir ao Google buscar um novo');
});

test('código da foto vencido: usa a foto atual do lugar, e a 2ª vez sai da memória', async () => {
  const { pedir, google } = ambiente();
  const ref = encodeURIComponent('places/ChIJlugar/photos/CODIGO_VENCIDO');
  const r1 = await pedir('ref=' + ref + '&w=400');
  assert.equal(r1.status, 302);
  assert.equal(r1.headers.get('Location'), 'https://lh3.googleusercontent.com/foto-atual=w400-rw');
  const antes = google();
  const r2 = await pedir('ref=' + ref + '&w=800');
  assert.equal(r2.status, 302);
  assert.equal(google(), antes, 'curada uma vez, não paga de novo');
});

test('link guardado vivo não gasta nada', async () => {
  const { pedir, google } = ambiente();
  const ref = encodeURIComponent('places/ChIJlugar/photos/Y');
  await pedir('ref=' + ref + '&w=400');
  await pedir('ref=' + ref + '&w=800');
  assert.equal(google(), 1);
});

const foto = { widthPx: 4032, heightPx: 3024, authorAttributions: [{ displayName: 'Ana', uri: 'https://maps.google.com/maps/contrib/123' }] };

test('mesmo retrato com códigos diferentes (buscas diferentes) = uma ida ao Google', async () => {
  const { pedir, google } = ambiente();
  const s = idDaFoto(foto);
  assert.ok(ID_OK.test(s), s);
  const r1 = await pedir('ref=' + encodeURIComponent('places/ChIJlugar/photos/CODIGO_DA_BUSCA_1') + '&s=' + s + '&w=400');
  const r2 = await pedir('ref=' + encodeURIComponent('places/ChIJlugar/photos/CODIGO_DA_BUSCA_2') + '&s=' + s + '&w=800');
  assert.equal(r1.status, 302);
  assert.equal(r2.status, 302);
  assert.equal(r2.headers.get('Location'), 'https://lh3.googleusercontent.com/foto-do-lugar=w800-rw');
  assert.equal(google(), 1, 'a 2ª busca não pode pagar a mesma foto de novo');
});

test('outro lugar, ou outro retrato, continua indo ao Google', async () => {
  const { pedir, google } = ambiente();
  const s = idDaFoto(foto);
  await pedir('ref=' + encodeURIComponent('places/ChIJlugar/photos/A') + '&s=' + s + '&w=400');
  await pedir('ref=' + encodeURIComponent('places/ChIJoutro/photos/B') + '&s=' + s + '&w=400');
  await pedir('ref=' + encodeURIComponent('places/ChIJlugar/photos/C') + '&s=' + idDaFoto({ ...foto, heightPx: 2000 }) + '&w=400');
  assert.equal(google(), 3);
});

test('endereço antigo (sem s, gravado no banco) segue funcionando pelo código', async () => {
  const { pedir, google } = ambiente();
  const ref = encodeURIComponent('places/ChIJlugar/photos/ANTIGO');
  assert.equal((await pedir('ref=' + ref + '&w=400')).status, 302);
  assert.equal((await pedir('ref=' + ref + '&w=800')).status, 302);
  assert.equal(google(), 1);
  // s inválido é ignorado (não vira chave)
  assert.equal((await pedir('ref=' + ref + '&s=../../x&w=400')).status, 302);
  assert.equal(google(), 1);
});

test('idDaFoto: sem tamanho não identifica; autor muda o id', () => {
  assert.equal(idDaFoto({ name: 'x' }), '');
  assert.notEqual(idDaFoto(foto), idDaFoto({ ...foto, authorAttributions: [{ uri: 'https://outro' }] }));
  assert.match(idDaFoto({ widthPx: 800, heightPx: 600 }), /^800x600$/);
});
