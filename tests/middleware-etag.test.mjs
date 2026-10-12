// A página do app ganha impressão digital no middleware (11/10/2026): com o
// mesmo conteúdo, o celular recebe 304 em vez de baixar a página inteira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest, comImpressaoDigital } from '../functions/_middleware.js';

const html = (txt) => new Response(txt, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
const pedido = (inm) => new Request('https://meuspot.app/', { headers: inm ? { 'If-None-Match': inm } : {} });

test('a página sai com ETag, e o mesmo ETag de volta dá 304 sem corpo', async () => {
  const r1 = await comImpressaoDigital(pedido(), html('<p>app v1</p>'));
  const etag = r1.headers.get('ETag');
  assert.equal(r1.status, 200);
  assert.match(etag, /^"[0-9a-f]{32}"$/);
  assert.equal(await r1.text(), '<p>app v1</p>');
  const r2 = await comImpressaoDigital(pedido(etag), html('<p>app v1</p>'));
  assert.equal(r2.status, 304);
  assert.equal(await r2.text(), '');
});

test('deploy novo (conteúdo diferente) baixa de novo', async () => {
  const r1 = await comImpressaoDigital(pedido(), html('<p>app v1</p>'));
  const r2 = await comImpressaoDigital(pedido(r1.headers.get('ETag')), html('<p>app v2</p>'));
  assert.equal(r2.status, 200);
  assert.equal(await r2.text(), '<p>app v2</p>');
});

test('o que não é HTML passa intacto, e arquivo interno continua bloqueado', async () => {
  const js = new Response('x', { status: 200, headers: { 'Content-Type': 'application/javascript' } });
  assert.equal(await comImpressaoDigital(pedido(), js), js);
  const bloq = await onRequest({ request: new Request('https://meuspot.app/CLAUDE.md'), next: async () => html('nao') });
  assert.equal(bloq.status, 404);
});
