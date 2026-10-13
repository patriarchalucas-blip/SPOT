// O app em inglês (13/10/2026): o motor (i18n/motor.js + i18n/en.js) e as
// páginas que o servidor monta (/c/ e /l/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function motor() {
  const ctx = { window: { IDIOMA: 'pt' }, document: { documentElement: {}, addEventListener() {} }, MutationObserver: function () { this.observe = () => {}; }, Intl, Map, Set, Array, String, Object, RegExp, JSON };
  ctx.window.COUNTRIES = [{ flag: '🇮🇹', name: 'Itália' }, { flag: '🇧🇷', name: 'Brasil' }, { flag: '🇩🇪', name: 'Alemanha' }];
  vm.createContext(ctx);
  vm.runInContext(readFileSync('i18n/en.js', 'utf8'), ctx);
  vm.runInContext(readFileSync('i18n/motor.js', 'utf8'), ctx);
  return ctx.window.SPOT_I18N;
}

test('frases fixas, números e nomes', () => {
  const { tr } = motor();
  assert.equal(tr('Quero ir'), 'Want to go');
  assert.equal(tr('  Salvar spot '), '  Save spot ');            // espaços das pontas ficam
  assert.equal(tr('há 3 dias'), '3 days ago');
  assert.equal(tr('Ana foi 4,5★'), 'Ana went · 4.5★');            // decimal vira ponto
  assert.equal(tr('Lisboa · há 2 dias'), 'Lisbon · 2 days ago');
  assert.equal(tr('Mora em São Paulo'), 'Lives in São Paulo');
  assert.equal(tr('6 de out.'), 'Oct 6');
});

test('país pela bandeira, e ligações só entre nomes', () => {
  const { tr } = motor();
  assert.equal(tr('Alemanha'), 'Germany');
  assert.equal(tr('Itália e Brasil'), 'Italy and Brazil');
  assert.equal(tr('🇮🇹 Itália'), '🇮🇹 Italy');
  // nota de alguém não pode sair meio traduzida
  assert.equal(tr('bom e barato'), 'bom e barato');
  assert.equal(tr('não sei como foi'), 'não sei como foi');
  assert.equal(tr('Pedi o polvo, vale muito'), 'Pedi o polvo, vale muito');
});

test('o que o motor escreveu não é traduzido de novo; pacote nativo volta em português', () => {
  const { tr, trObj, voltar } = motor();
  assert.equal(tr('Compras'), 'Shopping');
  assert.equal(tr('Shopping'), 'Shopping');                       // não vira "Mall"
  const p = trObj({ tipo: 'explorar', id: 'Europa', regioes: [{ nome: 'Europa' }] });
  assert.equal(p.id, 'Europa');                                   // chave fixa não traduz
  assert.equal(p.regioes[0].nome, 'Europe');
  assert.equal(voltar('Europe'), 'Europa');                       // a ação nativa volta pro site em português
});

test('sem tradução: devolve igual (fica em português, nunca some)', () => {
  const { tr } = motor();
  assert.equal(tr('Taberna da Rua das Flores'), 'Taberna da Rua das Flores');
  assert.equal(tr(''), '');
  assert.equal(tr('42'), '42');
});

test('o dicionário não tem cadeia (tradução que é chave de outra)', () => {
  const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(readFileSync('i18n/en.js', 'utf8'), ctx);
  const D = ctx.window.SPOT_EN; const ruins = [];
  for (const [k, v] of Object.entries(D)) if (v !== k && D[v] !== undefined && D[v] !== v && v !== 'Shopping') ruins.push(k + ' → ' + v + ' → ' + D[v]);
  assert.deepEqual(ruins, []);
});

test('index.html carrega o inglês só pra quem está em inglês, com </script> escapado', () => {
  const html = readFileSync('index.html', 'utf8');
  const cab = html.slice(0, html.indexOf('</head>'));
  assert.match(cab, /window\.IDIOMA=\(e==='pt'\|\|e==='en'\)\?e:\(\/\^pt\/i\.test\(n\)\?'pt':'en'\)/);
  assert.match(cab, /document\.write\('<script src="\/i18n\/en\.js"><\\\/script><script src="\/i18n\/motor\.js"><\\\/script>'\)/);
});

test('/l/ sai com o carregador do inglês escapado; /c/ em inglês pela língua de quem pede', async () => {
  const l = await import('../functions/l/[codigo].js');
  const rl = await l.onRequestGet({ params: { codigo: 'x' }, request: new Request('https://meuspot.app/l/x'), env: {} });
  const hl = await rl.text();
  assert.ok(hl.includes('document.write(\'<script src="/i18n/en.js"><\\/script>'), 'o </script> sairia cru e quebraria a página');
  globalThis.fetch = async () => new Response(JSON.stringify([{ display_name: 'Ana Ribeiro', lugares: 3, cidades: 1, fotos: [] }]), { status: 200 });
  const c = await import('../functions/c/[codigo].js');
  const pede = (lingua) => c.onRequestGet({ params: { codigo: 'abcd1234' }, request: new Request('https://meuspot.app/c/abcd1234', { headers: lingua ? { 'Accept-Language': lingua, 'User-Agent': 'WhatsApp/2' } : { 'User-Agent': 'WhatsApp/2' } }), env: {} });
  const en = await (await pede('en-US,en;q=0.9')).text();
  assert.match(en, /Ana Ribeiro invited you to Spot/);
  assert.match(en, /See the 3 spots Ana recommends/);
  const pt = await (await pede('pt-BR')).text();
  assert.match(pt, /Ana Ribeiro te convidou pro Spot/);
  const sem = await (await pede('')).text();
  assert.match(sem, /te convidou pro Spot/);
  assert.equal((await pede('en')).headers.get('Vary'), 'Accept-Language');
});
