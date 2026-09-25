const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

const A = app();

// "Onde você mora" (25/09): lugar da sua cidade não vira viagem. Vai pra uma
// linha escondida (dates='__casa__') que fica fora da lista de viagens.

function cenario(perfil, trips) {
  A.avaliar("S.user={id:'eu',email:'l@x.z'}");
  A.avaliar('S.profile=' + JSON.stringify(perfil));
  A.avaliar('S.trips=' + JSON.stringify(trips || []));
  const criadas = [];
  const volta = trocar(A, 'dbInsert', async (t, obj) => {
    criadas.push(obj);
    return { error: null, data: Object.assign({ id: 'nova' + criadas.length }, obj) };
  });
  return { criadas, volta };
}

test('spot da cidade onde mora vai pra casa, nao cria a viagem do pais', async () => {
  const c = cenario({ home_city: 'São Paulo', home_country: 'Brasil' });
  try {
    const v = await A.garantirViagem('São Paulo', 'Brasil');
    assert.strictEqual(v.dates, '__casa__');
    assert.strictEqual(c.criadas.length, 1);
    assert.strictEqual(c.criadas[0].name, 'São Paulo');
    // A segunda vez reaproveita a mesma casa.
    const v2 = await A.garantirViagem('São Paulo', 'Brasil');
    assert.strictEqual(v2.id, v.id);
    assert.strictEqual(c.criadas.length, 1);
  } finally { c.volta() }
});

test('outra cidade do mesmo pais continua virando viagem', async () => {
  const c = cenario({ home_city: 'São Paulo', home_country: 'Brasil' });
  try {
    const v = await A.garantirViagem('Rio de Janeiro', 'Brasil');
    assert.notStrictEqual(v.dates, '__casa__');
    assert.strictEqual(v.name, 'Brasil');
  } finally { c.volta() }
});

test('sem cidade de casa, nada muda', async () => {
  const c = cenario({});
  try {
    const v = await A.garantirViagem('São Paulo', 'Brasil');
    assert.notStrictEqual(v.dates, '__casa__');
  } finally { c.volta() }
});

test('a casa nao aparece como viagem, e o resumo conta os spots da cidade', () => {
  const c = cenario({ home_city: 'São Paulo', home_country: 'Brasil' }, [
    { id: 'c1', name: 'São Paulo', destinations: ['Brasil'], dates: '__casa__',
      _spots: [{ id: 's1', name: 'Mocotó', city: 'São Paulo', created_at: '2026-09-20' }] },
    // Spot da cidade numa viagem antiga: conta na seção também.
    { id: 't1', name: 'Brasil', destinations: ['Brasil'], dates: '',
      _spots: [{ id: 's2', name: 'A Casa do Porco', city: 'São Paulo', created_at: '2026-09-25' },
               { id: 's3', name: 'Aprazível', city: 'Rio de Janeiro', created_at: '2026-09-21' }] }
  ]);
  try {
    assert.strictEqual(A.avaliar("S.trips.filter(t=>!isNonTrip(t)).map(t=>t.id).join(',')"), 't1');
    const r = A.resumoDeCasa();
    assert.strictEqual(r.meta, '2 spots · A Casa do Porco');
  } finally { c.volta() }
});

test('mudar de cidade transforma a casa antiga em viagem comum, sem perder spots', async () => {
  const c = cenario({ home_city: 'São Paulo', home_country: 'Brasil' }, [
    { id: 'c1', name: 'São Paulo', destinations: ['Brasil'], dates: '__casa__', _spots: [{ id: 's1', name: 'Mocotó', city: 'São Paulo' }] }
  ]);
  const mudou = [];
  const voltas = [
    trocar(A, 'dbUpdate', async (t, id, obj) => { mudou.push([t, id, obj]); return { error: null } }),
    trocar(A, 'loadProfile', () => {}), trocar(A, 'loadDashboard', () => {}),
    trocar(A, 'toast', () => {}), trocar(A, 'closeOv', () => {}), trocar(A, 'showOv', () => {}),
  ];
  try {
    A.abrirCidadeDeCasa();
    A.avaliar("ONB.cidade={nome:'Lisboa',pais:'Portugal'}");
    await A.onbSalvarCidade();
    assert.strictEqual(A.avaliar("S.trips.find(t=>t.id==='c1').dates"), '');
    assert.ok(mudou.some(([t, id, o]) => t === 'trips' && id === 'c1' && o.dates === ''));
    assert.strictEqual(A.avaliar('S.profile.home_city'), 'Lisboa');
    assert.strictEqual(A.avaliar("S.trips.find(t=>t.id==='c1')._spots.length"), 1);
  } finally { voltas.forEach((v) => v()); c.volta() }
});
