// Spot — trabalhador de segundo plano (service worker)
//
// POR QUE EXISTE
//
// A regra 4.2 da App Store reprova app que seja só um site embrulhado. A lista
// do que tira um app dessa classificação começa com "conteúdo principal
// disponível offline". Sem isto, o Spot dentro da casca não faz nada que o
// Safari não faça — e é o argumento mais forte contra a gente na revisão.
//
// Vale como produto também: viagem é justamente quando falta sinal. Avião,
// metrô, roaming ruim. É o pior momento possível pra tela vir vazia.
//
// A REGRA QUE NÃO PODE SER QUEBRADA
//
// O Spot publica direto: eu conserto um bug e ele está no ar em 90 segundos,
// sem passar pela Apple. Um service worker mal escrito mata isso — passa a
// servir a versão velha pra sempre e o app congela no tempo. Por isso o HTML
// é SEMPRE buscado da rede primeiro, e o cache só entra quando a rede falha.
// Cache aqui é rede de segurança, nunca atalho.

const VERSAO = 'spot-v1';
const CASCA  = 'casca-' + VERSAO;   // o app em si
const MIDIA  = 'midia-' + VERSAO;   // fotos já vistas
const TETO_MIDIA = 220;             // fotos guardadas, as mais antigas saem

// O mínimo pro app abrir sem rede. A fonte vem do Google e é tratada à parte
// (ver ehFonte): é outro domínio e a resposta vem opaca.
const ESSENCIAL = ['/', '/index.html', '/vendor/supabase.js', '/manifest.json', '/icon-180.png'];

self.addEventListener('install', (e) => {
  // addAll falha inteiro se UM arquivo falhar, e aí o app fica sem offline
  // nenhum por causa de um ícone. Um a um, e quem falhar fica de fora.
  e.waitUntil(
    caches.open(CASCA)
      .then((c) => Promise.all(ESSENCIAL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((n) => !n.endsWith(VERSAO)).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Nunca tocar nestes: conta, dados e chamadas que gastam cota. Servir resposta
// velha do banco seria pior que não servir nada — o app mostraria o lugar que
// a pessoa acabou de apagar.
function ehDado(url) {
  return url.hostname.endsWith('.supabase.co') && !url.pathname.includes('/storage/')
      || url.hostname === 'places.googleapis.com'
      || url.pathname.startsWith('/api/');
}
function ehFoto(url) {
  return url.hostname.endsWith('.googleusercontent.com')
      || url.hostname === 'images.unsplash.com'
      || url.pathname.includes('/storage/v1/object/public/')
      || url.pathname.startsWith('/api/place-photo');
}
function ehFonte(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

async function guardarComTeto(nomeCache, req, resp) {
  const c = await caches.open(nomeCache);
  await c.put(req, resp);
  const chaves = await c.keys();
  if (chaves.length > TETO_MIDIA) {
    // keys() vem na ordem de inserção: as primeiras são as mais antigas.
    await Promise.all(chaves.slice(0, chaves.length - TETO_MIDIA).map((k) => c.delete(k)));
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url) } catch (err) { return }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // /api/place-photo é foto (cache) mas também casa com /api/ (dado, sem
  // cache). A foto vem primeiro de propósito.
  if (ehFoto(url)) {
    e.respondWith(
      caches.match(req).then((guardada) => guardada || fetch(req).then((resp) => {
        // Resposta opaca (outro domínio, sem CORS) não dá pra inspecionar:
        // guarda assim mesmo, é isso que faz a foto aparecer sem rede.
        if (resp && (resp.ok || resp.type === 'opaque')) {
          guardarComTeto(MIDIA, req, resp.clone()).catch(() => {});
        }
        return resp;
      }).catch(() => guardada || Response.error()))
    );
    return;
  }

  if (ehDado(url)) return;   // passa direto pra rede, sempre

  if (ehFonte(url)) {
    e.respondWith(
      caches.match(req).then((guardada) => {
        const daRede = fetch(req).then((resp) => {
          if (resp && (resp.ok || resp.type === 'opaque')) {
            caches.open(CASCA).then((c) => c.put(req, resp.clone())).catch(() => {});
          }
          return resp;
        }).catch(() => guardada);
        return guardada || daRede;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // O app e o resto do site: REDE PRIMEIRO. Ver a regra lá em cima — é o que
  // mantém a publicação instantânea funcionando.
  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.ok) {
          caches.open(CASCA).then((c) => c.put(req, resp.clone())).catch(() => {});
        }
        return resp;
      })
      .catch(async () => {
        const guardada = await caches.match(req);
        if (guardada) return guardada;
        // Navegação sem cache da rota exata: devolve o app, que é uma página
        // só e sabe se desenhar sozinha a partir do que está no aparelho.
        if (req.mode === 'navigate') {
          const app = await caches.match('/index.html') || await caches.match('/');
          if (app) return app;
        }
        return Response.error();
      })
  );
});
