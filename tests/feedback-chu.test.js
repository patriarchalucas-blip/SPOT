const { test } = require('node:test');
const assert = require('node:assert');
const { app, trocar } = require('./_ajuda.js');

// Os bugs do teste da Chu (01/10/2026), cada um reproduzido do jeito que ela
// encontrou. Se algum voltar, o teste certo reprova com o número do bug.
const A = app();
const EU = 'eu', ELA = 'chu';

function bancoFalso(tabelas) {
  return async (tabela, q) => {
    const l = (tabelas[tabela] || []).slice();
    return typeof l === 'function' ? l(q) : l.filter((r) => {
      const m = String(q || '').match(/status=eq\.(\w+)/);
      if (m && r.status !== m[1]) return false;
      const f = String(q || '').match(/following_id=eq\.(\w+)/);
      if (f && r.following_id !== f[1]) return false;
      const g = String(q || '').match(/follower_id=eq\.(\w+)/);
      if (g && !/or=/.test(q) && r.follower_id !== g[1]) return false;
      return true;
    });
  };
}

test('bug 1: na busca, pedido que ELA me mandou vira "Aceitar" (nao "Pedido enviado")', async () => {
  A.avaliar(`S.user={id:'${EU}',email:'l@x.z'};document.getElementById('x').value='chu'`);
  const v1 = trocar(A, 'dbRpc', async (fn) => fn === 'search_profiles' ? [{ id: ELA, display_name: 'Chu', username: 'chu' }] : []);
  const v2 = trocar(A, 'dbGet', async () => [{ id: 'f1', follower_id: ELA, following_id: EU, status: 'pending' }]);
  try {
    await A.rodarBuscaPessoas('chu', 'res', 'campo');
    const html = A.avaliar("document.getElementById('res').innerHTML");
    assert.ok(html.includes('Aceitar'), 'pedido recebido tinha que oferecer Aceitar: ' + html.slice(0, 200));
    assert.ok(!/Pedido enviado/.test(html));
  } finally { v1(); v2() }
});

test('bug 3: aceito pelo link, o pedido antigo some de Enviados', async () => {
  A.avaliar(`S.user={id:'${EU}',email:'l@x.z'};S.profile={};S.trips=[];FRIENDS_DATA=null;AMIGOS_CARREGADO_EM=0`);
  const volta = trocar(A, 'dbGet', bancoFalso({
    follows: [
      { id: 'a1', follower_id: ELA, following_id: EU, status: 'accepted' },   // a amizade que o link criou
      { id: 'p1', follower_id: EU, following_id: ELA, status: 'pending' }     // o pedido antigo, que ficou
    ],
    profiles: [{ id: ELA, display_name: 'Chu' }], bloqueios: [], trips: [], spots: [], spot_comments: []
  }));
  const voltaRpc = trocar(A, 'dbRpc', async () => []);
  try {
    await A.loadFriends();
    assert.strictEqual(A.avaliar('FRIENDS_DATA.outgoing.length'), 0, 'o Cancelar continuaria aparecendo');
    assert.strictEqual(A.avaliar('FRIENDS_DATA.friendIds.length'), 1);
  } finally { volta(); voltaRpc() }
});

