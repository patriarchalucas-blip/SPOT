import { lerKV } from '../api/_kv.js';

// Cloudflare Pages Function — a LISTA PÚBLICA de spots: meuspot.app/l/<código>.
// Desenho: handoff "crescimento", fluxo 1 (1a–1f), 30/09/2026.
//
// Quem recebe o link vê os spots de uma pessoa numa cidade, com a nota e a
// frase de quem foi, SEM conta e sem instalar nada; o convite vem no fim,
// depois que a lista já provou o valor.
//
// O link é criado por functions/api/lista.js, que guarda no KV só "de quem" e
// "quais cidades". Os spots são lidos aqui, na hora, com a chave de serviço.
//
// NUNCA APARECE: a nota privada ("por que te chamou atenção", my_note), os
// spots em "Não recomendo" e os de outras cidades. Link revogado → 410.
//
// Texto sem gênero: o app não sabe o gênero de ninguém ("Os spots de Lucas",
// "Lucas guarda os spots no Spot"), diferente do desenho, que usava "do"/"dele".
// A prévia do WhatsApp sai daqui (o robô dele não roda JavaScript).

const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
// O convite leva à LANDING (que tem o selo da App Store e o 'use no navegador')
// enquanto a 1.0 não sai da revisão da Apple: o link da loja daria erro até lá.
// Aprovado o app, trocar por 'https://apps.apple.com/br/app/id6814856044'.
const LOJA = '/sobre';
const CATEGORIA = { food: 'Comer', hotel: 'Ficar', experience: 'Experiências' };
const SUBCAT = { natureza: 'Natureza', nightlife: 'Nightlife', wellness: 'Wellness', cultura: 'Cultura', passeio: 'Passeio', compras: 'Compras' };
const GENERICOS = ['Comer & Beber', 'Onde Ficar', 'Experiência'];

