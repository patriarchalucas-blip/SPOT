import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestGet as paginaGet } from '../functions/l/[codigo].js';
import { onRequestPost as listaPost } from '../functions/api/lista.js';
import { onRequestPost as placesPost } from '../functions/api/places.js';
import { onRequestPost as notificarPost } from '../functions/api/notificar.js';
import { onRequestPost as posicaoPost } from '../functions/api/posicao.js';
import { onRequestPost as erroPost } from '../functions/api/erro.js';
import { semQueroIrPrivado } from '../functions/api/_privada.js';

// Correções de 06/10/2026 nas functions. Nada aqui sai pra rede: KV e fetch
// são falsos.

const UID = '00000000-0000-0000-0000-00000000000a';
const TK = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura';
function kvFalso(inicial) {
  const m = new Map(inicial || []);
  return { m, get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v) }, delete: async (k) => { m.delete(k) } };
}
async function comFetch(f, corpo) {
  const orig = globalThis.fetch;
  globalThis.fetch = f;
  try { return await corpo() } finally { globalThis.fetch = orig }
}
const login = (u) => String(u).includes('/auth/v1/user') ? new Response(JSON.stringify({ id: UID }), { status: 200 }) : null;

// ── 1. Quero ir de viagem privada não sai na lista pública ──────────────────
test('privada: regra igual a da 028 (want + viagem privada some; Fui fica; sem saber, esconde)', () => {
  const s = [{ id: 1, status: 'been', trip_id: 'p' }, { id: 2, status: 'want', trip_id: 'p' },
    { id: 3, status: 'want', trip_id: 'q' }, { id: 4, status: 'want', trip_id: null }];
  assert.deepStrictEqual(semQueroIrPrivado(s, new Set(['p'])).map((x) => x.id), [1, 3, 4]);
  assert.deepStrictEqual(semQueroIrPrivado(s, null).map((x) => x.id), [1, 4], 'banco fora: erra pra esconder');
});

test('privada: a pagina /l/ nao mostra Quero ir de viagem "So eu vejo"', async () => {
  const env = { SUPABASE_SERVICE_KEY: 'k', SPOT_KV: kvFalso([['lista_abcdefgh1234', JSON.stringify({ uid: UID, cidades: ['Lisboa'], titulo: 'Lisboa', pais: 'Portugal' })]]) };
  let pediuTrip = false;
  const r = await comFetch(async (u) => {
    u = String(u);
    if (u.includes('/rest/v1/trips')) { pediuTrip = true; assert.ok(u.includes('privada=is.true') && u.includes('user_id=eq.' + UID)); return new Response(JSON.stringify([{ id: 'tp' }])) }
    if (u.includes('/rest/v1/spots')) {
      assert.ok(u.includes('trip_id'), 'select traz trip_id');
      return new Response(JSON.stringify([
        { id: 'a', name: 'Fui Publico', status: 'been', trip_id: 'tp', city: 'Lisboa', category: 'food' },
        { id: 'b', name: 'Quero Segredo', status: 'want', trip_id: 'tp', city: 'Lisboa', category: 'food' },
        { id: 'c', name: 'Quero Aberto', status: 'want', trip_id: 'tn', city: 'Lisboa', category: 'food' }]));
    }
    if (u.includes('/rest/v1/profiles')) return new Response(JSON.stringify([{ display_name: 'Ana' }]));
    return new Response('[]');
  }, () => paginaGet({ params: { codigo: 'abcdefgh1234' }, request: new Request('https://meuspot.app/l/abcdefgh1234'), env }));
  const h = await r.text();
  assert.ok(pediuTrip);
  assert.ok(h.includes('Fui Publico') && h.includes('Quero Aberto'));
  assert.ok(!h.includes('Quero Segredo'));
});

test('privada: "Salvar no meu Spot" nao entrega Quero ir de viagem privada', async () => {
  const env = { SUPABASE_SERVICE_KEY: 'k', SPOT_KV: kvFalso([['lista_abcdefgh1234', JSON.stringify({ uid: 'u1', cidades: ['Lisboa'], titulo: 'Lisboa' })]]) };
  const id = '11111111-2222-3333-4444-555555555555';
  const d = await comFetch(async (u) => {
    u = String(u);
    if (u.includes('/rest/v1/trips')) return new Response(JSON.stringify([{ id: 'tp' }]));
    return new Response(JSON.stringify([{ name: 'Segredo', city: 'Lisboa', status: 'want', trip_id: 'tp' }]));
  }, () => listaPost({ request: new Request('https://x/api/lista', { method: 'POST', body: JSON.stringify({ op: 'spot', codigo: 'abcdefgh1234', id }) }), env }).then((r) => r.json()));
  assert.ok(d.sumiu);
});