test('bugs 7 e 8: o mesmo lugar nao entra duas vezes; Quero ir -> Fui atualiza o que existe', async () => {
  A.avaliar(`S.user={id:'${EU}',email:'l@x.z'};S.profile={};
    S.trips=[{id:'t',name:'Alemanha',destinations:['Alemanha'],dates:'',_spots:[{id:'s1',user_id:'${EU}',name:'Alexanderplatz',city:'Berlim',status:'want',category:'experience'}],_spotsLoaded:true}]`);
  assert.ok(A.avaliar("!!meuSpotIgual('alexanderplatz','Berlim')"), 'acento/caixa nao podem separar o mesmo lugar');
  assert.strictEqual(A.statusNaMinhaLista({ name: 'Alexanderplatz', city: 'Berlim' }), 'Quero ir', 'a busca tem que mostrar que ja esta salvo');
  const inserts = [], updates = [];
  const v1 = trocar(A, 'dbInsert', async (t, r) => { inserts.push(r); return { data: Object.assign({ id: 'novo' }, r), error: null } });
  const v2 = trocar(A, 'dbUpdate', async (t, id, p) => { updates.push([id, p]); return { data: [p], error: null } });
  try {
    const r = await A.salvarSpotDireto({ name: 'Alexanderplatz', city: 'Berlim', country: 'Alemanha', address: 'Berlim, Alemanha' }, 'experience', 'been', '');
    assert.strictEqual(inserts.filter((x) => x.name === 'Alexanderplatz').length, 0, 'criou um segundo Alexanderplatz');
    assert.strictEqual(r.id, 's1');
    assert.ok(updates.some(([id, p]) => id === 's1' && p.status === 'been'), 'Fui nao substituiu o Quero ir');
  } finally { v1(); v2() }
});

test('bug 9: spot do amigo que ja e meu abre a MINHA ficha (ficha unica, 05/10)', () => {
  A.avaliar(`S.user={id:'${EU}'};S.trips=[{id:'t',name:'Brasil',destinations:['Brasil'],_spots:[{id:'m',user_id:'${EU}',name:'Boteco Belmonte',city:'Rio de Janeiro',status:'been'}]}];
    FRIEND.profile={display_name:'Lucas'};FRIEND_CITY_SPOTS=[{id:'a',user_id:'amigo',name:'Boteco Belmonte',city:'Rio de Janeiro',status:'been',my_rating:4,category:'food'}]`);
  A.avaliar("window.__aberto=[];const _op9=openPlace;openPlace=function(id,o){window.__aberto.push(id+'|'+o)}");
  try {
    A.abrirSpotDoAmigo(0);
    assert.strictEqual(A.avaliar('window.__aberto.join()'), 'm|amigo', 'oferecia salvar de novo um spot que ja era meu');
  } finally { A.avaliar('openPlace=_op9') }
});

test('ficha unica: spot do amigo que nao e meu abre a previa com Salvar como e a dica dele', () => {
  A.avaliar(`S.user={id:'${EU}'};S.trips=[];FRIEND_CITY_SPOTS=[{id:'a',user_id:'amigo',name:'Bar da Dona Onça',city:'São Paulo',status:'been',my_rating:5,category:'food',price_level:2}]`);
  const v = trocar(A, 'abrirComentarios', () => {});
  const v2 = trocar(A, 'pintarDelesNaFicha', () => {});
  try {
    A.abrirSpotDoAmigo(0);
    assert.strictEqual(A.avaliar('S.curPlace._previa'), true);
    assert.strictEqual(A.avaliar('S.curPlace._comentId'), 'a', 'a conversa e a do spot dele');
    assert.strictEqual(A.avaliar('S.curPlace.from_user_id'), 'amigo');
    assert.strictEqual(A.avaliar('S.placeOrigin'), 'amigo');
    assert.strictEqual(A.avaliar('EXPLORE.avulso.from_user_id'), 'amigo', 'salvar guarda de quem veio a dica');
  } finally { v(); v2() }
});

test('preco em quatro niveis', () => {
  assert.strictEqual(A.precoEmQuatro(3), '<span class="fi-preco"><b>$$$</b><i>$</i></span>');
  assert.strictEqual(A.precoEmQuatro(null), '');
});

test('bug 10: cidade nao vira spot', () => {
  assert.strictEqual(A.naoEhSpot({ primaryType: 'locality', types: ['locality', 'political'] }), true, 'Joinville');
  assert.strictEqual(A.naoEhSpot({ types: ['locality', 'political'] }), true, 'Bonito');
});

