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
    A.guardarMarcadorDoExplorar(p1.token);
    A.avaliar('EXPLORE.items=' + JSON.stringify(p1.lugares));
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

// Tipo de comida (25/09): "quero comer um japonês hoje".
test('o tipo de comida muda a frase da busca, e so vale em Comer', () => {
  A.avaliar("EXPLORE.cat='food';EXPLORE.cozinha=''");
  assert.strictEqual(A.termoDoExplorar('São Paulo'), 'restaurantes em São Paulo');
  A.avaliar("EXPLORE.cozinha='japonesa'");
  assert.strictEqual(A.termoDoExplorar('São Paulo'), 'restaurantes de comida japonesa em São Paulo');
  // Em Ficar a cozinha escolhida não contamina a busca de hotel.
  A.avaliar("EXPLORE.cat='hotel'");
  assert.strictEqual(A.termoDoExplorar('Split'), 'hotéis em Split');
  A.avaliar("EXPLORE.cat='food';EXPLORE.cozinha=''");
});

test('trocar o tipo refaz a busca da mesma cidade; id desconhecido vira Todas', () => {
  let buscou = 0;
  const v = trocar(A, 'runExplore', () => { buscou++ });
  try {
    A.avaliar("EXPLORE.cat='food';EXPLORE.cozinha='';EXPLORE.city='Lisboa'");
    A.setExploreCozinha('pizza');
    assert.strictEqual(A.avaliar('EXPLORE.cozinha'), 'pizza');
    assert.strictEqual(buscou, 1);
    // Tocar no que já está escolhido não gasta outra busca paga.
    A.setExploreCozinha('pizza');
    assert.strictEqual(buscou, 1);
    A.setExploreCozinha('inventada');
    assert.strictEqual(A.avaliar('EXPLORE.cozinha'), '');
  } finally { v(); A.avaliar("EXPLORE.city='';EXPLORE.cozinha=''") }
});

test('a tela nativa recebe os tipos so em Comer', () => {
  let msg = null;
  const v = trocar(A, 'falarComACasca', (m) => { msg = m });
  try {
    A.avaliar("EXPLORE.cat='food';EXPLORE.cozinha='japonesa';EXPLORE.items=[]");
    A.darDadosDeExplorar();
    assert.ok(msg.dados.cozinhas.length > 5);
    assert.strictEqual(msg.dados.cozinhas[0].rotulo, 'Todas');
    assert.strictEqual(msg.dados.cozinha, 'japonesa');
    A.avaliar("EXPLORE.cat='hotel'");
    A.darDadosDeExplorar();
    assert.strictEqual(msg.dados.cozinhas.length, 0);
  } finally { v(); A.avaliar("EXPLORE.cat='food';EXPLORE.cozinha=''") }
});

// Busca por rua / bairro / cidade (26/09): "Rua Fradique Coutinho", "Quinta Avenida".
test('rua vira um retangulo de algumas quadras em volta; bairro usa o do Google', () => {
  const r = A.areaDaBusca({ latitude: -23.56, longitude: -46.69 }, null, 'rua').rectangle;
  const alt = r.high.latitude - r.low.latitude;
  assert.ok(alt > 0.01 && alt < 0.02, 'altura da area da rua: ' + alt);
  const vp = { low: { latitude: -23.60, longitude: -46.72 }, high: { latitude: -23.54, longitude: -46.66 } };
  const b = A.areaDaBusca({ latitude: -23.57, longitude: -46.69 }, vp, 'bairro').rectangle;
  assert.strictEqual(b.low.latitude, -23.60);
  assert.strictEqual(b.high.longitude, -46.66);
});

test('buscar uma rua procura DENTRO da area dela, em todas as paginas', async () => {
  const corpos = [];
  const volta = trocar(A, 'googlePlaces', async (op, o) => {
    const b = JSON.parse(o.body); corpos.push(b);
    if (b.maxResultCount === 5) {
      return { ok: true, json: async () => ({ places: [{ displayName: { text: 'Rua Fradique Coutinho' },
        location: { latitude: -23.56, longitude: -46.69 }, types: ['route'],
        addressComponents: [{ types: ['administrative_area_level_2'], longText: 'São Paulo' }, { types: ['country'], longText: 'Brasil', shortText: 'BR' }] }] }) };
    }
    return { ok: true, json: async () => ({ places: [lugar('Tuju')], nextPageToken: b.pageToken ? undefined : 'p2' }) };
  });
  const vs = [volta, trocar(A, 'renderExploreResults', () => {}), trocar(A, 'renderAmigosNoLugar', () => {}),
    trocar(A, 'buscarAmigosNoLugar', async () => ({ estado: 'vazio', grupos: [] }))];
  try {
    A.avaliar("EXPLORE.cat='food';EXPLORE.cozinha='';document.getElementById('exploreCitySearch').value='Rua Fradique Coutinho'");
    await A.runExplore();
    const busca = corpos.find((c) => c.pageSize);
    assert.ok(busca.locationRestriction && busca.locationRestriction.rectangle, 'sem area');
    assert.ok(/Perto de Rua Fradique Coutinho/.test(A.avaliar('EXPLORE.rotulo')));
    await A.maisDoExplorar();
    const pag2 = corpos.find((c) => c.pageToken);
    assert.ok(pag2 && pag2.locationRestriction, 'pagina 2 sem a area');
  } finally { vs.forEach((v) => v()); A.avaliar("EXPLORE.rotulo='';EXPLORE.area=null;EXPLORE.city=''") }
});

