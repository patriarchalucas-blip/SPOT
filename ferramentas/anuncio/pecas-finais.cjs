// ═══ PEÇAS DO FIM DO ANÚNCIO (06/10/2026) ═══
//
// A tela final que a IA redesenhou não era a marca (S de pedras inventado,
// "Spot" em fonte comum, selo digitado). Aqui saem as peças de verdade:
//   - selo oficial da App Store em pt-BR (landing/app-store-*.svg, da Apple),
//     em PNG grande e transparente;
//   - o wordmark SPOT em Cinzel (claro e verde), transparente;
//   - a tela final 1080×1920 montada com o ícone real + SPOT + frase + selo.
//
//   node ferramentas/anuncio/pecas-finais.cjs   → ferramentas/anuncio/pecas/

const path = require('path');
const fs = require('fs');
const puppeteer = require(path.join(__dirname, '..', 'capturas-loja', 'node_modules', 'puppeteer-core'));

const RAIZ = path.join(__dirname, '..', '..');
const SAIDA = path.join(__dirname, 'pecas');
const b64 = (f) => fs.readFileSync(path.join(RAIZ, f)).toString('base64');
const SELO_PRETO = 'data:image/svg+xml;base64,' + b64('landing/app-store-preto.svg');
const SELO_BRANCO = 'data:image/svg+xml;base64,' + b64('landing/app-store-branco.svg');
const ICONE = 'data:image/png;base64,' + b64('mobile/app-store/icon-1024.png');
// Fontes embutidas (o link do Google travava o carregamento nesta rede).
// São as mesmas do app, baixadas do Google Fonts (licença OFL).
const ttf = (f) => 'url(data:font/ttf;base64,' + fs.readFileSync(path.join(__dirname, 'fontes', f)).toString('base64') + ')';
const FONTES = '<style>@font-face{font-family:Cinzel;font-weight:500;src:' + ttf('cinzel-500.ttf') + '}'
  + '@font-face{font-family:"Inter Tight";font-weight:500;src:' + ttf('intertight-500.ttf') + '}'
  + '@font-face{font-family:"Inter Tight";font-weight:600;src:' + ttf('intertight-600.ttf') + '}</style>';

// Mesmo desenho do app: viewBox medido (CLAUDE.md, "Logo").
const marca = (cor) => '<svg viewBox="3 77 273 76" width="100%" height="100%"><text x="0" y="150" font-family="Cinzel" font-weight="500" font-size="100" letter-spacing="6" fill="' + cor + '">SPOT</text></svg>';

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const nav = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new' });
  const pg = await nav.newPage();

  const tirar = async (nome, w, h, corpo, transparente) => {
    await pg.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await pg.setContent('<!doctype html><html><head><meta charset="utf-8">' + FONTES
      + '<style>html,body{margin:0;width:' + w + 'px;height:' + h + 'px;overflow:hidden;background:' + (transparente ? 'transparent' : '#0B3D2E') + '}</style></head><body>' + corpo + '</body></html>',
      { waitUntil: 'load', timeout: 60000 });
    await pg.evaluate(async () => { await document.fonts.load('500 100px Cinzel'); await document.fonts.load('600 40px "Inter Tight"'); await document.fonts.ready });
    await pg.screenshot({ path: path.join(SAIDA, nome), omitBackground: !!transparente });
    console.log(nome);
  };

  // Selo: 40 de altura no original → 3x... aqui 1200 de largura.
  const selo = (src) => '<img src="' + src + '" style="width:1200px;height:auto;display:block">';
  await tirar('selo-app-store-preto.png', 1200, 401, selo(SELO_PRETO), true);
  await tirar('selo-app-store-branco.png', 1200, 401, selo(SELO_BRANCO), true);

  // Wordmark, 1638×456 (6× o viewBox 273×76).
  const wm = (cor) => '<div style="width:1638px;height:456px">' + marca(cor) + '</div>';
  await tirar('marca-SPOT-verde.png', 1638, 456, wm('#0B3D2E'), true);
  await tirar('marca-SPOT-clara.png', 1638, 456, wm('#F5F5F3'), true);

  // Tela final 1080×1920: ícone real, SPOT, frase, selo branco (fundo verde).
  await tirar('tela-final-1080x1920.png', 1080, 1920,
    '<div style="height:1920px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0">'
    + '<img src="' + ICONE + '" style="width:300px;height:300px;border-radius:68px;display:block">'
    + '<div style="width:520px;height:145px;margin-top:72px">' + marca('#F5F5F3') + '</div>'
    + '<div style="font-family:\'Inter Tight\';font-weight:500;font-size:46px;letter-spacing:-0.02em;color:#F5F5F3;margin-top:36px;text-align:center">Onde ir, pelos seus amigos.</div>'
    + '<img src="' + SELO_BRANCO + '" style="width:420px;height:auto;margin-top:120px;display:block">'
    + '</div>');

  await nav.close();
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
