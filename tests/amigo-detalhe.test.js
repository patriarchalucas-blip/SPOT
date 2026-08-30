const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

const A = app();

// Os quatro numeros no topo do perfil de um amigo eram so numeros. O caso que
// motivou: os paises que ele apenas MARCOU como visitados, sem nenhum spot,
// entram na contagem mas nao apareciam em lugar nenhum da tela — a lista de
// viagens filtra as marcacoes de proposito.

function cenario() {
  A.avaliar("FRIEND.profile={id:'bru',display_name:'Bruno Camargo'}");
  A.avaliar(`FRIEND.trips=[
    {id:'t1',name:'Brasil',destinations:['Brasil'],dates:'jun',status:'done',_spotsLoaded:true,_spots:[
      {id:'a',trip_id:'t1',name:'Rubaiyat',category:'food',city:'São Paulo',status:'been',my_rating:9},
      {id:'b',trip_id:'t1',name:'Astor',category:'food',city:'São Paulo',status:'want'},
      {id:'c',trip_id:'t1',name:'Casa da Praia',category:'hotel',city:'Santos',status:'been',my_rating:7}]},
    {id:'q1',name:'Japão',destinations:['Japão'],dates:'__quickvisit__',status:'done',_spotsLoaded:true,_spots:[]},
    {id:'q2',name:'Peru',destinations:['Peru'],dates:'__quickvisit__',status:'done',_spotsLoaded:true,_spots:[]}
  ]`);
  const pintado = {};
  trocar(A, 'showOv', (id) => { pintado.sheet = id });
  return pintado;
}

const textoDaSheet = () => A.avaliar("document.getElementById('daCorpo').innerHTML");
const tituloDaSheet = () => A.avaliar("document.getElementById('daTitulo').textContent");

test('paises inclui os que o amigo so marcou, sem nenhum spot', () => {
  // Japao e Peru so existem como marcacao. Sao justamente os que a lista de
  // viagens esconde — e a razao deste recurso existir.
  cenario();
  assert.doesNotThrow(() => A.abrirDetalheAmigo('countries'));
  const h = textoDaSheet();
  assert.ok(h.includes('Brasil'), 'faltou Brasil');
  assert.ok(h.includes('Japão'), 'faltou Japão, que ele so marcou');
  assert.ok(h.includes('Peru'), 'faltou Peru, que ele so marcou');
  assert.ok(h.includes('só marcou que foi'), 'nao distingue quem tem spots de quem so marcou');
  assert.ok(h.includes('3 lugares'), 'nao mostra quantos lugares tem no Brasil');
});

test('o titulo usa o primeiro nome do amigo', () => {
  cenario();
  A.abrirDetalheAmigo('countries');
  assert.strictEqual(tituloDaSheet(), 'Países de Bruno');
});

test('viagens lista so as viagens de verdade', () => {
  // Aqui as marcacoes NAO entram: elas nao sao viagens.
  cenario();
  A.abrirDetalheAmigo('trips');
  const h = textoDaSheet();
  assert.ok(h.includes('Brasil'));
  assert.ok(!h.includes('Japão'), 'marcacao de pais visitado apareceu como viagem');
});

test('cidades conta os lugares de cada uma', () => {
  cenario();
  A.abrirDetalheAmigo('cities');
  const h = textoDaSheet();
  assert.ok(h.includes('São Paulo') && h.includes('2 lugares'));
  assert.ok(h.includes('Santos') && h.includes('1 lugar'));
});

test('lugares vem agrupado por cidade, com quem ele foi antes de quem quer ir', () => {
  cenario();
  A.abrirDetalheAmigo('spots');
  const h = textoDaSheet();
  assert.ok(h.indexOf('Rubaiyat') < h.indexOf('Astor'), 'quem ele foi tem que vir antes');
  assert.ok(h.includes('quer ir'), 'nao marca o que ele so quer ir');
  assert.ok(h.includes('9.0'), 'nao mostra a nota dele');
});

test('amigo sem nada nao quebra nenhuma das quatro', () => {
  A.avaliar("FRIEND.profile={id:'x',display_name:'Ana'};FRIEND.trips=[]");
  trocar(A, 'showOv', () => {});
  for (const modo of ['trips', 'spots', 'cities', 'countries']) {
    assert.doesNotThrow(() => A.abrirDetalheAmigo(modo), modo + ' estoura sem dados');
    assert.ok(textoDaSheet().includes('Ana'), modo + ' nao explica que esta vazio');
  }
});

// ── o contador de "Recente" ────────────────────────────────────────────────
// Ele mostrava o TOTAL do feed, pra sempre. Numero que nao muda depois de lido
// nao avisa nada: vira enfeite e a pessoa para de olhar.

test('conta so o que chegou depois da ultima visita', () => {
  const itens = [
    { created_at: '2026-08-30T10:00:00Z' },
    { created_at: '2026-08-29T10:00:00Z' },
    { created_at: '2026-08-28T10:00:00Z' }
  ];
  A.avaliar("localStorage.removeItem('spot_feed_visto_em')");
  assert.strictEqual(A.novidadesNoFeed(itens), 3, 'primeira vez: tudo e novidade');

  A.avaliar("localStorage.setItem('spot_feed_visto_em','2026-08-29T12:00:00Z')");
  assert.strictEqual(A.novidadesNoFeed(itens), 1, 'so o de 30/08 e novo');

  A.marcarFeedComoVisto();
  assert.strictEqual(A.novidadesNoFeed(itens), 0, 'depois de ver, some');
});

test('abrir a aba Recente ja marca como visto', () => {
  A.avaliar("localStorage.removeItem('spot_feed_visto_em')");
  assert.strictEqual(A.feedVistoEm(), '');
  trocar(A, 'renderFriendsTab', () => {});
  A.switchFriendsTab('recente', null);
  assert.ok(A.feedVistoEm(), 'abrir a aba nao marcou nada');
});

test('abrir OUTRA aba nao marca o feed como visto', () => {
  // Ver a lista de amigos nao e ver as novidades.
  A.avaliar("localStorage.removeItem('spot_feed_visto_em')");
  trocar(A, 'renderFriendsTab', () => {});
  A.switchFriendsTab('amigos', null);
  assert.strictEqual(A.feedVistoEm(), '', 'marcou como visto sem a pessoa ter visto');
});

test('item sem data e lista vazia nao viram novidade', () => {
  A.marcarFeedComoVisto();
  assert.strictEqual(A.novidadesNoFeed([]), 0);
  assert.strictEqual(A.novidadesNoFeed([{}]), 0);
  assert.strictEqual(A.novidadesNoFeed(null), 0);
});
