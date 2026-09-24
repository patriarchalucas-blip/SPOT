import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestPost } from '../functions/api/denuncia-aviso.js';

// O aviso ao moderador roda com a chave de serviço. O que importa testar é o
// que ele RECUSA antes de chegar em qualquer coisa paga ou privada.

const pedir = (corpo, headers) => ({
  request: new Request('https://x/api/denuncia-aviso', {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo)
  }),
  env: {}
});

test('corpo que nao e JSON e recusado', async () => {
  const r = await onRequestPost(pedir('{'));
  assert.strictEqual(r.status, 400);
});

test('id que nao e uuid e recusado antes de consultar o banco', async () => {
  for (const id of ['', '1', "x' or 1=1", 'a'.repeat(36) + '&select=*']) {
    const r = await onRequestPost(pedir({ id }));
    assert.strictEqual(r.status, 400, id);
  }
});
