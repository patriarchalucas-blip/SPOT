import{quemEsta,podeGastar}from './_auth.js';
// Cloudflare Pages Function — roda no servidor da Cloudflare, nunca no
// navegador do usuário. Existe só pra isso: esconder a chave da Brave (que
// não pode ir pro client, senão qualquer um que abrir o app pode usá-la) e
// travar um teto rígido de buscas por mês.
//
// Teto de segurança: a Brave dá 1000 buscas/mês de graça. MONTHLY_CAP fica
// bem abaixo disso de propósito — o pior cenário matemático é *nunca*
// passar do crédito grátis, ou seja, R$0/US$0 de risco. Quando o teto é
// atingido, devolve instagram_url:null e o app simplesmente cai pro
// fallback que já existe (Google Maps) — sem erro, sem cobrança extra.
const MONTHLY_CAP = 900;
// Teto por usuário. Diferente da /api/climate, aqui NÃO existe cache: toda
// chamada consome uma busca da Brave. Então não há caminho "de graça" pra
// liberar sem token — quem não está logado é recusado antes de qualquer coisa.
// 150/mês por pessoa é muito acima do uso real (o backfill roda uma vez por
// spot de comida) e impede que uma conta só zere as 900 do mês.
const USER_CAP = 150;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'bad_request' }, 400);
  }

  const query = String(body.query || '').trim();
  if (!query) return json({ error: 'missing_query' }, 400);
  // Nome e cidade separados: a query junta os dois e não dá pra saber onde um
  // termina. Sem o nome isolado não dá pra conferir se o perfil é do lugar.
  // Compatível com chamada antiga (só query): aí name cai pra query inteira.
  const name = String(body.name || query).trim();
  const city = String(body.city || '').trim();
  if (!env.BRAVE_API_KEY || !env.SPOT_KV) {
    // Configuração ainda não feita no painel do Cloudflare — falha em
    // silêncio pro app, nunca trava a experiência do usuário por isso.
    return json({ instagram_url: null, configured: false });
  }

  // Sem cache aqui, então toda chamada gasta: exige estar logado sempre.
  // Se isso recusar, o app cai no fallback que já existe (link do Google
  // Maps) — o usuário não vê erro nenhum.
  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ instagram_url: null, unauthorized: true }, 401);
  if (!await podeGastar(env, 'brave', quem.uid, 1, USER_CAP)) {
    return json({ instagram_url: null, capped: true, scope: 'user' });
  }

  const monthKey = new Date().toISOString().slice(0, 7); // "2026-08"
  const counterKey = 'brave_count_' + monthKey;
  const current = parseInt((await env.SPOT_KV.get(counterKey)) || '0', 10);

  if (current >= MONTHLY_CAP) {
    return json({ instagram_url: null, capped: true });
  }

  let braveResp;
  try {
    braveResp = await fetch(
      'https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(query + ' instagram') + '&count=5',
      { headers: { Accept: 'application/json', 'X-Subscription-Token': env.BRAVE_API_KEY } }
    );
  } catch (e) {
    return json({ instagram_url: null });
  }

  // Conta a tentativa mesmo se a Brave falhar — é a chamada que gera custo
  // (ou consome o crédito grátis), não a resposta.
  await env.SPOT_KV.put(counterKey, String(current + 1), { expirationTtl: 60 * 60 * 24 * 40 });

  if (!braveResp.ok) return json({ instagram_url: null });

  const data = await braveResp.json();
  const results = (data.web && data.web.results) || [];
  const hit = escolherPerfil(results, name, city);

  return json({ instagram_url: hit || null });
}

// ═══ ESCOLHA DO PERFIL ═══
// Antes isto era um results.find() que pegava O PRIMEIRO link de instagram.com
// que aparecesse, sem conferir se tinha qualquer relação com o lugar. Buscar
// "Dinho's" devolvia o perfil de uma marca de JEANS de mesmo nome, e esse link
// era gravado no banco como website_url do restaurante — virando o botão
// "Abrir Instagram" apontando pra loja de roupa.
//
// Regra agora: só aceita com EVIDÊNCIA. Ou o @ é praticamente o nome do lugar,
// ou o resultado menciona a cidade (e aí basta uma semelhança de nome).
// Na dúvida devolve null: o app já cai no site do Google ou no link do Maps,
// e ficar sem Instagram é muito melhor que apontar pro Instagram errado.

function norm(x) {
  return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
// só letras e números: "Dinho's Place" e "dinhos_place" viram a mesma coisa
function soAlnum(x) { return norm(x).replace(/[^a-z0-9]/g, '') }

// Aceita só URL de PERFIL. /p/, /reel/, /explore/ etc. são post e página
// interna — nunca servem como "o Instagram do lugar".
const NAO_E_PERFIL = new Set(['p', 'reel', 'reels', 'tv', 'explore', 'stories', 'accounts', 'directory', 'about', 'developer', 'legal']);
function handleDe(url) {
  const m = String(url || '').match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (!m) return '';
  const h = m[1].replace(/\.$/, '');
  return NAO_E_PERFIL.has(h.toLowerCase()) ? '' : h;
}

function escolherPerfil(results, name, city) {
  const nomeAlnum = soAlnum(name);
  if (!nomeAlnum) return null;
  const nomeNorm = norm(name);
  const cidadeNorm = norm(city);

  for (const r of results) {
    const handle = handleDe(r.url);
    if (!handle) continue;
    const h = soAlnum(handle);
    const texto = norm((r.title || '') + ' ' + (r.description || ''));

    // Quanto o @ se parece com o nome do lugar
    let semelhanca = 0;
    if (h === nomeAlnum) semelhanca = 3;                                  // @dinhosplace para "Dinho's Place"
    else if (h.startsWith(nomeAlnum) || nomeAlnum.startsWith(h)) semelhanca = 2;
    else if (h.includes(nomeAlnum) || nomeAlnum.includes(h)) semelhanca = 1;

    const citaCidade = !!cidadeNorm && texto.includes(cidadeNorm);
    // Perfil oficial abre o título com o próprio nome:
    // "Dinho's Place (@dinhosplace) • Instagram photos and videos".
    // Isso separa o perfil DO lugar de um agregador que só CITA o lugar.
    const tituloAbreComNome = norm(r.title || '').startsWith(nomeNorm);

    // Aceita por dois caminhos, os dois exigindo evidência:
    //   1. o @ É o nome do lugar — basta por si só
    //   2. o resultado se apresenta como o lugar (@ parecido OU título abrindo
    //      com o nome) E menciona a cidade
    // O caso do jeans morre aqui: @dinhosjeans chega só a semelhanca 2, o
    // título abre com "Dinho's Jeans" (não com o nome salvo) e a página da
    // marca não fala da cidade do restaurante.
    if (semelhanca === 3) return r.url;
    if (citaCidade && (semelhanca >= 1 || tituloAbreComNome)) return r.url;
  }
  return null;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
