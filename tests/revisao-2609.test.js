// Provas dos defeitos achados na revisão de 26/09/2026. Cada teste reproduzia
// o defeito antes da correção; agora guarda que ele não volte.
const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');
const A = app();
const espera = (ms) => new Promise(r => setTimeout(r, ms));

function base(perfil, trips) {
  A.avaliar("S.user={id:'eu',email:'l@x.z'}");
  A.avaliar('S.profile=' + JSON.stringify(perfil || {}));
  A.avaliar('S.trips=' + JSON.stringify(trips || []));
}

test('corrigido 26/09 — dois + seguidos no Explorar num pais sem viagem criam DUAS viagens', async () => {
  base({}, []);
  const inserts = [];
  let n = 0;
  const voltas = [
    trocar(A, 'dbInsert', async (t, obj) => {
      inserts.push(t);
      await espera(30); // latencia de rede
      return { error: null, data: Object.assign({ id: t + (++n) }, obj) };
    }),
    trocar(A, 'resolverCidadeDoSpot', async (p) => p.city),
    trocar(A, 'toast', () => {}), trocar(A, 'loadDashboard', () => {}),
  ];
  try {
    A.avaliar("EXPLORE.cat='food';EXPLORE.items=[" +
      "{name:'Sushi A',address:'x, Tóquio, Japão',city:'Tóquio',country:'Japão',rating:'4.8'}," +
      "{name:'Sushi B',address:'y, Tóquio, Japão',city:'Tóquio',country:'Japão',rating:'4.7'}]");
    await Promise.all([A.queroIrDoExplorar(0), A.queroIrDoExplorar(1)]);
    const viagens = A.avaliar("S.trips.filter(t=>t.name==='Japão').length");
    console.log('inserts:', inserts, 'viagens Japão em S.trips:', viagens);
    assert.strictEqual(viagens, 1, 'esperava 1 viagem Japão, veio ' + viagens);
  } finally { voltas.forEach(v => v()) }
});

test('corrigido 26/09 — dois + seguidos na cidade de casa criam DUAS linhas __casa__', async () => {
  base({ home_city: 'São Paulo', home_country: 'Brasil' }, []);
  let n = 0;
  const voltas = [
    trocar(A, 'dbInsert', async (t, obj) => { await espera(30); return { error: null, data: Object.assign({ id: t + (++n) }, obj) } }),
    trocar(A, 'resolverCidadeDoSpot', async (p) => p.city),
    trocar(A, 'toast', () => {}), trocar(A, 'loadDashboard', () => {}),
  ];
  try {
    A.avaliar("EXPLORE.cat='food';EXPLORE.items=[" +
      "{name:'Mocotó',address:'x, São Paulo - SP, Brasil',city:'São Paulo',country:'Brasil',rating:'4.8'}," +
      "{name:'Tuju',address:'y, São Paulo - SP, Brasil',city:'São Paulo',country:'Brasil',rating:'4.7'}]");
    await Promise.all([A.queroIrDoExplorar(0), A.queroIrDoExplorar(1)]);
    const casas = A.avaliar("S.trips.filter(t=>t.dates==='__casa__').length");
    console.log('linhas __casa__:', casas);
    assert.strictEqual(casas, 1);
  } finally { voltas.forEach(v => v()) }
});

test('corrigido 26/09 — primeiro acesso, salvar lugar -> voltar do passo 4 -> Continuar de novo duplica o spot', async () => {
  base({ home_city: 'São Paulo', home_country: 'Brasil' }, []);
  const spots = [];
  let n = 0;
  const voltas = [
    trocar(A, 'dbInsert', async (t, obj) => { if (t === 'spots') spots.push(obj.name); return { error: null, data: Object.assign({ id: t + (++n) }, obj) } }),
    trocar(A, 'resolverCidadeDoSpot', async (p) => p.city),
    trocar(A, 'toast', () => {}),
  ];
  try {
    A.avaliar("ONB.passo=3;ONB.ocupado=false;ONB.cat='food';ONB.nota='';ONB.lugar={name:'Mocotó',address:'x, São Paulo - SP, Brasil',city:'São Paulo',country:'Brasil'}");
    await A.onbSalvarLugar();          // vai pro passo 4
    assert.strictEqual(A.avaliar('ONB.passo'), 4);
    A.onbIr(3);                        // botão voltar do passo 4 (n<5)
    await A.onbSalvarLugar();          // "Continuar" de novo com o mesmo lugar
    console.log('inserts em spots:', spots);
    assert.strictEqual(spots.length, 1, 'mesmo spot gravado ' + spots.length + 'x');
  } finally { voltas.forEach(v => v()) }
});

