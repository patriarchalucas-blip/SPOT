import { quemEsta } from './_auth.js';

// Cloudflare Pages Function — entrega a chave do mapa interativo.
//
// POR QUE ESTA PEÇA EXISTE, SENDO QUE A CHAVE VAI APARECER NO NAVEGADOR
//
// O mapa que arrasta e amplia é a biblioteca do Google rodando NA PÁGINA, e
// ela precisa da chave no navegador. Não tem como esconder isso — é assim em
// todo site que tem mapa. O que dá pra fazer é reduzir o estrago:
//
//   1. A chave é OUTRA, criada só pra isto, liberada só pra "Maps JavaScript
//      API" e só pro domínio meuspot.app. Não é a chave do Places, que paga
//      por requisição e tem acesso a busca.
//   2. Ela NÃO mora no index.html. O repositório é público: chave commitada
//      ali é colhida por robô em minutos e fica no histórico pra sempre,
//      mesmo depois de removida. Aqui ela é variável de ambiente, e só sai
//      daqui pra quem tem sessão.
//
// A restrição por domínio é o mecanismo que o próprio Google oferece pra
// chave de navegador, e é o que impede a chave de servir em outro site. Ela
// não é perfeita (referer se forja), e por isso o ponto 1 importa mais: o
// pior caso é alguém carregar mapas na conta do Lucas, não buscar lugares
// nem ler dado de ninguém.
//
// Sem a variável configurada, devolve `configurado:false` e o app continua
// com a imagem estática — ninguém fica sem mapa por causa disto.

function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=600' }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  // Só pra quem tem sessão. Não impede nada a sério (a chave aparece no
  // navegador de qualquer jeito depois), mas tira ela da mão de robô que só
  // varre endereço público.
  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ error: 'sem_sessao' }, 401);
  if (!env.GOOGLE_MAPS_JS_KEY) return json({ configurado: false });
  return json({ configurado: true, chave: env.GOOGLE_MAPS_JS_KEY });
}
