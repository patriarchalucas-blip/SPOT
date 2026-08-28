const { test } = require('node:test');
const assert = require('node:assert');
const { lerIndex, lerHeaders, scriptDoApp } = require('./_ajuda.js');

// ESTE ARQUIVO EXISTE POR CAUSA DE UM ERRO ESPECÍFICO.
//
// Ao apertar a Content-Security-Policy eu deixei de fora o domínio pro qual a
// foto do Places redireciona, e TODA foto de restaurante, hotel e experiência
// parou de carregar em produção. Eu tinha "testado" — com uma foto do
// Unsplash, que vinha de outro domínio e continuava passando. O defeito só
// apareceu quando o Lucas usou o app.
//
// A CSP e o código são dois arquivos que precisam concordar e não têm nada que
// os obrigue a isso. É o tipo de coisa que ninguém revisa de olho.

function diretivas() {
  const linha = lerHeaders().split('\n').find(l => l.includes('Content-Security-Policy'));
  assert.ok(linha, 'nao existe Content-Security-Policy no _headers');
  const mapa = {};
  linha.slice(linha.indexOf(':') + 1).split(';').forEach(p => {
    const t = p.trim().split(/\s+/);
    if (t[0]) mapa[t[0]] = t.slice(1);
  });
  return mapa;
}

// Um host é permitido se está listado ou se casa com um curinga (*.dominio).
function permitido(lista, host) {
  return (lista || []).some(p => {
    if (p === "'self'" || p.startsWith("'")) return false;
    const limpo = p.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (limpo === host) return true;
    if (limpo.startsWith('*.')) return host.endsWith(limpo.slice(1));
    return false;
  });
}

test('todo host que o codigo busca esta em connect-src', () => {
  const js = scriptDoApp();
  const hosts = new Set();
  // fetch('https://host/...') escrito literalmente no código
  for (const m of js.matchAll(/fetch\(\s*'https:\/\/([a-z0-9.*-]+)/gi)) hosts.add(m[1]);
  // loadScript(['https://host/...', 'https://host2/...'])
  for (const m of js.matchAll(/loadScript\(\[([^\]]+)\]/g)) {
    for (const u of m[1].matchAll(/'https:\/\/([a-z0-9.*-]+)/gi)) hosts.add(u[1]);
  }
  assert.ok(hosts.size > 0, 'nao achei nenhum host no codigo — o extrator quebrou');

  const d = diretivas();
  const faltando = [...hosts].filter(h => !permitido(d['connect-src'], h) && !permitido(d['script-src'], h));
  assert.deepStrictEqual(faltando, [],
    'o codigo busca esses hosts e a CSP bloqueia: ' + faltando.join(', '));
});

test('o destino do redirecionamento da foto esta em img-src', () => {
  // /api/place-photo devolve 302 pro CDN do Google. A CSP vale pro DESTINO do
  // redirecionamento, não pra origem — foi exatamente isso que me escapou.
  const d = diretivas();
  assert.ok(permitido(d['img-src'], 'lh3.googleusercontent.com'),
    'img-src nao cobre o CDN pra onde a foto do Places redireciona; '
    + 'toda foto de estabelecimento fica quebrada');
});

test('img-src cobre as proprias rotas do site', () => {
  const d = diretivas();
  assert.ok((d['img-src'] || []).includes("'self'"),
    "img-src precisa de 'self': as fotos passam por /api/place-photo");
});

test('as travas basicas da CSP continuam de pe', () => {
  const d = diretivas();
  assert.deepStrictEqual(d['object-src'], ["'none'"]);
  assert.deepStrictEqual(d['base-uri'], ["'none'"]);
  assert.deepStrictEqual(d['frame-ancestors'], ["'none'"], 'sem isso o site pode ser posto num iframe alheio');
  assert.deepStrictEqual(d['default-src'], ["'self'"]);
});

test('nenhuma diretiva libera geral', () => {
  const d = diretivas();
  for (const [nome, valores] of Object.entries(d)) {
    if (nome === 'Content-Security-Policy') continue;
    assert.ok(!valores.includes('*'), nome + ' esta liberado pra qualquer origem');
    assert.ok(!valores.includes("'unsafe-eval'"), nome + " permite eval");
  }
});

test('os cabecalhos de protecao continuam no lugar', () => {
  const h = lerHeaders();
  assert.ok(/X-Content-Type-Options:\s*nosniff/i.test(h));
  assert.ok(/Referrer-Policy:/i.test(h));
});

test('o manifest e o icone do PWA existem de verdade', () => {
  // Sem isso, "Adicionar a Tela de Inicio" instala um icone quebrado.
  const fs = require('node:fs'), path = require('node:path');
  const html = lerIndex();
  for (const m of html.matchAll(/(?:href|src)="\/([a-zA-Z0-9._-]+\.(?:json|png|webmanifest))"/g)) {
    const arquivo = path.join(__dirname, '..', m[1]);
    assert.ok(fs.existsSync(arquivo), 'o index.html aponta pra /' + m[1] + ' e o arquivo nao existe');
  }
});

// ── o que pode deixar a tela branca ──────────────────────────────────────────

test('nenhum script externo bloqueia o desenho da pagina', () => {
  // ISTO ACONTECEU. O SDK do Supabase era carregado do cdn.jsdelivr por um
  // <script src> no <head>, sem defer e sem async. O navegador para de
  // desenhar a pagina ate esse arquivo chegar — entao uma rede que demorasse
  // ou bloqueasse aquele dominio deixava o app em TELA BRANCA. E num app
  // instalado na tela de inicio nao ha barra de endereco pra recarregar: a
  // unica saida e fechar pela multitarefa.
  //
  // Nao da pra so colocar defer: o codigo inline no fim do body usa
  // supabase.createClient assim que roda, e defer executaria depois dele. A
  // saida e o arquivo ser servido pelo proprio site — se o HTML chegou, ele
  // chega junto.
  const html = lerIndex();
  const cabeca = html.slice(0, html.indexOf('</head>'));
  const externos = [...cabeca.matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi)]
    .filter(m => /^https?:\/\//i.test(m[2]))
    .filter(m => !/\b(defer|async)\b/i.test(m[1] + m[3]))
    .map(m => m[2]);
  assert.deepStrictEqual(externos, [],
    'script externo bloqueante no <head>: se esse host falhar, o app abre em branco');
});

test('o arquivo do SDK existe de verdade no repositorio', () => {
  const fs = require('node:fs'), path = require('node:path');
  const html = lerIndex();
  for (const m of html.matchAll(/<script[^>]*src="\/([^"]+\.js)"/g)) {
    const arquivo = path.join(__dirname, '..', m[1]);
    assert.ok(fs.existsSync(arquivo),
      'o index.html carrega /' + m[1] + ' e o arquivo nao esta no repo — tela branca na certa');
    assert.ok(fs.statSync(arquivo).size > 1000, '/' + m[1] + ' esta vazio ou truncado');
  }
});
