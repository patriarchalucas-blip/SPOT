// Gera o ícone "Travessia" (o S em fita dando a volta no mundo, escolhido pelo
// Lucas em 28/09/2026) em todos os tamanhos que o app e o site usam.
//
// O desenho original está em ferramentas/marca-travessia-original.webp (verde
// sobre creme). Aqui ele é REPINTADO nas cores exatas do app — claro #F5F5F3
// sobre o verde #0B3D2E, a versão de fundo verde que o Lucas escolheu — pelo
// mesmo princípio de ferramentas/repintar-marca.html: cada pixel vira a mesma
// MISTURA entre as duas cores de destino, pela luminância, pra o contorno não
// ficar com halo da cor antiga.
//
// O símbolo ocupa 88% do quadro (e não o quadro todo): a Apple aplica a
// máscara de cantos arredondados por cima, e com mais margem o desenho
// cortaria. 88% em vez de 84% porque nos tamanhos pequenos (Ajustes, 29 pt)
// cada pixel a mais de símbolo conta.
//
// Todo PNG sai SEM canal alfa (png-sem-alfa.cjs): a Apple recusa o de 1024
// com transparência.
//
// Uso: node ferramentas/icone-travessia.cjs
const puppeteer = require('./capturas-loja/node_modules/puppeteer-core');
const fs = require('fs'); const path = require('path');
const { pngRGB } = require('./png-sem-alfa.cjs');
const RAIZ = path.join(__dirname, '..');
const ORIGINAL = path.join(__dirname, 'marca-travessia-original.webp');
const SAIDAS = [
  [1024, 'mobile/assets/icon.png'],
  [1024, 'mobile/app-store/icon-1024.png'],
  [512, 'icon-512.png'],
  [192, 'icon-192.png'],
  [180, 'icon-180.png'],
  [120, 'logo-120.png'],
];
const VERDE = [11, 61, 46], CLARO = [245, 245, 243];

(async () => {
  const src = 'data:image/webp;base64,' + fs.readFileSync(ORIGINAL).toString('base64');
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  for (const [lado, destino] of SAIDAS) {
    const px = await p.evaluate(async (src, lado, VERDE, CLARO) => {
      const img = new Image(); img.src = src; await img.decode();
      // repinta em 1024 e só depois reduz: reduzir primeiro misturaria as cores velhas
      const N = 1024, cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      const x = cv.getContext('2d');
      x.fillStyle = 'rgb(' + VERDE + ')'; x.fillRect(0, 0, N, N);
      const escala = 0.88, l = N * escala, o = (N - l) / 2;
      const tmp = document.createElement('canvas'); tmp.width = N; tmp.height = N;
      const t = tmp.getContext('2d');
      t.fillStyle = '#F7F3EA'; t.fillRect(0, 0, N, N);   // o creme do original, atrás
      t.imageSmoothingQuality = 'high'; t.drawImage(img, o, o, l, l);
      const d = t.getImageData(0, 0, N, N), out = x.getImageData(0, 0, N, N);
      for (let i = 0; i < d.data.length; i += 4) {
        const L = (0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2]) / 255;
        // f = quanto do pixel era VERDE no original (0.26) x creme (0.93); a
        // versão de fundo verde inverte: o que era verde vira fundo, o creme vira tinta
        let f = (0.93 - L) / (0.93 - 0.26); f = Math.max(0, Math.min(1, f));
        for (let k = 0; k < 3; k++) out.data[i + k] = Math.round(VERDE[k] * (1 - f) + CLARO[k] * f);
        out.data[i + 3] = 255;
      }
      x.putImageData(out, 0, 0);
      let final = cv;
      if (lado !== N) {
        final = document.createElement('canvas'); final.width = lado; final.height = lado;
        const fx = final.getContext('2d'); fx.imageSmoothingQuality = 'high'; fx.drawImage(cv, 0, 0, lado, lado);
      }
      return Array.from(final.getContext('2d').getImageData(0, 0, lado, lado).data);
    }, src, lado, VERDE, CLARO);
    fs.writeFileSync(path.join(RAIZ, destino), pngRGB(Uint8Array.from(px), lado, lado, VERDE));
    console.log(destino, lado);
  }
  await b.close();
})();
