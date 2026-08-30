const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Enquanto o criterio de cidade estava errado, spots foram gravados com o nome
// da DIVISAO no lugar do municipio: Braganca Paulista, Santos e Campos do
// Jordao viraram todos "Sao Paulo". O criterio novo so vale pro que for salvo
// daqui pra frente — o banco nao se conserta sozinho.
//
// Corrigir errado e PIOR que nao corrigir: um spot movido pra cidade errada e
// dado perdido sem aviso. Estes testes cobrem principalmente o que a migracao
// NAO pode fazer.

const ENDERECO_BRAGANCA = comps([
  ['Bragança Paulista', 'administrative_area_level_2'],
  ['São Paulo', 'administrative_area_level_1'], ['Brasil', 'country']]);

function comps(l) { return l.map(([longText, tipo]) => ({ longText, types: [tipo, 'political'] })) }

function cenario(resposta) {
  A.avaliar("S.user={id:'eu'}");
  A.avaliar(`S.trips=[{id:'t1',name:'Brasil',destinations:['Brasil'],_spotsLoaded:true,_spots:[
    {id:'s1',trip_id:'t1',name:'Padaria Bragantina',category:'food',city:'São Paulo',
     address:'R. Principal 10, Bragança Paulista - SP',status:'been',my_rating:8,my_note:''}]}]`);
  A.avaliar("localStorage.removeItem('spot_cidades_conferidas_v1')");
  const gravados = [];
  A.dbUpdate = async (tabela, id, patch) => { gravados.push({ id, patch }); return { error: null } };
  A.placesFetch = async () => ({ json: async () => resposta });
  A.toast = () => {};
  A.renderTrips = () => {};
  A.renderEstante = () => {};
  return gravados;
}

test('corrige o spot quando o Google confirma o lugar', async () => {
  const gravados = cenario({
    places: [{ displayName: { text: 'Padaria Bragantina' }, addressComponents: ENDERECO_BRAGANCA }]
  });
  await A.corrigirCidadesAntigas();
  assert.strictEqual(gravados.length, 1);
  // Comparado campo a campo: o objeto vem de dentro do contexto simulado e tem
  // outro prototype, entao deepStrictEqual nunca bate mesmo com o valor certo.
  assert.strictEqual(gravados[0].patch.city, 'Bragança Paulista');
});

test('NAO corrige quando o Google devolve outro estabelecimento', async () => {
  // Busca por nome generico traz outro lugar. Aceitar isso moveria o spot pra
  // uma cidade que nao tem nada a ver.
  const gravados = cenario({
    places: [{ displayName: { text: 'Outra Coisa Completamente' },
      addressComponents: comps([['Recife', 'administrative_area_level_2'], ['Pernambuco', 'administrative_area_level_1']]) }]
  });
  await A.corrigirCidadesAntigas();
  assert.strictEqual(gravados.length, 0, 'gravou "' + (gravados[0] && gravados[0].patch.city) + '" de um lugar que nao e o mesmo');
});

test('NAO grava quando a cidade nova e igual ou vazia', async () => {
  let gravados = cenario({
    places: [{ displayName: { text: 'Padaria Bragantina' },
      addressComponents: comps([['São Paulo', 'administrative_area_level_2'], ['São Paulo', 'administrative_area_level_1']]) }]
  });
  await A.corrigirCidadesAntigas();
  assert.strictEqual(gravados.length, 0, 'gravou uma mudanca que nao muda nada');

  gravados = cenario({ places: [{ displayName: { text: 'Padaria Bragantina' }, addressComponents: [] }] });
  await A.corrigirCidadesAntigas();
  assert.strictEqual(gravados.length, 0, 'gravou cidade vazia');
});

test('nao repete o mesmo spot na proxima abertura', async () => {
  const gravados = cenario({
    places: [{ displayName: { text: 'Padaria Bragantina' }, addressComponents: ENDERECO_BRAGANCA }]
  });
  await A.corrigirCidadesAntigas();
  const depoisDaPrimeira = gravados.length;
  await A.corrigirCidadesAntigas();
  assert.strictEqual(gravados.length, depoisDaPrimeira, 'consultou o mesmo spot de novo — cada rodada custa dinheiro');
});

test('erro de rede nao derruba nada e deixa pra proxima', async () => {
  cenario({ places: [] });
  A.placesFetch = async () => { throw new Error('rede fora') };
  await assert.doesNotReject(() => A.corrigirCidadesAntigas());
});

test('spot sem endereco e ignorado', async () => {
  const gravados = cenario({ places: [] });
  A.avaliar("S.trips[0]._spots[0].address=''");
  A.placesFetch = async () => { throw new Error('nao devia nem chamar') };
  await A.corrigirCidadesAntigas();
  assert.strictEqual(gravados.length, 0);
});

test('sem usuario logado a migracao nem comeca', async () => {
  cenario({ places: [] });
  A.avaliar('S.user=null');
  A.placesFetch = async () => { throw new Error('nao devia chamar sem sessao') };
  await assert.doesNotReject(() => A.corrigirCidadesAntigas());
});
