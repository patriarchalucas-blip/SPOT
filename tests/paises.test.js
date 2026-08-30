const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// "Marcar pais que ja visitei" cria uma viagem escondida (dates
// '__quickvisit__'). Viagem escondida nao aparece em "Minhas viagens", que e o
// unico lugar do app com botao de excluir — entao dava pra marcar um pais por
// engano e NAO havia caminho nenhum pra desmarcar. Foi o que aconteceu com uma
// pessoa que acabou de entrar no app.

function cenario() {
  A.avaliar("S.user={id:'eu'};S.profile={}");
  A.avaliar(`S.trips=[
    {id:'q1',name:'França',destinations:['França'],dates:'__quickvisit__',status:'done',_spots:[]},
    {id:'q2',name:'Japão',destinations:['Japão'],dates:'__quickvisit__',status:'done',_spots:[]},
    {id:'t1',name:'Bálcãs',destinations:['Croácia'],dates:'jun',status:'done',
     _spots:[{id:'s1',trip_id:'t1',name:'Riva',category:'food',city:'Split',status:'been'}]}
  ]`);
  const apagados = [];
  A.dbDelete = async (tabela, id) => { apagados.push(tabela + ':' + id); return { error: null } };
  A.toast = () => {};
  A.loadProfile = () => {};
  A.renderTrips = () => {};
  A.populateTripOpts = () => {};
  A.confirm = () => true;
  return apagados;
}

test('pais que e so marcacao pode ser desmarcado', () => {
  cenario();
  assert.strictEqual(A.paisSoMarcado('França'), true);
  assert.strictEqual(A.paisSoMarcado('Japão'), true);
});

test('pais com viagem de verdade NAO ganha o botao', () => {
  cenario();
  // Apagar ali levaria os spots junto. O caminho certo pra isso e excluir a
  // viagem, que ja existe e avisa que os spots vao junto.
  assert.strictEqual(A.paisSoMarcado('Croácia'), false);
  assert.strictEqual(A.paisSoMarcado('Pais Que Nao Existe'), false);
});

test('desmarcar apaga so a viagem escondida daquele pais', async () => {
  const apagados = cenario();
  await A.desmarcarPais('França');
  assert.deepStrictEqual(apagados, ['trips:q1']);
  const restantes = A.avaliar('S.trips.map(t=>t.name)');
  assert.deepStrictEqual([...restantes], ['Japão', 'Bálcãs']);
});

test('desistir no aviso nao apaga nada', async () => {
  const apagados = cenario();
  A.confirm = () => false;
  await A.desmarcarPais('Japão');
  assert.strictEqual(apagados.length, 0);
  assert.ok(A.avaliar("S.trips.some(t=>t.name==='Japão')"));
});

test('chamar direto num pais com viagem real nao apaga nada', async () => {
  // A funcao nao confia so em quem a chamou: ela mesma recusa. Sem isso, um
  // clique num botao que nao devia existir apagaria uma viagem com spots.
  const apagados = cenario();
  await A.desmarcarPais('Croácia');
  assert.strictEqual(apagados.length, 0);
  assert.ok(A.avaliar("S.trips.some(t=>t.name==='Bálcãs')"));
});

test('erro no banco nao some com o pais da lista local', async () => {
  cenario();
  A.dbDelete = async () => ({ error: true });
  await A.desmarcarPais('França');
  assert.ok(A.avaliar("S.trips.some(t=>t.name==='França')"),
    'a viagem sumiu da tela mas continua no banco — na proxima carga ela volta');
});

test('a lista de paises desenha com e sem botao', () => {
  cenario();
  assert.doesNotThrow(() => A.renderListaDePaises(['França', 'Japão', 'Croácia']));
  assert.doesNotThrow(() => A.renderListaDePaises([]));
});
