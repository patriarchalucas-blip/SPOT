/* ═══ SPOT EM INGLÊS — o motor (13/10/2026) ═══
   Carregado SÓ quando a pessoa está em inglês (ver o começo do <head> do
   index.html): quem usa em português roda exatamente o app de antes.

   Como traduz: o app continua escrevendo em português; tudo que chega na tela
   passa por tr(), que troca pelo inglês de i18n/en.js. Um observador de
   mudanças no documento pega o que o script desenha depois (innerHTML,
   textContent, toast, folha), e o pacote que vai pras abas nativas passa por
   trObj() em falarComACasca.

   tr(texto), nesta ordem:
     1. igual a uma frase do dicionário (espaços das pontas preservados);
     2. com os números trocados por {n} ("há 3 dias" → "há {n} dias");
     3. modelos com {x} pra trecho variável ("{x} foi" → "{x} went").
   Não achou: devolve igual — fica em português, nunca some.

   Volta: o que sai traduzido pras abas nativas e volta numa ação (o nome de
   uma região, por exemplo) é destraduzido em voltar(), pro site achar. */
(function () {
  'use strict';
  var D = window.SPOT_EN || {};          // frase → frase
  var MODELOS = window.SPOT_EN_MODELOS || []; // ['{x} foi', '{x} went']
  var LOCALE = 'en-US';

  // País: o nome em inglês sai do próprio sistema (Intl), pela bandeira.
  var paises = null;
  function nomeDePais(s) {
    if (!paises) {
      paises = {};
      try {
        var dn = new Intl.DisplayNames([LOCALE], { type: 'region' });
        (window.COUNTRIES || []).forEach(function (c) {
          var cps = Array.from(c.flag || '').map(function (ch) { return ch.codePointAt(0) - 127397; });
          if (cps.length === 2 && cps.every(function (x) { return x >= 65 && x <= 90; })) {
            var iso = String.fromCharCode(cps[0], cps[1]);
            var en = dn.of(iso);
            if (en && en !== iso) paises[c.name] = en;
          }
        });
      } catch (e) {}
      if (!window.COUNTRIES) { var p = paises; paises = null; return p[s]; }
    }
    return paises[s];
  }

  var compilados = MODELOS.map(function (par) {
    var partes = []; var nomes = [];
    var re = '^' + par[0].replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(x|n)\}/g, function (_, k) {
      nomes.push(k); return k === 'n' ? '(\\d+(?:[.,]\\d+)?)' : '([\\s\\S]+?)';
    }) + '$';
    return { re: new RegExp(re), en: par[1], nomes: nomes, estrito: par[2] === true };
  });
  // Modelo "estrito" (só a ligação: "{x} e {x}", "{x} com {x}") só vale quando
  // cada {x} é coisa do app (tem tradução) ou nome próprio ("Ana", "São
  // Paulo"). Sem isso, a nota da pessoa ("bom e barato") viraria "bom and barato".
  var NOME = /^[A-ZÀ-Ú0-9][^\s]*(?: (?:de|da|do|dos|das|e|del|la|le)?\s?[A-ZÀ-Ú0-9][^\s]*)*$/;
  function seguro(x) { return NOME.test(x) || trNucleo(x) != null; }

  var numEn = function (n) { return String(n).replace(/(\d),(\d)/g, '$1.$2'); };

  function trNucleo(s) {
    if (Object.prototype.hasOwnProperty.call(D, s)) return D[s];
    var pais = nomeDePais(s); if (pais) return pais;
    // números → {n}
    var nums = [];
    var t = s.replace(/\d+(?:[.,]\d+)?/g, function (m) { nums.push(m); return '{n}'; });
    if (nums.length && Object.prototype.hasOwnProperty.call(D, t)) {
      var k = 0; return D[t].replace(/\{n\}/g, function () { return numEn(nums[k++]); });
    }
    for (var i = 0; i < compilados.length; i++) {
      var c = compilados[i]; var m = s.match(c.re);
      if (!m) continue;
      var vals = m.slice(1); var jx = 0; var jn = 0;
      var xs = []; var ns = [];
      c.nomes.forEach(function (nm, idx) { (nm === 'x' ? xs : ns).push(vals[idx]); });
      if (c.estrito && !xs.every(seguro)) continue;
      return c.en.replace(/\{(x|n)\}/g, function (_, nm) {
        if (nm === 'n') return numEn(ns[jn++]);
        var v = xs[jx++]; var r = trNucleo(v); return r == null ? v : r;   // o trecho variável também pode ter tradução
      });
    }
    // Bandeira na frente ("🇮🇹 Itália") e "·" numa ponta ("Gastronomia ·").
    var b = s.match(/^((?:\uD83C[\uDDE6-\uDDFF]){2} )([\s\S]+)$/) || s.match(/^(· )([\s\S]+)$/);
    if (b) { var rb = trNucleo(b[2]); if (rb != null) return b[1] + rb; }
    var f = s.match(/^([\s\S]+?)( ·| ›|:)$/);
    if (f) { var rf = trNucleo(f[1]); if (rf != null) return rf + f[2]; }
    // Pedaços separados por ' · ' ("Lisboa · há 2 dias"): traduz cada um.
    if (s.indexOf(' · ') > 0) {
      var partes = s.split(' · '); var mudou = false;
      var tp = partes.map(function (p) { var r = trNucleo(p); if (r != null) { mudou = true; return r; } return p; });
      if (mudou) return tp.join(' · ');
    }
    return null;
  }

  var cache = new Map();
  // O que o próprio motor escreveu não passa de novo ("Compras" → "Shopping"
  // não pode virar "Mall" quando o observador vê o texto novo).
  var saidas = new Set();
  function tr(s) {
    if (typeof s !== 'string' || !s) return s;
    // Nota sem letra ("4,5★", "4,5"): só o decimal vira ponto.
    if (!/[A-Za-zÀ-ú]/.test(s)) return /^\s*\d,\d★?\s*$/.test(s) ? s.replace(',', '.') : s;
    if (saidas.has(s)) return s;
    if (cache.has(s)) return cache.get(s);
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var nucleo = m[2].replace(/\s+/g, ' ');
    var r = trNucleo(nucleo);
    var out = r == null ? s : m[1] + r + m[3];
    if (cache.size > 5000) cache.clear();
    cache.set(s, out);
    if (out !== s) { if (saidas.size > 5000) saidas.clear(); saidas.add(out); }
    if (r == null && window.__i18nFalta) { try { window.__i18nFalta(nucleo); } catch (e) {} }   // só nos testes
    return out;
  }

  // ── o documento ──
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var PULA = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  function trNo(n) {
    if (!n) return;
    if (n.nodeType === 3) {
      var p = n.parentNode;
      if (p && PULA[p.nodeName]) return;
      var t = tr(n.data); if (t !== n.data) n.data = t;
      return;
    }
    if (n.nodeType !== 1 || PULA[n.nodeName]) return;
    if (n.hasAttribute && n.hasAttribute('data-sem-traduzir')) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = n.getAttribute(ATTRS[i]);
      if (v) { var tv = tr(v); if (tv !== v) n.setAttribute(ATTRS[i], tv); }
    }
    if (n.nodeName === 'INPUT' && (n.type === 'button' || n.type === 'submit') && n.value) {
      var vv = tr(n.value); if (vv !== n.value) n.value = vv;
    }
    for (var c = n.firstChild; c; c = c.nextSibling) trNo(c);
  }

  // ── o pacote das abas nativas ──
  var volta = new Map(); // inglês → português, do que foi traduzido pro app
  var CHAVES_FIXAS = { id: 1, i: 1, pedido: 1, tipo: 1, aba: 1, acao: 1, chave: 1, key: 1, foto: 1, url: 1, username: 1, uid: 1, user_id: 1, trip_id: 1, spot_id: 1, cores: 1, iniciais: 1 };
  function trObj(o, chave) {
    if (typeof o === 'string') {
      if (chave && CHAVES_FIXAS[chave]) return o;
      var t = tr(o); if (t !== o) volta.set(t, o); return t;
    }
    if (Array.isArray(o)) return o.map(function (x) { return trObj(x, chave); });
    if (o && typeof o === 'object') {
      var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = trObj(o[k], k);
      return r;
    }
    return o;
  }
  function voltar(v) { return typeof v === 'string' && volta.has(v) ? volta.get(v) : v; }

  window.SPOT_I18N = { tr: tr, trNo: trNo, trObj: trObj, voltar: voltar, LOCALE: LOCALE };

  if (window.IDIOMA !== 'en') return;
  var obs = new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === 'characterData') trNo(m.target);
      else if (m.type === 'attributes') { var el = m.target; var v = el.getAttribute(m.attributeName); if (v) { var t = tr(v); if (t !== v) el.setAttribute(m.attributeName, t); } }
      else for (var j = 0; j < m.addedNodes.length; j++) trNo(m.addedNodes[j]);
    }
  });
  obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener('DOMContentLoaded', function () { trNo(document.documentElement); });
})();
