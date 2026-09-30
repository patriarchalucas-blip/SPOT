import { lerKV } from '../api/_kv.js';

// Cloudflare Pages Function — a LISTA PÚBLICA de spots: meuspot.app/l/<código>.
//
// Quem recebe o link vê os spots de uma pessoa numa cidade, com a nota e o que
// ela escreveu, SEM precisar de conta — e no fim, o convite pra conhecer o
// Spot. É a página que faz alguém de fora entender o app (30/09/2026).
//
// O link é criado por functions/api/lista.js, que guarda no KV só "de quem" e
// "quais cidades". Os spots são lidos aqui, na hora, com a chave de serviço:
// o que aparece é sempre a lista de hoje. Só campos que a pessoa escreveu pra
// mostrar: nome, categoria, Fui/Quero ir, nota e a avaliação. A nota privada
// de "por que te chamou atenção" (my_note) NÃO entra.
//
// A prévia do WhatsApp (Open Graph) sai daqui também: o robô dele não roda
// JavaScript, então o HTML já vem pronto do servidor.

const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const CAT = { food: 'Comer', hotel: 'Ficar', experience: 'Experiência' };

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
function nota(n) {
  const v = Number(n) || 0;
  return v ? String(v % 1 ? v.toFixed(1) : v).replace('.', ',') : '';
}

