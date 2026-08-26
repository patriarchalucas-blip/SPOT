import { test } from 'node:test';
import assert from 'node:assert';
import { montarTexto, montarPerto, filtrarMascara, limitar, CAMPOS_OK } from '../functions/api/places.js';
import { REF_OK } from '../functions/api/place-photo.js';

// A /api/places existe pra que a chave do Google não fique no navegador. Isso
// só vale alguma coisa se a rota não aceitar qualquer pedido: se ela repassar
// o que o navegador mandar, a chave está escondida e a conta continua aberta
// pra qualquer um. Estes testes são sobre essa parte — o que ela RECUSA.

test('a FieldMask so deixa passar campo que o app usa', () => {
  // Cada campo pedido ao Places entra no preço da requisição. `reviews` e
  // `editorialSummary` estão entre os mais caros e o app não usa nenhum.
  assert.strictEqual(
    filtrarMascara('places.displayName,places.reviews,places.priceLevel,places.editorialSummary'),
    'places.displayName');
  assert.strictEqual(filtrarMascara('places.reviews'), null, 'so campo caro deve ser recusado');
  assert.strictEqual(filtrarMascara('*'), null, 'curinga pede o registro inteiro, o mais caro possivel');
  assert.strictEqual(filtrarMascara(''), null);
  assert.strictEqual(filtrarMascara(null), null);
});

test('a FieldMask nao repete campo', () => {
  assert.strictEqual(filtrarMascara('places.id,places.id,places.id'), 'places.id');
});

test('nenhum campo caro entrou na lista permitida por descuido', () => {
  for (const caro of ['places.reviews', 'places.editorialSummary', 'places.priceLevel',
    'places.currentOpeningHours', 'places.servesBeer', '*']) {
    assert.ok(!CAMPOS_OK.has(caro), caro + ' nao deveria estar liberado');
  }
});

test('searchText poda o que passa do limite', () => {
  assert.strictEqual(montarTexto({ textQuery: 'x', maxResultCount: 500 }).maxResultCount, 20);
  assert.strictEqual(montarTexto({ textQuery: 'x', maxResultCount: -3 }).maxResultCount, 1);
  assert.strictEqual(montarTexto({ textQuery: 'a'.repeat(5000) }).textQuery.length, 200);
  assert.strictEqual(montarTexto({ textQuery: '   ' }), null, 'busca vazia nao deve chegar ao Google');
  assert.strictEqual(montarTexto({}), null);
});

test('searchText descarta campo que nao foi previsto', () => {
  // O ponto todo: o corpo é montado campo a campo, nunca repassado.
  const p = montarTexto({ textQuery: 'x', rankPreference: 'DISTANCE', pageSize: 99, evil: 1, priceLevels: ['a'] });
  assert.deepStrictEqual(Object.keys(p).sort(), ['maxResultCount', 'textQuery']);
});

test('searchNearby recusa coordenada impossivel', () => {
  const perto = (lat, lng) => montarPerto({
    includedTypes: ['restaurant'],
    locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 100 } }
  });
  assert.strictEqual(perto(999, 2), null);
  assert.strictEqual(perto(2, 999), null);
  assert.strictEqual(perto('abc', 2), null);
  assert.strictEqual(perto(undefined, undefined), null);
  assert.ok(perto(-23.5, -46.6), 'Sao Paulo tem que passar');
});

test('searchNearby limita raio e quantidade de tipos', () => {
  const p = montarPerto({
    includedTypes: Array(50).fill('bar'),
    locationRestriction: { circle: { center: { latitude: 1, longitude: 2 }, radius: 9999999 } }
  });
  assert.strictEqual(p.includedTypes.length, 10);
  assert.strictEqual(p.locationRestriction.circle.radius, 50000);
});

test('searchNearby sem tipo nenhum e recusado', () => {
  assert.strictEqual(montarPerto({
    includedTypes: [],
    locationRestriction: { circle: { center: { latitude: 1, longitude: 2 }, radius: 100 } }
  }), null);
  assert.strictEqual(montarPerto({ includedTypes: 'restaurant' }), null, 'texto no lugar de lista');
});

test('limitar nao deixa passar nada fora da faixa', () => {
  assert.strictEqual(limitar(NaN, 1, 10, 5), 5);
  assert.strictEqual(limitar(Infinity, 1, 10, 5), 5);
  assert.strictEqual(limitar('7', 1, 10, 5), 7);
  assert.strictEqual(limitar(-99, 1, 10, 5), 1);
  assert.strictEqual(limitar(99, 1, 10, 5), 10);
});

test('a referencia de foto tem formato fechado', () => {
  assert.ok(REF_OK.test('places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AeJbb3f9xK-2Lm'));
  // Sem isso o parâmetro viraria caminho livre pra montar qualquer URL do Google.
  assert.ok(!REF_OK.test('../../etc/passwd'));
  assert.ok(!REF_OK.test('places/X/photos/Y/../../../v1/outracoisa'));
  assert.ok(!REF_OK.test('places/X/photos/Y?key=roubada'));
  assert.ok(!REF_OK.test('https://evil.com/places/X/photos/Y'));
  assert.ok(!REF_OK.test('places/X/photos/'));
  assert.ok(!REF_OK.test(''));
});

test('as duas rotas so respondem ao verbo que deveriam', async () => {
  const places = await import('../functions/api/places.js');
  const foto = await import('../functions/api/place-photo.js');
  assert.strictEqual(typeof places.onRequestPost, 'function');
  assert.strictEqual(places.onRequestGet, undefined, 'busca por GET seria cacheavel por terceiros');
  assert.strictEqual(typeof foto.onRequestGet, 'function');
  assert.strictEqual(foto.onRequestPost, undefined);
});
