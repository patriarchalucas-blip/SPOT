// ═══ CAPTURA DAS TELAS DA APP STORE ═══
//
// Chrome de verdade, em modo automático, com 3 pixels por ponto. Uma tela de
// 440x956 pontos sai em 1320x2868 — o número exato que a Apple pede pro
// iPhone de 6,9".
//
// POR QUE NÃO html2canvas (a primeira tentativa): ele reimplementa CSS em
// JavaScript e erra. Em cinco capturas deu cinco defeitos: PNG preto (ele
// reinicia a animação de entrada), texto atravessando a barra de baixo (não
// desenha desfoque), resenha cortada na primeira linha (não desenha
// <textarea> com quebra), aba ativa emoldurada em vez de sublinhada (desenha
// box-shadow:inset como caixa) e — o que matou — o cartão do placar saindo
// como faixa de ponta a ponta, sem margem nem canto arredondado. Aqui quem
// desenha é o navegador, então o que sai é o que existe.

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:8795/';
const SAIDA = path.join(__dirname, 'capturas');

const esperar = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });

  const navegador = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none']
  });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 440, height: 956, deviceScaleFactor: 3, isMobile: true });
  await pagina.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

  const erros = [];
  pagina.on('pageerror', e => erros.push('página: ' + e.message));

  await pagina.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await pagina.addScriptTag({ url: '/demo.js?v=' + Date.now() });

  const resumo = await pagina.evaluate(() => window.prepararDemo());
  console.log('demo:', JSON.stringify(resumo));

  // As fontes têm que estar carregadas antes da primeira foto, senão a
  // primeira sai na fonte do sistema e as outras na Inter Tight.
  await pagina.evaluate(() => document.fonts.ready);

  const tirar = async (nome, ms) => {
    await esperar(ms || 1500);
    await pagina.evaluate(() => window.scrollTo(0, 0));
    await esperar(500);
    const arq = path.join(SAIDA, nome);
    await pagina.screenshot({ path: arq, type: 'png' });
    const b = fs.readFileSync(arq);
    console.log(nome, b.readUInt32BE(16) + 'x' + b.readUInt32BE(20), Math.round(b.length / 1024) + 'KB');
  };

  // 1 — Início
  await pagina.evaluate(async () => { await loadDashboard(); goTo('dashboard'); });
  await tirar('01-inicio.png', 3000);

  // 2 — Ficha do lugar, com comentário de amigo.
  //     Semear DEPOIS do openPlace: ele rebusca os comentários no banco (que
  //     está desligado) e zera o que eu tivesse posto antes.
  await pagina.evaluate(async () => {
    const r = window.__SPOTS.find(s => s.name === 'Cervejaria Ramiro');
    await openPlace(r.id, 'city');
    await new Promise(t => setTimeout(t, 1500));
    Object.assign(COMENT_PERFIS, window.AMIGOS);
    COMENTARIOS[r.id] = [
      { id: 'c1', user_id: 'am-1', body: 'Fui por sua causa. A fila valeu cada minuto.', created_at: '2026-09-14T20:10:00Z' },
      { id: 'c2', user_id: 'am-2', body: 'Marca aí quando voltar que eu vou junto.', created_at: '2026-09-16T13:40:00Z' }
    ];
    renderComentarios(r.id, 'placeComentarios', r.user_id);
  });
  await tirar('02-ficha.png', 1500);

  // 3 — Amigos
  await pagina.evaluate(() => {
    const F = window.FOTO_DEMO, P = window.P_DEMO;
    const spot = (id, dono, nome, cidade, cat, nota, resenha) => ({
      id, user_id: dono, trip_id: 'x', name: nome, category: cat, city: cidade,
      address: cidade, status: 'been', my_rating: nota, my_review: resenha,
      my_note: null, photo_url: P(F[nome]), place_type: null, rating_google: null,
      created_at: '2026-09-21T18:00:00Z'
    });
    FRIENDS_DATA = {
      friendIds: ['am-1', 'am-2', 'am-3'], incoming: [], outgoing: [], pmap: window.AMIGOS,
      lugaresPorAmigo: { 'am-1': 23, 'am-2': 41, 'am-3': 17 },
      feedItems: [
        { tipo: 'visita', user_id: 'am-3', created_at: '2026-09-21T19:00:00Z',
          spot: spot('f1', 'am-3', 'Fushimi Inari', 'Quioto', 'experience', 5,
            'Sobe além do primeiro portal. A partir dali o caminho esvazia e fica só você.') },
        { tipo: 'linha', user_id: 'am-1', created_at: '2026-09-20T15:00:00Z',
          html: '<b>Rafael Bastos</b> marcou <b>Grécia</b> como visitado' },
        { tipo: 'visita', user_id: 'am-2', created_at: '2026-09-19T12:30:00Z',
          spot: spot('f2', 'am-2', 'Ponte Luís I', 'Porto', 'experience', 5,
            'Atravessa a pé pelo tabuleiro de cima no fim do dia. Sem pressa.') },
        { tipo: 'linha', user_id: 'am-2', created_at: '2026-09-18T09:00:00Z',
          html: '<b>Clara Menezes</b> comentou em <b>Cervejaria Ramiro</b>: Marca aí quando voltar que eu vou junto.' }
      ]
    };
    Object.assign(FRIEND_NOMES, { 'am-1': 'Rafael Bastos', 'am-2': 'Clara Menezes', 'am-3': 'Téo Nakamura' });
    goTo('friends'); renderFriendsTab();
  });
  await tirar('03-amigos.png', 2000);

  // 4 — Cidade (openCityScreen precisa da viagem aberta antes: ele lê S.curTrip)
  await pagina.evaluate(async () => {
    const pt = window.__TRIPS.find(t => t.name === 'Portugal');
    await openTrip(pt.id);
    await new Promise(t => setTimeout(t, 1200));
    openCityScreen('Lisboa');
  });
  await tirar('04-cidade.png', 2200);

  // 5 — Perfil
  await pagina.evaluate(async () => { goTo('profile'); await loadProfile(); });
  await tirar('05-perfil.png', 2500);

  if (erros.length) console.log('ERROS:', erros);
  await navegador.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
