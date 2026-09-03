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

  // Quantos resultados pedir. Eram 5, e 5 era pouco: buscar "Botanikafé
  // Jardins instagram" devolve baressp, linktr.ee e Wikipedia antes do
  // perfil, e o único instagram.com entre os 5 primeiros era o do Jardim
  // Botânico de SP — outro lugar, corretamente recusado. O perfil existia e
  // simplesmente não estava no conjunto que chegava aqui.
  // Pedir mais resultados NÃO custa mais: a Brave cobra por busca, não por
  // resultado.
  const COUNT = 20;

  let gastos = 0;
  async function buscar(q) {
    let resp;
    try {
      resp = await fetch(
        'https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(q) + '&count=' + COUNT,
        { headers: { Accept: 'application/json', 'X-Subscription-Token': env.BRAVE_API_KEY } }
      );
    } catch (e) {
      gastos++; // a chamada saiu: conta como gasto mesmo sem resposta
      return null;
    }
    gastos++;
    if (!resp.ok) return null;
    try { return (await resp.json()) } catch (e) { return null }
  }
  const urlsDe = (d) => ((d && d.web && d.web.results) || []);
  // Conta o que foi gasto mesmo quando a busca falha — é a chamada que
  // consome o crédito, não a resposta.
  const registrar = async () => {
    if (gastos) await env.SPOT_KV.put(counterKey, String(current + gastos), { expirationTtl: 60 * 60 * 24 * 40 });
  };

  // UMA busca. Aqui existiu uma segunda, dirigida com `site:instagram.com`,
  // pra quando a primeira não produzisse perfil aceito. Ela saiu: testada, a
  // query com `site:` devolve resultado sem relação nenhuma (verbetes de
  // jardim botânico na Wikipedia) — o operador não é respeitado. Gastava uma
  // busca do teto por lugar sem Instagram e não melhorava nada.
  //
  // O limite real não é o número de buscas: é o índice. Perfil do Instagram é
  // mal indexado por buscador (o Instagram bloqueia crawler), e comércio local
  // brasileiro é o pior caso. O Google acha porque é o Google; a Brave, não.
  // Pedir mais resultados é o único ganho barato e sem risco — a Brave cobra
  // por busca, não por resultado.
  const resultados = urlsDe(await buscar(query + ' instagram'));
  const hit = escolherPerfil(resultados, name, city);

  await registrar();
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
export function handleDe(url) {
  const m = String(url || '').match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (!m) return '';
  const h = m[1].replace(/\.$/, '');
  return NAO_E_PERFIL.has(h.toLowerCase()) ? '' : h;
}

// Escolhe o MELHOR candidato, não o primeiro que passa.
//
// A versão anterior aceitava na hora quando o @ era idêntico ao nome salvo.
// Parecia seguro e não é: nome curto e comum casa com qualquer negócio. Um
// spot salvo como "Dinhos" batia exato com o @ de uma loja de jeans, e o
// Instagram do restaurante virava o da loja — o defeito que voltou duas
// vezes.
//
// Agora todos os resultados são pontuados e o melhor vence, desde que passe
// de um mínimo. Handle idêntico deixa de ser prova suficiente sozinho: precisa
// vir com a cidade ou com o título se apresentando como o lugar.
//
//   @dinhos, título "Dinho's Jeans", sem a cidade      3  -> recusado
//   @dinhos + a cidade no texto                        6  -> aceito
//   @dinhosplace + a cidade                            5  -> aceito
//   @dinhosplace, título "Dinho's Place", sem cidade   4  -> aceito
const MINIMO = 4;
export function escolherPerfil(results, name, city) {
  const nomeAlnum = soAlnum(name);
  if (!nomeAlnum) return null;
  const nomeNorm = norm(name);
  const cidadeNorm = norm(city);

  let melhor = null, melhorPonto = 0;

  for (const r of results || []) {
    const handle = handleDe(r.url);
    if (!handle) continue;
    const h = soAlnum(handle);
    const texto = norm((r.title || '') + ' ' + (r.description || ''));

    // Quanto o @ se parece com o nome do lugar
    let ponto = 0;
    if (h === nomeAlnum) ponto += 3;                                  // @dinhosplace para "Dinho's Place"
    else if (h.startsWith(nomeAlnum) || nomeAlnum.startsWith(h)) ponto += 2;
    else if (h.includes(nomeAlnum) || nomeAlnum.includes(h)) ponto += 1;
    else continue;                                                     // nem parecido: fora

    // A cidade é a evidência mais forte de que é o MESMO negócio, e não outro
    // de nome igual em outro lugar do país.
    if (cidadeNorm && texto.includes(cidadeNorm)) ponto += 3;

    // Perfil oficial abre o título com o próprio nome:
    // "Dinho's Place (@dinhosplace) • Instagram photos and videos".
    // Isso separa o perfil DO lugar de um agregador que só CITA o lugar.
    if (norm(r.title || '').startsWith(nomeNorm)) ponto += 2;

    if (ponto > melhorPonto) { melhorPonto = ponto; melhor = r.url }
  }

  return melhorPonto >= MINIMO ? melhor : null;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
