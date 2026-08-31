const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

const A = app();

// Adicionar um lugar de amigo perguntava "Em qual viagem?". Era pedir uma
// decisao que o app ja tem como tomar: o lugar vem com cidade e endereco, e a
// viagem certa e a que cobre aquele destino. Quando nao existe nenhuma, o
// certo tambem nao e perguntar — e criar, que e o que a pessoa faria em
// seguida de qualquer jeito.

function cenario(trips) {
  A.avaliar("S.user={id:'eu',email:'l@x.z'}");
  A.avaliar('S.trips=' + JSON.stringify(trips || []));
  A.avaliar(`FRIEND.spot={id:'s1',name:'Rubaiyat',category:'food',city:'São Paulo',
    status:'been',my_rating:9,address:'Al. Santos 86, São Paulo - SP, 01419-002, Brasil'}`);
  A.avaliar('S.explorePick=null;S.explorePickCat=null');
  const eventos = { perguntou: false, notaAberta: null, viagensCriadas: [] };
  trocar(A, 'abrirEscolhaDeViagem', () => { eventos.perguntou = true });
  trocar(A, 'jumpToNoteSheet', (trip) => { eventos.notaAberta = trip });
  trocar(A, 'dbInsert', async (tabela, obj) => {
    eventos.viagensCriadas.push(obj);
    return { data: Object.assign({ id: 'nova' }, obj), error: null };
  });
  return eventos;
}

test('usa a viagem que cobre a cidade, sem perguntar', async () => {
  const e = cenario([
    { id: 't1', name: 'Japão', destinations: ['Japão'], initial_city: 'Tóquio', dates: '', _spots: [] },
    { id: 't2', name: 'Brasil', destinations: ['Brasil'], initial_city: 'São Paulo', dates: '', _spots: [] }
  ]);
  await A.adicionarSpotAbertoDoAmigo();
  assert.strictEqual(e.perguntou, false, 'perguntou a viagem tendo como saber');
  assert.ok(e.notaAberta, 'nao abriu a ficha de nota');
  assert.strictEqual(e.notaAberta.id, 't2', 'escolheu a viagem errada');
  assert.strictEqual(e.viagensCriadas.length, 0, 'criou viagem tendo uma que servia');
});

test('a cidade manda mais que o pais', async () => {
  // Duas viagens pro Brasil; a certa e a de Sao Paulo.
  const e = cenario([
    { id: 't1', name: 'Brasil', destinations: ['Brasil'], initial_city: 'Rio de Janeiro', dates: '', _spots: [] },
    { id: 't2', name: 'Brasil', destinations: ['Brasil'], initial_city: 'São Paulo', dates: '', _spots: [] }
  ]);
  await A.adicionarSpotAbertoDoAmigo();
  assert.strictEqual(e.notaAberta && e.notaAberta.id, 't2');
});

test('cai no pais quando nenhuma viagem tem a cidade', async () => {
  const e = cenario([
    { id: 't1', name: 'Brasil', destinations: ['Brasil'], initial_city: 'Salvador', dates: '', _spots: [] }
  ]);
  await A.adicionarSpotAbertoDoAmigo();
  assert.strictEqual(e.perguntou, false);
  assert.strictEqual(e.notaAberta && e.notaAberta.id, 't1');
});

test('sem viagem nenhuma, CRIA em vez de perguntar', async () => {
  const e = cenario([]);
  await A.adicionarSpotAbertoDoAmigo();
  assert.strictEqual(e.perguntou, false, 'perguntou em vez de criar');
  assert.strictEqual(e.viagensCriadas.length, 1);
  assert.strictEqual(e.viagensCriadas[0].name, 'Brasil');
  assert.strictEqual(e.viagensCriadas[0].initial_city, 'São Paulo');
  assert.ok(e.notaAberta, 'criou a viagem mas nao abriu a nota');
});

test('marcacao de pais visitado nao serve de viagem', async () => {
  // Trip com dates '__quickvisit__' e so um marcador de mapa; jogar spot ali
  // faria ela aparecer como viagem de verdade.
  const e = cenario([
    { id: 'q1', name: 'Brasil', destinations: ['Brasil'], dates: '__quickvisit__', _spots: [] }
  ]);
  await A.adicionarSpotAbertoDoAmigo();
  assert.notStrictEqual(e.notaAberta && e.notaAberta.id, 'q1',
    'usou a marcacao de pais visitado como se fosse viagem');
  assert.strictEqual(e.viagensCriadas.length, 1, 'devia ter criado uma viagem de verdade');
  assert.strictEqual(e.perguntou, false);
});