// ── 2. "Parar de compartilhar" desliga todos os links do mesmo alvo ─────────
test('parar: revoga o link antigo (cidades de ontem) e o novo, e nao toca em outro alvo', async () => {
  const kv = kvFalso();
  const env = { SPOT_KV: kv };
  const pede = (corpo) => listaPost({ request: new Request('https://x/api/lista', { method: 'POST', headers: { Authorization: 'Bearer ' + TK }, body: JSON.stringify(corpo) }), env }).then((r) => r.json());
  await comFetch(async (u) => login(u) || new Response('[]'), async () => {
    const velho = (await pede({ cidades: ['Lisboa'], titulo: 'Portugal' })).codigo;
    const novo = (await pede({ cidades: ['Lisboa', 'Porto'], titulo: 'Portugal' })).codigo;
    const outro = (await pede({ cidades: ['Madri'], titulo: 'Espanha' })).codigo;
    assert.ok(velho && novo && outro && velho !== novo, 'cidades novas ainda geram link novo');
    assert.strictEqual((await pede({ op: 'parar', cidades: ['Lisboa', 'Porto'], titulo: 'Portugal' })).parado, true);
    assert.ok(JSON.parse(kv.m.get('lista_' + velho)).revogado, 'o antigo tambem para');
    assert.ok(JSON.parse(kv.m.get('lista_' + novo)).revogado);
    assert.ok(!JSON.parse(kv.m.get('lista_' + outro)).revogado, 'Espanha segue no ar');
    // O índice das cidades velhas não oferece mais o link desligado.
    assert.strictEqual((await pede({ op: 'estado', cidades: ['Lisboa'], titulo: 'Portugal' })).codigo, '');
    const denovo = (await pede({ cidades: ['Lisboa'], titulo: 'Portugal' })).codigo;
    assert.ok(denovo && denovo !== velho, 'compartilhar de novo sai link novo');
  });
});

test('parar: link de antes do registro (so no indice das cidades) tambem para', async () => {
  const kv = kvFalso([['lista_legadolink12', JSON.stringify({ uid: UID, cidades: ['Lisboa'], titulo: 'Lisboa' })]]);
  const env = { SPOT_KV: kv };
  const pede = (corpo) => listaPost({ request: new Request('https://x/api/lista', { method: 'POST', headers: { Authorization: 'Bearer ' + TK }, body: JSON.stringify(corpo) }), env }).then((r) => r.json());
  await comFetch(async (u) => login(u) || new Response('[]'), async () => {
    // índice no formato antigo, apontando pro link legado
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(UID + '|Lisboa'));
    kv.m.set('lista_de_' + [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join(''), 'legadolink12');
    assert.strictEqual((await pede({ op: 'estado', cidades: ['Lisboa'], titulo: 'Lisboa' })).codigo, 'legadolink12');
    assert.strictEqual((await pede({ op: 'parar', cidades: ['Lisboa'], titulo: 'Lisboa' })).parado, true);
    assert.ok(JSON.parse(kv.m.get('lista_legadolink12')).revogado);
  });
});

// ── 3. A 1ª página do Explorar sai do cache ──────────────────────────────────
test('places: 1a pagina (pageSize, sem token) e cacheada sem o nextPageToken; pagina com token nao', async () => {
  const kv = kvFalso();
  const env = { SPOT_KV: kv, GOOGLE_PLACES_KEY: 'g' };
  let google = 0;
  const f = async (u) => login(u) || (google++, new Response(JSON.stringify({ places: [{ id: 'p1' }], nextPageToken: 'TOKEN_1' })));
  const corpo = { op: 'searchText', textQuery: 'restaurantes em Lisboa', pageSize: 20, languageCode: 'pt-BR', fields: 'places.id,nextPageToken' };
  const pede = (c, auth) => placesPost({ request: new Request('https://x/api/places', { method: 'POST', headers: auth ? { Authorization: 'Bearer ' + TK } : {}, body: JSON.stringify(c) }), env }).then((r) => r.json());
  await comFetch(f, async () => {
    const a = await pede(corpo, true);
    assert.strictEqual(a.nextPageToken, 'TOKEN_1', 'quem paga recebe o token');
    const chaves = [...kv.m.keys()].filter((k) => k.startsWith('places_') && !k.startsWith('places_count_'));
    assert.strictEqual(chaves.length, 1);
    assert.ok(!chaves[0].includes(UID), 'nada do usuario na chave');
    assert.ok(!kv.m.get(chaves[0]).includes('TOKEN_1'), 'token nao vai pro cache');
    const b = await pede(corpo, false);
    assert.strictEqual(google, 1, 'a segunda saiu do cache, sem login e sem Google');
    assert.deepStrictEqual(b.places, [{ id: 'p1' }]);
    await pede(Object.assign({ pageToken: 'TOKEN_1' }, corpo), true);
    await pede(Object.assign({ pageToken: 'TOKEN_1' }, corpo), true);
    assert.strictEqual(google, 3, 'pagina com token nunca sai do cache');
  });
});

