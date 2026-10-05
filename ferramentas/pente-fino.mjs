// Pente-fino (30/09): percorre as telas principais com banco, Google e IA
// FALSOS e junta todo erro de JavaScript. Rodar ANTES de publicar:
//   1) servidor local na porta 8935 servindo a pasta do repo;
//   2) node ferramentas/pente-fino.mjs  → tem que terminar com ERROS (0).
// Prints de cada passo em %TEMP%/pente-*.png.
import { createRequire } from 'module';
const require = createRequire('C:/Users/lucas.patriarcha_sol/Downloads/Spot-20260923T193028Z-1-001/Spot/ferramentas/capturas-loja/');
const puppeteer = require('puppeteer-core');
const OUT = process.env.TEMP + '/pente-';

const EU = '00000000-0000-0000-0000-0000000000e1', ANA = '00000000-0000-0000-0000-0000000000a1', RAFA = '00000000-0000-0000-0000-0000000000b1';
const DB = {
  profiles: [{ id: EU, display_name: 'Lucas Patriarcha', username: 'lucas', home_city: 'São Paulo', home_country: 'Brasil' },
    { id: ANA, display_name: 'Ana Ribeiro', username: 'ana' }, { id: RAFA, display_name: 'Rafa Mendes', username: 'rafa' }],
  follows: [{ id: 'f1', follower_id: EU, following_id: ANA, status: 'accepted' }, { id: 'f2', follower_id: RAFA, following_id: EU, status: 'accepted' }],
  trips: [
    { id: 't1', user_id: EU, name: 'Portugal', destinations: ['Portugal'], dates: '', status: 'planning', initial_city: 'Lisboa', created_at: '2026-09-01' },
    // Próxima viagem (05/10): só Quero ir, privada, montada com a dica da Ana.
    { id: 'tj', user_id: EU, name: 'Japão', destinations: ['Japão'], dates: '', status: 'planning', initial_city: 'Tóquio', privada: true, proxima: true, created_at: '2026-10-01' },
    { id: 't2', user_id: EU, name: 'São Paulo', destinations: ['Brasil'], dates: '__casa__', status: 'planning', initial_city: 'São Paulo', created_at: '2026-09-02' },
    { id: 'ta', user_id: ANA, name: 'portugal', destinations: ['portugal'], dates: '', status: 'planning', created_at: '2026-08-01' },
    { id: 'tr', user_id: RAFA, name: 'Portugal', destinations: ['Portugal'], dates: '', status: 'planning', created_at: '2026-08-01' },
    { id: 'tac', user_id: ANA, name: 'São Paulo', destinations: ['São Paulo'], dates: '__casa__', status: 'planning', created_at: '2026-08-01' }],
  spots: [
    { id: 's1', user_id: EU, trip_id: 't1', name: 'Taberna da Rua das Flores', category: 'food', city: 'Lisboa', status: 'been', my_rating: 4.5, my_review: 'Petiscos', created_at: '2026-09-01' },
    { id: 's2', user_id: EU, trip_id: 't1', name: 'Majestic Café', category: 'food', city: 'Porto', status: 'want', created_at: '2026-09-01' },
    { id: 'j1', user_id: EU, trip_id: 'tj', name: 'Sushi Saito', category: 'food', city: 'Tóquio', status: 'want', from_user_id: ANA, created_at: '2026-10-02' },
    { id: 'j2', user_id: EU, trip_id: 'tj', name: 'Fushimi Inari', category: 'experience', city: 'Kyoto', status: 'want', created_at: '2026-10-02' },
    { id: 'a3', user_id: ANA, trip_id: 'ta', name: 'A Cevicheria', category: 'food', city: 'Lisboa', status: 'been', my_rating: 4.5, my_review: 'Pisco sour no balcão.', price_level: 2, rating_google: '4.6', created_at: '2026-08-02' },
    { id: 'a4', user_id: ANA, trip_id: 'ta', name: 'Livraria Lello', category: 'experience', city: 'Porto', status: 'been', my_rating: 4, my_review: 'Chega antes das 10h.', created_at: '2026-08-04' },
    { id: 'r3', user_id: RAFA, trip_id: 'tr', name: 'A Cevicheria', category: 'food', city: 'Lisboa', status: 'want', created_at: '2026-08-03' },
    { id: 'aj', user_id: ANA, trip_id: 'ta', name: 'Sushi Saito', category: 'food', city: 'Tóquio', status: 'been', my_rating: 5, created_at: '2026-08-01' },
    // Seus melhores (Perfil v5): notas em São Paulo, com empate e tipos.
    { id: 'm4', user_id: EU, trip_id: 't2', name: 'Maní', category: 'food', city: 'São Paulo', status: 'been', my_rating: 5, my_review: 'Mil-folhas de mandioquinha', tipo: 'brazilian_restaurant', created_at: '2026-09-20' },
    { id: 'm5', user_id: EU, trip_id: 't2', name: 'Bráz Pizzaria', category: 'food', city: 'São Paulo', status: 'been', my_rating: 4.5, my_review: 'A de abobrinha', tipo: 'pizza_restaurant', created_at: '2026-09-18' },
    { id: 'm6', user_id: EU, trip_id: 't2', name: 'Shin-Zushi', category: 'food', city: 'São Paulo', status: 'been', my_rating: 5, tipo: 'japanese_restaurant', created_at: '2026-09-15' },
    { id: 'm7', user_id: EU, trip_id: 't2', name: 'Bar Astor', category: 'food', city: 'São Paulo', status: 'been', my_rating: 4, tipo: 'bar', created_at: '2026-09-10' },
    { id: 'm8', user_id: EU, trip_id: 't2', name: 'Pizzaria Camelo', category: 'food', city: 'São Paulo', status: 'been', my_rating: 4, tipo: 'pizza_restaurant', created_at: '2026-09-09' },
    { id: 'm9', user_id: EU, trip_id: 't2', name: 'Bar sem nota', category: 'food', city: 'São Paulo', status: 'been', tipo: 'bar', created_at: '2026-09-08' },
    { id: 'm10', user_id: EU, trip_id: 't1', name: 'Sushi Lisboa', category: 'food', city: 'Lisboa', status: 'been', my_rating: 4, tipo: 'japanese_restaurant', created_at: '2026-09-07' },
    { id: 's3', user_id: EU, trip_id: 't2', name: 'Mocotó', category: 'food', city: 'São Paulo', status: 'been', my_rating: 5, created_at: '2026-09-01' },
    { id: 'a1', user_id: ANA, trip_id: 'ta', name: 'Cervejaria Ramiro', category: 'food', city: 'Lisboa', status: 'been', my_rating: 5, my_review: 'Camarão', created_at: '2026-08-01' },
    { id: 'r1', user_id: RAFA, trip_id: 'tr', name: 'Taberna da Rua das Flores', category: 'food', city: 'Lisboa', status: 'been', my_rating: 4, created_at: '2026-08-01' },
    { id: 'a2', user_id: ANA, trip_id: 'tac', name: 'Bar da Dona Onça', category: 'food', city: 'São Paulo', address: 'Av. Ipiranga, 200 - República, São Paulo - SP, 01046-010, Brasil', status: 'been', my_rating: 5, created_at: '2026-08-01' }]
};
DB.spot_comments = [{ id: 'c1', spot_id: 'a4', user_id: RAFA, body: 'Reserva ou chega cedo?', created_at: '2026-10-01' }, { id: 'c2', spot_id: 'a4', user_id: ANA, body: 'Balcão sem reserva, às 19h.', created_at: '2026-10-02' }];
function filtra(tab, qs) {
  let l = (DB[tab] || []).slice();
  for (const [k, v] of new URLSearchParams(qs)) {
    if (['select', 'order', 'limit', 'offset', 'or'].includes(k)) continue;
    const m = String(v).match(/^(eq|in|cs)\.(.*)$/); if (!m) continue;
    if (m[1] === 'eq') l = l.filter(r => String(r[k]) === m[2]);
    if (m[1] === 'in') { const ids = m[2].replace(/[()"]/g, '').split(','); l = l.filter(r => ids.includes(String(r[k]))) }
    if (m[1] === 'cs') { const x = m[2].replace(/[{}"]/g, ''); l = l.filter(r => (r[k] || []).includes(x)) }
  }
  if (tab === 'follows') l = DB.follows;
  return l;
}
const gPlace = (n, c) => ({ id: 'g' + n, displayName: { text: n }, formattedAddress: 'Rua 1, ' + c + ', Portugal', types: ['restaurant'], primaryType: 'restaurant',
  addressComponents: [{ types: ['locality'], longText: c, shortText: c }, { types: ['country'], longText: 'Portugal', shortText: 'PT' }], location: { latitude: 38.7, longitude: -9.1 },
  // 3 fotos por lugar: o carrossel da ficha (05/10) precisa delas pra montar.
  photos: [1, 2, 3].map(k => ({ name: 'places/g' + n.replace(/W/g, '') + '/photos/p' + k, authorAttributions: [{ displayName: 'Autor ' + k }] })) });

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const pg = await b.newPage(); await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const erros = [];
pg.on('pageerror', e => erros.push('[' + passo + '] ' + e.message));
pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push('[' + passo + '] console: ' + m.text().slice(0, 200)) });
let passo = 'abrir';
await pg.setRequestInterception(true);
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
pg.on('request', r => {
  const u = r.url();
  if (r.method()==='OPTIONS') return r.respond({status:204,headers:CORS});
  const resp0=r.respond.bind(r); r.respond=(o)=>resp0(Object.assign({},o,{headers:Object.assign({},CORS,o.headers||{})}));
  const rest = u.match(/supabase\.co\/rest\/v1\/([a-z_]+)\??(.*)$/);
  if (rest) {
    if (r.method() === 'POST' && rest[1] === 'spots') { const body = JSON.parse(r.postData() || '{}'); const row = Object.assign({ id: 'n' + Math.random().toString(16).slice(2, 8), created_at: new Date().toISOString() }, body); DB.spots.push(row); return r.respond({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) }) }
    if (r.method() === 'POST' && rest[1] === 'trips') { const body = JSON.parse(r.postData() || '{}'); const row = Object.assign({ id: 'nt' + Math.random().toString(16).slice(2, 8) }, body); DB.trips.push(row); return r.respond({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) }) }
    if (r.method() === 'POST' && rest[1] === 'rpc') return r.respond({ status: 200, contentType: 'application/json', body: '[]' });
    return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(filtra(rest[1], rest[2])) });
  }
  if (/supabase\.co\/(auth|storage)/.test(u)) return r.respond({ status: 200, contentType: 'application/json', body: '{}' });
  if (u.includes('/api/places')) { let q = ''; try { q = JSON.parse(r.postData() || '{}').textQuery || '' } catch (e) {} return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ places: q ? (/xyzzy/i.test(q)?[gPlace('Farmácia Central','Porto')]:[gPlace(q.split(',')[0], /Porto/.test(q)?'Porto':'Lisboa')]) : [] }) }) }
  if (u.includes('/api/importar')) { if (r.method()==='GET') return r.respond({status:200,contentType:'application/json',body:JSON.stringify({ligado:true})}); return r.respond({status:200,contentType:'application/json',body:JSON.stringify({lugares:[{texto:'taberna da rua das flores',nome:'Taberna da Rua das Flores',cidade:'Lisboa',pais:'Portugal',status:'been'},{texto:'pasteis de belem (amei)',nome:'Pastéis de Belém',cidade:'Lisboa',pais:'Portugal',status:'been'},{texto:'livraria lello',nome:'Livraria Lello',cidade:'Porto',pais:'Portugal',status:'want'},{texto:'o bar xyzzy do joão',nome:'Bar Xyzzy',cidade:'Porto',pais:'Portugal',status:'want'}]})}) }
  // Sugestões do Explorar em dois grupos (05/10): "Mani" acha o restaurante e a cidade.
  if (u.includes('/api/lugar')) return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({
    sugestoes: [{ id: 'ChIJmanila_cidade_001', titulo: 'Manila', sub: 'Filipinas' }],
    spots: [{ id: 'ChIJmani_restaurante1', titulo: 'Maní', sub: 'Rua Joaquim Antunes, Jardins, São Paulo', tipos: ['restaurant', 'food', 'establishment'] },
      { id: 'ChIJtaberna_flores01', titulo: 'Taberna da Rua das Flores', sub: 'Rua da Misericórdia, Lisboa', tipos: ['restaurant'] }] }) });
  if (u.includes('/api/lista')) return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ codigo: 'abcdefgh1234' }) });
  if (u.includes('/api/')) return r.respond({ status: 200, contentType: 'application/json', body: '{}' });
  r.continue();
});
await pg.goto('http://localhost:8935/index.html');
await new Promise(r => setTimeout(r, 2000));
const passoDe = async (nome, fn, espera) => {
  passo = nome;
  try { await pg.evaluate(fn) } catch (e) { erros.push('[' + nome + '] ' + e.message.split('\n')[0]) }
  await new Promise(r => setTimeout(r, espera || 900));
  const ativa = await pg.evaluate(() => { const s = document.querySelector('.screen.active'); const ov = [...document.querySelectorAll('.overlay.show')].map(o => o.id); return (s && s.id) + (ov.length ? ' + ' + ov.join(',') : '') });
  console.log(nome.padEnd(34), '→', ativa);
  await pg.screenshot({ path: OUT + nome.replace(/\W+/g, '_') + '.png' });
};
await passoDe('login simulado + dashboard', `(async()=>{window.ensureToken=async()=>'tk';S.user={id:'${EU}',email:'l@x.z',user_metadata:{full_name:'Lucas Patriarcha'}};await fetchOwnProfile(true);goTo('dashboard');await loadDashboard()})()`, 2500);
await passoDe('viagens: casa + lista (c1)', `(()=>{goTo('dashboard');renderTrips()})()`, 1200);
await passoDe('adicionar viagem (c3)', `abrirAdicionarViagem()`);
await passoDe('adicionar viagem: buscar', `(()=>{const i=document.getElementById('countrySearch');i.value='Kyoto';filterNewTripCity('Kyoto')})()`, 1500);
await passoDe('adicionar viagem: escolher', `selectNewTripCity(0)`);
await passoDe('adicionar viagem: fechar', `closeOv('ov-newtrip')`);
await passoDe('abrir viagem Portugal', `openTrip('t1')`, 1500);
await passoDe('compartilhar país', `compartilharPais()`, 1200);
await passoDe('fechar folha', `closeOv('ov-compartilhar')`);
await passoDe('abrir cidade Lisboa', `openCityScreen('Lisboa')`, 1200);
await passoDe('cidade: Quero ir (c2)', `setCityStatus('want')`);
await passoDe('cidade: Fui (c2)', `setCityStatus('been')`);
await passoDe('compartilhar cidade', `compartilharCidade()`, 1200);
await passoDe('fechar folha 2', `closeOv('ov-compartilhar')`);
await passoDe('planejar pela cidade', `plnDaEntrada(true)`, 1200);
await passoDe('ver lista juntada', `plnVerLista()`, 1200);
await passoDe('ficha do lugar', `plnAbrirFicha(0)`);
await passoDe('salvar Quero ir da ficha', `(async()=>{const i=PLN.vis.findIndex(g=>g.base.name==='Cervejaria Ramiro');plnAbrirFicha(i);await plnSalvar('want',null)})()`, 1500);
await passoDe('voltar à escolha', `goTo('planejarEscolher')`);
await passoDe('escolher destino', `plnEscolherDestino()`);
await passoDe('buscar país', `plnPintarDestinos('ital')`);
await passoDe('definir Itália', `plnDefinirDestino(0)`, 1200);
await passoDe('lista com Lisboa + Itália', `plnVerLista()`, 1200);
await passoDe('montar minha viagem', `plnComecarMontagem()`);
await passoDe('salvar montagem', `plnSalvarMontagem(null)`, 2000);
await passoDe('mandar pro grupo', `(()=>{window.__texto='';window.mandarTextoPraFora=async(t)=>{window.__texto=t};plnMandarProGrupo(true)})()`);
await passoDe('voltar pra lista', `plnVoltarDaLista()`, 1200);
await passoDe('só Itália (vazio)', `(()=>{PLN.destinos=[{tipo:'pais',nome:'Itália'}];plnVerLista()})()`, 1200);
await passoDe('Brasil com Ana (casa SP dela)', `(()=>{PLN.destinos=[{tipo:'pais',nome:'Brasil'}];PLN.amigos=new Set(['${ANA}']);plnVerLista()})()`, 1500);
await passoDe('Brasil: montar', `plnComecarMontagem()`);
await passoDe('Brasil: salvar montagem', `plnSalvarMontagem(null)`, 2500);
await passoDe('Brasil: mandar pro grupo', `(()=>{window.mandarTextoPraFora=async(t)=>{window.__texto=t};plnMandarProGrupo(true)})()`);
console.log(await pg.evaluate(()=>window.__texto));
await passoDe('casa: abrir viagem SP', `openTrip('t2')`, 1500);
await passoDe('adicionar spot (busca)', `(()=>{goTo('dashboard');abrirBuscaDeSpot()})()`, 1000);
await passoDe('digitar na busca', `(()=>{const i=document.getElementById('placeSearch');i.value='Mocotó';searchPlaces('Mocotó')})()`, 1500);
await passoDe('fechar busca', `closeOv('ov-search')`);
await passoDe('salvar spot abre a ficha (B7)', `(async()=>{S.addCat='food';S.addTrip=S.trips.find(t=>t.id==='t1');S.selPlace={name:'Pastéis de Belém',city:'Lisboa',country:'Portugal',address:'R. de Belém 84, Lisboa'};resetNoteSheet();showOv('ov-note');setTimeout(()=>{addStatus='want';saveSpot(false)},300)})()`, 3000);
await passoDe('aba amigos', `(async()=>{goTo('friends');await loadFriends()})()`, 2000);
await passoDe('perfil da Ana', `openFriend('${ANA}')`, 2000);
await passoDe('ficha única: spot da Ana (e5)', `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));const l=await plnSpotsDeles();FRIEND_CITY_SPOTS=l.filter(x=>x.id==='a4');abrirSpotDoAmigo(0)})()`, 2000);
await passoDe('ficha única: voltar', `backFromPlace()`);
await passoDe('ficha única: spot que é meu (e4)', `(async()=>{const l=await plnSpotsDeles();FRIEND_CITY_SPOTS=l.filter(x=>x.id==='r1');abrirSpotDoAmigo(0)})()`, 2000);
console.log('  slides:', await pg.evaluate(() => document.querySelectorAll('#place .fi-slide').length));
await passoDe('ficha: tocar em "Rafa foi"', `(async()=>{await new Promise(r=>setTimeout(r,800));const b=document.querySelector('#fiDeles .fi-dele');if(b)b.click()})()`, 1500);
console.log('  rótulo:', await pg.evaluate(() => document.getElementById('fiListaRot').innerText.replace(/\n/g,' | ')));
await passoDe('ficha do Rafa: voltar pra minha', `backFromPlace()`, 1500);
console.log('  voltou pra:', await pg.evaluate(() => S.curPlace && S.curPlace.name + ' / prévia=' + !!S.curPlace._previa));
await passoDe('fotos suas: abrir meu spot', `(async()=>{goTo('profile');await new Promise(r=>setTimeout(r,300));openPlace('s1','profile')})()`, 1500);
console.log('  botao +:', await pg.evaluate(() => getComputedStyle(document.querySelector('#place .fi-maisfotos')).display));
await passoDe('fotos suas: voltar', `backFromPlace()`);
await passoDe('carrossel: 2a foto', `(()=>{const f=document.querySelector('#place .fi-faixa');f.scrollLeft=f.clientWidth;f.dispatchEvent(new Event('scroll'))})()`);
console.log('  contador:', await pg.evaluate(() => (document.querySelector('#place .fi-cont')||{}).textContent));
await passoDe('carrossel: tela cheia', `document.querySelector('#place .fi-faixa').click()`);
await passoDe('carrossel: fechar', `fecharVisualizador()`);
await passoDe('ficha única: voltar 2', `backFromPlace()`);
await passoDe('planejar com Ana', `plnDoAmigo()`, 1200);
await passoDe('voltar ao perfil', `plnVoltar()`);
await passoDe('amigos: só pedido enviado', `(()=>{FRIENDS_DATA={friendIds:[],incoming:[],outgoing:[{id:'p1',follower_id:'${EU}',following_id:'${RAFA}',status:'pending'}],pmap:{'${RAFA}':{id:'${RAFA}',display_name:'Rafa Mendes'}},feedItems:[],convidou:false};friendsTab='recente';goTo('friends');renderFriendsTab()})()`);
console.log('  linha:',await pg.evaluate(()=>(document.querySelector('#friendsContainer .am-pedidos')||{}).textContent||'(nenhuma)'));
await passoDe('amigos: busca (c7)', `(()=>{const i=document.getElementById('amBusca2');i.value='ana';amBuscar('ana')})()`);
await passoDe('amigos: busca sem amigo', `(()=>{const i=document.getElementById('amBusca2');i.value='zezinho';amBuscar('zezinho')})()`, 1200);
await passoDe('amigos: limpar busca', `(()=>{const i=document.getElementById('amBusca2');i.value='';amBuscar('')})()`);
await passoDe('atividade (c6)', `abrirAtividade()`, 2000);
console.log('  cancelar:',await pg.evaluate(()=>/Cancelar/.test(document.getElementById('atCorpo').innerText)));
await passoDe('atividade: voltar', `goTo('friends')`);
await passoDe('amigos: lista real (c7)', `(async()=>{FRIENDS_DATA=null;await loadFriends()})()`, 2500);
await passoDe('atividade com eventos', `abrirAtividade()`, 2500);
await passoDe('atividade: voltar 2', `goTo('friends')`);
await passoDe('perfil próprio', `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('profile');await loadProfile()})()`, 2000);
await passoDe('v5: perfil (topo)', `(async()=>{goTo('profile');await loadProfile();window.scrollTo(0,0)})()`, 1500);
await passoDe('v5: rolar até os melhores', `document.getElementById('smLista').scrollIntoView({block:'start'})`);
console.log('  top:', await pg.evaluate(() => (TOP.ordem||[]).map(x=>x.name+' '+x.my_rating).join(' / ')), '| empates:', await pg.evaluate(() => (TOP.empates||[]).length));
await passoDe('v5: trocar cidade (7b)', `abrirCidadesDoTop()`);
await passoDe('v5: Lisboa (poucas notas, 7c)', `(()=>{const i=TOP.cidadesDaFolha.findIndex(c=>c==='Lisboa');escolherCidadeDoTop(i);document.getElementById('smLista').scrollIntoView({block:'start'})})()`);
await passoDe('v5: Todas as cidades', `(()=>{abrirCidadesDoTop();escolherCidadeDoTop(-1)})()`);
await passoDe('v5: volta São Paulo', `(()=>{abrirCidadesDoTop();escolherCidadeDoTop(TOP.cidadesDaFolha.indexOf('São Paulo'))})()`);
await passoDe('v5: desempate (6c)', `abrirDesempate()`);
await passoDe('v5: escolher no desempate', `escolherNoDesempate(1)`);
console.log('  depois:', await pg.evaluate(() => { renderTop(); return (TOP.ordem||[]).map(x=>x.name).join(' / ') }));
await passoDe('v5: ver em ordem', `(()=>{goTo('profile');renderTop();abrirTopEmOrdem()})()`);
await passoDe('v5: mandar (7e)', `(()=>{goTo('profile');renderTop();abrirMandarTop()})()`);
console.log('  texto:', JSON.stringify(await pg.evaluate(() => textoDoTop())));
await passoDe('v5: fechar mandar', `closeOv('ov-mandartop')`);
await passoDe('v5: rodapé com Colar uma lista', `(async()=>{IMP.ligado=true;goTo('profile');renderPerfil();document.querySelector('#profile .pf-rodape').scrollIntoView({block:'center'})})()`);
console.log('  importar visível:', await pg.evaluate(() => getComputedStyle(document.getElementById('pfImportar')).display));
await passoDe('v5: abrir importar do perfil', `document.getElementById('pfImportar').click()`);
await passoDe('v5: voltar do importar', `(()=>{goTo('profile')})()`);
await passoDe('seus spots (8a)', `abrirSeusSpots('dashboard')`, 1200);
await passoDe('seus spots: Quero ir', `ssStatus('want')`);
await passoDe('seus spots: Fui + Gastronomia', `(()=>{ssStatus('been');ssCat('food')})()`);
await passoDe('seus spots: por onde (8c)', `abrirPorOnde()`);
await passoDe('seus spots: abrir Brasil', `ssAbrirPais(SS.ondePaises.indexOf('Brasil'))`);
await passoDe('seus spots: São Paulo (8d)', `(()=>{const i=SS.ondePaises.indexOf('Brasil');ssEscolherLugar(i,SS.ondeCidades[i].indexOf('São Paulo'))})()`);
await passoDe('seus spots: busca (8b)', `(()=>{const b=document.getElementById('ssBusca');b.focus();b.value='piz';SS.busca='piz';renderBuscaDosSpots()})()`, 600);
await passoDe('seus spots: busca sem nada', `(()=>{SS.busca='xyzw';renderBuscaDosSpots()})()`);
await passoDe('seus spots: cancelar', `ssCancelarBusca()`);
await passoDe('seus spots: abrir um spot e voltar', `(async()=>{ssLimparFiltros();const b=document.querySelector('#ssLista .ss-row');if(b)b.click();await new Promise(r=>setTimeout(r,800));backFromPlace()})()`, 1500);
await passoDe('v5: planejar sem amigos', `(()=>{goTo('profile');abrirPlanejarDoPerfil();PLN.destinos=[{tipo:'pais',nome:'Itália'},{tipo:'cidade',nome:'Paris',pais:'França'}];plnPintarEscolha()})()`, 1200);
await passoDe('v5: seguir sem amigos', `plnSeguirSemAmigos()`, 1500);
console.log('  viagem:', await pg.evaluate(() => { const t = S.trips.find(x => x.name === 'Itália e França'); return t ? JSON.stringify(t.destinations) + ' proxima=' + t.proxima : 'NAO CRIOU' }));
await passoDe('perfil: meus spots', `document.querySelector('#profile .pf-cab:nth-of-type(2)')?.scrollIntoView()`);
await passoDe('perfil: quero ir', `mlTrocarStatus('want')`);
await passoDe('perfil: cidades em Quero ir', `(()=>{mlTrocarStatus('want');abrirFolhaDeCidades()})()`);
console.log('  cidades:', await pg.evaluate(() => [...document.querySelectorAll('#mlCidadeLista .prof-linha .pl-txt')].map(e => e.innerText.replace(/\n/g,' ')).join(' / ')));
await passoDe('perfil: fechar cidades', `closeOv('ov-mlcidade')`);
await passoDe('perfil: rodapé', `document.querySelector('#profile .pf-rodape').scrollIntoView()`);
await passoDe('próxima viagem: tela', `openTrip('tj')`, 1500);
await passoDe('próxima viagem: Kyoto', `pvCidade(1)`);
await passoDe('próxima viagem: amigos veem', `trocarQuemVe(false)`, 1200);
await passoDe('nova viagem (folha)', `(()=>{goTo('profile');abrirNovaViagem()})()`);
await passoDe('nova viagem: amigos veem', `novaQuemVe(false)`);
await passoDe('nova viagem: fechar', `closeOv('ov-newtrip')`);
await passoDe('nova viagem: 2 países (folha)', `(()=>{abrirNovaViagem();newTripCityResults=[{city:'Roma',country:'Itália'},{city:'',country:'França'}];document.getElementById('countryList').innerHTML=newTripCityResults.map(linhaDeDestino).join('');selectNewTripCity(0);selectNewTripCity(1)})()`);
await passoDe('nova viagem: criar Itália e França', `createTrip()`, 2000);
console.log('  viagem:', await pg.evaluate(() => { const t = S.trips.find(x => x.name === 'Itália e França'); return t ? JSON.stringify({ d: t.destinations, prox: t.proxima, planejada: viagemPlanejada(t) }) : 'NAO CRIOU' }));
await passoDe('primeiro Fui (folha)', `(()=>{localStorage.removeItem('spot_virou_tj');conferirViagensQueViraram();const t=S.trips.find(x=>x.id==='tj');t._spots[0].status='been';conferirViagensQueViraram()})()`);
await passoDe('primeiro Fui: ver em Viagens', `(async()=>{closeOv('ov-virou');goTo('dashboard');renderTrips()})()`, 1500);
await passoDe('perfil sem próxima (vazio)', `(async()=>{goTo('profile');renderProximas()})()`);
await passoDe('explorar', `(async()=>{goTo('explore');loadExplore()})()`, 2500);
await passoDe('explorar: digitar Mani', `(()=>{const c=document.getElementById('exploreCitySearch');c.value='Mani';c.focus();sugerirLugar('Mani')})()`, 1500);
await passoDe('explorar: abrir spot sugerido', `escolherSpotSugerido(0)`, 1500);
await passoDe('explorar: salvar como Quero ir', `setStatus('want')`, 2500);
await passoDe('explorar: faixa some ao sair', `(()=>{goTo('explore')})()`, 800);
console.log('  faixa:', await pg.evaluate(() => (document.getElementById('faixaSalvo') || {}).className));
await passoDe('salvar da lista pública', `(async()=>{localStorage.setItem('spot_salvar_pendente','abcdefgh1234.11111111-2222-3333-4444-555555555555');await salvarSpotPendente()})()`, 1500);
await passoDe('v2: 5 destinos (recolhe)', `(()=>{plnAbrir({destinos:[{tipo:'pais',nome:'Portugal'},{tipo:'cidade',nome:'Lisboa'},{tipo:'pais',nome:'Itália'},{tipo:'pais',nome:'Espanha'},{tipo:'pais',nome:'Marrocos'}],amigos:['${ANA}','${RAFA}'],volta:'dashboard'})})()`, 1500);
await passoDe('v2: lista Todas (cidade à direita)', `plnVerLista()`, 1500);
await passoDe('v2: montar (header Cancelar/Todos)', `plnComecarMontagem()`);
await passoDe('v2: Todos/Nenhum', `plnTodosOuNenhum()`);
await passoDe('v2: cancelar', `plnVoltarDaLista()`);
await passoDe('v2: prévia pro grupo', `plnMandarProGrupo(false)`);
await passoDe('v2: fechar prévia', `closeOv('ov-pln-mandar')`);
await passoDe('v2: vazio com 3 destinos', `(()=>{PLN.destinos=[{tipo:'pais',nome:'Japão'},{tipo:'pais',nome:'Chile'},{tipo:'cidade',nome:'Quioto',pais:'Japão'}];plnVerLista()})()`, 1200);
await passoDe('a2: ficha com categoria', `openPlace('s1','city')`, 1500);
await passoDe('a2: trocar pra Ficar', `trocarCategoriaDoLugar('hotel')`, 1200);
await passoDe('a1: nota com segmentado', `(()=>{S.addCat='food';S.addTrip=S.trips[0];S.selPlace={name:'Teste',city:'Lisboa',country:'Portugal'};resetNoteSheet();showOv('ov-note')})()`);
await passoDe('a1: escolher Experiências', `escolherCatDaNota('experience')`);
await passoDe('a1: fechar', `closeOv('ov-note')`);
if (await pg.evaluate(() => typeof impAbrir === 'function')) {
  await passoDe('importar: ver se ligado', `impVerSeEstaLigado()`);
  await passoDe('importar: entrada no Adicionar', `(()=>{goTo('dashboard');abrirBuscaDeSpot()})()`);
  await passoDe('importar: lista colada na busca', `(()=>{const i=document.getElementById('placeSearch');i.value='taberna, pasteis de belem, lello';searchPlaces(i.value)})()`);
  await passoDe('importar: abrir (2a)', `impAbrir(IMP.texto)`);
  await passoDe('importar: encontrar (2b-2c)', `impEncontrar()`, 3000);
  await passoDe('importar: trocar lugar', `impAbrirTroca(0)`);
  await passoDe('importar: escolher alternativa', `impEscolherAlt(0)`);
  await passoDe('importar: buscar nao achado', `impBuscarNaoAchado(0)`, 1200);
  await passoDe('importar: nenhum desses', `impNenhumDesses()`);
  await passoDe('importar: status Fui na 2a', `impStatus(1,'been')`);
  await passoDe('importar: salvar (2d)', `impSalvar()`, 3000);
  await passoDe('importar: abrir cidade', `impAbrirCidade(0)`, 1200);
  await passoDe('a3: viagens sem nenhum spot', `(async()=>{IMP.ligado=true;S.trips=[];window.dbGet=async()=>[];goTo('dashboard');await loadDashboard()})()`, 2000);
await passoDe('onb: passo 3 colar', `(()=>{IMP.ligado=true;ONB.textoImportar='';showOv('ov-onb');ONB.passo=2;onbIr(3)})()`);
await passoDe('onb: colou texto', `(()=>{const t=document.getElementById('onbImportar');t.value='lisboa: taberna da rua das flores, pasteis de belem (amei)';t.dispatchEvent(new Event('input'))})()`);
await passoDe('onb: segue pros amigos', `document.getElementById('onbSeguirImp').click()`);
await passoDe('onb: terminar abre revisão', `onbTerminar()`, 4000);
await passoDe('importar: vazio (2e)', `(()=>{IMP.etapa='vazio';IMP.texto='oi tudo bem';goTo('importar');impPintar()})()`);
}
console.log('\nERROS (' + erros.length + '):'); erros.forEach(e => console.log(' -', e));
await b.close();
