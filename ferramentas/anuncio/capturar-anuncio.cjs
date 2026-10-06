// ═══ PRINTS DO ANÚNCIO EM VÍDEO (06/10/2026) ═══
//
// Mesmo andaime das capturas da App Store (ferramentas/capturas-loja): Chrome
// de verdade, conta fictícia, nada toca o Supabase, foto real de cada lugar
// (Wikimedia Commons). A história é a do anúncio: quem chega em Lisboa SEM
// nada salvo e acha o que os amigos indicaram.
//
//   node ferramentas/capturas-loja/srv.js . ferramentas/capturas-loja/capturas
//   node ferramentas/anuncio/capturar-anuncio.cjs
//
// Sai em ferramentas/anuncio/prints/: telas inteiras (1320×2868, iPhone 6,9")
// e os cards soltos com fundo transparente, pra flutuar por cima do vídeo.

const path = require('path');
const fs = require('fs');
const puppeteer = require(path.join(__dirname, '..', 'capturas-loja', 'node_modules', 'puppeteer-core'));

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:8795/';
const SAIDA = path.join(__dirname, 'prints');
const esperar = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const nav = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const pg = await nav.newPage();
  await pg.setViewport({ width: 440, height: 956, deviceScaleFactor: 3, isMobile: true });
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const erros = [];
  pg.on('pageerror', e => erros.push(e.message));

  await pg.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await pg.addScriptTag({ url: '/demo.js?v=' + Date.now() });

  // A conta de quem assiste: mora em São Paulo, vai pra Lisboa pela primeira
  // vez. Os amigos é que já foram.
  await pg.evaluate(() => {
    window.prepararDemo();
    S.profile.display_name = 'Pedro Alves'; S.profile.username = 'pedroalves';
    window.__SPOTS = window.__SPOTS.filter(s => s.city !== 'Lisboa');
    window.AMIGOS = {
      'am-1': { id: 'am-1', display_name: 'Ana Lima', username: 'analima' },
      'am-2': { id: 'am-2', display_name: 'Rafa Mendes', username: 'rafamendes' },
      'am-3': { id: 'am-3', display_name: 'Clara Menezes', username: 'clarinha' }
    };
    const F = window.FOTO_DEMO, P = window.P_DEMO;
    const spot = (id, dono, nome, cat, nota, resenha, quando) => ({
      id, user_id: dono, trip_id: 'x', name: nome, category: cat, city: 'Lisboa',
      address: 'Lisboa, Portugal', status: 'been', my_rating: nota, my_review: resenha,
      my_note: null, photo_url: P(F[nome]), place_type: null, rating_google: null, created_at: quando
    });
    const agora = Date.now(), h = n => new Date(agora - n * 3600e3).toISOString();
    window.DELES = [
      spot('f1', 'am-1', 'Cervejaria Ramiro', 'food', 5, 'Peça o camarão ao alho e feche com o prego no pão. Chegue antes das 19h, depois a fila dobra.', h(3)),
      spot('f2', 'am-2', 'Miradouro da Senhora do Monte', 'experience', 5, 'Pôr do sol aqui, com um vinho do quiosque de baixo.', h(20)),
      spot('f3', 'am-3', 'Pastéis de Belém', 'food', 4.5, 'Pede pra comer lá dentro, sai quente. Canela e açúcar por cima.', h(30))
    ];
    FRIENDS_DATA = { uid: S.user.id, friendIds: ['am-1', 'am-2', 'am-3'], incoming: [], outgoing: [], pmap: window.AMIGOS,
      lugaresPorAmigo: { 'am-1': 48, 'am-2': 31, 'am-3': 22 },
      feedItems: window.DELES.map(s => ({ tipo: 'visita', user_id: s.user_id, created_at: s.created_at, spot: s })) };
    Object.assign(FRIEND_NOMES, { 'am-1': 'Ana Lima', 'am-2': 'Rafa Mendes', 'am-3': 'Clara Menezes' });
  });
  await pg.evaluate(() => document.fonts.ready);

  const tela = async (nome, ms) => {
    await esperar(ms || 1800);
    await pg.evaluate(() => window.scrollTo(0, 0));
    await esperar(400);
    await pg.screenshot({ path: path.join(SAIDA, nome), type: 'png' });
    console.log(nome);
  };

  // 1 — O feed: o que os amigos indicaram em Lisboa.
  await pg.evaluate(() => { goTo('friends'); renderFriendsTab(); });
  await tela('1-feed-dos-amigos.png', 2500);

  // 2 — Os três cards soltos, pra flutuar no vídeo: cada um numa placa clara
  //     com canto arredondado (texto escuro sobre vídeo some), e fora dela
  //     transparente.
  await pg.evaluate(() => {
    const st = document.createElement('style'); st.id = 'transp';
    st.textContent = 'html,body,.screen,#friends{background:transparent!important}'
      + '#friends .fd-card{background:#F5F5F3!important;padding:20px!important;border-radius:28px!important;margin:24px 20px!important}';
    document.head.appendChild(st);
  });
  const cards = await pg.$$('#friends .fd-card');
  const nomes = ['2a-card-ana-ramiro.png', '2b-card-rafa-miradouro.png', '2c-card-clara-pasteis.png'];
  for (let i = 0; i < Math.min(cards.length, 3); i++) {
    await cards[i].scrollIntoView(); await esperar(600);
    await cards[i].screenshot({ path: path.join(SAIDA, nomes[i]), omitBackground: true });
    console.log(nomes[i]);
  }
  await pg.evaluate(() => document.getElementById('transp').remove());

  // 3 — A ficha do spot da Ana: a dica dela e o botão de salvar.
  await pg.evaluate(async () => {
    // O bloco "Ana foi 5★" lê os spots dos amigos pelo Planejar: aponta pra demo.
    window.plnSpotsDeles = async () => window.DELES;
    window.plnCarregarAmigos = async () => {};
    window.plnPrimeiro = id => (window.AMIGOS[id] ? window.AMIGOS[id].display_name.split(' ')[0] : 'Amigo');
    const s = window.DELES[0];
    abrirFichaDoSpotDeAmigo(s, true);
    await new Promise(t => setTimeout(t, 1200));
    Object.assign(COMENT_PERFIS, window.AMIGOS);
    COMENTARIOS[s.id] = [
      { id: 'c1', user_id: 'am-2', body: 'Fui por sua causa. A fila valeu cada minuto.', created_at: new Date(Date.now() - 2 * 3600e3).toISOString() }
    ];
    renderComentarios(s.id, 'placeComentarios', s.user_id);
  });
  await tela('3-ficha-do-spot-da-ana.png', 2000);

  // 4 — Depois de salvar: Lisboa na lista dele, os três em Quero ir.
  await pg.evaluate(async () => {
    const pt = window.__TRIPS.find(t => t.name === 'Portugal');
    window.DELES.forEach((s, i) => window.__SPOTS.push(Object.assign({}, s, {
      id: 'm' + i, user_id: S.user.id, trip_id: pt.id, status: 'want', my_rating: null, my_review: null,
      from_user_id: s.user_id })));
    await loadDashboard();
    await openTrip(pt.id);
    await new Promise(t => setTimeout(t, 1200));
    openCityScreen('Lisboa');
  });
  await pg.evaluate(() => { const b = [...document.querySelectorAll('#city button, #city [onclick]')].find(x => /Quero ir/.test(x.textContent || '')); if (b) b.click(); });
  await tela('4-lisboa-quero-ir.png', 2200);

  if (erros.length) console.log('ERROS:', erros);
  await nav.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
