const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Explorar (05/10, desenho e1–e6): digitar o nome de um spot funciona. As
// sugestões vêm em dois grupos, Spots e Lugares.

function cenario() {
  A.avaliar("S.user={id:'eu'};S.profile={};SUG_DELES=[{user_id:'ana',name:'Mani Bar',city:'Lisboa',status:'been'}];PLN_AMIGOS.perfis={ana:{id:'ana',display_name:'Ana Ribeiro'}}");
  A.avaliar(`S.trips=[{id:'br',name:'Brasil',destinations:['Brasil'],dates:'',_spotsLoaded:true,_spots:[
    {id:'m1',trip_id:'br',name:'Maní',category:'food',city:'São Paulo',status:'want'}]}]`);
  A.avaliar(`SUG.texto='Mani';SUG.modo='sugestoes';
    SUG.spots=[{id:'a',titulo:'Maní',sub:'Rua Joaquim Antunes, Jardins, São Paulo',tipos:['restaurant']},
               {id:'b',titulo:'Manioca',sub:'Pinheiros, São Paulo',tipos:['cafe']},
               {id:'c',titulo:'Mani Bar',sub:'Bairro Alto, Lisboa',tipos:['bar']},
               {id:'d',titulo:'Quarto',sub:'x',tipos:['bar']}];
    SUG.lista=[{id:'e',titulo:'Manila',sub:'Filipinas'}]`);
}

test('o status da sugestao: seu spot, spot de amigo, nenhum', () => {
  cenario();
  assert.strictEqual(A.avaliar('statusDaSugestao(SUG.spots[0]).txt'), 'Você quer ir');
  assert.strictEqual(A.avaliar('statusDaSugestao(SUG.spots[2]).txt'), 'Ana foi');
  assert.strictEqual(A.avaliar('statusDaSugestao(SUG.spots[1])'), null);
});

test('ate 3 por grupo, e Spots primeiro quando bate tanto quanto', () => {
  cenario();
  A.pintarSugestoes();
  const h = A.avaliar("document.getElementById('exploreSugestoes').innerHTML");
  assert.ok(h.indexOf('>Spots<') < h.indexOf('>Lugares<'), 'Spots vem antes');
  assert.ok(!h.includes('Quarto'), 'o quarto spot não aparece');
  assert.ok(h.includes('Restaurante · Rua Joaquim Antunes'));
});

test('lugar que bate mais que o spot vem primeiro', () => {
  cenario();
  A.avaliar("SUG.texto='Manila'");
  A.pintarSugestoes();
  const h = A.avaliar("document.getElementById('exploreSugestoes').innerHTML");
  assert.ok(h.indexOf('>Lugares<') < h.indexOf('>Spots<'));
});

test('um grupo so: sem titulo do outro, e nada com esse nome quando os dois vem vazios', () => {
  cenario();
  A.avaliar("SUG.spots=[]");
  A.pintarSugestoes();
  let h = A.avaliar("document.getElementById('exploreSugestoes').innerHTML");
  assert.ok(h.includes('>Lugares<') && !h.includes('>Spots<'));
  A.avaliar("SUG.lista=[];SUG.modo='nada'");
  A.pintarSugestoes();
  h = A.avaliar("document.getElementById('exploreSugestoes').innerHTML");
  assert.ok(h.includes('Nada com esse nome'));
});

test('tocar num spot que ja e seu abre a sua ficha, sem buscar no Google', async () => {
  cenario();
  A.avaliar("window.__aberto='';const _op=openPlace;openPlace=function(id){window.__aberto=id};window.__g=0;const _gp=googlePlaces;googlePlaces=async function(){window.__g++;return{json:async()=>({})}}");
  try {
    await A.avaliar('escolherSpotSugerido(0)');
    assert.strictEqual(A.avaliar('window.__aberto'), 'm1');
    assert.strictEqual(A.avaliar('window.__g'), 0);
  } finally { A.avaliar('openPlace=_op;googlePlaces=_gp') }
});