export function paginaDaLista({ nome, titulo, pais, spots, origem, codigo }) {
  const fui = spots.filter((s) => s.status === 'been').sort((a, b) => (Number(b.my_rating) || 0) - (Number(a.my_rating) || 0));
  const quero = spots.filter((s) => s.status !== 'been' && s.status !== 'skip');
  const primeiro = String(nome || '').split(' ')[0] || 'Alguém';
  const h1 = 'Os spots de ' + primeiro + ' em ' + titulo;
  const total = fui.length + quero.length;
  const capa = (fui.concat(quero).find((s) => fotoDoSpot(s.photo_url, 1200)) || {}).photo_url;
  const ogImg = capa ? origem + fotoDoSpot(capa, 1200) : origem + '/compartilhar.png';
  const linha = (s) => {
    const f = fotoDoSpot(s.photo_url, 200);
    const n = s.status === 'been' ? nota(s.my_rating) : '';
    const meta = [CAT[s.category] || '', n ? '★ ' + n : ''].filter(Boolean).join(' · ');
    const rev = s.status === 'been' ? String(s.my_review || '').trim() : '';
    return '<li class="l"><div class="f">' + (f ? '<img src="' + esc(f) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>'
      + '<div class="t"><div class="n">' + esc(s.name) + '</div><div class="m">' + esc(meta) + '</div>'
      + (rev ? '<p class="r">“' + esc(rev) + '”</p>' : '') + '</div></li>';
  };
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(h1)} · Spot</title>
<meta name="robots" content="noindex">
<meta name="description" content="${esc(total + ' spots com a nota de quem foi. Veja no Spot.')}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Spot">
<meta property="og:title" content="${esc(h1)}">
<meta property="og:description" content="${esc(total + (total === 1 ? ' spot' : ' spots') + ', com a nota de quem foi.')}">
<meta property="og:url" content="${esc(origem + '/l/' + codigo)}">
<meta property="og:image" content="${esc(ogImg)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500&family=Inter+Tight:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--base:#F5F5F3;--surface:#E9E9E6;--ink:#111;--ink2:#6B6B67;--ink3:#9A9A96;--green:#0B3D2E;--on:#F5F5F3;--vazio:#6E7F73}
*{box-sizing:border-box}html,body{margin:0;background:var(--base);color:var(--ink);font-family:'Inter Tight',-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
.w{max-width:560px;margin:0 auto;padding:calc(20px + env(safe-area-inset-top,0px)) 20px calc(40px + env(safe-area-inset-bottom,0px))}
.marca{display:block;width:88px}
h1{margin:32px 0 6px;font-size:34px;font-weight:700;letter-spacing:-.04em;line-height:1.05}
.sub{margin:0;font-size:15px;color:var(--ink2)}
h2{margin:32px 0 14px;font-size:20px;font-weight:700;letter-spacing:-.02em}
h2 small{margin-left:6px;font-size:15px;font-weight:400;color:var(--ink3)}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
.l{display:flex;gap:14px;align-items:flex-start}
.f{flex:none;width:64px;height:64px;border-radius:14px;overflow:hidden;background:var(--vazio)}
.f img{width:100%;height:100%;object-fit:cover;display:block}
.t{flex:1;min-width:0;padding-top:2px}
.n{font-size:16px;font-weight:600;letter-spacing:-.02em}
.m{margin-top:2px;font-size:13px;color:var(--ink2)}
.r{margin:6px 0 0;font-size:15px;line-height:1.4}
.cta{margin-top:40px;background:var(--green);color:var(--on);border-radius:18px;padding:24px}
.cta b{display:block;font-size:22px;letter-spacing:-.03em;line-height:1.15}
.cta p{margin:8px 0 18px;font-size:15px;line-height:1.45;opacity:.85}
.cta a{display:flex;align-items:center;justify-content:center;height:48px;border-radius:10px;background:var(--on);color:var(--green);font-weight:600;font-size:16px;text-decoration:none}
.pe{margin-top:24px;font-size:13px;color:var(--ink3);text-align:center}
.pe a{color:var(--ink3)}
</style></head><body><div class="w">
<a href="/sobre" aria-label="Spot"><svg class="marca" viewBox="3 77 273 76" role="img" aria-label="SPOT"><text x="0" y="150" font-family="Cinzel" font-weight="500" font-size="100" letter-spacing="6" fill="#0B3D2E">SPOT</text></svg></a>
<h1>${esc(h1)}</h1>
<p class="sub">${esc([pais, total + (total === 1 ? ' spot' : ' spots')].filter(Boolean).join(' · '))}</p>
${fui.length ? '<h2>Fui<small>' + fui.length + '</small></h2><ul>' + fui.map(linha).join('') + '</ul>' : ''}
${quero.length ? '<h2>Quero ir<small>' + quero.length + '</small></h2><ul>' + quero.map(linha).join('') + '</ul>' : ''}
${!total ? '<p class="sub" style="margin-top:24px">Esta lista está vazia por enquanto.</p>' : ''}
<div class="cta"><b>Guarde os seus lugares — e veja os dos seus amigos.</b>
<p>No Spot cada lugar tem a nota de quem foi. Não por algoritmo.</p>
<a href="/sobre">Conhecer o Spot</a></div>
<p class="pe">Spot - seus lugares · <a href="/privacidade">Privacidade</a></p>
</div></body></html>`;
}

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const codigo = String(params.codigo || '');
  const origem = new URL(request.url).origin;
  const naoAchei = () => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lista não encontrada · Spot</title><body style="font-family:sans-serif;background:#F5F5F3;color:#111;padding:40px 20px"><h1 style="font-size:24px">Esta lista não existe mais.</h1><p><a href="/sobre" style="color:#0B3D2E">Conhecer o Spot</a></p></body>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  if (!/^[A-Za-z0-9]{8,24}$/.test(codigo) || !env.SUPABASE_SERVICE_KEY) return naoAchei();
  let dado = null;
  try { dado = JSON.parse((await lerKV(env, 'lista_' + codigo)) || 'null') } catch (e) {}
  if (!dado || !dado.uid || !Array.isArray(dado.cidades) || !dado.cidades.length) return naoAchei();

  const sb = (caminho) => fetch(SB_URL + caminho, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } });
  const lista = dado.cidades.map((c) => '"' + String(c).replace(/["\\]/g, '') + '"').join(',');
  const [rs, rp] = await Promise.all([
    sb('/rest/v1/spots?select=name,category,status,my_rating,my_review,photo_url,created_at&user_id=eq.' + dado.uid
      + '&city=in.(' + encodeURIComponent(lista) + ')&order=created_at.desc&limit=200'),
    sb('/rest/v1/profiles?select=display_name,username&id=eq.' + dado.uid)
  ]);
  const spots = rs.ok ? await rs.json() : [];
  const perfil = rp.ok ? ((await rp.json())[0] || {}) : {};
  const html = paginaDaLista({ nome: perfil.display_name || perfil.username || '', titulo: dado.titulo || dado.cidades[0],
    pais: dado.pais || '', spots, origem, codigo });
  // Cache curto: a lista é "de hoje", mas o robô do WhatsApp e quem abre em
  // seguida não precisam ir ao banco toda vez.
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
