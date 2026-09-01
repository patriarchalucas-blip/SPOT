const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

const A = app();

// Ver o hotel que a sua tia salvou e nao poder dizer nada sobre ele deixava o
// app de mao unica: dava pra olhar a lista dos outros, nao pra conversar sobre
// ela.

function cenario(comentarios) {
  A.avaliar("S.user={id:'eu',email:'l@x.z'};S.profile={id:'eu',display_name:'Lucas'}");
  A.avaliar('COMENTARIOS={};COMENT_PERFIS={}');
  const enviados = [], apagados = [];
  trocar(A, 'dbGet', async (tabela) => {
    if (tabela === 'spot_comments') return comentarios || [];
    if (tabela === 'profiles') return [
      { id: 'tia', display_name: 'Tia Sonia' }, { id: 'eu', display_name: 'Lucas' }];
    return [];
  });
  trocar(A, 'dbInsert', async (t, obj) => {
    enviados.push(obj);
    return { data: Object.assign({ id: 'novo', created_at: new Date().toISOString() }, obj), error: null };
  });
  trocar(A, 'dbDelete', async (t, id) => { apagados.push(id); return { error: null } });
  trocar(A, 'toast', () => {});
  trocar(A, 'confirm', () => true);
  return { enviados, apagados };
}

const html = () => A.avaliar("document.getElementById('fpComentarios').innerHTML");

test('carrega e mostra os comentarios do spot', async () => {
  cenario([{ id: 'c1', spot_id: 's1', user_id: 'tia', body: 'Café da manhã excelente', created_at: '2026-08-30T10:00:00Z' }]);
  await A.abrirComentarios('s1', 'fpComentarios', 'tia');
  const h = html();
  assert.ok(h.includes('Café da manhã excelente'), 'nao mostrou o texto');
  assert.ok(h.includes('Tia Sonia'), 'nao mostrou quem escreveu');
  assert.ok(h.includes('1 comentário'), 'nao contou');
});

test('o X so aparece pra quem pode apagar', async () => {
  // Comentario da tia no spot DA TIA: eu nao posso apagar.
  cenario([{ id: 'c1', spot_id: 's1', user_id: 'tia', body: 'oi', created_at: '2026-08-30T10:00:00Z' }]);
  await A.abrirComentarios('s1', 'fpComentarios', 'tia');
  assert.ok(!html().includes('coment-x'), 'deixei apagar comentario alheio em spot alheio');

  // O MESMO comentario, mas no MEU spot: posso tirar do meu registro.
  A.avaliar('COMENTARIOS={};COMENT_PERFIS={}');
  await A.abrirComentarios('s1', 'fpComentarios', 'eu');
  assert.ok(html().includes('coment-x'), 'dono do spot nao consegue tirar comentario indesejado');
});

test('meu proprio comentario eu sempre posso apagar', async () => {
  cenario([{ id: 'c1', spot_id: 's1', user_id: 'eu', body: 'meu', created_at: '2026-08-30T10:00:00Z' }]);
  await A.abrirComentarios('s1', 'fpComentarios', 'tia');
  assert.ok(html().includes('coment-x'));
});

test('enviar grava e aparece na hora', async () => {
  const { enviados } = cenario([]);
  await A.abrirComentarios('s1', 'fpComentarios', 'tia');
  A.avaliar("document.getElementById('campo-fpComentarios').value='Fui e amei'");
  await A.enviarComentario('s1', 'fpComentarios', 'tia');
  assert.strictEqual(enviados.length, 1);
  assert.strictEqual(enviados[0].body, 'Fui e amei');
  assert.strictEqual(enviados[0].spot_id, 's1');
  assert.strictEqual(enviados[0].user_id, 'eu', 'gravou em nome de outra pessoa');
  assert.ok(html().includes('Fui e amei'), 'gravou mas nao apareceu');
});

test('comentario vazio nao vai pro banco', async () => {
  const { enviados } = cenario([]);
  await A.abrirComentarios('s1', 'fpComentarios', 'tia');
  A.avaliar("document.getElementById('campo-fpComentarios').value='   '");
  await A.enviarComentario('s1', 'fpComentarios', 'tia');
  assert.strictEqual(enviados.length, 0);
});

test('se o envio falhar, o texto volta pro campo', async () => {
  // Sumir com o que a pessoa escreveu e a pior forma de falhar.
  cenario([]);
  await A.abrirComentarios('s1', 'fpComentarios', 'tia');
  trocar(A, 'dbInsert', async () => ({ data: null, error: { message: 'falhou' } }));
  A.avaliar("document.getElementById('campo-fpComentarios').value='texto que custou a escrever'");
  await A.enviarComentario('s1', 'fpComentarios', 'tia');
  assert.strictEqual(A.avaliar("document.getElementById('campo-fpComentarios').value"),
    'texto que custou a escrever', 'perdeu o que a pessoa escreveu');
});

test('sem a tabela criada, a secao some em vez de mostrar erro', async () => {
  // A migracao 012 pode nao ter rodado ainda. O resto da ficha continua
  // inteiro; quem nao rodou o SQL nao ve nada quebrado.
  cenario([]);
  trocar(A, 'dbGet', async () => { throw new Error('relation "spot_comments" does not exist') });
  await A.abrirComentarios('s1', 'fpComentarios', 'tia');
  assert.strictEqual(html(), '');
});

test('apagar tira da lista', async () => {
  const { apagados } = cenario([{ id: 'c1', spot_id: 's1', user_id: 'eu', body: 'some', created_at: '2026-08-30T10:00:00Z' }]);
  await A.abrirComentarios('s1', 'fpComentarios', 'eu');
  await A.apagarComentario('c1', 's1', 'fpComentarios', 'eu');
  assert.deepStrictEqual([...apagados], ['c1']);
  assert.ok(!html().includes('some'));
});

test('o texto do comentario e escapado antes de virar HTML', () => {
  // Comentario e texto de outra pessoa dentro da SUA tela — o caminho mais
  // direto pra injetar script no app se ninguem escapar.
  A.avaliar("COMENTARIOS={'s1':[{id:'c1',spot_id:'s1',user_id:'tia',body:'<img src=x onerror=alert(1)>',created_at:'2026-08-30T10:00:00Z'}]};COMENT_PERFIS={tia:{id:'tia',display_name:'Tia'}}");
  A.renderComentarios('s1', 'fpComentarios', 'tia');
  const h = html();
  assert.ok(!h.includes('<img src=x'), 'HTML de comentario entrou cru na tela');
  assert.ok(h.includes('&lt;img'), 'nao escapou');
});
