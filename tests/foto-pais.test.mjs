// Foto de capa de PAÍS (09/10/2026): a dos EUA caía na foto aleatória do Google
// porque o filtro exigia que a legenda citasse "United States of America".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fotoServe, fotoServeDePais } from '../functions/api/city-photo.js';

const paisagem = { alt_description: 'aerial view of grand canyon at sunset', tags: [{ title: 'canyon' }] };
const retrato = { alt_description: 'woman smiling in front of a flag', tags: [] };

test('país aceita paisagem que não cita o nome do país', () => {
  assert.equal(fotoServe(paisagem, 'United States of America'), false);   // o filtro de cidade recusava
  assert.equal(fotoServeDePais(paisagem), true);
});

test('país continua recusando foto de gente', () => {
  assert.equal(fotoServeDePais(retrato), false);
  assert.equal(fotoServeDePais(null), false);
});
