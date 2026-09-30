import { test } from 'node:test';
import assert from 'node:assert';
import { melhorResultado, onRequestPost } from '../functions/api/posicao.js';

test('posicao: so aceita resultado com o nome do spot', () => {
  const l = [{ displayName: { text: 'Hospital Qualquer' }, location: { latitude: 1, longitude: 2 } },
    { displayName: { text: 'Mocotó Bar e Restaurante' }, location: { latitude: 3, longitude: 4 } }];
  assert.strictEqual(melhorResultado(l, 'Mocotó').location.latitude, 3);
  assert.strictEqual(melhorResultado(l, 'Tuju'), null);
});

test('posicao: sem login nao consulta nada', async () => {
  const req = new Request('https://x/api/posicao', { method: 'POST', body: JSON.stringify({ ids: ['00000000-0000-0000-0000-000000000001'] }) });
  const r = await onRequestPost({ request: req, env: {} });
  assert.strictEqual(r.status, 401);
});

test('posicao: ignora id que nao e uuid (nada de injetar filtro)', async () => {
  const req = new Request('https://x/api/posicao', { method: 'POST', body: JSON.stringify({ ids: ['1),lat.is.null&x=('] }) });
  const r = await onRequestPost({ request: req, env: {} });
  assert.deepStrictEqual(await r.json(), { posicoes: {} });
});
