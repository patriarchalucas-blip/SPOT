// Cloudflare Pages Function — a página que o WhatsApp lê.
//
// POR QUE ESTA PEÇA EXISTE
//
// O link de convite é `/?c=<codigo>`, e quem cola isso numa conversa vê um
// retângulo genérico: "Spot — seus lugares, sua voz", a mesma imagem de
// sempre. O convite é de UMA pessoa, com UM acervo, e nada disso aparecia.
//
// A prévia (Open Graph) é lida por um ROBÔ, não por um navegador: o WhatsApp
// busca o endereço, lê as etiquetas do <head> e vai embora. Ele não executa
// JavaScript — então nada que o index.html monte na tela chega até ele. A
// única forma de ter prévia por convite é o SERVIDOR devolver HTML já pronto,
// que é o que acontece aqui.
//
// Quem abre no navegador cai em /?c=<codigo> e segue o fluxo normal.
//
// De onde vêm os dados: `invite_preview` (migração 022), a mesma função que a
// página do convite usa. Ela é `security definer` e devolve só nome, avatar,
// três contagens e até três fotos — quem recebe a mensagem vê o mesmo que
// veria abrindo o link.

const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6aWRuaWxzeXJ2YXV6Z2Vsc3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODE5NDAsImV4cCI6MjA5Njg1Nzk0MH0.BMgiP_lTe8mCfe0eSPNUCksXatOntuWAhcqGtR8hco4';

// O texto vai pra dentro de um atributo HTML. Sem escapar, um nome com aspas
// fecha o atributo e o resto da etiqueta vira marcação — e nome é texto que
// outra pessoa escolheu.
function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Só http(s) e só do host do Google/Supabase: a URL vem do banco, mas é a
// única coisa aqui que vira endereço de imagem, e `javascript:` num og:image
// não faz nada — o cuidado é contra redirecionar a prévia pra outro lugar.
function fotoSegura(u) {
  try {
    const url = new URL(String(u || ''));
    if (url.protocol !== 'https:') return '';
    const ok = /(^|\.)googleapis\.com$|(^|\.)googleusercontent\.com$|(^|\.)supabase\.co$|(^|\.)unsplash\.com$/;
    return ok.test(url.hostname) ? url.toString() : '';
  } catch (e) { return '' }
}

export async function onRequestGet(context) {
  const { params, request } = context;
  const codigo = String(params.codigo || '').slice(0, 64);
  const origem = new URL(request.url).origin;
  const destino = origem + '/?c=' + encodeURIComponent(codigo);

  let p = null;
  if (/^[A-Za-z0-9_-]{4,64}$/.test(codigo)) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/rpc/invite_preview', {
        method: 'POST',
        headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: codigo })
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d) && d.length) p = d[0];
      }
    } catch (e) { /* sem prévia personalizada: cai no texto genérico */ }
  }

  const nome = (p && (p.display_name || (p.username ? '@' + p.username : ''))) || '';
  const n = p ? Number(p.lugares) || 0 : 0;
  const nc = p ? Number(p.cidades) || 0 : 0;
  const titulo = nome ? (nome + ' te convidou pro Spot') : 'Convite pro Spot';
  const descricao = n
    ? (n + (n === 1 ? ' lugar' : ' lugares') + (nc ? (' em ' + nc + (nc === 1 ? ' cidade' : ' cidades')) : '')
       + ', cada um com a nota de quem foi.')
    : 'Os lugares favoritos de quem você conhece.';
  // A foto de um lugar da pessoa, quando houver — é o que faz a prévia
  // parecer o convite dela e não um cartaz do app.
  const foto = (p && Array.isArray(p.fotos) && fotoSegura(p.fotos[0])) || (origem + '/compartilhar.png');

  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(titulo) + '</title>'
    + '<meta name="description" content="' + esc(descricao) + '">'
    + '<meta property="og:type" content="website">'
    + '<meta property="og:site_name" content="Spot">'
    + '<meta property="og:title" content="' + esc(titulo) + '">'
    + '<meta property="og:description" content="' + esc(descricao) + '">'
    + '<meta property="og:image" content="' + esc(foto) + '">'
    + '<meta property="og:url" content="' + esc(destino) + '">'
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:title" content="' + esc(titulo) + '">'
    + '<meta name="twitter:description" content="' + esc(descricao) + '">'
    + '<meta name="twitter:image" content="' + esc(foto) + '">'
    // Quem chegou com navegador segue pro app. O robô não executa nada disso
    // e fica só com as etiquetas — que é o ponto.
    + '<meta http-equiv="refresh" content="0;url=' + esc(destino) + '">'
    + '<link rel="canonical" href="' + esc(destino) + '">'
    + '</head><body style="font-family:system-ui;background:#F5F5F3;color:#111;padding:40px">'
    + '<p>' + esc(titulo) + '</p>'
    + '<p><a href="' + esc(destino) + '">Abrir o convite</a></p>'
    + '<script>location.replace(' + JSON.stringify(destino) + ')<\/script>'
    + '</body></html>';

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Curto: o acervo da pessoa muda, e prévia velha diz número errado.
      'Cache-Control': 'public, max-age=600'
    }
  });
}
