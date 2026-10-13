// Lista os textos do app que aparecem pra pessoa (13/10/2026, app em inglês).
//
//   node ferramentas/i18n-extrair.mjs            → todos os candidatos
//   node ferramentas/i18n-extrair.mjs --faltando → só os que i18n/en.js ainda não traduz
//
// De onde saem: (1) o HTML fixo do index.html (texto e placeholder/aria-label/
// title/alt) e (2) os textos entre aspas do script, inclusive os pedaços de
// HTML montado em string. É heurística: sobra um pouco de código no meio,
// e o que é montado por concatenação ("há " + n + " dias") sai em pedaços —
// esses viram modelo com {n} ou {x} em i18n/en.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(raiz, 'index.html'), 'utf8');

const achados = new Map(); // texto → onde
const pt = /[a-zà-úç]/i;
function pareceTexto(s) {
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length < 2 || !pt.test(s)) return null;
  if (/^[a-z0-9_\-.:#/]+$/i.test(s) && !/^[A-ZÀ-Ú]/.test(s) && !/[à-úç]/i.test(s)) return null; // identificador
  if (/^(https?:|\/|\.|#|data:|var\(|rgba?\(|[a-z-]+:[^ ]|\$\{)/i.test(s)) return null;
  if (/[{};=]|=>|\|\||&&/.test(s) && !/[à-úç]/i.test(s)) return null;   // código
  if (/^[a-z]+([A-Z][a-z]+)+$/.test(s)) return null;                       // camelCase
  if (/^(px|em|rem|vh|vw|ms|s)$/.test(s)) return null;
  if (!/[aeiouà-ú]/i.test(s)) return null;
  return s;
}
const anota = (s, onde) => { const t = pareceTexto(s); if (t && !achados.has(t)) achados.set(t, onde); };

function doHTML(frag, onde) {
  frag.replace(/(?:placeholder|aria-label|title|alt|data-placeholder)\s*=\s*"([^"]*)"/g, (_, v) => { anota(v, onde); return ''; });
  frag.replace(/(?:placeholder|aria-label|title|alt)\s*=\s*\\?'([^'\\]*)\\?'/g, (_, v) => { anota(v, onde); return ''; });
  const semComent = frag.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ');
  semComent.split(/<[^>]*>/).forEach((t) => anota(t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'), onde));
}

// (1) marcação fixa
const corpo = html.slice(html.indexOf('<body'), html.indexOf('<script>', html.indexOf('<body')));
doHTML(corpo, 'html');

// (2) strings do script: tokeniza de verdade (comentário, regex e template)
const ini = html.indexOf('<script>', html.indexOf('<body')) + 8;
const fim = html.lastIndexOf('</script>');
const js = html.slice(ini, fim);
let i = 0; let linha = 1;
const linhaDe = (pos) => { return js.slice(0, pos).split('\n').length + html.slice(0, ini).split('\n').length - 1; };
function lerString(q, pos) {
  let s = ''; pos++;
  while (pos < js.length && js[pos] !== q) {
    if (js[pos] === '\\') { const c = js[pos + 1]; s += c === 'n' ? '\n' : c; pos += 2; continue; }
    if (q === '`' && js[pos] === '$' && js[pos + 1] === '{') { // ${...} vira separador
      let prof = 1; pos += 2; s += '\u0000';
      while (pos < js.length && prof) { if (js[pos] === '{') prof++; else if (js[pos] === '}') prof--; pos++; }
      continue;
    }
    s += js[pos]; pos++;
  }
  return [s, pos + 1];
}
let anterior = '';
while (i < js.length) {
  const c = js[i];
  if (c === '/' && js[i + 1] === '/') { i = js.indexOf('\n', i); if (i < 0) break; continue; }
  if (c === '/' && js[i + 1] === '*') { i = js.indexOf('*/', i) + 2; continue; }
  if (c === '/' && /[(,=:[!&|?{};\n]\s*$|return\s*$|^\s*$/.test(anterior.slice(-12))) { // regex literal
    i++; let cl = false;
    while (i < js.length && (js[i] !== '/' || cl)) { if (js[i] === '\\') i++; else if (js[i] === '[') cl = true; else if (js[i] === ']') cl = false; i++; }
    i++; while (/[a-z]/i.test(js[i])) i++; anterior = 'x'; continue;
  }
  if (c === '"' || c === "'" || c === '`') {
    const [s, prox] = lerString(c, i);
    const onde = 'js:' + linhaDe(i);
    s.split('\u0000').forEach((p) => (/[<>]/.test(p) ? doHTML(p, onde) : anota(p, onde)));
    i = prox; anterior = 's'; continue;
  }
  anterior += c; if (anterior.length > 40) anterior = anterior.slice(-40);
  i++;
}

let lista = [...achados.keys()];
if (process.argv.includes('--faltando')) {
  const ctx = { window: {}, document: { documentElement: {}, addEventListener() {} }, MutationObserver: function () { this.observe = () => {}; }, navigator: {} };
  Object.assign(ctx, { Intl, Map, Set, Array, String, Object, RegExp, JSON });
  vm.createContext(ctx); vm.runInContext(readFileSync(path.join(raiz, 'i18n/en.js'), 'utf8'), ctx); vm.runInContext(readFileSync(path.join(raiz, 'i18n/motor.js'), 'utf8'), ctx);
  const tr = ctx.window.SPOT_I18N && ctx.window.SPOT_I18N.tr;
  lista = lista.filter((s) => tr(s) === s);
}
writeFileSync(path.join(raiz, '_local/i18n-textos.json'), JSON.stringify(lista.map((s) => [s, achados.get(s)]), null, 0).replace(/\],\[/g, '],\n['));
console.log(lista.length + ' textos → _local/i18n-textos.json');