// Aba Amigos (26/09): spots dos amigos DENTRO da área, 1º quantos foram, 2º nota.
test('aba Amigos: o lugar onde mais amigos foram vem primeiro, depois a nota', async () => {
  const consultas = [];
  const spots = [
    { id: 's1', user_id: 'a', name: 'Tuju', city: 'São Paulo', status: 'been', my_rating: 5, lat: -23.561, lng: -46.690, category: 'food' },
    { id: 's2', user_id: 'b', name: 'Mocotó', city: 'São Paulo', status: 'been', my_rating: 4, lat: -23.562, lng: -46.691, category: 'food' },
    { id: 's3', user_id: 'c', name: 'Mocotó', city: 'São Paulo', status: 'been', my_rating: 3.5, lat: -23.5621, lng: -46.6911, category: 'food' },
    { id: 's4', user_id: 'd', name: 'Mocotó', city: 'São Paulo', status: 'want', lat: -23.562, lng: -46.691, category: 'food' },
  ];
  const vs = [
    trocar(A, 'idsDosAmigos', async () => ['a', 'b', 'c', 'd']),
    trocar(A, 'dbGet', async (t, q) => { consultas.push([t, q]); return t === 'spots' ? spots : [{ id: 'b', display_name: 'Clara Souza' }, { id: 'c', display_name: 'Rafael' }] }),
  ];
  try {
    A.avaliar("EXPLORE.cat='food'");
    const area = { rectangle: { low: { latitude: -23.57, longitude: -46.70 }, high: { latitude: -23.55, longitude: -46.68 } } };
    const r = await A.lugaresDosAmigos(area, true, 'São Paulo');
    assert.strictEqual(r.estado, 'ok');
    assert.strictEqual(r.lugares[0].capa.name, 'Mocotó', 'Mocotó (2 foram) devia vir antes do Tuju (1 foi, nota 5)');
    assert.strictEqual(r.lugares[0].foram.length, 2);
    assert.strictEqual(r.lugares[0].querem.length, 1);
    assert.ok(/2 amigos foram · Clara e Rafael/.test(A.textoDosAmigos(r.lugares[0])));
    // busca por rua filtra pela coordenada, sem cair no nome da cidade
    const q = consultas.filter((c) => c[0] === 'spots').map((c) => c[1]);
    assert.ok(q.some((x) => /lat=gte\./.test(x) && /lng=lte\./.test(x)));
    assert.ok(!q.some((x) => /city=ilike/.test(x)), 'rua nao pode buscar pela cidade');
  } finally { vs.forEach((v) => v()) }
});

test('aba Amigos em cidade: acha pelo nome da cidade e avisa quando a categoria esta vazia', async () => {
  const consultas = [];
  const vs = [
    trocar(A, 'idsDosAmigos', async () => ['a']),
    trocar(A, 'dbGet', async (t, q) => {
      consultas.push([t, q]);
      if (t === 'trips') return [];
      if (t === 'profiles') return [{ id: 'a', display_name: 'Bruno' }];
      // spot com coordenada FORA do retângulo, mas com a cidade certa
      if (/city=ilike/.test(q)) return [{ id: 'm', user_id: 'a', name: 'MASP', city: 'São Paulo', status: 'been', my_rating: 5, lat: -24.5, lng: -47.5, category: 'experience' }];
      return [];
    }),
  ];
  try {
    const area = { rectangle: { low: { latitude: -23.8, longitude: -46.8 }, high: { latitude: -23.4, longitude: -46.4 } } };
    const r = await A.lugaresDosAmigos(area, false, ['São Paulo', 'São Paulo']);
    assert.strictEqual(r.estado, 'ok');
    assert.strictEqual(r.lugares.length, 1);
    A.avaliar("EXPLORE.cat='food'");
    A.avaliar('AMIGOS_AREA=' + JSON.stringify(r));
    assert.ok(/1 experiência em Experiências/.test(A.avisoDosAmigos()), A.avisoDosAmigos());
  } finally { vs.forEach((v) => v()); A.avaliar("AMIGOS_AREA={estado:'inicial',lugares:[],amigos:0}") }
});

test('"São Paulo" com um hospital na frente: vale a cidade, nao o hospital', async () => {
  const volta = trocar(A, 'googlePlaces', async () => ({ ok: true, json: async () => ({ places: [
    { displayName: { text: 'Irmandade da Santa Casa de Misericórdia de São Paulo - Hospital Central' }, location: { latitude: -23.54, longitude: -46.65 }, types: ['hospital', 'point_of_interest', 'establishment'] },
    { displayName: { text: 'São Paulo' }, location: { latitude: -23.55, longitude: -46.63 }, types: ['locality', 'political'],
      viewport: { low: { latitude: -24.0, longitude: -46.83 }, high: { latitude: -23.35, longitude: -46.36 } } }
  ] }) }));
  try {
    const l = await A.resolverLugarDoExplorar('São Paulo');
    assert.strictEqual(l.nome, 'São Paulo');
    assert.strictEqual(l.tipo, 'area');
  } finally { volta() }
});

test('so estabelecimento com outro nome: sem area, segue pelo texto', async () => {
  const volta = trocar(A, 'googlePlaces', async () => ({ ok: true, json: async () => ({ places: [
    { displayName: { text: 'Hospital Qualquer' }, location: { latitude: 1, longitude: 1 }, types: ['hospital', 'establishment'] }] }) }));
  try { assert.strictEqual(await A.resolverLugarDoExplorar('São Paulo'), null) } finally { volta() }
});
