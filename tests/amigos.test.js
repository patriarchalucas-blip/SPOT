const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// ESTE ARQUIVO EXISTE POR CAUSA DE UM ERRO ESPECIFICO.
//
// Eu reverti a mudanca do Google Places e levei junto a funcao fotoUrl, sem
// notar que o render da busca de amigos chamava ela. Em producao virou
// ReferenceError dentro de um .catch, e o que aparecia na tela era
// "Nao consegui consultar seus amigos agora" — uma mensagem de erro de REDE
// pra um defeito de codigo.
//
// Os testes que eu tinha nao pegavam isso: todos exercitavam funcoes puras,
// uma de cada vez. Funcao que existe isolada mas chama outra que sumiu passa
// batido. A unica forma de pegar e EXECUTAR o render.

// Formato que buscarAmigosNoLugar devolve: um item por AMIGO, com os spots
// dele dentro. (A primeira versao agrupava por lugar; virou uma parede de
// nomes de restaurante sem dono claro.)
function amigoDeExemplo(comFoto) {
  return {
    estado: 'ok',
    amigos: 2,
    grupos: [
      {
        uid: 'bruno', perfil: { id: 'bruno', display_name: 'Bruno Camargo' },
        foram: 2, querem: 1,
        spots: [
          { id: 's1', user_id: 'bruno', name: 'Rubaiyat', category: 'food', status: 'been', my_rating: 9,
            photo_url: comFoto ? 'https://places.googleapis.com/v1/places/X/photos/Y/media?maxWidthPx=400&key=K' : '' },
          { id: 's2', user_id: 'bruno', name: 'Bar Astor', category: 'food', status: 'been', my_rating: 8 },
          { id: 's3', user_id: 'bruno', name: 'Hotel Fasano', category: 'hotel', status: 'want' }
        ]
      },
      {
        uid: 'ana', perfil: { id: 'ana', display_name: 'Ana Lima' },
        foram: 0, querem: 1,
        spots: [{ id: 's4', user_id: 'ana', name: 'Rubaiyat', category: 'food', status: 'want' }]
      }
    ]
  };
}

test('o render dos amigos executa sem estourar', () => {
  // Chamada de verdade. Se qualquer funcao que ele usa nao existir mais,
  // isto lanca — que e exatamente o defeito que chegou em producao.
  assert.doesNotThrow(() => A.renderAmigosNoLugar(amigoDeExemplo(true), 'São Paulo'));
  assert.doesNotThrow(() => A.renderAmigosNoLugar(amigoDeExemplo(false), 'São Paulo'));
});

test('cada estado vazio tambem executa', () => {
  for (const estado of ['carregando', 'sem_amigos', 'nada_aqui', 'vazio']) {
    assert.doesNotThrow(
      () => A.renderAmigosNoLugar({ estado, grupos: [], amigos: 2 }, 'São Paulo'),
      'estado "' + estado + '" estoura no render');
  }
});

test('o render aguenta amigo sem perfil e spot sem nota', () => {
  // Perfil vem null quando a linha de profiles nao veio; nota vem vazia
  // quando a pessoa marcou como visitado sem avaliar.
  assert.doesNotThrow(() => A.renderAmigosNoLugar({
    estado: 'ok', amigos: 1,
    grupos: [{ uid: 'u', perfil: null, foram: 1, querem: 0,
      spots: [{ id: 's', user_id: 'u', name: 'X', category: 'hotel', status: 'been' }] }]
  }, 'Lugar'));
});

test('quem ja foi aparece antes de quem so quer ir', () => {
  const r = amigoDeExemplo(false);
  A.renderAmigosNoLugar(r, 'São Paulo');
  // Bruno tem visita, Ana so tem vontade — a ordem vem de buscarAmigosNoLugar
  // e o render precisa respeitar o array como recebeu.
  assert.strictEqual(r.grupos[0].uid, 'bruno');
  assert.ok(r.grupos[0].foram > 0);
  assert.strictEqual(r.grupos[1].foram, 0);
});

test('abrir o amigo mostra os lugares dele, nao o perfil inteiro', () => {
  // Voce pesquisou um lugar: o que interessa sao os spots dali, nao a viagem
  // inteira do amigo. A tela recebe a lista JA pronta.
  const r = amigoDeExemplo(false);
  A.avaliar("S.user={id:'eu'}");
  A.AMIGOS_LUGAR = r.grupos;
  A.avaliar("AMIGOS_LUGAR=" + JSON.stringify(r.grupos) + ";LUGAR_PESQUISADO='São Paulo'");
  assert.doesNotThrow(() => A.abrirAmigoNoLugar(0));
  const pronta = A.avaliar('FRIEND.listaPronta');
  assert.ok(Array.isArray(pronta) && pronta.length === 3, 'a lista pronta deveria ter os 3 spots do Bruno');
  assert.strictEqual(A.avaliar('FRIEND.city'), 'São Paulo');
  assert.strictEqual(A.avaliar('voltarDaCidadeDoAmigo'), 'explore', 'o voltar tem que devolver pro Explorar');
});

test('a tela da cidade nao refiltra a lista que ja veio pronta', () => {
  // Se a busca foi por PAIS ("Japao"), os spots tem cidade "Toquio". Refiltrar
  // por nome de cidade jogaria tudo fora e a tela abriria vazia.
  A.avaliar("FRIEND.listaPronta=[{id:'a',name:'X',category:'food',status:'been',city:'Tóquio'}];FRIEND.city='Japão'");
  const base = A.spotsDaCidadeDoAmigo();
  assert.strictEqual(base.length, 1, 'a lista pronta foi refiltrada e sumiu');
  A.avaliar('FRIEND.listaPronta=null');
});

