// Os três testes que têm que passar ANTES de todo push no main, num comando só:
//
//   node ferramentas/antes-de-subir.mjs
//
// Push no main chega em todos os apps na hora e ninguém revisa antes (o
// Patriarcha e o Jezler sobem direto), então isto aqui é a única trava.
//
// O que ele faz, na ordem:
//   1. instala o puppeteer-core se faltar (só na primeira vez);
//   2. sobe o servidor estático na porta 8935, se já não houver um;
//   3. node --test                     → tem que dar 0 falhas;
//   4. node ferramentas/pente-fino.mjs → tem que terminar em ERROS (0);
//   5. node ferramentas/jornadas.mjs   → tem que terminar em FALHAS (0).
// Sai com 0 só se os três passarem. Leva uns 4 minutos.
//
//   node ferramentas/antes-de-subir.mjs --servidor   → só o servidor, pra abrir
//                                                       o app em localhost:8935
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { RAIZ, PASTA_DO_PUPPETEER } from './_base-de-teste.mjs';

const PORTA = 8935;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

// Servidor estático da pasta do repositório. O app não abre em file:// (o
// localStorage lança e o script morre no meio). As /api/ e o banco são
// respondidos pelos próprios testes, dentro do Chrome: aqui só saem arquivos.
function servidor() {
  return http.createServer((req, res) => {
    let caminho;
    try { caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname) } catch (e) { res.writeHead(400); return res.end() }
    let arquivo = path.join(RAIZ, caminho);
    if (arquivo !== RAIZ && !arquivo.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end() }
    // Como a Cloudflare: pasta → index.html; endereço sem extensão → .html.
    if (fs.existsSync(arquivo) && fs.statSync(arquivo).isDirectory()) arquivo = path.join(arquivo, 'index.html');
    else if (!fs.existsSync(arquivo) && fs.existsSync(arquivo + '.html')) arquivo += '.html';
    if (!fs.existsSync(arquivo)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('nao achei') }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(arquivo).pipe(res);
  });
}

function jaTemServidor() {
  return new Promise((ok) => {
    const r = http.get({ host: 'localhost', port: PORTA, path: '/index.html', timeout: 2000 }, (res) => { res.resume(); ok(res.statusCode === 200) });
    r.on('error', () => ok(false));
    r.on('timeout', () => { r.destroy(); ok(false) });
  });
}

function subirServidor() {
  return new Promise((ok, erro) => {
    const s = servidor();
    s.on('error', erro);
    s.listen(PORTA, () => ok(s));
  });
}

// Roda um comando mostrando a saída ao vivo e devolvendo-a inteira, pra
// conferir a linha final ("ERROS (0)") — o pente-fino sai com 0 mesmo com erro.
function rodar(nome, args) {
  return new Promise((ok) => {
    console.log('\n━━━ ' + nome + ' ━━━');
    const p = spawn(process.execPath, args, { cwd: RAIZ, env: process.env });
    let saida = '';
    const junta = (d) => { const t = d.toString(); saida += t; process.stdout.write(t) };
    p.stdout.on('data', junta);
    p.stderr.on('data', junta);
    p.on('close', (codigo) => ok({ codigo, saida }));
  });
}

if (process.argv.includes('--servidor')) {
  if (await jaTemServidor()) { console.log('Já existe um servidor na porta ' + PORTA + '.'); process.exit(0) }
  await subirServidor();
  console.log('Spot em http://localhost:' + PORTA + '  (Ctrl+C pra parar)');
} else {
  if (!fs.existsSync(path.join(PASTA_DO_PUPPETEER, 'node_modules', 'puppeteer-core'))) {
    console.log('Instalando o puppeteer-core (só na primeira vez)…');
    const i = spawnSync('npm install --no-audit --no-fund', { cwd: PASTA_DO_PUPPETEER, stdio: 'inherit', shell: true });
    if (i.status !== 0) { console.error('\nA instalação falhou. Confira a internet e rode de novo.'); process.exit(1) }
  }

  let meu = null;
  if (!await jaTemServidor()) meu = await subirServidor();

  const resultado = [];
  const t = await rodar('1/3  node --test', ['--test']);
  resultado.push(['node --test', t.codigo === 0, t.codigo === 0 ? '0 falhas' : 'tem teste falhando']);

  const p = await rodar('2/3  pente-fino', ['ferramentas/pente-fino.mjs']);
  const erros = (p.saida.match(/ERROS \((\d+)\)/) || [])[1];
  resultado.push(['pente-fino', p.codigo === 0 && erros === '0', erros === undefined ? 'não chegou ao fim' : 'ERROS (' + erros + ')']);

  const j = await rodar('3/3  jornadas (uns 2 minutos)', ['ferramentas/jornadas.mjs']);
  const falhas = (j.saida.match(/FALHAS \((\d+)\)/) || [])[1];
  resultado.push(['jornadas', j.codigo === 0 && falhas === '0', falhas === undefined ? 'não chegou ao fim' : 'FALHAS (' + falhas + ')']);

  if (meu) meu.close();
  console.log('\n━━━ RESUMO ━━━');
  for (const [nome, passou, texto] of resultado) console.log((passou ? '  ✔ ' : '  ✖ ') + nome.padEnd(12) + texto);
  const tudo = resultado.every((r) => r[1]);
  console.log(tudo ? '\nPode subir.\n' : '\nNÃO suba: conserte o que falhou e rode de novo.\n');
  process.exit(tudo ? 0 : 1);
}
