// Gera a imagem de prévia dos links do Spot (WhatsApp, iMessage, Instagram):
// compartilhar-v3.png, 1200×630, no sistema F.
//
//   node ferramentas/imagem-compartilhar/gerar.mjs
//
// Por que existe (01/10/2026): a imagem antiga (compartilhar.png, de 23/09)
// ainda tinha a esfera e as cores de antes, e aparecia em todo link de
// convite — "a gente tá pra lançar um produto, não pode vacilar nisso".
// Trocou o ícone do app? Rode de novo: o desenho puxa mobile/assets/icon.png.
//
// O NOME DO ARQUIVO MUDA a cada versão (v2, v3...): o WhatsApp guarda a
// imagem pelo endereço, e trocar o conteúdo com o mesmo nome deixaria a
// prévia velha aparecendo por dias. Mudou de versão, troque as referências
// (index.html, sobre.html, functions/c, functions/l).
import { createRequire } from 'module';
import url from 'url';
import path from 'path';
const aqui = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(path.join(aqui, '../capturas-loja/'));
const puppeteer = require('puppeteer-core');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
const pg = await b.newPage();
await pg.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await pg.goto(url.pathToFileURL(path.join(aqui, 'imagem.html')).href, { waitUntil: 'networkidle0', timeout: 30000 });
await pg.evaluate(() => document.fonts.ready);
const ok = await pg.evaluate(() => [document.fonts.check('500 20px Cinzel'), document.fonts.check('700 20px "Inter Tight"')]);
if (!ok.every(Boolean)) { console.log('fonte não carregou — sem internet pro Google Fonts?', ok); process.exit(1); }
const saida = path.join(aqui, '../../compartilhar-v3.png');
await pg.screenshot({ path: saida, type: 'png' });
await b.close();
console.log('ok:', saida);