test('bug 11: montar a ideia de viagem (so Quero ir) nao conta como ido', () => {
  A.avaliar(`S.trips=[{id:'j',name:'Japão',destinations:['Japão'],dates:'',status:'planning',_spots:[{status:'want',city:'Tóquio',name:'X'}],_spotsLoaded:true}]`);
  assert.ok(!A.avaliar('visitedCountryNames()').includes('Japão'));
  assert.strictEqual(A.avaliar('naAbaViagens(S.trips[0])'), false, 'vai pras Proximas viagens do Perfil');
});

test('bug 4: link de app e de compartilhar nao viram @ do Instagram', () => {
  assert.strictEqual(A.ehPerfilDoInstagram('https://instagram.com/_u/botecobelmonte'), true, '_u seguido do @ vale');
  assert.strictEqual(A.ehPerfilDoInstagram('https://instagram.com/_u'), false);
  assert.strictEqual(A.ehPerfilDoInstagram('https://www.instagram.com/sharer.php?u=x'), false);
  assert.strictEqual(A.ehPerfilDoInstagram('https://instagram.com/help'), false);
  assert.strictEqual(A.ehPerfilDoInstagram('https://www.instagram.com/bar.do.ze/'), true);
});

test('bug 5: a foto de perfil e conferida no banco, nao fica na copia velha do aparelho', async () => {
  A.avaliar(`S.user={id:'${EU}'};S.profile={id:'${EU}',display_name:'Chu',avatar_url:''}`); // copia guardada: sem foto
  const v1 = trocar(A, 'dbGet', async () => [{ id: EU, display_name: 'Chu', avatar_url: 'https://kzidnilsyrvauzgelsqd.supabase.co/storage/v1/object/public/uploads/x/avatar-1.jpg' }]);
  const v2 = trocar(A, 'guardarDadosLocais', () => {});
  try {
    await A.refreshAvatars('Chu');
    assert.ok(/avatar-1\.jpg/.test(A.avaliar('S.profile.avatar_url')), 'a foto do banco nao entrou');
  } finally { v1(); v2() }
});

test('bug 5: rede caindo na conferencia nao apaga o perfil', async () => {
  A.avaliar(`S.user={id:'${EU}'};S.profile={id:'${EU}',display_name:'Chu',avatar_url:'foto-antiga'}`);
  const v1 = trocar(A, 'dbGet', async () => A.avaliar('listaComFalha()'));
  try {
    await A.refreshAvatars('Chu');
    assert.strictEqual(A.avaliar('S.profile.display_name'), 'Chu');
  } finally { v1() }
});

test('bug 6: a busca do Adicionar spot procura perto da viagem aberta', () => {
  A.avaliar(`S.addTrip={id:'t',name:'Brasil',destinations:['Brasil'],_spots:[{lat:-23.55,lng:-46.63},{lat:-23.57,lng:-46.65}]};S.curTrip=null;S.curCity=null;window.__spotAqui=null`);
  const b = A.avaliar('centroDaBusca()');
  assert.ok(b.locationBias && Math.abs(b.locationBias.circle.center.latitude + 23.56) < 0.01, 'sem area, o Google procurava no mundo todo');
});

test('bug 12: o perfil do amigo pede perfil, viagens e spots JUNTOS (nao em fila)', async () => {
  A.avaliar(`S.user={id:'${EU}'}`);
  let emVoo = 0, maxEmVoo = 0;
  const v1 = trocar(A, 'dbGet', async () => { emVoo++; maxEmVoo = Math.max(maxEmVoo, emVoo); await new Promise((r) => setTimeout(r, 20)); emVoo--; return [] });
  const v2 = trocar(A, 'renderFriendProfile', () => {});
  try {
    await A.openFriend(ELA);
    assert.ok(maxEmVoo >= 3, 'as consultas ainda saem uma depois da outra (' + maxEmVoo + ' ao mesmo tempo)');
  } finally { v1(); v2() }
});
