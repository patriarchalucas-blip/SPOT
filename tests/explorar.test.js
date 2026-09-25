const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

const A = app();

// Explorar (25/09): selo de quem já salvou, ⊕ que salva direto como Quero
// ir, e rolagem contínua sem repetir lugar.

function lugar(nome, extra) {
  return Object.assign({ displayName: { text: nome }, formattedAddress: 'Rua 1, São Paulo - SP, Brasil',
    addressComponents: [{ types: ['country'], shortText: 'BR', longText: 'Brasil' }],
    rating: 4.5, userRatingCount: 300 }, extra || {});
}

test('o selo diz Fui ou Quero ir pro lugar que ja esta na lista', () => {
  A.avaliar(`S.trips=[{id:'t',name:'Brasil',destinations:['Brasil'],_spots:[
    {id:'a',name:'Mocotó',city:'São Paulo',status:'been'},
    {id:'b',name:'Maní',city:'São Paulo',status:'want'}]}]`);
  assert.strictEqual(A.statusNaMinhaLista({ name: 'Mocotó', city: 'São Paulo' }), 'Fui');
  assert.strictEqual(A.statusNaMinhaLista({ name: 'Maní', city: 'São Paulo' }), 'Quero ir');
  assert.strictEqual(A.statusNaMinhaLista({ name: 'Tuju', city: 'São Paulo' }), '');
  // Mesmo nome em outra cidade não é o mesmo lugar.
  assert.strictEqual(A.statusNaMinhaLista({ name: 'Mocotó', city: 'Lisboa' }), '');
});

test('o + salva direto como Quero ir, sem folha', async () => {
  A.avaliar("S.user={id:'eu',email:'l@x.z'};S.profile={};S.trips=[]");
  A.avaliar("EXPLORE.cat='food';EXPLORE.items=[{name:'Tuju',address:'Rua 1, São Paulo - SP, Brasil',city:'São Paulo',country:'Brasil',rating:'4.8'}]");
  const gravados = [];
  const voltas = [
    trocar(A, 'dbInsert', async (t, obj) => { gravados.push([t, obj]); return { error: null, data: Object.assign({ id: 'x' + gravados.length }, obj) } }),
    trocar(A, 'toast', () => {}), trocar(A, 'loadDashboard', () => {}), trocar(A, 'renderExploreResults', () => {}),
    trocar(A, 'resolverCidadeDoSpot', async (p) => p.city || ''),
    trocar(A, 'abrirEscolhaDeViagem', () => { throw new Error('abriu folha') }),
  ];
  try {
    await A.queroIrDoExplorar(0);
    const spot = gravados.find(([t]) => t === 'spots');
    assert.ok(spot, 'nao gravou o spot');
    assert.strictEqual(spot[1].status, 'want');
    assert.strictEqual(spot[1].category, 'food');
    assert.strictEqual(A.statusNaMinhaLista({ name: 'Tuju', city: 'São Paulo' }), 'Quero ir');
  } finally { voltas.forEach((v) => v()) }
});

test('a proxima pagina entra no fim, sem repetir lugar, e para quando o Google para', async () => {
  let pedidos = 0;
  const volta = trocar(A, 'googlePlaces', async (op, o) => {
    pedidos++;
    const b = JSON.parse(o.body);
    const places = b.pageToken ? [lugar('Mocotó'), lugar('Tuju')] : [lugar('Mocotó'), lugar('Maní')];
    return { ok: true, json: async () => ({ places, nextPageToken: b.pageToken ? undefined : 'tok' }) };
  });
  const v2 = trocar(A, 'renderExploreResults', () => {});
  try {
    A.avaliar("EXPLORE.termo='restaurantes em São Paulo';EXPLORE.fim=false;EXPLORE.token=''");
    const p1 = await A.paginaDoExplorar('');
    A.avaliar('EXPLORE.items=' + JSON.stringify(p1));
    A.avaliar("EXPLORE_ESTADO='ok'");
    await A.maisDoExplorar();
    const nomes = A.avaliar('EXPLORE.items.map(p=>p.name).join(",")');
    assert.strictEqual(nomes.split(',').filter((n) => n === 'Mocotó').length, 1, 'repetiu lugar');
    assert.ok(nomes.endsWith('Tuju'), 'a pagina nova nao foi pro fim: ' + nomes);
    assert.strictEqual(A.avaliar('EXPLORE.fim'), true);
    await A.maisDoExplorar();
    assert.strictEqual(pedidos, 2, 'pediu pagina depois do fim');
  } finally { volta(); v2() }
});

test('a foto abre a pagina do lugar em previa, e tocar em Fui salva e abre o spot de verdade', async () => {
  A.avaliar("S.user={id:'eu',email:'l@x.z'};S.profile={};S.trips=[]");
  A.avaliar("EXPLORE.cat='food';EXPLORE.items=[{name:'Mocotó',address:'Av. X, 1 - Vila Medeiros, São Paulo - SP, Brasil',city:'São Paulo',country:'Brasil',rating:'4.6',phone:'(11) 2951-3056',website_url:'',maps_url:''}]");
  const gravados = []; let abriu = null;
  const voltas = [
    trocar(A, 'dbInsert', async (t, obj) => { gravados.push([t, obj]); return { error: null, data: Object.assign({ id: 'sp' + gravados.length }, obj) } }),
    trocar(A, 'toast', () => {}), trocar(A, 'loadDashboard', () => {}), trocar(A, 'renderExploreResults', () => {}),
    trocar(A, 'resolverCidadeDoSpot', async (p) => p.city || ''),
    trocar(A, 'goTo', () => {}),
  ];
  try {
    A.abrirPreviaDoExplorar(0);
    assert.strictEqual(A.avaliar('S.curPlace._previa'), true);
    assert.strictEqual(gravados.length, 0, 'abrir a previa nao pode gravar nada');
    const v = trocar(A, 'openPlace', (id) => { abriu = id });
    try { await A.setStatus('been') } finally { v() }
    const spot = gravados.find(([t]) => t === 'spots');
    assert.ok(spot, 'nao salvou');
    assert.strictEqual(spot[1].status, 'been');
    assert.ok(abriu && abriu.startsWith('sp'), 'nao abriu o spot salvo');
  } finally { voltas.forEach((x) => x()) }
});