test('so pergunta quando o endereco nao diz o pais', async () => {
  const e = cenario([]);
  A.avaliar("FRIEND.spot.address='Rua Sem Pais 123'");
  await A.adicionarSpotAbertoDoAmigo();
  assert.strictEqual(e.viagensCriadas.length, 0, 'criou viagem chutando o pais');
  assert.strictEqual(e.perguntou, true, 'devia perguntar quando nao da pra saber');
});

test('o pais sai do fim do endereco e tem que existir na lista', () => {
  assert.strictEqual(A.paisDoEndereco('Al. Santos 86, São Paulo - SP, 01419-002, Brasil'), 'Brasil');
  assert.strictEqual(A.paisDoEndereco('1-1 Asakusa, Tóquio, Japão'), 'Japão');
  assert.strictEqual(A.paisDoEndereco('Rua Qualquer 12'), '');
  assert.strictEqual(A.paisDoEndereco('Rua X, Paisinho Inventado'), '');
  assert.strictEqual(A.paisDoEndereco(''), '');
});

// ── o botao + tambem parou de perguntar a viagem ───────────────────────────
// Ele perguntava "Em qual viagem?" ANTES de saber o lugar. Ordem errada: quem
// escolhe a viagem e o lugar, nao o contrario.

function cenarioFab(trips) {
  A.avaliar("S.user={id:'eu',email:'l@x.z'}");
  A.avaliar('S.trips=' + JSON.stringify(trips || []));
  A.avaliar("S.addTrip=null;S.addCat='food'");
  const e = { perguntou: false, viagensCriadas: [], notaAberta: false };
  trocar(A, 'abrirEscolhaDeViagem', () => { e.perguntou = true });
  trocar(A, 'nextOv', (a, b) => { if (b === 'ov-note') e.notaAberta = true });
  trocar(A, 'resetNoteSheet', () => {});
  trocar(A, 'closeOv', () => {});
  trocar(A, 'dbInsert', async (t, obj) => {
    e.viagensCriadas.push(obj);
    return { data: Object.assign({ id: 'nova' }, obj), error: null };
  });
  return e;
}

const LUGAR = {
  name: 'Rubaiyat', meta: 'Al. Santos 86, São Paulo - SP, Brasil', icon: '',
  city: 'São Paulo', country: 'Brasil', address: 'Al. Santos 86, São Paulo - SP, Brasil'
};

test('o + usa a viagem que cobre o lugar, sem perguntar', async () => {
  const e = cenarioFab([{ id: 't1', name: 'Brasil', destinations: ['Brasil'], initial_city: 'São Paulo', dates: '', _spots: [] }]);
  await A.pickPlace(LUGAR);
  assert.strictEqual(e.perguntou, false, 'perguntou a viagem tendo como saber');
  assert.strictEqual(A.avaliar('S.addTrip && S.addTrip.id'), 't1');
  assert.ok(e.notaAberta, 'nao chegou na ficha de nota');
});

test('o + cria a viagem quando nao existe nenhuma', async () => {
  const e = cenarioFab([]);
  await A.pickPlace(LUGAR);
  assert.strictEqual(e.perguntou, false, 'perguntou em vez de criar');
  assert.strictEqual(e.viagensCriadas.length, 1);
  assert.strictEqual(e.viagensCriadas[0].name, 'Brasil');
  assert.strictEqual(e.viagensCriadas[0].initial_city, 'São Paulo');
});

test('o + so pergunta quando nem o endereco diz o pais', async () => {
  const e = cenarioFab([]);
  await A.pickPlace({ name: 'X', meta: 'Rua Sem Pais', icon: '', city: '', country: '', address: 'Rua Sem Pais' });
  assert.strictEqual(e.viagensCriadas.length, 0, 'criou viagem chutando o pais');
  assert.strictEqual(e.perguntou, true);
});

test('dentro de uma viagem, ela continua mandando', async () => {
  // Entrar numa viagem e apertar + ja diz qual e: o lugar nao pode sobrepor.
  const e = cenarioFab([{ id: 't1', name: 'Japão', destinations: ['Japão'], initial_city: 'Tóquio', dates: '', _spots: [] }]);
  A.avaliar("S.addTrip={id:'t9',name:'Japão',destinations:['Japão'],initial_city:'Tóquio'}");
  trocar(A, 'showCountryMismatch', () => { e.avisouPais = true });
  await A.pickPlace(LUGAR);
  assert.strictEqual(e.viagensCriadas.length, 0, 'criou viagem tendo uma escolhida');
  assert.ok(e.avisouPais, 'nao avisou que o lugar e de outro pais');
});
