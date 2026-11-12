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
import { fileURLToPath } from 'url';
import { RAIZ, PASTA_DO_PUPPETEER } from './_base-de-teste.mjs';

const PORTA = 8935;
const LIMITE_MIN = 10;   // por teste; o mais demorado leva uns 4 numa máquina lenta
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

// Para o teste E o Chrome que ele abriu. No Windows, matar só o node deixa o
// Chrome dele aberto, gastando a máquina na tentativa seguinte.
function matar(p) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
  else p.kill('SIGKILL');
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
    // Teste de navegador pode travar (Chrome que não responde, máquina
    // ocupada): sem teto, o comando ficava parado pra sempre sem dizer nada.
    const teto = setTimeout(() => { saida += '\n[travou: passou de ' + LIMITE_MIN + ' min]'; console.log('\n[travou: passou de ' + LIMITE_MIN + ' min — parei este teste]'); matar(p) }, LIMITE_MIN * 60000);
    p.on('close', (codigo) => { clearTimeout(teto); ok({ codigo, saida, travou: saida.includes('[travou:') }) });
  });
}

// Teste de navegador. O resultado que vale é a linha final ("ERROS (0)").
// Quando o teste NÃO chega nela — o Chrome fechou, a página se soltou, travou —
// não é o app que falhou, é a máquina do teste: tenta mais uma vez, e o resumo
// diz que foi na 2ª. Na branch redesenho as jornadas quebraram assim em 3 de 5
// rodadas completas em 11/11/2026 (sozinhas passam; causa não achada).
// Resultado de verdade (ERROS/FALHAS acima de 0) nunca é repetido.
async function deNavegador(titulo, nome, arquivo, linhaFinal, rotulo) {
  let r, n, tentativa = 0;
  do {
    tentativa++;
    r = await rodar(titulo + (tentativa > 1 ? '  (2ª tentativa: a 1ª não chegou ao fim)' : ''), [arquivo]);
    n = (r.saida.match(linhaFinal) || [])[1];
  } while (n === undefined && tentativa < 2);
  const passou = r.codigo === 0 && n === '0';
  const texto = n !== undefined ? rotulo + ' (' + n + ')' + (tentativa > 1 ? ' — na 2ª tentativa; a 1ª não chegou ao fim' : '')
    : r.travou ? 'travou nas duas tentativas' : 'quebrou antes do fim nas duas tentativas — veja o erro acima';
  return [nome, passou, texto];
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

  // O servidor roda em OUTRO processo (este mesmo arquivo com --servidor), não
  // dentro deste. Embutido aqui, a rodada completa quebrou duas vezes na branch
  // redesenho com a página recarregando no meio do teste; com o servidor à
  // parte, passou (11/11/2026). A causa exata não foi achada: a configuração
  // que passa é esta.
  let meu = null;
  if (!await jaTemServidor()) {
    meu = spawn(process.execPath, [fileURLToPath(import.meta.url), '--servidor'], { cwd: RAIZ, stdio: 'ignore' });
    let subiu = false;
    for (let i = 0; i < 40 && !subiu; i++) { await new Promise((r) => setTimeout(r, 250)); subiu = await jaTemServidor() }
    if (!subiu) { console.error('\nO servidor local não subiu na porta ' + PORTA + '. Veja se outra coisa está usando a porta.'); meu.kill(); process.exit(1) }
  }

  const resultado = [];
  const t = await rodar('1/3  node --test', ['--test']);
  resultado.push(['node --test', t.codigo === 0, t.codigo === 0 ? '0 falhas' : 'tem teste falhando']);

  resultado.push(await deNavegador('2/3  pente-fino', 'pente-fino', 'ferramentas/pente-fino.mjs', /ERROS \((\d+)\)/, 'ERROS'));
  resultado.push(await deNavegador('3/3  jornadas (uns 2 minutos)', 'jornadas', 'ferramentas/jornadas.mjs', /FALHAS \((\d+)\)/, 'FALHAS'));

  if (meu) meu.kill();
  console.log('\n━━━ RESUMO ━━━');
  for (const [nome, passou, texto] of resultado) console.log((passou ? '  ✔ ' : '  ✖ ') + nome.padEnd(12) + texto);
  const tudo = resultado.every((r) => r[1]);
  console.log(tudo ? '\nPode subir.\n' : '\nNÃO suba: conserte o que falhou e rode de novo.\n');
  process.exit(tudo ? 0 : 1);
}
