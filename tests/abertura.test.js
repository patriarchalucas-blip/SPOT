const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Abrir o app mostrava "Seu mapa está em branco" por ~2 s a cada vez, até o
// banco responder: o placar só era contado com a resposta dele (25/09).

function ultimaDeViagens() {
  const m = A.avaliar("window.__msgs.map(m=>JSON.parse(m)).filter(m=>m.tipo==='viagens')");
  return m[m.length - 1];
}

test('antes de haver dado da conta, a tela nativa espera em vez de dizer "mapa em branco"', () => {
  A.avaliar("S.user={id:'eu',email:'l@x.z'};S.trips=[];DADOS_DA_CONTA=false");
  A.avaliar('window.__msgs=[];window.ReactNativeWebView={postMessage:function(m){window.__msgs.push(m)}}');
  try {
    A.darDadosDeViagens();
    assert.strictEqual(ultimaDeViagens().pronto, false);
  } finally { A.avaliar('window.ReactNativeWebView=undefined') }
});

test('com o que esta guardado no aparelho, o placar ja sai contado', () => {
  A.avaliar("S.user={id:'eu',email:'l@x.z'};S.trips=[];S.profile=null;DADOS_DA_CONTA=false");
  A.avaliar(`localStorage.setItem(chaveDosDados(),JSON.stringify({quando:1,profile:null,trips:[
    {id:'t1',name:'Portugal',destinations:['Portugal'],dates:'',_spots:[{id:'s1',name:'Ramiro',city:'Lisboa'}]},
    {id:'q1',name:'Japão',destinations:['Japão'],dates:'__quickvisit__',_spots:[]}]}))`);
  A.avaliar('window.__msgs=[];window.ReactNativeWebView={postMessage:function(m){window.__msgs.push(m)}}');
  try {
    assert.strictEqual(A.usarDadosLocais(), true);
    const d = ultimaDeViagens().dados;
    assert.ok(d, 'nao mandou os dados');
    assert.strictEqual(d.paises, 2);
    assert.strictEqual(d.placar, true);
    assert.strictEqual(d.emBranco, null, 'mostrou mapa em branco pra quem tem pais');
  } finally { A.avaliar('window.ReactNativeWebView=undefined;localStorage.clear&&localStorage.clear()') }
});
