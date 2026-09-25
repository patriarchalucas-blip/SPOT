const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

const A = app();

// Primeiro acesso (desenho de 25/09). As regras que importam, e que já foram
// decididas com o Lucas: a cidade é obrigatória, o resto tem saída, e cada
// tela grava quando a pessoa segue — não no fim.

function cenario() {
  A.avaliar("S.user={id:'eu',email:'l@x.z'};S.profile={};S.trips=[]");
  const gravado = { perfil: null, viagens: [], spots: [] };
  const voltas = [
    trocar(A, 'dbUpdate', async (t, id, obj) => { gravado.perfil = obj; return { error: null } }),
    trocar(A, 'dbInsertMany', async (t, linhas) => {
      gravado.viagens.push(...linhas);
      return { error: null, data: linhas.map((l, i) => Object.assign({ id: 'q' + i }, l)) };
    }),
    trocar(A, 'dbInsert', async (t, obj) => {
      (t === 'spots' ? gravado.spots : gravado.viagens).push(obj);
      return { error: null, data: Object.assign({ id: t + gravado.spots.length }, obj) };
    }),
    trocar(A, 'toast', () => {}),
    trocar(A, 'onbPintarMapa', async () => {}),
  ];
  return { gravado, fim: () => voltas.forEach((v) => v()) };
}

test('a cidade nao tem pular: o pular so existe dos paises em diante', () => {
  const c = cenario();
  try {
    A.avaliar('ONB.passo=1');
    A.onbPular();
    assert.strictEqual(A.avaliar('ONB.passo'), 1, 'pulou a cidade, que e obrigatoria');
    assert.ok(!A.onbTopo().includes('Pular'));
    A.avaliar('ONB.passo=2');
    assert.ok(A.onbTopo().includes('Pular'));
  } finally { c.fim() }
});

test('sem cidade escolhida, seguir nao grava nada', async () => {
  const c = cenario();
  try {
    A.avaliar('ONB.passo=1;ONB.cidade=null');
    await A.onbSalvarCidade();
    assert.strictEqual(c.gravado.perfil, null);
    assert.strictEqual(A.avaliar('ONB.passo'), 1);
  } finally { c.fim() }
});

test('a cidade grava cidade E pais, e o pais ja vem marcado na tela seguinte', async () => {
  const c = cenario();
  try {
    A.avaliar("ONB.passo=1;ONB.paises=new Set();ONB.cidade={nome:'São Paulo',pais:'Brasil'}");
    await A.onbSalvarCidade();
    // JSON: o objeto nasce dentro do app (outro contexto), e o deepStrictEqual
    // compara o protótipo também.
    assert.strictEqual(JSON.stringify(c.gravado.perfil), JSON.stringify({ home_city: 'São Paulo', home_country: 'Brasil' }));
    assert.strictEqual(A.avaliar('ONB.passo'), 2);
    assert.ok(A.avaliar("ONB.paises.has('Brasil')"));
  } finally { c.fim() }
});

test('os paises viram as linhas escondidas de "ja visitei", num POST so', async () => {
  const c = cenario();
  try {
    A.avaliar("ONB.passo=2;ONB.paises=new Set(['Brasil','Portugal'])");
    await A.onbSalvarPaises();
    assert.deepStrictEqual(c.gravado.viagens.map((v) => v.name).sort(), ['Brasil', 'Portugal']);
    assert.ok(c.gravado.viagens.every((v) => v.dates === '__quickvisit__'));
    assert.strictEqual(A.avaliar('ONB.passo'), 3);
  } finally { c.fim() }
});

test('o lugar indicado entra como Fui, com a frase como avaliacao', async () => {
  const c = cenario();
  try {
    A.avaliar(`ONB.passo=3;ONB.cat='food';ONB.nota='Vale a fila.';
      ONB.lugar={name:'A Casa do Porco',city:'São Paulo',country:'Brasil',address:'R. Araújo, 124'}`);
    await A.onbSalvarLugar();
    const s = c.gravado.spots[0];
    assert.ok(s, 'nao gravou o spot');
    assert.strictEqual(s.status, 'been');
    assert.strictEqual(s.my_review, 'Vale a fila.');
    assert.strictEqual(s.category, 'food');
    assert.strictEqual(A.avaliar('ONB.passo'), 4);
  } finally { c.fim() }
});

test('quem ja tem cidade nao ve o cadastro de novo', async () => {
  const c = cenario();
  let abriu = false;
  const v1 = trocar(A, 'fetchOwnProfile', async () => ({ home_city: 'Lisboa' }));
  const v2 = trocar(A, 'showOv', () => { abriu = true });
  try {
    await A.talvezAbrirBoasVindas();
    assert.strictEqual(abriu, false);
  } finally { v1(); v2(); c.fim() }
});