test('toda funcao que a busca de amigos usa existe', () => {
  // Rede grossa contra o mesmo erro em outra forma: reverter uma mudanca e
  // levar junto uma funcao que outra parte chama.
  const usadas = ['fotoUrl', 'cityOf', 'friendName', 'initials', 'fmtRating',
    'thumbFallback', 'catIcon', 'hydrateIcons', 'esc', 'escUrl', 'dbGet',
    'canonizarCidade', 'termoSeguro', 'idsDosAmigos', 'aviso',
    'buscarAmigosNoLugar', 'renderAmigosNoLugar', 'abrirAmigoNoLugar',
    'adicionarSpotAbertoDoAmigo', 'spotsDaCidadeDoAmigo', 'voltarDaCidade',
    'voltarDaFichaDoAmigo', 'abrirSpotDoAmigo', 'updateFriendCityHeader',
    'renderFriendCityBody', 'destGradient', 'fetchCityPhoto', 'cssUrl'];
  const faltando = usadas.filter(n => typeof A[n] !== 'function');
  assert.strictEqual(faltando.length, 0, 'sumiram: ' + faltando.join(', '));
});

test('a busca sem amigos nao vai ao banco atras de spots', async () => {
  // Sem amigo aceito nao ha o que procurar, e a resposta precisa dizer isso —
  // nao devolver vazio, que a tela mostrava como se fosse erro.
  const original = A.dbGet;
  let tabelasConsultadas = [];
  A.avaliar("S.user={id:'eu'}");
  A.dbGet = async (tabela) => { tabelasConsultadas.push(tabela); return [] };
  try {
    const r = await A.buscarAmigosNoLugar('São Paulo', false);
    assert.strictEqual(r.estado, 'sem_amigos');
    assert.deepStrictEqual([...new Set(tabelasConsultadas)], ['follows']);
  } finally { A.dbGet = original }
});

test('a busca traz "quero ir" junto com "ja fui"', async () => {
  // Voce pediu que aparecesse tudo. O feed de amigos continua so com "ja fui"
  // de proposito — la e mural; aqui voce esta planejando.
  const original = A.dbGet;
  const consultas = [];
  A.avaliar("S.user={id:'eu'}");
  A.dbGet = async (tabela, q) => {
    consultas.push(tabela + '?' + q);
    if (tabela === 'follows') return [{ follower_id: 'eu', following_id: 'bruno', status: 'accepted' }];
    if (tabela === 'profiles') return [{ id: 'bruno', display_name: 'Bruno' }];
    if (tabela === 'spots') return [
      { id: 'a', user_id: 'bruno', name: 'Rubaiyat', category: 'food', status: 'been', my_rating: 9, city: 'São Paulo' },
      { id: 'b', user_id: 'bruno', name: 'Astor', category: 'food', status: 'want', city: 'São Paulo' }
    ];
    return [];
  };
  try {
    const r = await A.buscarAmigosNoLugar('São Paulo', false);
    const spotsQ = consultas.filter(c => c.startsWith('spots?'));
    assert.ok(spotsQ.some(c => c.includes('status=in.(been,want)')),
      'a consulta ainda filtra so por "been": ' + spotsQ[0]);
    assert.strictEqual(r.estado, 'ok');
    assert.strictEqual(r.grupos.length, 1);
    assert.strictEqual(r.grupos[0].foram, 1);
    assert.strictEqual(r.grupos[0].querem, 1);
    assert.strictEqual(r.grupos[0].spots[0].status, 'been', 'quem foi tem que vir primeiro');
  } finally { A.dbGet = original }
});

test('a sheet de viagem mostra so os passos que faltam', () => {
  // Ela tinha quatro pontinhos sempre. Quando o lugar ja vem resolvido
  // (Explorar, check-in, amigo) so faltam dois — viagem e nota. Passo que nao
  // existe da a impressao de que o app vai perguntar de novo o que ja sabe.
  A.avaliar("S.trips=[{id:'t1',name:'Brasil',destinations:['Brasil'],initial_city:'Sao Paulo',_spots:[]}]");
  A.avaliar("S.explorePick={name:'Rubaiyat',city:'São Paulo'};S.explorePickCat='food'");
  assert.doesNotThrow(() => A.abrirEscolhaDeViagem());
  A.avaliar('S.explorePick=null;S.explorePickCat=null');
  assert.doesNotThrow(() => A.abrirEscolhaDeViagem());
});

test('a viagem do lugar pesquisado vai pro topo, mesmo com acento diferente', () => {
  // "Sao Paulo" gravado na viagem e "São Paulo" vindo do spot precisam se
  // encontrar, senao a ordenacao nao serve pra nada em portugues.
  assert.ok(A.mesmoLugar('Sao Paulo', 'São Paulo'));
  assert.ok(A.mesmoLugar('TÓQUIO', 'toquio'));
  assert.ok(!A.mesmoLugar('Split', 'Sao Paulo'));
  assert.ok(!A.mesmoLugar('', ''), 'vazio nao pode casar com vazio');

  A.avaliar("S.trips=[{id:'a',name:'Japão',destinations:['Japão'],initial_city:'Tóquio',_spots:[]},"
    + "{id:'b',name:'Brasil',destinations:['Brasil'],initial_city:'Sao Paulo',_spots:[]}]");
  A.populateTripOpts('São Paulo');
  const marcadas = A.avaliar('S.trips.filter(t=>t._sugerida).map(t=>t.name)');
  assert.deepStrictEqual([...marcadas], ['Brasil']);
});
