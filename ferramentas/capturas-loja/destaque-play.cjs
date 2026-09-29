// Imagem de destaque da Google Play (1024x500, sem canal alfa). Não existe na
// Apple. Wordmark "SPOT" em Cinzel + a tagline, claro sobre o verde do app —
// as mesmas duas peças da tela de login, sem inventar desenho novo.
// Uso: node ferramentas/capturas-loja/destaque-play.cjs
const path = require('path');
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await p.setContent(`<html><head>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500&family=Inter+Tight:wght@500&display=block" rel="stylesheet">
<style>html,body{margin:0;width:1024px;height:500px;background:#0B3D2E;color:#F5F5F3;
display:flex;flex-direction:column;align-items:center;justify-content:center}
h1{margin:0;font:500 132px/1 Cinzel,serif;letter-spacing:6px}
p{margin:22px 0 0;font:500 30px 'Inter Tight',sans-serif;opacity:.82}</style></head>
<body><h1>SPOT</h1><p>seus lugares · sua voz</p></body></html>`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  const saida = path.join(__dirname, 'capturas-android', 'destaque-1024x500.jpg');
  await p.screenshot({ path: saida, type: 'jpeg', quality: 95 });
  console.log(saida);
  await b.close();
})();