export function esc(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// A foto passa sempre pelo nosso servidor (/api/place-photo), que tem a chave
// do Google. URL gravada no formato antigo, direto no Google, é convertida.
export function fotoDoSpot(u, largura) {
  const s = String(u || '');
  const m = s.match(/^https:\/\/places\.googleapis\.com\/v1\/(places\/[^/]+\/photos\/[^/]+)\/media\?/i);
  if (m) return '/api/place-photo?ref=' + encodeURIComponent(m[1]) + '&w=' + largura;
  if (/^\/api\/place-photo\?ref=[^&]+&w=\d+$/.test(s)) return s.replace(/&w=\d+$/, '&w=' + largura);
  if (/^https:\/\/kzidnilsyrvauzgelsqd\.supabase\.co\/storage\//.test(s)) return s;
  return '';
}
// O rótulo da linha: o tipo de experiência ("Passeio"), senão o tipo gravado
// quando diz algo ("Portuguesa"), senão a categoria.
export function rotuloDoSpot(s) {
  const sub = String(s.subcategory || '').split(',').map((k) => SUBCAT[k.trim()]).filter(Boolean);
  if (sub.length) return sub.join(' · ');
  const pt = String(s.place_type || '').trim();
  if (pt && !GENERICOS.includes(pt)) return pt;
  return s.category === 'hotel' ? 'Hospedagem' : (CATEGORIA[s.category] || '');
}
// Estrelas: a de baixo cinza, a de cima verde cortada — como no app (meia estrela existe).
function estrelas(n) {
  const v = Number(n) || 0;
  if (!v) return '';
  const D = 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8z';
  let h = '<span class="st" aria-label="' + esc(String(v).replace('.', ',')) + ' de 5">';
  for (let i = 1; i <= 5; i++) {
    const corte = i <= v ? 0 : (i - 0.5 <= v ? 50 : 100);
    h += '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + D + '" fill="#D6D6D2"/>'
      + (corte < 100 ? '<path d="' + D + '" fill="#0B3D2E" clip-path="inset(0 ' + corte + '% 0 0)"/>' : '') + '</svg>';
  }
  return h + '</span>';
}
const ESTILO = `:root{--base:#F5F5F3;--surface:#E9E9E6;--ink:#111;--ink2:#6B6B67;--ink3:#9A9A96;--green:#0B3D2E;--vazio:#6E7F73}
*{box-sizing:border-box}html,body{margin:0;background:var(--base);color:var(--ink);font-family:'Inter Tight',-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
.w{max-width:480px;margin:0 auto;padding:calc(24px + env(safe-area-inset-top,0px)) 20px calc(40px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:24px}
.av{width:40px;height:40px;border-radius:12px;background:var(--green) center/cover;color:var(--base);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px}
h1{margin:0;font-size:34px;font-weight:700;letter-spacing:-.04em;line-height:1.02;color:var(--green);text-wrap:balance}
.sub{margin:6px 0 0;font-size:15px;color:var(--ink2)}
h2{margin:0 0 14px;font-size:20px;font-weight:700;letter-spacing:-.02em}
h2 small,.aba small{margin-left:6px;font-size:15px;font-weight:400;color:var(--ink3)}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.fui{gap:18px}.quero{gap:14px}
.l{display:flex;gap:14px;align-items:flex-start;color:inherit;text-decoration:none}
.l:active{opacity:.7}
.seta{flex:none;align-self:center;font-size:18px;color:var(--ink3)}
.f{flex:none;border-radius:14px;overflow:hidden;background:var(--vazio)}
.fui .f{width:76px;height:76px}.quero .f{width:56px;height:56px}.quero .l{align-items:center}
.f img{width:100%;height:100%;object-fit:cover;display:block}
.t{flex:1;min-width:0}
.n{font-size:17px;font-weight:600;letter-spacing:-.02em}
.m{margin-top:2px;font-size:14px;color:var(--ink2);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.st{display:inline-flex;gap:1px}.st svg{width:13px;height:13px;display:block}
.r{margin:6px 0 0;font-size:15px;line-height:1.4}
.abas{display:flex;gap:20px}
.aba{border:none;background:none;padding:0 0 6px;font:inherit;font-size:15px;font-weight:600;color:var(--ink3);cursor:pointer}
.aba.on{color:var(--ink);box-shadow:inset 0 -2px 0 var(--ink)}
.aba.on small{color:var(--ink2)}
.cats{display:flex;gap:18px;margin-top:14px;font-size:14px}
.cat{border:none;background:none;padding:0;font:inherit;color:var(--ink2);cursor:pointer}
.cat.on{color:var(--ink);font-weight:600}
.convite{background:var(--surface);border-radius:14px;padding:20px}
.convite b{display:block;font-size:17px;font-weight:600;letter-spacing:-.02em}
.convite p{margin:4px 0 16px;font-size:15px;color:var(--ink2)}
.btn{display:flex;align-items:center;justify-content:center;height:48px;border-radius:10px;background:var(--green);color:var(--base);font-size:16px;font-weight:600;text-decoration:none}
.btn2{background:var(--surface);color:var(--ink)}`;

function cabecalho(titulo, desc, ogImg, url, extra) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title><meta name="robots" content="noindex">
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Spot">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500&family=Inter+Tight:wght@400;600;700&display=swap" rel="stylesheet">
<style>${ESTILO}${extra || ''}</style></head><body>`;
}

// Tocar no spot abre ele no mapa (Google Maps): é o que quem recebeu a lista quer
// fazer — ver onde fica e ir. O endereço do Maps já vem gravado no spot; sem
// ele, uma busca pelo nome + cidade.
export function linkDoMapa(s) {
  const m = String(s.maps_url || '');
  if (/^https:\/\/(maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(m)) return m;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([s.name, s.address || s.city].filter(Boolean).join(', '));
}
export function paginaDaLista({ nome, avatar, titulo, pais, spots, origem, codigo }) {
  const fui = spots.filter((s) => s.status === 'been')
    .sort((a, b) => (Number(b.my_rating) || 0) - (Number(a.my_rating) || 0) || String(a.name).localeCompare(String(b.name), 'pt-BR'));
  const quero = spots.filter((s) => s.status === 'want');
  const primeiro = String(nome || '').trim().split(/\s+/)[0] || 'Alguém';
  const h1 = 'Os spots de ' + primeiro + ' em ' + titulo;
  const total = fui.length + quero.length;
  const soQuero = !fui.length && quero.length;
  const muitos = total > 10;
  // A imagem da prévia sai de /l/capa/<código>, que entrega os bytes (o
  // WhatsApp não seguia o redirecionamento de /api/place-photo).
  const ogImg = origem + '/l/capa/' + codigo;
  // Lista de país (várias cidades): a cidade de cada spot entra na linha.
  const variasCidades = new Set(spots.map((s) => String(s.city || '').trim()).filter(Boolean)).size > 1;
  const rotulo = (s) => rotuloDoSpot(s) + (variasCidades && s.city ? ' · ' + String(s.city).trim() : '');
  const linhaFui = (s) => {
    const f = fotoDoSpot(s.photo_url, 240), rev = String(s.my_review || '').trim();
    return '<li data-cat="' + esc(s.category) + '"><a class="l" href="' + esc(linkDoMapa(s)) + '" target="_blank" rel="noopener"><div class="f">' + (f ? '<img src="' + esc(f) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>'
      + '<div class="t"><div class="n">' + esc(s.name) + '</div><div class="m"><span>' + esc(rotulo(s)) + '</span>' + estrelas(s.my_rating) + '</div>'
      + (rev ? '<p class="r">' + esc(rev) + '</p>' : '') + '</div><span class="seta">›</span></a></li>';
  };
  const linhaQuero = (s) => {
    const f = fotoDoSpot(s.photo_url, 180);
    return '<li data-cat="' + esc(s.category) + '"><a class="l" href="' + esc(linkDoMapa(s)) + '" target="_blank" rel="noopener"><div class="f">' + (f ? '<img src="' + esc(f) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>'
      + '<div class="t"><div class="n">' + esc(s.name) + '</div><div class="m">' + esc(rotulo(s)) + '</div></div><span class="seta">›</span></a></li>';
  };
  const paisNoSub = pais && pais !== titulo ? pais : '';
  const sub = soQuero ? [paisNoSub, total + (total === 1 ? ' spot que quer conhecer' : ' spots que quer conhecer')]
    : [paisNoSub, total + (total === 1 ? ' spot' : ' spots')];
  let corpo = '';
  if (muitos) {
    // Mais de 10: Fui e Quero ir viram abas, e as categorias filtram. Sem
    // JavaScript, as duas seções ficam visíveis uma embaixo da outra.
    const conta = (l, c) => l.filter((s) => s.category === c).length;
    const cats = (l, id) => '<div class="cats" data-de="' + id + '">' + ['food', 'hotel', 'experience'].filter((c) => conta(l, c))
      .map((c) => '<button class="cat" data-cat="' + c + '">' + CATEGORIA[c] + ' ' + conta(l, c) + '</button>').join('') + '</div>';
    corpo = '<section><div class="abas" role="tablist">'
      + (fui.length ? '<button class="aba on" data-aba="fui">Fui<small>' + fui.length + '</small></button>' : '')
      + (quero.length ? '<button class="aba' + (fui.length ? '' : ' on') + '" data-aba="quero">Quero ir<small>' + quero.length + '</small></button>' : '')
      + '</div>'
      + (fui.length ? '<div class="painel" data-painel="fui">' + cats(fui, 'fui') + '<ul class="fui" style="margin-top:18px">' + fui.map(linhaFui).join('') + '</ul></div>' : '')
      + (quero.length ? '<div class="painel" data-painel="quero">' + cats(quero, 'quero') + '<ul class="quero" style="margin-top:18px">' + quero.map(linhaQuero).join('') + '</ul></div>' : '')
      + '</section>';
  } else {
    if (fui.length) corpo += '<section><h2>Fui<small>' + fui.length + '</small></h2><ul class="fui">' + fui.map(linhaFui).join('') + '</ul></section>';
    // Só Quero ir: sem título de seção — o subtítulo já diz o que é a lista.
    if (quero.length) corpo += '<section>' + (soQuero ? '' : '<h2>Quero ir<small>' + quero.length + '</small></h2>') + '<ul class="quero">' + quero.map(linhaQuero).join('') + '</ul></section>';
  }
  const js = muitos ? `<script>(function(){var abas=document.querySelectorAll('.aba'),pai=document.querySelectorAll('.painel');
function mostra(a){abas.forEach(function(b){b.classList.toggle('on',b.dataset.aba===a)});pai.forEach(function(p){p.style.display=p.dataset.painel===a?'':'none'})}
abas.forEach(function(b){b.onclick=function(){mostra(b.dataset.aba)}});var on=document.querySelector('.aba.on');if(on)mostra(on.dataset.aba);
document.querySelectorAll('.cats').forEach(function(c){var lista=c.parentNode.querySelector('ul');c.querySelectorAll('.cat').forEach(function(b){b.onclick=function(){
var ligar=!b.classList.contains('on');c.querySelectorAll('.cat').forEach(function(x){x.classList.remove('on')});if(ligar)b.classList.add('on');
lista.querySelectorAll('li').forEach(function(li){li.style.display=!ligar||li.dataset.cat===b.dataset.cat?'':'none'})}})})})();</script>` : '';
  const av = avatar ? '<div class="av" style="background-image:url(\'' + esc(avatar) + '\')"></div>' : '<div class="av">' + esc(primeiro.charAt(0).toUpperCase()) + '</div>';
  return cabecalho(h1, total + (total === 1 ? ' spot no Spot' : ' spots no Spot'), ogImg, origem + '/l/' + codigo)
    + '<main class="w"><div>' + av + '</div><div><h1>' + esc(h1) + '</h1><p class="sub">' + esc(sub.filter(Boolean).join(' · ')) + '</p></div>'
    + corpo
    + '<div class="convite"><b>' + esc(primeiro) + ' guarda os spots no Spot.</b><p>Salve os seus e veja onde seus amigos foram.</p>'
    + '<a class="btn" href="' + esc(LOJA + (LOJA.includes('apple.com') ? '?ct=l_' : '?ref=l_') + codigo) + '">Conhecer o Spot</a></div>'
    + '</main>' + js + '</body></html>';
}

export function paginaQueSumiu(origem, status) {
  return new Response(cabecalho('Esta lista não está mais aqui · Spot', 'Quem compartilhou pode ter parado de compartilhar.', origem + '/compartilhar.png', origem + '/sobre',
    '.fim{min-height:80vh;justify-content:center}.marca{width:88px;align-self:center}.fim h1{color:var(--ink);font-size:28px}')
    + '<main class="w fim"><svg class="marca" viewBox="3 77 273 76" role="img" aria-label="SPOT"><text x="0" y="150" font-family="Cinzel" font-weight="500" font-size="100" letter-spacing="6" fill="#0B3D2E">SPOT</text></svg>'
    + '<div><h1>Esta lista não está mais aqui</h1><p class="sub">Quem compartilhou pode ter parado de compartilhar. Peça um link novo.</p></div>'
    + '<a class="btn btn2" href="/sobre">Conhecer o Spot</a></main></body></html>',
    { status: status || 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const codigo = String(params.codigo || '');
  const origem = new URL(request.url).origin;
  if (!/^[A-Za-z0-9]{8,24}$/.test(codigo) || !env.SUPABASE_SERVICE_KEY) return paginaQueSumiu(origem, 404);
  let dado = null;
  try { dado = JSON.parse((await lerKV(env, 'lista_' + codigo)) || 'null') } catch (e) {}
  if (dado && dado.revogado) return paginaQueSumiu(origem, 410);
  if (!dado || !dado.uid || !Array.isArray(dado.cidades) || !dado.cidades.length) return paginaQueSumiu(origem, 404);

  const sb = (caminho) => fetch(SB_URL + caminho, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } });
  const lista = dado.cidades.map((c) => '"' + String(c).replace(/["\\]/g, '') + '"').join(',');
  const [rs, rp] = await Promise.all([
    sb('/rest/v1/spots?select=name,category,subcategory,place_type,status,my_rating,my_review,photo_url,maps_url,address,city,created_at&user_id=eq.' + dado.uid
      + '&status=in.(been,want)&city=in.(' + encodeURIComponent(lista) + ')&order=created_at.desc&limit=300'),
    sb('/rest/v1/profiles?select=display_name,username,avatar_url&id=eq.' + dado.uid)
  ]);
  const spots = rs.ok ? await rs.json() : [];
  const perfil = rp.ok ? ((await rp.json())[0] || {}) : {};
  const avatar = /^https:\/\/kzidnilsyrvauzgelsqd\.supabase\.co\/storage\//.test(String(perfil.avatar_url || '')) ? perfil.avatar_url : '';
  // O nome: o do perfil; senão o que o app mandou ao criar o link (o do login
  // do Google — o perfil de muita gente só tem o username, e a prévia saía
  // 'Os spots de patriarchalucas'); o username só em último caso.
  const html = paginaDaLista({ nome: perfil.display_name || dado.nome || perfil.username || '', avatar, titulo: dado.titulo || dado.cidades[0],
    pais: dado.pais || '', spots, origem, codigo });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
