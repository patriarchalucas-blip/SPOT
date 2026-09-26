const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');
const A = app();
test('corrigido 26/09 — previa velha (mesmo indice) empresta o site/Instagram pra outro lugar', async () => {
  A.avaliar("S.user={id:'eu'};S.profile={};S.trips=[{id:'t1',name:'Portugal',destinations:['Portugal'],dates:'',_spots:[]}]");
  const spots = [];
  const vs = [trocar(A, 'dbInsert', async (t, o) => { if (t === 'spots') spots.push(o); return { error: null, data: Object.assign({ id: 'x' }, o) } }),
    trocar(A, 'resolverCidadeDoSpot', async p => p.city), trocar(A, 'toast', () => {}), trocar(A, 'loadDashboard', () => {})];
  try {
    // prévia aberta no card 0 da busca de japonesa, com o Instagram achado nela
    A.avaliar("S.curPlace={id:'previa',_previa:true,_i:0,name:'Sushi Velho',website_url:'https://instagram.com/sushivelho'}");
    // voltou, trocou pra Pizza: o card 0 agora é outro lugar
    A.avaliar("EXPLORE.cat='food';EXPLORE.items=[{name:'Pizzaria Nova',address:'r, Lisboa, Portugal',city:'Lisboa',country:'Portugal',rating:'4.6',website_url:'https://pizzarianova.pt'}]");
    await A.queroIrDoExplorar(0);
    console.log('gravado:', spots[0].name, spots[0].website_url);
    assert.strictEqual(spots[0].website_url, 'https://pizzarianova.pt');
  } finally { vs.forEach(v => v()) }
});
