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

function grupoDeExemplo(comFoto) {
  return {
    estado: 'ok',
    amigos: 2,
    grupos: [{
      nome: 'Ichiran Shinjuku', city: 'Tóquio', category: 'food',
      photo_url: comFoto ? 'https://places.googleapis.com/v1/places/X/photos/Y/media?maxWidthPx=400&key=K' : '',
      amigos: [
        { spot: { id: 's1', user_id: 'bruno', name: 'Ichiran', my_rating: 9, category: 'food' }, perfil: { id: 'bruno', display_name: 'Bruno Camargo' } },
        { spot: { id: 's2', user_id: 'ana', name: 'ICHIRAN', my_rating: 8, category: 'food' }, perfil: { id: 'ana', display_name: 'Ana Lima' } }
      ]
    }]
  };
}

test('o render dos amigos executa sem estourar', () => {
  // Chamada de verdade. Se qualquer funcao que ele usa nao existir mais,
  // isto lanca — que e exatamente o defeito que chegou em producao.
  assert.doesNotThrow(() => A.renderAmigosNoLugar(grupoDeExemplo(true), 'Tóquio'));
  assert.doesNotThrow(() => A.renderAmigosNoLugar(grupoDeExemplo(false), 'Tóquio'));
});

test('cada estado vazio tambem executa', () => {
  for (const estado of ['carregando', 'sem_amigos', 'nada_aqui', 'vazio']) {
    assert.doesNotThrow(
      () => A.renderAmigosNoLugar({ estado, grupos: [], amigos: 2 }, 'Tóquio'),
      'estado "' + estado + '" estoura no render');
  }
});

test('o render aguenta amigo sem perfil e spot sem nota', () => {
  // Perfil vem null quando a linha de profiles nao veio; nota vem vazia
  // quando a pessoa marcou como visitado sem avaliar.
  assert.doesNotThrow(() => A.renderAmigosNoLugar({
    estado: 'ok', amigos: 1,
    grupos: [{ nome: 'X', city: '', category: 'hotel', photo_url: '',
      amigos: [{ spot: { id: 's', user_id: 'u', name: 'X' }, perfil: null }] }]
  }, 'Lugar'));
});

test('toda funcao que a busca de amigos usa existe', () => {
  // Rede grossa contra o mesmo erro em outra forma: reverter uma mudanca e
  // levar junto uma funcao que outra parte chama.
  const usadas = ['fotoUrl', 'cityOf', 'friendName', 'fmtRating', 'thumbFallback',
    'catIcon', 'hydrateIcons', 'esc', 'escUrl', 'dbGet', 'canonizarCidade',
    'termoSeguro', 'chaveDeLugar', 'notaMedia', 'idsDosAmigos', 'aviso',
    'buscarAmigosNoLugar', 'renderAmigosNoLugar', 'abrirSpotAmigoDoExplorar',
    'voltarDaFichaDoAmigo', 'abrirSpotDoAmigo'];
  const faltando = usadas.filter(n => typeof A[n] !== 'function');
  assert.strictEqual(faltando.length, 0, 'sumiram: ' + faltando.join(', '));
});

test('a busca sem amigos nao vai ao banco atras de spots', async () => {
  // Sem amigo aceito nao ha o que procurar, e a resposta precisa dizer isso —
  // nao devolver vazio, que a tela mostrava como se fosse erro.
  const original = A.dbGet;
  let tabelasConsultadas = [];
  // S e const no script, entao nao vira propriedade do contexto: chega nele
  // por uma expressao avaliada no mesmo escopo.
  A.avaliar("S.user={id:'eu'}");
  A.dbGet = async (tabela) => { tabelasConsultadas.push(tabela); return [] };
  try {
    const r = await A.buscarAmigosNoLugar('Tóquio', false);
    assert.strictEqual(r.estado, 'sem_amigos');
    assert.deepStrictEqual([...new Set(tabelasConsultadas)], ['follows']);
  } finally { A.dbGet = original }
});
