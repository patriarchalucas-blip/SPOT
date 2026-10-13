// Põe a versão em inglês dentro de uma página fixa do site (13/10/2026).
//
//   node ferramentas/pagina-bilingue.cjs privacidade.html en.html "Privacy Policy — Spot"
//
// O texto em português que já está entre <div class="wrap"> e o fim fica
// num <div class="lang-pt">, e o inglês (o arquivo passado) num
// <div class="lang-en">. Um script no <head> mostra a versão da língua do
// navegador antes de desenhar (sem piscar). Rodar de novo troca o inglês.
const fs = require('fs');
const [, , pagina, arqEn, tituloEn] = process.argv;
const NL = '\n';
let h = fs.readFileSync(pagina, 'utf8');
const crlf = h.includes('\r\n');
h = h.split('\r\n').join(NL);
const en = fs.readFileSync(arqEn, 'utf8').split('\r\n').join(NL).trim();

const MARCA_INI = '<!-- versão em inglês (ferramentas/pagina-bilingue.cjs) -->';
const MARCA_FIM = '<!-- /versão em inglês -->';
const FIM = '</div>' + NL + '</body>';
if (h.includes(MARCA_INI)) {
  h = h.slice(0, h.indexOf(MARCA_INI)) + h.slice(h.indexOf(MARCA_FIM) + MARCA_FIM.length + 1);
} else {
  const ini = h.indexOf('<div class="wrap">');
  const fim = h.lastIndexOf(FIM);
  if (ini < 0 || fim < 0) throw new Error('não achei <div class="wrap"> … </div></body> em ' + pagina);
  const a = ini + '<div class="wrap">'.length;
  h = h.slice(0, a) + NL + '<div class="lang-pt" lang="pt-BR">' + h.slice(a, fim) + '</div>' + NL + h.slice(fim);
  const cab = '<style>.lang-en{display:none}html.en .lang-pt{display:none}html.en .lang-en{display:block}</style>' + NL
    + '<script>(function(){var n=(navigator.languages&&navigator.languages[0])||navigator.language||"pt";'
    + 'if(!/^pt/i.test(n)){var d=document.documentElement;d.classList.add("en");d.lang="en";'
    + 'document.addEventListener("DOMContentLoaded",function(){var t=document.querySelector("meta[name=titulo-en]");if(t)document.title=t.content})}})();</script>' + NL
    + '<meta name="titulo-en" content="' + tituloEn.replace(/"/g, '&quot;') + '">' + NL;
  h = h.replace('</head>', cab + '</head>');
}
const fimWrap = h.lastIndexOf(FIM);
h = h.slice(0, fimWrap) + MARCA_INI + NL + '<div class="lang-en" lang="en">' + NL + en + NL + '</div>' + NL + MARCA_FIM + NL + h.slice(fimWrap);
fs.writeFileSync(pagina, crlf ? h.split(NL).join('\r\n') : h);
console.log(pagina + ': ok');
