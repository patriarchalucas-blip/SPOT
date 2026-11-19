// Versão do site (18/11/2026). O app de iPhone pergunta isto quando a pessoa
// volta pra ele: se o site mudou desde que a página abriu, recarrega sozinho.
// Antes a novidade só aparecia fechando o app de vez — ninguém faz isso.
// A versão é a impressão digital da página; a resposta vale 60 s na borda,
// então mil pessoas voltando pro app custam um cálculo por minuto.
export async function onRequestGet({ request, env }) {
  try {
    const r = await env.ASSETS.fetch(new Request(new URL('/', request.url)));
    const h = await crypto.subtle.digest('SHA-256', await r.arrayBuffer());
    const v = [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
    return new Response(JSON.stringify({ v }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } });
  } catch (e) {
    return new Response(JSON.stringify({ v: '' }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
}
