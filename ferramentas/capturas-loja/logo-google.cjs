// Logo de 120x120 que o Google pede na tela de consentimento do login
// ("Branding" do Google Auth Platform). Sai do mesmo icon-512.png do app,
// reduzido pelo Chrome, sem canal alfa.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  const src = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', '..', 'icon-512.png')).toString('base64');
  const dataUrl = await p.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = 120; c.height = 120;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.fillStyle = '#0B3D2E'; x.fillRect(0, 0, 120, 120);
    x.drawImage(img, 0, 0, 120, 120);
    return c.toDataURL('image/png');
  }, src);
  const saida = path.join(__dirname, 'logo-google-120.png');
  fs.writeFileSync(saida, Buffer.from(dataUrl.split(',')[1], 'base64'));
  const buf = fs.readFileSync(saida);
  console.log(saida, buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20), buf.length + ' bytes');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
