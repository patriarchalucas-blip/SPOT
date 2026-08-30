const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// O Perfil era uma tela de repeticao: mapa e contadores que o Dashboard ja
// mostrava, mais nome/bio/sair que foram pra Configuracoes. A estante da a ele
// conteudo proprio — os lugares agrupados por cidade, que e como a pessoa
// lembra deles ("o que eu comi em Lisboa?").

function cenario() {
  A.avaliar("S.user={id:'eu'};S.profile={}");
  A.avaliar(`S.trips=[
    {id:'t1',name:'Brasil',destinations:['Brasil'],dates:'',status:'done',_spotsLoaded:true,_spots:[
      {id:'a1',trip_id:'t1',name:'Rubaiyat',category:'food',city:'São Paulo',status:'been',my_rating:9,my_note:''},
      {id:'a2',trip_id:'t1',name:'Bar Astor',category:'food',city:'São Paulo',status:'been',my_rating:7,my_note:''},
      {id:'a3',trip_id:'t1',name:'Hotel Fasano',category:'hotel',city:'São Paulo',status:'want',my_note:''},
      {id:'a4',trip_id:'t1',name:'Padaria',category:'food',city:'Bragança Paulista',status:'been',my_rating:8,my_note:''}]},
    {id:'t2',name:'Portugal',destinations:['Portugal'],dates:'',status:'done',_spotsLoaded:true,_spots:[
      {id:'b1',trip_id:'t2',name:'Time Out',category:'food',city:'Lisboa',status:'been',my_rating:10,my_note:''}]}
  ]`);
  A.avaliar('ESTANTE_ABERTA={}');
}

test('a estante desenha sem estourar', () => {
  cenario();
  assert.doesNotThrow(() => A.renderEstante());
});

test('estante vazia explica o que vai aparecer ali', () => {
  A.avaliar("S.user={id:'eu'};S.trips=[]");
  assert.doesNotThrow(() => A.renderEstante());
});

test('cidades vizinhas nao se misturam na estante', () => {
  // A prova visual do criterio: Braganca Paulista tem que ser uma linha
  // propria, nao um spot dentro de Sao Paulo.
  cenario();
  const spots = A.allSpotsFlat();
  const porCidade = A.agruparPorCidade(spots);
  const cidades = Object.keys(porCidade).filter(c => porCidade[c].length);
  assert.ok(cidades.includes('São Paulo'));
  assert.ok(cidades.includes('Bragança Paulista'), 'Bragança foi engolida por São Paulo');
  assert.strictEqual(porCidade['São Paulo'].length, 3);
  assert.strictEqual(porCidade['Bragança Paulista'].length, 1);
});

test('abrir e fechar uma cidade nao quebra nem perde as outras', () => {
  cenario();
  A.renderEstante();
  assert.doesNotThrow(() => A.alternarCidadeDaEstante('São Paulo'));
  assert.strictEqual(A.avaliar("ESTANTE_ABERTA['São Paulo']"), true);
  assert.doesNotThrow(() => A.alternarCidadeDaEstante('São Paulo'));
  assert.strictEqual(A.avaliar("ESTANTE_ABERTA['São Paulo']"), false);
});

test('toda funcao que a estante usa existe', () => {
  const usadas = ['renderEstante', 'alternarCidadeDaEstante', 'allSpotsFlat',
    'agruparPorCidade', 'cityOf', 'flagFor', 'catIcon', 'fmtRating', 'esc',
    'hydrateIcons', 'openPlace'];
  const faltando = usadas.filter(n => typeof A[n] !== 'function');
  assert.strictEqual(faltando.length, 0, 'sumiram: ' + faltando.join(', '));
});