test('corrigido 26/09 — resposta atrasada da pagina 2 da busca antiga sobrescreve token/fim da busca nova', async () => {
  base({}, []);
  let chamadas = 0;
  const voltas = [
    trocar(A, 'googlePlaces', async (op, opts) => {
      const corpo = JSON.parse(opts.body);
      chamadas++;
      if (corpo.pageToken === 'JAP2') {           // página 2 da busca de japonesa: lenta, última página
        await espera(40);
        return { json: async () => ({ places: [{ displayName: { text: 'Old' }, rating: 4, userRatingCount: 10, types: [] }] }) };
      }
      // página 1 da busca nova (pizza): rápida, tem mais páginas
      return { json: async () => ({ places: [{ displayName: { text: 'Pizza 1' }, rating: 4.5, userRatingCount: 100, types: [] }], nextPageToken: 'PIZ2' }) };
    }),
    trocar(A, 'buscarAmigosNoLugar', async () => ({ grupos: [] })),
    trocar(A, 'renderAmigosNoLugar', () => {}),
    trocar(A, 'toast', () => {}),
  ];
  try {
    A.document.getElementById('exploreCitySearch').value = 'Lisboa';
    A.avaliar("EXPLORE.city='Lisboa';EXPLORE.cat='food';EXPLORE.cozinha='japonesa';EXPLORE.termo=termoDoExplorar('Lisboa');EXPLORE.items=[{name:'J1',city:'Lisboa'}];EXPLORE.token='JAP2';EXPLORE.fim=false;EXPLORE.carregandoMais=false;EXPLORE_ESTADO='ok'");
    const mais = A.maisDoExplorar();      // rolou até o fim: pede a página 2 de japonesa
    A.setExploreCozinha('pizza');         // troca de chip antes de a página 2 voltar
    await mais; await espera(80);
    const st = A.avaliar('({termo:EXPLORE.termo,token:EXPLORE.token,fim:EXPLORE.fim,itens:EXPLORE.items.map(p=>p.name)})');
    console.log('estado final:', JSON.stringify(st));
    assert.strictEqual(st.token, 'PIZ2', 'token da busca nova foi sobrescrito');
    assert.strictEqual(st.fim, false, 'busca nova marcada como fim por resposta velha');
  } finally { voltas.forEach(v => v()); A.avaliar("EXPLORE.city='';EXPLORE.cozinha=''") }
});

test('corrigido 26/09 — cidade de casa casa so pelo nome, ignora o pais', async () => {
  base({ home_city: 'Córdoba', home_country: 'Argentina' }, []);
  let n = 0;
  const v = trocar(A, 'dbInsert', async (t, obj) => ({ error: null, data: Object.assign({ id: 'n' + (++n) }, obj) }));
  try {
    const viagem = await A.garantirViagem('Córdoba', 'Espanha');
    console.log('spot de Córdoba/Espanha foi pra:', viagem.name, viagem.dates, viagem.destinations);
    assert.notStrictEqual(viagem.dates, '__casa__');
  } finally { v() }
});

test('corrigido 26/09 — desfazerCasa muda o estado local antes (e apesar) do banco recusar', async () => {
  base({ home_city: 'São Paulo', home_country: 'Brasil' }, [
    { id: 'c1', name: 'São Paulo', destinations: ['Brasil'], dates: '__casa__', _spots: [{ id: 's1', name: 'Mocotó', city: 'São Paulo' }] }]);
  const v = trocar(A, 'dbUpdate', async () => ({ error: true }));
  try {
    const casa = A.avaliar('S.trips[0]');
    await A.desfazerCasa(casa);
    console.log('local:', casa.dates === '' ? 'viagem comum' : casa.dates, '| banco: continua __casa__ (update falhou, ninguém avisou)');
    assert.strictEqual(casa.dates, '__casa__');
  } finally { v() }
});
