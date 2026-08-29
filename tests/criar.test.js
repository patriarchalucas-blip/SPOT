const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// ESTE ARQUIVO EXISTE POR CAUSA DE UM ERRO QUE FICOU UM DIA EM PRODUCAO.
//
// createTrip tinha `const cidadeEscolhida = ...` e mais abaixo uma linha que
// reatribuia essa mesma variavel. Isso lanca "Assignment to constant
// variable" TODA vez que uma cidade e escolhida — que e sempre. A funcao
// morria antes de inserir, o botao ja tinha virado "Criando..." e nunca mais
// voltava. Nenhum erro na tela, nenhuma saida.
//
// Por que nada pegou: e sintaxe VALIDA, entao a checagem de sintaxe passa. So
// quebra ao executar. E nenhum teste meu chamava createTrip.

function prepara(overrides) {
  const o = overrides || {};
  A.avaliar("S.user={id:'eu'};S.trips=[]");
  A.avaliar('selectedNewTripCity=' + JSON.stringify(o.cidade || { city: 'Paris', country: 'França' }));
  const inseridos = [];
  A.dbInsert = async (tabela, obj) => { inseridos.push({ tabela, obj }); return { data: Object.assign({ id: 't1' }, obj), error: null } };
  A.dbGet = async () => [];
  A.dbUpdate = async () => ({ error: null });
  A.loadDashboard = async () => {};
  A.openTrip = () => {};
  A.toast = () => {};
  return inseridos;
}

test('criar viagem chega a inserir no banco', async () => {
  const inseridos = prepara();
  A.canonizarCidade = async (n) => n;
  await A.createTrip();
  const trips = inseridos.filter(x => x.tabela === 'trips');
  assert.ok(trips.length >= 1, 'createTrip terminou sem inserir nada — o botao fica em "Criando..." pra sempre');
  assert.strictEqual(trips[0].obj.name, 'França');
  assert.strictEqual(trips[0].obj.initial_city, 'Paris');
});

test('o botao nao fica preso em "Criando..." quando o Google nao responde', async () => {
  // O caso real: rede de celular, canonizacao pendurada. Antes isso segurava a
  // criacao pra sempre; agora o prazo desiste e a viagem e criada com o nome
  // que a pessoa escolheu.
  const inseridos = prepara();
  A.canonizarCidade = () => new Promise(() => {});   // nunca resolve
  const t0 = Date.now();
  await A.createTrip();
  const levou = Date.now() - t0;
  const trips = inseridos.filter(x => x.tabela === 'trips');
  assert.ok(trips.length >= 1, 'a viagem nao foi criada quando o Google travou');
  assert.strictEqual(trips[0].obj.initial_city, 'Paris', 'devia cair no nome escolhido');
  assert.ok(levou < 8000, 'demorou ' + levou + 'ms — o prazo nao funcionou');
});

test('canonizacao que estoura nao derruba a criacao', async () => {
  const inseridos = prepara();
  A.canonizarCidade = async () => { throw new Error('rede fora') };
  await A.createTrip();
  assert.ok(inseridos.filter(x => x.tabela === 'trips').length >= 1);
});

test('comPrazo devolve a reserva e nao explode', async () => {
  assert.strictEqual(await A.comPrazo(Promise.resolve('bom'), 500, 'reserva'), 'bom');
  assert.strictEqual(await A.comPrazo(new Promise(() => {}), 60, 'reserva'), 'reserva');
  assert.strictEqual(await A.comPrazo(Promise.reject(new Error('x')), 500, 'reserva'), 'reserva');
});

test('salvar spot tambem nao trava se o Google nao responder', async () => {
  A.canonizarCidade = () => new Promise(() => {});
  const t0 = Date.now();
  const r = await A.resolverCidadeDoSpot(
    { city: 'Paris', country: 'França', region: 'Île-de-France' },
    { initial_city: 'Paris' });
  const levou = Date.now() - t0;
  assert.strictEqual(r, 'Paris');
  assert.ok(levou < 9000, 'demorou ' + levou + 'ms');
});