test('places: o contador global grava por amostragem (1 em 4, somando 4)', async () => {
  const kv = kvFalso();
  const env = { SPOT_KV: kv, GOOGLE_PLACES_KEY: 'g' };
  const orig = Math.random;
  try {
    await comFetch(async (u) => login(u) || new Response(JSON.stringify({ places: [] })), async () => {
      const pede = (q) => placesPost({ request: new Request('https://x/api/places', { method: 'POST', headers: { Authorization: 'Bearer ' + TK }, body: JSON.stringify({ op: 'searchText', textQuery: q, fields: 'places.id' }) }), env });
      const conta = () => kv.m.get('places_count_' + new Date().toISOString().slice(0, 7));
      Math.random = () => 0.9; await pede('a'); assert.strictEqual(conta(), undefined);
      Math.random = () => 0.1; await pede('b'); assert.strictEqual(conta(), '4');
    });
  } finally { Math.random = orig }
});

// ── 4. Pedido de amizade: texto neutro e marca só depois de enviar ──────────
test('notificar: "quer ser seu amigo", e sem envio de fato a marca anti-repeticao nao e gravada', async () => {
  const kv = kvFalso();
  const env = { SUPABASE_SERVICE_KEY: 's', SPOT_KV: kv };
  let enderecos = [];
  const enviados = [];
  const f = async (u, opt) => {
    u = String(u);
    if (u.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
    if (u.includes('enderecos_para_avisar')) return new Response(JSON.stringify(enderecos));
    if (u.includes('/rest/v1/profiles')) return new Response(JSON.stringify([{ display_name: 'Clara' }]));
    if (u.includes('exp.host')) { enviados.push(JSON.parse(opt.body)); return new Response('{"data":[{"status":"ok"}]}') }
    return new Response('[]');
  };
  const pede = () => notificarPost({ request: new Request('https://x/api/notificar', { method: 'POST', headers: { Authorization: 'Bearer a.b.c' }, body: JSON.stringify({ tipo: 'pedido', alvo: '11111111-1111-1111-1111-111111111111' }) }), env, waitUntil: () => {} });
  await comFetch(f, async () => {
    await pede();   // vínculo ainda não existe: nada sai
    assert.ok(![...kv.m.keys()].some((k) => k.startsWith('push_par_')));
    enderecos = [{ token: 'ExponentPushToken[a]' }];
    await pede();
    assert.strictEqual(enviados.length, 1);
    assert.strictEqual(enviados[0][0].body, 'Clara quer ser seu amigo no Spot');
    await pede();
    assert.strictEqual(enviados.length, 1, 'depois de enviar, segura o repetido');
  });
});

// ── 7. Posição: só spot que o RLS deixa quem chama ver ──────────────────────
test('posicao: le os spots com o token de quem chama, nao com a chave de servico', async () => {
  const env = { SUPABASE_SERVICE_KEY: 'SERVICO', GOOGLE_PLACES_KEY: 'g', SPOT_KV: kvFalso() };
  let leitura = null; let patch = 0;
  await comFetch(async (u, opt) => {
    u = String(u);
    if (u.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: UID }), { status: 200 });
    if (u.includes('/rest/v1/spots') && (!opt || !opt.method)) { leitura = opt.headers.Authorization; return new Response('[]') }
    if (opt && opt.method === 'PATCH') patch++;
    return new Response('{}');
  }, () => posicaoPost({ request: new Request('https://x/api/posicao', { method: 'POST', headers: { Authorization: 'Bearer ' + TK }, body: JSON.stringify({ ids: ['00000000-0000-0000-0000-000000000001'] }) }), env }));
  assert.strictEqual(leitura, 'Bearer ' + TK);
  assert.strictEqual(patch, 0, 'o RLS nao devolveu nada: nada e gravado');
});

// ── 11. Aviso de erro com texto fixo ─────────────────────────────────────────
test('erro: o aviso no celular do dono nao leva a mensagem de quem chamou', async () => {
  const env = { SPOT_KV: kvFalso(), SUPABASE_SERVICE_KEY: 's' };
  const corpos = [], espera = [];
  await comFetch(async (u, opt) => { if (opt && opt.body) corpos.push(String(opt.body)); return new Response('[{"token":"ExponentPushToken[a]","user_id":"x"}]') },
    () => erroPost({ request: new Request('https://x/api/erro', { method: 'POST', body: JSON.stringify({ msg: 'PIX GRATIS em golpe.co', tela: 'Perfil<b>' }) }), env, waitUntil: (p) => espera.push(p) }).then(() => Promise.all(espera)));
  const tudo = corpos.join(' ');
  assert.ok(tudo.includes("Erro novo no app"), tudo);
  assert.ok(!tudo.includes("PIX GRATIS"));
});
