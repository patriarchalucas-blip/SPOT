import { test } from 'node:test';
import assert from 'node:assert';
import { fotoServe } from '../functions/api/city-photo.js';

// Joinville virou um menino com haltere (01/10): a foto tem que ser DO lugar.
test('foto de cidade: precisa citar o lugar e nao pode ser de gente', () => {
  const menino = { alt_description: 'boy holding blue dumbbell', tags: [{ title: 'joinville' }] };
  const cidade = { alt_description: 'aerial view of Joinville city at dusk' };
  const semLugar = { alt_description: 'beautiful sunset over the sea' };
  const saoPaulo = { description: 'Avenida Paulista, São Paulo' };
  assert.strictEqual(fotoServe(menino, 'Joinville'), false, 'retrato nao serve');
  assert.strictEqual(fotoServe(cidade, 'Joinville'), true);
  assert.strictEqual(fotoServe(semLugar, 'Joinville'), false, 'foto que nao cita o lugar nao serve');
  assert.strictEqual(fotoServe(saoPaulo, 'São Paulo'), true, 'acento nao atrapalha');
});

test('nome composto: "Sao" sozinho nao serve pra Sao Paulo (05/10)', () => {
  const saoSebastiao = { description: 'Beach in São Sebastião', tags: [] };
  const sp = { description: 'Skyline of São Paulo city', tags: [] };
  assert.strictEqual(fotoServe(saoSebastiao, 'São Paulo'), false);
  assert.strictEqual(fotoServe(sp, 'São Paulo'), true);
  assert.strictEqual(fotoServe(sp, 'São Paulo Brasil'), true, 'com o pais no fim');
  assert.strictEqual(fotoServe({ description: 'Paulo and friends', tags: [] }, 'São Paulo'), false);
});
