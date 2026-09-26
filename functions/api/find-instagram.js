import{quemEsta,podeGastar}from './_auth.js';
import{lerKV,gravarKV}from './_kv.js';
import{avisarDono}from './_aviso-dono.js';
// Cloudflare Pages Function — roda no servidor da Cloudflare, nunca no
// navegador do usuário. Existe só pra isso: esconder a chave da Brave (que
// não pode ir pro client, senão qualquer um que abrir o app pode usá-la) e
// travar um teto rígido de buscas por mês.
//
// Teto do mês. Era 900 — abaixo das 1.000 grátis, risco zero — e estourou
// em 26/09 só com testes: o Instagram parou pra todo mundo até virar o mês.
// Decisão do Lucas (26/09): o Instagram NÃO PODE PARAR. Então este número
// deixou de ser o limite de uso e virou só a rede contra desastre (robô,
// laço de código): 20.000 ≈ US$ 95 no pior mês, pelo preço conferido no site
// da Brave nesse dia (US$ 5 por mil, com US$ 5 de crédito grátis por mês).
// Quem garante que ele nunca é atingido são duas coisas abaixo: a MEMÓRIA
// por restaurante (o mesmo lugar não é buscado duas vezes, por ninguém) e o
// AVISO no celular do Lucas em 50%, 80% e 100% — tempo de sobra pra subir.
const MONTHLY_CAP = 20000;
const AVISOS = [50, 80, 100];
// Quanto tempo a resposta fica guardada. Achado dura mais: perfil de
// restaurante não muda. "Não tem" dura menos: o lugar pode criar um perfil.
const MEMORIA_ACHOU = 60 * 60 * 24 * 180;
const MEMORIA_NAO_TEM = 60 * 60 * 24 * 30;
// Chave da memória: nome + cidade, sem acento nem caixa. "Mocotó, São Paulo"
// e "mocoto, sao paulo" são o mesmo restaurante; o de outra cidade, não.
async function chaveDaMemoria(name, city) {
  const n = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const dado = new TextEncoder().encode(n(name) + '|' + n(city));
  const h = await crypto.subtle.digest('SHA-256', dado);
  return 'ig_' + [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Teto por usuário. Diferente da /api/climate, aqui NÃO existe cache: toda
// chamada consome uma busca da Brave. Então não há caminho "de graça" pra
// liberar sem token — quem não está logado é recusado antes de qualquer coisa.
// 300/mês por pessoa: acima do uso real (o backfill roda uma vez por spot de
// comida) e impede que uma conta só zere o teto do mês.
const USER_CAP = 300;

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
  // Site oficial que o Google Places já devolveu pro lugar, quando existe.
  const site = String(body.site || '').trim();

  // Toda chamada exige estar logado — inclusive a que só lê o site oficial,
  // senão isto viraria um buscador de páginas aberto pra qualquer um.
  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ instagram_url: null, unauthorized: true }, 401);

  // ═══ PASSO 1: o site oficial do lugar ═══
  // O jeito mais confiável e o mais barato, nesta ordem, e por isso vem antes
  // da busca: quando o Google já sabe o site do restaurante, o próprio site
  // costuma linkar o Instagram dele. Isso é o negócio DIZENDO qual é a conta
  // dele — evidência de dono, não semelhança de nome. Foi o que resolveu o
  // Botanikafé: botanikafe.com linka instagram.com/botanikafe.
  //
  // Não custa nada do teto da Brave: é uma requisição HTTP comum.
  // ═══ PASSO 0: alguém já procurou este restaurante? ═══
  // Cinquenta amigos salvando o mesmo lugar eram cinquenta buscas pagas iguais.
  // Agora a primeira resposta fica guardada pra todo mundo.
  const memoria = await chaveDaMemoria(name, city);
  // Toque manual em "buscar" passa por cima: se a pessoa pediu de novo, a
  // resposta guardada não serviu pra ela.
  const guardado = body.forcar === true ? null : await lerKV(env, memoria);
  if (guardado !== null) {
    return json({ instagram_url: guardado === '-' ? null : guardado, fonte: 'memoria' });
  }

  const doSite = await instagramDoSite(site, name);
  if (doSite) {
    await gravarKV(env, memoria, doSite, MEMORIA_ACHOU);
    return json({ instagram_url: doSite, fonte: 'site' });
  }

  // ═══ PASSO 2: busca na web ═══
  if (!env.BRAVE_API_KEY || !env.SPOT_KV) {
    // Configuração ainda não feita no painel do Cloudflare — falha em
    // silêncio pro app, nunca trava a experiência do usuário por isso.
    return json({ instagram_url: null, configured: false });
  }

  const monthKey = new Date().toISOString().slice(0, 7); // "2026-08"
  const counterKey = 'brave_count_' + monthKey;
  const current = parseInt((await lerKV(env, counterKey)) || '0', 10);

  if (current >= MONTHLY_CAP) {
    return json({ instagram_url: null, capped: true });
  }
  // O teto por usuário é cobrado AQUI, e não no começo: quando o passo 1
  // resolve, nenhuma busca acontece e não há o que cobrar. Cobrar na entrada
  // gastava a cota da pessoa mesmo quando a resposta saiu de graça.
  if (!await podeGastar(env, 'brave', quem.uid, 1, USER_CAP)) {
    return json({ instagram_url: null, capped: true, scope: 'user' });
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
  // gravarKV nunca levanta erro: o put direto derrubava a rota com 500 quando
  // o KV recusava gravação, DEPOIS de a busca já ter sido paga.
  const registrar = async () => {
    if (!gastos) return;
    const depois = current + gastos;
    await gravarKV(env, counterKey, String(depois), 60 * 60 * 24 * 40);
    // Aviso no celular do Lucas quando cruza 50%, 80% e 100% — uma vez por
    // marca por mês. É o que faz o teto nunca ser surpresa.
    for (const pct of AVISOS) {
      const marca = Math.ceil(MONTHLY_CAP * pct / 100);
      if (current < marca && depois >= marca) {
        const k = 'brave_aviso_' + monthKey + '_' + pct;
        if (await lerKV(env, k)) continue;
        await gravarKV(env, k, '1', 60 * 60 * 24 * 40);
        await avisarDono(env, 'Instagram: ' + pct + '% da cota do mês',
          depois + ' de ' + MONTHLY_CAP + ' buscas usadas em ' + monthKey + '. ' +
          (pct >= 100 ? 'A busca de Instagram parou — suba o teto em find-instagram.js.' : 'Se precisar, suba o teto antes de acabar.'),
          'cota');
      }
    }
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
  const resposta = await buscar(query + ' instagram');
  const resultados = urlsDe(resposta);
  const hit = escolherPerfil(resultados, name, city);

  await registrar();
  // Só guarda quando a busca de fato respondeu: falha da Brave não pode virar
  // "esse restaurante não tem Instagram" por 30 dias.
  if (resposta) await gravarKV(env, memoria, hit || '-', hit ? MEMORIA_ACHOU : MEMORIA_NAO_TEM);
  return json({ instagram_url: hit || null });
}

// ═══ INSTAGRAM PELO SITE OFICIAL ═══
//
// Devolve o perfil que o site do próprio lugar linka, ou '' se não der.
//
// O risco aqui não é achar o Instagram de outro restaurante — é achar o da
// AGÊNCIA que fez o site, que às vezes assina no rodapé. Por isso não vale
// "o primeiro instagram.com da página": o handle tem que se parecer com o
// domínio do site ou com o nome do lugar. O handle da agência não se parece
// com nenhum dos dois.
const LIMITE_HTML = 400 * 1024; // rodapé e header cabem de sobra; corta site gigante
export async function instagramDoSite(site, name) {
  if (!site) return '';
  let u;
  try { u = new URL(site) } catch (e) { return '' }
  // Só http(s), e nada de endereço interno: isto roda no servidor.
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  if (/^(localhost$|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(u.hostname)) return '';
  // Se o "site" do Google já É o Instagram, quem chama resolve sem vir aqui.
  if (/(^|\.)instagram\.com$/i.test(u.hostname)) return '';

  let html;
  try {
    const resp = await fetch(u.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SpotBot/1.0)', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return '';
    const tipo = resp.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml/i.test(tipo)) return '';
    html = (await resp.text()).slice(0, LIMITE_HTML);
  } catch (e) { return '' } // fora do ar, lento, bloqueado: só não usa este passo

  // Domínio sem www e sem sufixo: "botanikafe.com" -> "botanikafe"
  const dominio = soAlnum(u.hostname.replace(/^www\./i, '').split('.')[0]);
  const nomeAlnum = soAlnum(name);

  const vistos = new Set();
  for (const m of html.matchAll(/instagram\.com\/([a-zA-Z0-9._]+)/gi)) {
    const handle = handleDe('instagram.com/' + m[1]);
    if (!handle || vistos.has(handle.toLowerCase())) continue;
    vistos.add(handle.toLowerCase());
    const h = soAlnum(handle);
    if (!h) continue;
    const pareceDominio = dominio && (h === dominio || h.includes(dominio) || dominio.includes(h));
    const pareceNome = nomeAlnum && (h === nomeAlnum || h.includes(nomeAlnum) || nomeAlnum.includes(h));
    if (pareceDominio || pareceNome) return 'https://www.instagram.com/' + handle + '/';
  }
  return '';
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
