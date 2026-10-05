const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Próximas viagens (05/10, desenho p1–p4): viagem com 0 Fui mora só no
// Perfil — nunca na aba Viagens nem no mapa — e cada uma tem "Quem vê".

function cenario(extra) {
  A.avaliar("S.user={id:'eu'};S.profile={home_city:'São Paulo'};CHEGOU.clear();PLANEJADAS=null;VIAGENS_NOVAS.clear()");
  A.avaliar(`S.trips=[
    {id:'jp',name:'Japão',destinations:['Japão'],dates:'',status:'planning',privada:true,proxima:true,_spotsLoaded:true,_spots:[
      {id:'j1',trip_id:'jp',name:'Sushi Saito',category:'food',city:'Tóquio',status:'want',from_user_id:'ana'}]},
    {id:'it',name:'Itália',destinations:['Itália'],dates:'',status:'planning',privada:false,proxima:true,_spotsLoaded:true,_spots:[]},
    {id:'pt',name:'Portugal',destinations:['Portugal'],dates:'',status:'planning',privada:false,proxima:false,_spotsLoaded:true,_spots:[
      {id:'p1',trip_id:'pt',name:'Ramiro',category:'food',city:'Lisboa',status:'been',my_rating:5}]},
    {id:'cl',name:'Chile',destinations:['Chile'],dates:'',status:'planning',privada:false,proxima:false,_spotsLoaded:true,_spots:[]}
  ]${extra || ''}`);
}

test('proxima viagem: so Quero ir, ou criada como proxima e ainda vazia', () => {
  cenario();
  assert.deepStrictEqual(A.avaliar("proximasViagens().map(t=>t.id).sort().join()"), 'it,jp');
  // Viagem vazia criada à mão (sem a marca) continua sendo viagem feita.
  assert.strictEqual(A.avaliar("naAbaViagens(S.trips.find(t=>t.id==='cl'))"), true);
  assert.strictEqual(A.avaliar("naAbaViagens(S.trips.find(t=>t.id==='jp'))"), false);
});

test('proxima viagem nao pinta o mapa nem entra no placar de viagens', () => {
  cenario();
  const v = A.avaliar('visitedCountryNames()');
  assert.ok(!v.includes('Japão') && !v.includes('Itália'));
  assert.ok(v.includes('Portugal') && v.includes('Chile'));
  A.contarPlacar();
  assert.strictEqual(A.avaliar('PLACAR.viagens'), 2);
});

test('o card da proxima viagem diz quem ve', () => {
  cenario();
  A.renderProximas();
  const h = A.avaliar("document.getElementById('pxLista').innerHTML");
  assert.ok(h.includes('Só eu vejo'), 'Japão é privada');
  assert.ok(h.includes('Amigos veem'), 'Itália é visível');
  assert.ok(h.indexOf('Japão') >= 0 && h.indexOf('Itália') >= 0);
});

test('sem proxima viagem, o vazio oferece Nova viagem e Com amigos', () => {
  cenario();
  A.avaliar("S.trips=S.trips.filter(t=>t.id==='pt')");
  A.renderProximas();
  const h = A.avaliar("document.getElementById('pxLista').innerHTML");
  assert.ok(h.includes('Para onde é a próxima?') && h.includes('Nova viagem') && h.includes('Com amigos'));
});

test('primeiro Fui: a viagem vira viagem, a folha aparece uma vez e a aba diz "Acabou de chegar"', () => {
  cenario();
  A.avaliar("localStorage.clear&&localStorage.clear()");
  A.conferirViagensQueViraram(); // fotografa as planejadas
  A.avaliar("window.__ovs=[];const _show=showOv;showOv=function(id){window.__ovs.push(id)}");
  try {
    A.avaliar("S.trips.find(t=>t.id==='jp')._spots[0].status='been'");
    A.conferirViagensQueViraram();
    assert.strictEqual(A.avaliar('window.__ovs.join()'), 'ov-virou');
    assert.strictEqual(A.avaliar("naAbaViagens(S.trips.find(t=>t.id==='jp'))"), true);
    assert.strictEqual(A.avaliar("tripMetaText(S.trips.find(t=>t.id==='jp'))"), 'Acabou de chegar');
    // Volta pra Quero ir e marca Fui de novo: a folha não aparece outra vez.
    A.avaliar("S.trips.find(t=>t.id==='jp')._spots[0].status='want'");
    A.conferirViagensQueViraram();
    A.avaliar("S.trips.find(t=>t.id==='jp')._spots[0].status='been'");
    A.conferirViagensQueViraram();
    assert.strictEqual(A.avaliar('window.__ovs.length'), 1);
  } finally { A.avaliar('showOv=_show') }
});

