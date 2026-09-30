import { test } from 'node:test';
import assert from 'node:assert';
import { paginaDaLista, fotoDoSpot, esc } from '../functions/l/[codigo].js';
import { limparCidades, onRequestPost } from '../functions/api/lista.js';

const spots = [
  { name: 'Taberna <b>X</b>', category: 'food', status: 'been', my_rating: 4.5, my_review: 'Vai cedo "sempre"', photo_url: 'https://places.googleapis.com/v1/places/abc/photos/def/media?maxWidthPx=400&key=SEGREDO' },
  { name: 'Miradouro', category: 'experience', status: 'want', my_rating: null, my_review: 'nao deve aparecer', photo_url: '' },
];

test('lista publica: escapa texto de usuario e nunca vaza a chave da foto', () => {
  const h = paginaDaLista({ nome: 'Lucas P', titulo: 'Lisboa', pais: 'Portugal', spots, origem: 'https://meuspot.app', codigo: 'abc12345' });
  assert.ok(h.includes('Os spots de Lucas em Lisboa'));
  assert.ok(!h.includes('<b>X</b>'), 'nome do spot virou HTML');
  assert.ok(!h.includes('SEGREDO'), 'a chave do Google apareceu');
  assert.ok(h.includes('/api/place-photo?ref=places%2Fabc%2Fphotos%2Fdef&amp;w=200') || h.includes('/api/place-photo?ref=places%2Fabc%2Fphotos%2Fdef&w=200'));
  assert.ok(h.includes('★ 4,5'));
  assert.ok(!h.includes('nao deve aparecer'), 'avaliacao de Quero ir apareceu');
  assert.ok(h.includes('noindex'));
  assert.ok(h.includes('Spot - seus lugares'));
});

test('lista publica: foto de fora do Google/Supabase nao entra', () => {
  assert.strictEqual(fotoDoSpot('https://site-malicioso.com/x.jpg', 200), '');
  assert.strictEqual(esc('"><script>'), '&quot;&gt;&lt;script&gt;');
});

test('criar lista: exige login e limpa as cidades', async () => {
  assert.deepStrictEqual(limparCidades(['Lisboa', 'Lisboa', ' Porto ', 'a,b)', '']), ['Lisboa', 'Porto', 'a b']);
  const r = await onRequestPost({ request: new Request('https://x/api/lista', { method: 'POST', body: JSON.stringify({ cidades: ['Lisboa'] }) }), env: {} });
  assert.strictEqual(r.status, 401);
});
