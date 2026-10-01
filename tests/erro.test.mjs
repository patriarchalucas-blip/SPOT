import { test } from 'node:test';
import assert from 'node:assert';
import { limparTexto, assinatura, onRequestPost, onRequestGet } from '../functions/api/erro.js';

test('erro: nada pessoal passa (email, id, token, link com parametro)', () => {
  const t = limparTexto("dbGet error spots lucas@x.com 11111111-2222-3333-4444-555555555555 eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop https://meuspot.app/?c=SEGREDO 'um texto muito comprido que a pessoa escreveu na nota dela'", 500);
  assert.ok(!t.includes('lucas@x.com') && !t.includes('5555') && !t.includes('eyJ') && !t.includes('SEGREDO') && !t.includes('nota dela'), t);
});

test('erro: agrupa o mesmo erro e avisa so o novo', async () => {
  const kv = new Map();
  const env = { SPOT_KV: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v) } } };
  const manda = (msg) => onRequestPost({ request: new Request('https://x/api/erro', { method: 'POST', body: JSON.stringify({ tipo: 'erro', msg, tela: 'city' }) }), env, waitUntil: () => {} });
  await manda('TypeError: x is undefined');
  await manda('TypeError: x is undefined');
  await manda('ReferenceError: y');
  const r = await (await onRequestGet({ request: new Request('https://x/api/erro'), env })).json();
  assert.strictEqual(r.erros.length, 2);
  assert.strictEqual(r.total, 3);
  assert.strictEqual(assinatura('a 12', 't'), assinatura('a 99', 't'), 'numero nao separa o mesmo erro');
});
