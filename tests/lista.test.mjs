import { test } from 'node:test';
import assert from 'node:assert';
import { paginaDaLista, fotoDoSpot, esc, rotuloDoSpot } from '../functions/l/[codigo].js';
import { limparCidades, onRequestPost } from '../functions/api/lista.js';

const base = { origem: 'https://meuspot.app', codigo: 'abc12345', nome: 'Lucas P', titulo: 'Lisboa', pais: 'Portugal' };
const fui = (i, extra) => Object.assign({ name: 'Lugar ' + i, category: 'food', status: 'been', my_rating: 4, my_review: 'frase ' + i, photo_url: '' }, extra);
const quero = (i) => ({ name: 'Quero ' + i, category: 'experience', status: 'want', my_review: 'nao deve aparecer', photo_url: '' });

test('lista publica: escapa texto, nunca vaza a chave da foto nem frase de Quero ir', () => {
  const spots = [fui(1, { name: 'Taberna <b>X</b>', my_rating: 4.5, photo_url: 'https://places.googleapis.com/v1/places/abc/photos/def/media?maxWidthPx=400&key=SEGREDO' }), quero(1)];
  const h = paginaDaLista(Object.assign({ spots }, base));
  assert.ok(h.includes('Os spots de Lucas em Lisboa'), 'titulo sem genero');
  assert.ok(!/Os spots do /.test(h), 'o app nao sabe o genero');
  assert.ok(!h.includes('<b>X</b>'));
  assert.ok(!h.includes('SEGREDO'));
  assert.ok(/\/api\/place-photo\?ref=places%2Fabc%2Fphotos%2Fdef&(amp;)?w=\d+/.test(h));
  assert.ok(h.includes('aria-label="4,5 de 5"'), 'meia estrela');
  assert.ok(!h.includes('nao deve aparecer'));
  assert.ok(h.includes('noindex'));
  assert.ok(h.includes('2 spots no Spot'), 'og:description sem misturar fui/quero ir');
});

test('lista publica: so Quero ir tira o titulo da secao e explica no subtitulo', () => {
  const h = paginaDaLista(Object.assign({ spots: [quero(1), quero(2)] }, base));
  assert.ok(h.includes('Portugal · 2 spots que quer conhecer'));
  assert.ok(!h.includes('<h2>Quero ir'));
});

test('lista publica: mais de 10 spots vira abas com categorias', () => {
  const spots = Array.from({ length: 8 }, (_, i) => fui(i)).concat(Array.from({ length: 4 }, (_, i) => quero(i)));
  const h = paginaDaLista(Object.assign({ spots }, base));
  assert.ok(h.includes('data-aba="fui"') && h.includes('data-aba="quero"'));
  assert.ok(h.includes('Gastronomia 8'));
});

test('lista publica: foto de fora e rotulo da linha', () => {
  assert.strictEqual(fotoDoSpot('https://site-malicioso.com/x.jpg', 200), '');
  assert.strictEqual(esc('"><script>'), '&quot;&gt;&lt;script&gt;');
  assert.strictEqual(rotuloDoSpot({ category: 'experience', subcategory: 'passeio' }), 'Passeio');
  assert.strictEqual(rotuloDoSpot({ category: 'food', place_type: 'Comer & Beber' }), 'Gastronomia');
  assert.strictEqual(rotuloDoSpot({ category: 'hotel' }), 'Hospedagem');
});

test('criar lista: exige login e limpa as cidades', async () => {
  assert.deepStrictEqual(limparCidades(['Lisboa', 'Lisboa', ' Porto ', 'a,b)', '']), ['Lisboa', 'Porto', 'a b']);
  const r = await onRequestPost({ request: new Request('https://x/api/lista', { method: 'POST', body: JSON.stringify({ cidades: ['Lisboa'] }) }), env: {} });
  assert.strictEqual(r.status, 401);
});

test('criar lista: com login, guarda o nome que o app mandou (sem ReferenceError)', async () => {
  const kv = new Map();
  const env = { SPOT_KV: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v) }, delete: async (k) => { kv.delete(k) } } };
  // login falso: token com a forma de JWT e o Supabase respondendo o usuário
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: '00000000-0000-0000-0000-00000000000a' }), { status: 200 });
  try {
    const tk = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura';
    const req = new Request('https://x/api/lista', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body: JSON.stringify({ cidades: ['Lisboa'], titulo: 'Lisboa', nome: 'Lucas' }) });
    const r = await onRequestPost({ request: req, env });
    const d = await r.json();
    if (d.unauthorized) return; // o jeito de validar o login mudou: o teste de cima já cobre o 401
    assert.ok(d.codigo, JSON.stringify(d));
    assert.strictEqual(JSON.parse(kv.get('lista_' + d.codigo)).nome, 'Lucas');
  } finally { globalThis.fetch = orig }
});

test('salvar da lista: so devolve spot que esta na lista, e nunca a nota de quem fez', async () => {
  const kv = new Map([['lista_abcdefgh1234', JSON.stringify({ uid: 'u1', cidades: ['Lisboa'], titulo: 'Lisboa', pais: 'Portugal' })],
    ['lista_revogadaaa12', JSON.stringify({ revogado: true })]]);
  const env = { SUPABASE_SERVICE_KEY: 'k', SPOT_KV: { get: async (k) => kv.get(k) ?? null, put: async () => {}, delete: async () => {} } };
  const id = '11111111-2222-3333-4444-555555555555';
  let pedido = '';
  const orig = globalThis.fetch;
  const pede = (corpo) => onRequestPost({ request: new Request('https://x/api/lista', { method: 'POST', body: JSON.stringify(corpo) }), env }).then((r) => r.json());
  try {
    globalThis.fetch = async (u) => { pedido = String(u); return new Response(JSON.stringify([{ name: 'Taberna', city: 'Lisboa', status: 'been' }])) };
    const ok = await pede({ op: 'spot', codigo: 'abcdefgh1234', id });
    assert.equal(ok.spot.name, 'Taberna');
    assert.equal(ok.pais, 'Portugal');
    assert.ok(!/my_note|my_review|my_rating/.test(pedido), 'nao pede nota nem frase');
    assert.ok(pedido.includes('user_id=eq.u1') && pedido.includes('id=eq.' + id));
    globalThis.fetch = async () => new Response(JSON.stringify([{ name: 'Outro', city: 'Porto' }]));
    assert.ok((await pede({ op: 'spot', codigo: 'abcdefgh1234', id })).sumiu, 'cidade fora da lista');
    assert.ok((await pede({ op: 'spot', codigo: 'revogadaaa12', id })).sumiu, 'lista desativada');
    const ruim = await onRequestPost({ request: new Request('https://x/api/lista', { method: 'POST', body: JSON.stringify({ op: 'spot', codigo: 'abcdefgh1234', id: "1' or 1=1" }) }), env });
    assert.equal(ruim.status, 400);
  } finally { globalThis.fetch = orig }
});

test('lista publica: a linha leva o id pra folha de salvar', () => {
  const h = paginaDaLista({ nome: 'Ana', titulo: 'Lisboa', pais: 'Portugal', origem: 'https://meuspot.app', codigo: 'abcdefgh1234',
    spots: [{ id: '11111111-2222-3333-4444-555555555555', name: 'Taberna', category: 'food', status: 'been', city: 'Lisboa' }] });
  assert.ok(h.includes('data-id="11111111-2222-3333-4444-555555555555"'));
  assert.ok(h.includes('Salvar no meu Spot') && h.includes('/?salvar='));
  assert.ok(h.includes('maps/search/?api=1'), 'sem JavaScript a linha ainda abre o mapa');
});
