const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Planejar com amigos (30/09): uma linha por lugar, "Você" sempre primeiro,
// ordem por quantos foram, e a nota privada nunca na tela.

test('junta o mesmo lugar salvo por duas pessoas e separa homonimo longe', () => {
  A.avaliar("S.user={id:'eu'};S.profile={display_name:'Lucas'};PLN_AMIGOS.perfis={rafa:{display_name:'Rafa Mendes'},ana:{display_name:'Ana Ribeiro'}}");
  const g = A.avaliar(`plnAgrupar([
    {user_id:'rafa',name:'Taberna',city:'Lisboa',status:'been',my_rating:4,lat:38.7112,lng:-9.1421},
    {user_id:'eu',name:'taberna ',city:'Lisboa',status:'been',my_rating:4.5,lat:38.711,lng:-9.142},
    {user_id:'ana',name:'Taberna',city:'Porto',status:'want',lat:41.15,lng:-8.61},
    {user_id:'ana',name:'Ramiro',city:'Lisboa',status:'want'},
    {user_id:'rafa',name:'Ramiro',city:'Lisboa',status:'been',my_rating:5}])`);
  assert.strictEqual(g.length, 3, 'Taberna de Lisboa junta; a do Porto (a 270 km) fica separada');
  assert.strictEqual(A.plnFraseForam(g[0]), 'Você foi 4,5★ · Rafa 4★');
  assert.strictEqual(A.plnFraseForam(g[1]), 'Rafa foi 5★');
  assert.strictEqual(A.plnFraseQuerem(g[1]), 'Ana quer ir');
  assert.strictEqual(g[2].querem.length, 1);
});

test('frase de quem quer ir, com e sem voce', () => {
  A.avaliar("S.user={id:'eu'};PLN_AMIGOS.perfis={ana:{display_name:'Ana Ribeiro'},bia:{display_name:'Bia Costa'}}");
  const g = A.avaliar(`plnAgrupar([{user_id:'ana',name:'X',city:'Lisboa',status:'want'},{user_id:'eu',name:'X',city:'Lisboa',status:'want'},{user_id:'bia',name:'X',city:'Lisboa',status:'want'}])`);
  assert.strictEqual(A.plnFraseQuerem(g[0]), 'Você, Ana e Bia querem ir');
  assert.strictEqual(A.plnNomesCurtos(['ana', 'bia', 'eu']), 'Ana, Bia e mais 1');
  const so = A.avaliar("plnAgrupar([{user_id:'eu',name:'Z',city:'Lisboa',status:'want'}])");
  assert.strictEqual(A.plnFraseQuerem(so[0]), 'Você quer ir');
});

test('a linha nunca mostra a nota privada', () => {
  A.avaliar("S.user={id:'eu'};PLN_AMIGOS.perfis={rafa:{display_name:'Rafa'}}");
  const html = A.avaliar(`(()=>{const g=plnAgrupar([{user_id:'rafa',name:'Y',city:'Lisboa',status:'been',my_rating:5,my_note:'SEGREDO',my_review:'frase'}]);return plnLinha(g[0],0)})()`);
  assert.ok(!html.includes('SEGREDO'));
});
