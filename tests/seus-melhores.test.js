const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Perfil v5 (05/10): "Seus melhores" — o ranking dos Fui com nota.

function cenario() {
  A.avaliar("S.user={id:'eu'};S.profile={home_city:'São Paulo',ranking:{ordem:{},dec:{}}};TOP.cidade=null;TOP.cat='food'");
  A.avaliar(`S.trips=[{id:'sp',name:'São Paulo',destinations:['Brasil'],dates:'__casa__',_spotsLoaded:true,_spots:[
    {id:'a',name:'Maní',category:'food',city:'São Paulo',status:'been',my_rating:5,my_review:'Mil-folhas de mandioquinha',my_note:'segredo',created_at:'2026-09-20',tipo:'brazilian_restaurant'},
    {id:'b',name:'Shin-Zushi',category:'food',city:'São Paulo',status:'been',my_rating:5,created_at:'2026-09-15',tipo:'japanese_restaurant'},
    {id:'c',name:'Bráz',category:'food',city:'São Paulo',status:'been',my_rating:4.5,created_at:'2026-09-18',tipo:'pizza_restaurant'},
    {id:'d',name:'Camelo',category:'food',city:'São Paulo',status:'been',my_rating:4,created_at:'2026-09-09',tipo:'pizza_restaurant'},
    {id:'e',name:'Quero ir',category:'food',city:'São Paulo',status:'want',created_at:'2026-09-01'},
    {id:'f',name:'Ruim',category:'food',city:'São Paulo',status:'skip',my_rating:1,created_at:'2026-09-01'}]}]`);
}

test('so Fui com nota entra; ordem = nota, depois o mais recente', () => {
  cenario();
  const l = A.avaliar("ordenarTop(spotsDoTop('São Paulo','food'),'São Paulo|food').map(x=>x.id).join()");
  assert.strictEqual(l, 'a,b,c,d');
});

test('empate: mesma nota lado a lado; a escolha do desempate resolve e reordena', () => {
  cenario();
  const chave = "'São Paulo|food'";
  assert.strictEqual(A.avaliar('empatesDoTop(ordenarTop(spotsDoTop("São Paulo","food"),' + chave + '),' + chave + ').length'), 1);
  A.avaliar("S.profile.ranking.dec['b>a']=true");
  assert.strictEqual(A.avaliar('ordenarTop(spotsDoTop("São Paulo","food"),' + chave + ').map(x=>x.id).join()'), 'b,a,c,d');
  assert.strictEqual(A.avaliar('empatesDoTop(ordenarTop(spotsDoTop("São Paulo","food"),' + chave + '),' + chave + ').length'), 0);
});

test('a ordem arrastada manda (e quem nao esta nela vem depois)', () => {
  cenario();
  A.avaliar("S.profile.ranking.ordem['São Paulo|food']=['d','c']");
  assert.strictEqual(A.avaliar("ordenarTop(spotsDoTop('São Paulo','food'),'São Paulo|food').map(x=>x.id).join()"), 'd,c,a,b');
});

test('Mandar: frase com minuscula, sem nota numerica e sem a nota privada', () => {
  cenario();
  A.avaliar("TOP.cidade='São Paulo';TOP.cat='food';TOP.ordem=ordenarTop(spotsDoTop('São Paulo','food'),'São Paulo|food');TOP.n=3");
  A.avaliar("TOP.mandar={titulo:'Meu top de São Paulo',lista:TOP.ordem,comCidade:false,onde:'São Paulo'}");
  const t = A.avaliar('textoDoTop()');
  assert.strictEqual(t, 'Meu top de São Paulo:\n\n1. Maní: mil-folhas de mandioquinha\n2. Shin-Zushi\n3. Bráz\n\nOs 4 no Spot: meuspot.app');
  assert.ok(!t.includes('segredo') && !t.includes('★'));
});

test('o tipo gravado no spot e o mais especifico do Google', () => {
  assert.strictEqual(A.tipoDoGoogle('restaurant', ['restaurant', 'japanese_restaurant', 'food']), 'japanese_restaurant');
});

test('cidade de abertura: onde mora com 3+ notas', () => {
  cenario();
  assert.strictEqual(A.avaliar('cidadePadraoDoTop()'), 'São Paulo');
});

// Seus spots (8a–8d): a busca acha sem acento, nome antes do resto.
test('seus spots: busca sem acento, nome que comeca vem primeiro', () => {
  cenario();
  A.avaliar("SS.buscando=true;SS.busca='bra'");
  A.renderBuscaDosSpots();
  const h = A.avaliar("document.getElementById('ssLista').innerHTML");
  assert.ok(h.indexOf('Br') >= 0 && h.indexOf('<mark>Br') >= 0, 'marca o trecho');
  A.avaliar("SS.busca='mani'");
  A.renderBuscaDosSpots();
  assert.ok(A.avaliar("document.getElementById('ssLista').innerHTML").includes('<mark>Maní</mark>'), 'Mani acha Maní');
  A.avaliar("SS.buscando=false");
});
