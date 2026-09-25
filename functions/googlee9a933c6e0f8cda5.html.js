// Verificação do meuspot.app no Google Search Console (25/09/2026), pedida
// pela verificação da marca do login com Google.
//
// Por que uma function e não só o arquivo estático: a Cloudflare Pages manda
// qualquer ".html" pro endereço sem a extensão (308), e a verificação do
// Google procura o arquivo EXATAMENTE neste endereço. A function responde
// aqui mesmo, com 200 e o conteúdo que o Google deu. Não apagar: o Google
// reconfere de tempos em tempos, e sem isto a propriedade cai.
export function onRequest() {
  return new Response('google-site-verification: googlee9a933c6e0f8cda5.html', {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}