test('viagem que perde o ultimo spot nao conta como "virou viagem"', () => {
  cenario();
  A.avaliar("S.trips.find(t=>t.id==='jp').proxima=false");
  A.conferirViagensQueViraram();
  A.avaliar("window.__ovs=[];const _s2=showOv;showOv=function(id){window.__ovs.push(id)}");
  try {
    A.avaliar("S.trips.find(t=>t.id==='jp')._spots=[]");
    A.conferirViagensQueViraram();
    assert.strictEqual(A.avaliar('window.__ovs.length'), 0);
  } finally { A.avaliar('showOv=_s2') }
});

test('viagem criada sozinha so com Quero ir nasce "So eu vejo"', async () => {
  cenario(`.concat([{id:'fr',name:'França',destinations:['França'],dates:'',status:'planning',privada:false,proxima:false,_spotsLoaded:true,_spots:[{id:'f1',name:'Le Bistro',city:'Paris',status:'want'}]}])`);
  A.avaliar("window.__upd=[];dbUpdate=async function(tab,id,p){window.__upd.push([tab,id,p]);return{error:null}}");
  A.avaliar("marcarViagemNova({id:'fr'})");
  await A.avaliar('fecharViagensNovas()');
  const upd = A.avaliar('JSON.stringify(window.__upd)');
  assert.ok(upd.includes('"fr",{"privada":true,"proxima":true}'), upd);
  assert.strictEqual(A.avaliar("S.trips.find(t=>t.id==='fr').privada"), true);
});

test('sem a migracao 028 (linha sem privada), nada e gravado e a tela diz Amigos veem', async () => {
  A.avaliar("S.user={id:'eu'};VIAGENS_NOVAS.clear()");
  A.avaliar(`S.trips=[{id:'x',name:'França',destinations:['França'],dates:'',status:'planning',_spotsLoaded:true,_spots:[{id:'f1',name:'Le Bistro',city:'Paris',status:'want'}]}]`);
  A.avaliar("window.__upd=[];dbUpdate=async function(tab,id,p){window.__upd.push([tab,id,p]);return{error:null}}");
  assert.strictEqual(A.avaliar('bancoTemPrivacidade()'), false);
  A.avaliar("marcarViagemNova({id:'x'})");
  await A.avaliar('fecharViagensNovas()');
  assert.strictEqual(A.avaliar('window.__upd.length'), 0);
  A.renderProximas();
  assert.ok(A.avaliar("document.getElementById('pxLista').innerHTML").includes('Amigos veem'));
});

test('Meus spots: Fui inclui Nao recomendo; agrupado por cidade, ate 8 linhas', () => {
  A.avaliar("S.user={id:'eu'};S.profile={};mlStatus='been';mlCidade='';mlCat='';ML_TUDO=false");
  const spots = [];
  for (let i = 0; i < 10; i++) spots.push(`{id:'s${i}',name:'Lugar ${i}',category:'food',city:'${i < 6 ? 'Lisboa' : 'Porto'}',status:'${i === 0 ? 'skip' : 'been'}',my_rating:4,created_at:'2026-10-0${i % 9}'}`);
  A.avaliar(`S.trips=[{id:'pt',name:'Portugal',destinations:['Portugal'],dates:'',_spotsLoaded:true,_spots:[${spots.join(',')}]}]`);
  const n = A.avaliar("mlFiltrar(allSpotsFlat(),'been','','').length");
  assert.strictEqual(n, 10, 'Não recomendo conta como Fui');
  A.avaliar('const _dp=darDadosDePerfil;darDadosDePerfil=function(){}');
  try { A.renderEstante() } finally { A.avaliar('darDadosDePerfil=_dp') }
  const ver = A.avaliar("document.getElementById('mlVerTodos').innerHTML");
  // O mesmo elemento falso serve todos os ids: o último innerHTML é o do "Ver os N".
  assert.ok(ver.includes('Ver os 10'), ver);
});

test('bairro do endereco brasileiro', () => {
  assert.strictEqual(A.bairroDoEndereco('R. Joaquim Antunes, 210 - Jardins, São Paulo - SP, 05415-010, Brasil'), 'Jardins');
  assert.strictEqual(A.bairroDoEndereco('Rua das Flores 103, 1200-194 Lisboa, Portugal'), '');
});
