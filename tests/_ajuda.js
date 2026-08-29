// Ferramenta comum dos testes.
//
// O app é um HTML único com o JavaScript inline, sem build e sem módulos —
// não há o que importar. A primeira tentativa foi recortar do arquivo só as
// funções que cada teste precisa; não presta. Recortar exige saber onde uma
// declaração termina, e pra isso é preciso entender literal de expressão
// regular, template string e crase dentro de classe de caractere. O recorte
// engasgou em /[&<>"'`]/ na primeira tentativa. Escrever um interpretador de
// JavaScript pra poder testar JavaScript é trocar um problema por outro maior.
//
// O que sobrou é mais simples e mais fiel: avaliar o script INTEIRO num
// contexto com o mínimo de navegador simulado, exatamente como a página faz, e
// pegar as funções do escopo resultante. Sem recorte, sem parser. De brinde,
// avaliar já é um teste: erro de sintaxe ou referência quebrada aparece aqui
// antes de chegar no navegador de alguém.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');

const lerIndex = () => fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const lerHeaders = () => fs.readFileSync(path.join(RAIZ, '_headers'), 'utf8');
const lerArquivo = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// O último <script> sem src é o do app.
function scriptDoApp() {
  const blocos = [...lerIndex().matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  if (!blocos.length) throw new Error('nenhum script inline no index.html');
  return blocos[blocos.length - 1][1];
}

const nada = () => {};

// Elemento que aceita qualquer coisa sem reclamar. O objetivo não é simular o
// DOM de verdade — é deixar o arquivo terminar de avaliar pra que as funções
// existam. Teste que depende de DOM de verdade não mora aqui.
function elementoFalso() {
  const alvo = {
    style: new Proxy({}, { get: () => '', set: () => true }),
    classList: { add: nada, remove: nada, toggle: nada, contains: () => false },
    dataset: {}, value: '', textContent: '', innerHTML: '', src: '', href: '',
    children: [], childNodes: [], files: [], checked: false, disabled: false,
    offsetWidth: 0, offsetHeight: 0, scrollTop: 0,
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    appendChild: nada, removeChild: nada, remove: nada, insertBefore: nada,
    addEventListener: nada, removeEventListener: nada, setAttribute: nada,
    getAttribute: () => null, removeAttribute: nada, hasAttribute: () => false,
    focus: nada, blur: nada, click: nada, scrollIntoView: nada, closest: () => null,
    querySelector: () => null, querySelectorAll: () => [], contains: () => false
  };
  return new Proxy(alvo, {
    get: (t, p) => (p in t ? t[p] : (typeof p === 'string' ? nada : undefined)),
    set: (t, p, v) => { t[p] = v; return true }
  });
}

// Monta o contexto e avalia. Devolve o escopo — dele saem as funções.
function carregarApp() {
  const el = elementoFalso();
  const doc = {
    getElementById: () => el, querySelector: () => el, querySelectorAll: () => [],
    createElement: () => elementoFalso(), createTextNode: () => el,
    addEventListener: nada, removeEventListener: nada,
    body: el, head: el, documentElement: el, readyState: 'complete',
    cookie: '', title: '', hidden: false, visibilityState: 'visible'
  };
  const armazem = { getItem: () => null, setItem: nada, removeItem: nada, clear: nada, key: () => null, length: 0 };

  // O SDK do Supabase entra por <script src> na página. Aqui ele é um casco:
  // toda a camada de dados do app usa fetch direto, e o SDK só é usado para
  // sessão — que nenhum teste desses exercita.
  const sessaoVazia = { data: { session: null }, error: null };
  const supabase = {
    createClient: () => ({
      auth: {
        getSession: () => Promise.resolve(sessaoVazia),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: nada } } }),
        signInWithOAuth: () => Promise.resolve(sessaoVazia),
        signInWithPassword: () => Promise.resolve(sessaoVazia),
        signUp: () => Promise.resolve(sessaoVazia),
        signOut: () => Promise.resolve({ error: null }),
        exchangeCodeForSession: () => Promise.resolve(sessaoVazia)
      }
    })
  };

  const ctx = {
    console: { log: nada, warn: nada, error: nada, info: nada, debug: nada },
    document: doc, localStorage: armazem, sessionStorage: armazem, supabase,
    // Rede desligada: teste não fala com o Google, com o Supabase nem com
    // ninguém. Qualquer chamada devolve vazio.
    fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
    location: { href: 'https://localhost/', origin: 'https://localhost', search: '', pathname: '/', hash: '', replace: nada, assign: nada, reload: nada },
    navigator: { geolocation: { getCurrentPosition: nada }, userAgent: 'node', language: 'pt-BR', onLine: true, share: undefined, clipboard: { writeText: () => Promise.resolve() } },
    history: { pushState: nada, replaceState: nada, back: nada },
    // setInterval do app roda pra sempre e seguraria o processo depois que os
    // testes acabam — por isso o unref.
    //
    // setTimeout fica INTEIRO de propósito. Eu tinha posto unref nos dois, e
    // aí um teste que espera um timeout do app (o prazo do comPrazo, por
    // exemplo) morria com "Promise resolution is still pending but the event
    // loop has already resolved": o node não esperava o próprio timer que o
    // teste precisava. Timeout termina sozinho; não precisa de unref.
    setTimeout,
    setInterval: (fn, ms, ...a) => { const t = setInterval(fn, ms, ...a); if (t && t.unref) t.unref(); return t },
    clearTimeout, clearInterval, queueMicrotask,
    Promise, JSON, Math, Date, Intl, URL, URLSearchParams, TextEncoder, TextDecoder,
    Error, TypeError, RangeError, Set, Map, WeakMap, WeakSet, Array, Object, String,
    Number, Boolean, RegExp, Symbol, Proxy, Reflect, isFinite, isNaN, parseInt, parseFloat,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    performance: { now: () => 0, getEntriesByType: () => [] },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000', getRandomValues: (a) => a, subtle: {} },
    requestAnimationFrame: nada, cancelAnimationFrame: nada,
    matchMedia: () => ({ matches: false, addEventListener: nada, addListener: nada }),
    addEventListener: nada, removeEventListener: nada, scrollTo: nada, scroll: nada,
    alert: nada, confirm: () => false, prompt: () => null, open: nada, close: nada,
    innerWidth: 375, innerHeight: 812, devicePixelRatio: 2, scrollY: 0, scrollX: 0,
    Image: function () { return elementoFalso() },
    FileReader: function () { return { readAsDataURL: nada, addEventListener: nada } },
    IntersectionObserver: function () { return { observe: nada, disconnect: nada } },
    MutationObserver: function () { return { observe: nada, disconnect: nada } }
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.top = ctx; ctx.parent = ctx;

  vm.createContext(ctx);
  vm.runInContext(scriptDoApp(), ctx, { timeout: 15000, filename: 'index.html (script do app)' });

  // `function f(){}` no topo vira propriedade do contexto; `const X = [...]`
  // não — fica no escopo do script. Um segundo script no MESMO contexto
  // enxerga esse escopo, então é assim que se lê COUNTRIES e companhia.
  ctx.avaliar = (expressao) => vm.runInContext(expressao, ctx, { timeout: 5000 });
  return ctx;
}

// Avalia uma vez só e reaproveita: são ~4200 linhas.
let cache = null;
function app() {
  if (!cache) cache = carregarApp();
  return cache;
}

module.exports = { RAIZ, lerIndex, lerHeaders, lerArquivo, scriptDoApp, app };
