// Servidor de bastidor pros prints da App Store:
//  - serve o app de C:/.../Spot
//  - encaminha /api/* pra producao (e de la que vem a foto de cidade e a do
//    lugar; sem isso o print sai com todos os cards em cinza)
//  - recebe os pixels do html2canvas e grava o PNG sem canal alfa
//
// O encaminhamento vai por CURL, nao pelo fetch do Node: a rede daqui
// intercepta TLS com um certificado que o Node nao conhece ("unable to verify
// the first certificate"). O curl usa o armazenamento do Windows e passa.
// Desligar a verificacao seria o outro caminho, e nao vale nem num script de
// bastidor.
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const { pngRGB } = require(__dirname + '/png-sem-alfa.cjs');

const APP = 'C:/Users/lucas.patriarcha_sol/Downloads/Spot';
const SAIDA = APP + '/mobile/app-store/capturas';
const PORTA = 8932;
const tipos = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp'
};

function encaminhar(req, res) {
  const corpo = [];
  req.on('data', c => corpo.push(c));
  req.on('end', () => {
    // -L: a foto do lugar responde 302 pro servidor de imagem do Google, e
    // este encaminhador so repassava Content-Type — o Location sumia, o
    // navegador nao tinha pra onde ir e TODA foto de spot caia no icone.
    // Deixando o curl seguir o salto, o que chega aqui ja e a imagem.
    const args = ['-s', '-i', '-L', '-X', req.method, 'https://meuspot.app' + req.url];
    for (const k of ['content-type', 'authorization', 'apikey']) {
      if (req.headers[k]) { args.push('-H', k + ': ' + req.headers[k]); }
    }
    const temCorpo = req.method !== 'GET' && req.method !== 'HEAD';
    if (temCorpo) args.push('--data-binary', '@-');
    const c = spawn('curl', args);
    const saida = [];
    c.stdout.on('data', d => saida.push(d));
    c.on('error', e => { res.writeHead(502); res.end(String(e.message)); });
    c.on('close', () => {
      // Com -L o curl imprime o cabecalho de CADA salto, um atras do outro.
      // Vale o ultimo: e dele que vem o status e o tipo do que esta no corpo.
      let resto = Buffer.concat(saida), cab = '';
      while (resto.slice(0, 5).toString() === 'HTTP/') {
        const corte = resto.indexOf('\r\n\r\n');
        if (corte < 0) break;
        cab = resto.slice(0, corte).toString();
        resto = resto.slice(corte + 4);
      }
      if (!cab) { res.writeHead(502); res.end('resposta sem cabecalho'); return; }
      const mTipo = /content-type:\s*([^\r\n]+)/i.exec(cab);
      const mStatus = /HTTP\/[\d.]+ (\d+)/.exec(cab);
      res.writeHead(mStatus ? parseInt(mStatus[1], 10) : 200,
        { 'Content-Type': (mTipo && mTipo[1].trim()) || 'application/octet-stream' });
      res.end(resto);
    });
    if (temCorpo) c.stdin.end(Buffer.concat(corpo));
  });
}

// O /gravar aceita chamada de outra origem: os prints sao capturados DENTRO
// da pagina de producao (a rede daqui passou a bloquear meuspot.app pro curl,
// mas o navegador alcanca). O Chrome trata http://localhost como origem
// confiavel, entao a pagina em HTTPS consegue postar aqui.
function gravar(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const nome = path.basename(q.get('nome') || 'saida.png');
  const w = parseInt(q.get('w') || '0', 10), h = parseInt(q.get('h') || '0', 10);
  const pedacos = [];
  req.on('data', c => pedacos.push(c));
  req.on('end', () => {
    try {
      const rgba = Buffer.concat(pedacos);
      if (!w || !h || rgba.length !== w * h * 4) {
        throw new Error('recebi ' + rgba.length + ', esperava ' + (w * h * 4));
      }
      fs.writeFileSync(path.join(SAIDA, nome), pngRGB(rgba, w, h, [0xF5, 0xF5, 0xF3]));
      res.writeHead(200,{'Access-Control-Allow-Origin':'*'}); res.end('ok');
    } catch (e) { res.writeHead(500); res.end(String(e.message)); }
  });
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS',
      'Access-Control-Allow-Headers':'content-type'});
    return res.end();
  }
  if (req.method === 'POST' && req.url.startsWith('/gravar')) return gravar(req, res);
  if (req.url.startsWith('/api/')) return encaminhar(req, res);
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(APP, p);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('nao achei'); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(PORTA, () => console.log('no ar ' + PORTA));
