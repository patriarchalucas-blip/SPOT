import { test } from 'node:test';
import assert from 'node:assert';
import { webcrypto } from 'node:crypto';
import { onRequestPost, segredoDoCliente } from '../functions/api/apple.js';

// Revogação do "Entrar com a Apple" na exclusão de conta (5.1.1(v), 27/09).

async function chaveDeTeste() {
  const par = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', par.privateKey)).toString('base64');
  return { par, pem: '-----BEGIN PRIVATE KEY-----\n' + der.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----' };
}
const pedido = (corpo) => new Request('https://meuspot.app/api/apple', {
  method: 'POST', headers: { Authorization: 'Bearer a.b.c', 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
});

test('segredo do cliente e um JWT ES256 com assinatura valida e os campos da Apple', async () => {
  const { par, pem } = await chaveDeTeste();
  const jwt = await segredoDoCliente({ APPLE_SIWA_KEY: pem, APPLE_SIWA_KEY_ID: 'ABC123DEFG' });
  const [c, p, a] = jwt.split('.');
  const dec = (x) => JSON.parse(Buffer.from(x, 'base64url').toString());
  assert.strictEqual(dec(c).alg, 'ES256');
  assert.strictEqual(dec(c).kid, 'ABC123DEFG');
  assert.strictEqual(dec(p).sub, 'app.meuspot.spot');
  assert.strictEqual(dec(p).aud, 'https://appleid.apple.com');
  const ok = await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, par.publicKey, Buffer.from(a, 'base64url'), new TextEncoder().encode(c + '.' + p));
  assert.ok(ok, 'assinatura invalida');
});

test('sem a chave configurada, nao quebra nada', async () => {
  const antigo = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
  try {
    const r = await (await onRequestPost({ request: pedido({ op: 'revogar' }), env: { SPOT_KV: { get: async () => null, put: async () => {} } } })).json();
    assert.strictEqual(r.configured, false);
  } finally { globalThis.fetch = antigo }
});

test('guardar troca o codigo e revogar manda o token pra Apple e apaga', async () => {
  const { pem } = await chaveDeTeste();
  const kv = new Map();
  const env = { APPLE_SIWA_KEY: pem, APPLE_SIWA_KEY_ID: 'K', SPOT_KV: { get: async (k) => kv.get(k) || null, put: async (k, v) => { kv.set(k, v) }, delete: async (k) => { kv.delete(k) } } };
  const antigo = globalThis.fetch; const chamadas = [];
  globalThis.fetch = async (u, o) => {
    const s = String(u); chamadas.push(s);
    if (s.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'eu' }), { status: 200 });
    if (s.endsWith('/auth/token')) return new Response(JSON.stringify({ refresh_token: 'rt123' }), { status: 200 });
    if (s.endsWith('/auth/revoke')) { assert.ok(String(o.body).includes('token=rt123')); return new Response('', { status: 200 }) }
    return new Response('{}', { status: 200 });
  };
  try {
    const g = await (await onRequestPost({ request: pedido({ op: 'guardar', codigo: 'c0de.abc-123_xyz' }), env })).json();
    assert.strictEqual(g.guardado, true);
    const r = await (await onRequestPost({ request: pedido({ op: 'revogar' }), env })).json();
    assert.strictEqual(r.revogado, true);
    assert.strictEqual(kv.has('apple_rt_eu'), false);
  } finally { globalThis.fetch = antigo }
});
