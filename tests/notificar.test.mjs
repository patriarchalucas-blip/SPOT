import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestPost } from '../functions/api/notificar.js';

// Revisão de 26/09: a notificação aceitava o nome do lugar vindo do app
// (texto livre na tela de bloqueio de outra pessoa) e deixava um pedido de
// amizade virar 60 avisos por hora na tela de um estranho.

const ALVO = '11111111-1111-1111-1111-111111111111';
const SPOT = '22222222-2222-2222-2222-222222222222';

function montar(comentarioExiste, donoDoSpot) {
  const kv = new Map();
  const env = {
    SUPABASE_SERVICE_KEY: 's',
    SPOT_KV: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v) } }
  };
  const enviados = [];
  globalThis.fetch = async (url, opt) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
    if (u.includes('enderecos_para_avisar')) return new Response(JSON.stringify([{ token: 'ExponentPushToken[a]' }]), { status: 200 });
    if (u.includes('/rest/v1/spot_comments')) return new Response(JSON.stringify(comentarioExiste ? [{ id: 'c' }] : []), { status: 200 });
    if (u.includes('/rest/v1/spots')) return new Response(JSON.stringify([{ name: 'Mocotó', user_id: donoDoSpot || ALVO }]), { status: 200 });
    if (u.includes('/rest/v1/profiles')) return new Response(JSON.stringify([{ display_name: 'Clara' }]), { status: 200 });
    if (u.includes('exp.host')) { enviados.push(JSON.parse(opt.body)); return new Response('{"data":[{"status":"ok"}]}', { status: 200 }) }
    return new Response('[]', { status: 200 });
  };
  return { env, enviados };
}
const pedido = (corpo) => new Request('https://meuspot.app/api/notificar', {
  method: 'POST', headers: { Authorization: 'Bearer a.b.c', 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
});

test('texto vindo do app nunca chega na notificacao', async () => {
  const antigo = globalThis.fetch;
  const { env, enviados } = montar(true);
  try {
    await onRequestPost({ request: pedido({ tipo: 'comentario', alvo: ALVO, extra: 'PIX GRATIS em golpe.co', spot: SPOT }), env, waitUntil: () => {} });
    assert.strictEqual(enviados.length, 1);
    assert.strictEqual(enviados[0][0].body, 'Clara comentou em Mocotó');
  } finally { globalThis.fetch = antigo }
});

test('sem comentario de verdade, sai generico', async () => {
  const antigo = globalThis.fetch;
  const { env, enviados } = montar(false);
  try {
    await onRequestPost({ request: pedido({ tipo: 'comentario', alvo: ALVO, spot: SPOT }), env, waitUntil: () => {} });
    assert.strictEqual(enviados[0][0].body, 'Clara comentou no seu lugar');
  } finally { globalThis.fetch = antigo }
});

test('pedido de amizade: um aviso por dia pra mesma pessoa', async () => {
  const antigo = globalThis.fetch;
  const { env, enviados } = montar(true);
  try {
    for (let i = 0; i < 5; i++) await onRequestPost({ request: pedido({ tipo: 'pedido', alvo: ALVO }), env, waitUntil: () => {} });
    assert.strictEqual(enviados.length, 1);
  } finally { globalThis.fetch = antigo }
});

// 06/10: o dono respondendo no fio avisa quem comentou — e o texto não pode
// dizer 'no seu lugar' pra quem não é dono do spot.
test('resposta do dono no fio: respondeu na conversa', async () => {
  const antigo = globalThis.fetch;
  const { env, enviados } = montar(true, 'eu');
  try {
    await onRequestPost({ request: pedido({ tipo: 'comentario', alvo: ALVO, spot: SPOT }), env, waitUntil: () => {} });
    assert.strictEqual(enviados[0][0].body, 'Clara respondeu na conversa de Mocotó');
  } finally { globalThis.fetch = antigo }
});

test('resposta nao e tipo que o app pode pedir', async () => {
  const antigo = globalThis.fetch;
  const { env, enviados } = montar(true);
  try {
    const r = await onRequestPost({ request: pedido({ tipo: 'resposta', alvo: ALVO, spot: SPOT }), env, waitUntil: () => {} });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(enviados.length, 0);
  } finally { globalThis.fetch = antigo }
});
