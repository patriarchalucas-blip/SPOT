const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

const A = app();

// Entrar com a Apple é nativo (a folha do iPhone, pela casca). O botão só pode
// aparecer quando a casca tem o módulo E o Supabase tem o provedor ligado —
// fora disso ele estaria na tela e não funcionaria.

function cenario({ casca, cascaTemApple, apple }) {
  const classes = [];
  A.avaliar('document.body.classList.add=function(c){window.__classes.push(c)}');
  A.avaliar('window.__classes=[]');
  A.avaliar(casca ? 'window.ReactNativeWebView={postMessage:function(){}}' : 'window.ReactNativeWebView=undefined');
  A.avaliar('window.cascaTemApple=' + (cascaTemApple ? 'true' : 'false'));
  const volta = trocar(A, 'fetch', async () => ({ ok: true, json: async () => ({ external: { apple } }) }));
  return { classes, volta };
}

async function mostra(opcoes) {
  const c = cenario(opcoes);
  try { await A.temApple() } finally { c.volta() }
  return A.avaliar("window.__classes.includes('tem-apple')");
}

test('aparece no app de iPhone com o provedor ligado', async () => {
  assert.strictEqual(await mostra({ casca: true, cascaTemApple: true, apple: true }), true);
});

test('nao aparece com o provedor desligado', async () => {
  assert.strictEqual(await mostra({ casca: true, cascaTemApple: true, apple: false }), false);
});

test('nao aparece no build antigo, que nao tem o modulo', async () => {
  assert.strictEqual(await mostra({ casca: true, cascaTemApple: false, apple: true }), false);
});

test('nao aparece no navegador: la o login da Apple nao existe', async () => {
  assert.strictEqual(await mostra({ casca: false, cascaTemApple: false, apple: true }), false);
});

test('cancelar a folha da Apple nao mostra erro', async () => {
  let erro = null;
  const volta = trocar(A, 'showAuthErr', (m) => { erro = m });
  try { await A.voltouDoLoginApple({ erro: 'cancelado' }) } finally { volta() }
  assert.strictEqual(erro, null);
});
