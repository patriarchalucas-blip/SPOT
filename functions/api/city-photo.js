import{quemEsta,podeGastar}from './_auth.js';
import{lerKV,gravarKV,contarUso}from './_kv.js';

// Cloudflare Pages Function — foto de uma cidade, via Unsplash.
//
// Existe por dois motivos, e o segundo é o que mais importa:
//
// 1. A chave do Unsplash estava no index.html. Testei: ela funciona de
//    qualquer lugar, sem restrição de origem — qualquer pessoa copiava do
//    código e usava a cota. Agora ela vive só aqui, como env var.
//
// 2. O limite do Unsplash é de 50 requisições por HORA para a chave inteira,
//    compartilhado entre TODOS os usuários. O cache antes era no localStorage,
//    ou seja POR APARELHO: dez pessoas abrindo "Split" gastavam dez
//    requisições pela mesma foto. Aqui o cache é no KV, compartilhado — a
//    mesma cidade custa UMA requisição pra todo mundo, pra sempre.
//
// Teto mensal como as outras: a cota é por hora, mas um contador mensal
// impede que um laço queime tudo repetidamente.
// As 20 cidades do fundo da tela de entrada. Elas são pedidas por quem ainda
// NÃO fez login — e o resto deste arquivo exige sessão para gastar cota.
// Sem esta lista a tela de entrada fica só com gradiente para sempre: ninguém
// logado busca "Lisbon Portugal" espontaneamente, então o cache nunca enche.
//
// É seguro abrir só para elas: a lista é fechada, cada uma custa UMA consulta
// a cada 6 meses (o TTL do cache), e o teto mensal continua valendo por cima.
const CIDADES_DA_ENTRADA = new Set([
  'Dubrovnik Croatia', 'Tokyo Japan skyline', 'Santorini Greece',
  'Paris France Eiffel Tower', 'Marrakech Morocco', 'Rome Italy Colosseum',
  'Kyoto Japan temple', 'Lisbon Portugal', 'Barcelona Spain Sagrada',
  'New York City skyline', 'Machu Picchu Peru', 'Cape Town South Africa',
  'Venice Italy canal', 'Istanbul Turkey', 'Bali Indonesia temple',
  'Rio de Janeiro Brazil', 'Amsterdam Netherlands canal',
  'Prague Czech Republic', 'Kotor Montenegro bay', 'Petra Jordan'
].map(normKey));

// OS DOIS TETOS AQUI SÃO MEUS, NÃO DO UNSPLASH. O Unsplash limita por HORA
// (50 no plano demo); estes existem pra que um laço no cliente não queime a
// cota do mês inteiro de madrugada sem ninguém ver.
//
// Estavam em 1200 no mês e 80 por pessoa, e o de 80 era baixo demais pra
// quem usa o app de verdade: o Lucas viu "cota esgotada" no telefone dele
// em 22/09/2026. Não dá pra provar qual dos três estourou — a resposta não
// dizia qual —, mas o de 80 é o único que um usuário sozinho alcança em uso
// normal, e ele é anti-abuso de estranho, não pedágio pro dono.
//
// Cuidado ao subir mais: cada busca nova grava no KV, e o plano grátis dá
// mil gravações por DIA. 5000/mês dá ~167/dia, com folga.
const MONTHLY_CAP = 5000;
const USER_CAP = 500;

// Foto de cidade não muda: 6 meses. Falha guarda por 1 hora, nunca 6 meses —
// erro cacheado por muito tempo condena a cidade a nunca mais ter foto (foi
// exatamente o defeito que a /api/climate tinha).
const TTL_OK = 60 * 60 * 24 * 180;
const TTL_FALHA = 60 * 60;
// A foto do Google sai de um photos[].name do Places, que EXPIRA (09/10): 30
// dias e escolhe de novo, em vez de 6 meses servindo um link morto.
const TTL_GOOGLE = 60 * 60 * 24 * 30;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const query = String(body.query || '').trim();
  if (!query) return json({ error: 'missing_query' }, 400);
  if (!env.UNSPLASH_KEY || !env.SPOT_KV) return json({ url: '', configured: false });

  // v2: o registro antigo não guardava o autor da foto, e sem autor não dá
  // pra creditar. Trocar o prefixo aposenta os antigos sem apagar nada.
  // v3 (01/10): a regra de escolha mudou (ver escolherFoto). O cache velho
  // guardava fotos sem conferir se eram do lugar — Joinville virou um menino
  // com haltere. Chave nova = toda cidade é escolhida de novo, uma vez.
  // v4 (05/10): a foto passa a vir primeiro do Google (ver abaixo). Chave nova
  // = toda cidade é escolhida de novo, uma vez, conforme alguém abre.
  // As fotos da TELA DE LOGIN foram escolhidas a dedo (são o anúncio do app):
  // ficam com a chave e a regra antigas, do Unsplash.
  const daEntradaCedo = CIDADES_DA_ENTRADA.has(normKey(query));
  // PAÍS (08/10): o app manda o nome em inglês com pais:true. A foto do Google
  // do país é a de um usuário qualquer e o link expira — a capa do Brasil
  // virou um prédio e mudava sozinha. País vai direto pro Unsplash (a foto
  // mais relevante que cita o país), com chave própria.
  const ehPais = body.pais === true;
  const cacheKey = ehPais ? 'paisfoto1_' + normKey(query)
    : (daEntradaCedo ? 'cityphoto3_' : 'cityphoto4_') + normKey(query);
  const cached = await lerKV(env, cacheKey);
  // Cache liberado sem login, igual à /api/climate: responder daqui não gasta
  // cota nem expõe nada, e é o caminho da maioria das chamadas.
  // País que caiu na foto do Google (09/10: a dos EUA — o filtro abaixo exigia
  // que a legenda citasse "United States of America" inteiro) é escolhido de
  // novo, uma vez: a do Google é a de um usuário qualquer e o link expira.
  let guardado = null;
  try { guardado = cached ? JSON.parse(cached) : null } catch (e) {}
  // Só uma vez: se cair no Google de novo, fica marcado (reescolhido) e não
  // gasta cota a cada abertura.
  if (guardado && !(ehPais && guardado.fonte === 'google' && !guardado.reescolhido)) return responder(context, guardado);
  // Re-escolha que falha (sem login, teto, Unsplash fora) devolve a foto que
  // já havia, em vez de nenhuma (09/10).
  const ouGuardado = (resp) => guardado ? responder(context, guardado) : resp;

  // Daqui pra baixo gasta cota de verdade — só pra quem está logado, ou para
  // uma das cidades fixas da tela de entrada (ver CIDADES_DA_ENTRADA).
  const daEntrada = CIDADES_DA_ENTRADA.has(normKey(query));
  if (!daEntrada) {
    const quem = await quemEsta(request, env);
    // Sem uid não há teto por pessoa (06/10): o "deixa passar" do _auth.js
    // pra Supabase fora do ar virava gasto pago sem dono. Aqui, recusa.
    if (!quem.permitir || !quem.uid) return ouGuardado(json({ url: '', unauthorized: true }, 401));
    if (!await podeGastar(env, 'unsplash', quem.uid, 1, USER_CAP)) {
      return ouGuardado(json({ url: '', capped: true, scope: 'user' }));
    }
  }

  // PRIMEIRO O GOOGLE, DO PRÓPRIO LUGAR (05/10). O Unsplash acha foto pelo
  // TEXTO, e texto engana: "São Paulo" é cidade e estado, e uma praia do
  // litoral marcada "São Paulo, Brasil" virou a capa de quem mora na capital
  // (o Lucas). O resultado do Google é o lugar do tipo cidade/região/país —
  // é o lugar certo por construção. Uma busca por cidade nova, guardada 6
  // meses e dividida entre todo mundo; conta no mesmo teto do /api/places.
  const mesG = new Date().toISOString().slice(0, 7);
  const contadorG = 'places_count_' + mesG;
  const usadoG = parseInt((await lerKV(env, contadorG)) || '0', 10);
  if (!daEntradaCedo && !ehPais && usadoG < 5000) {
    await contarUso(env, contadorG, usadoG, 1, 60 * 60 * 24 * 40);
    const g = await fotoDoGoogle(env, query);
    if (g) { await gravarKV(env, cacheKey, JSON.stringify(ehPais ? Object.assign({ reescolhido: true }, g) : g), TTL_GOOGLE); return responder(context, g); }
  }

  const mes = new Date().toISOString().slice(0, 7);
  const contador = 'unsplash_count_' + mes;
  const usado = parseInt((await lerKV(env, contador)) || '0', 10);
  if (usado >= MONTHLY_CAP) return ouGuardado(json({ url: '', capped: true, scope: 'mes' }));

  let r;
  try {
    r = await fetch('https://api.unsplash.com/search/photos?per_page=10&orientation=landscape&query='
      + encodeURIComponent(query) + '&client_id=' + env.UNSPLASH_KEY);
  } catch (e) {
    return ouGuardado(json({ url: '' })); // sem cachear: rede falhou, não é resposta do Unsplash
  }
  // conta a tentativa: é a chamada que consome a cota, não a resposta
  await contarUso(env, contador, usado, 1, 60 * 60 * 24 * 40);

  // 403/429 = cota da hora esgotada. Guarda por 10 min só pra não martelar.
  if (r.status === 403 || r.status === 429) {
    // Cota do Unsplash na hora: a foto do Google do próprio lugar resolve.
    const g = await fotoDoGoogle(env, query);
    if (g) { await gravarKV(env, cacheKey, JSON.stringify(ehPais ? Object.assign({ reescolhido: true }, g) : g), TTL_GOOGLE); return responder(context, g); }
    const espera = { url: '', quotaExceeded: true };
    if (guardado) return responder(context, guardado);
    await gravarKV(env, cacheKey, JSON.stringify(espera), 600);
    return json(espera);
  }
  if (!r.ok) return ouGuardado(json({ url: '' }));

  let d;
  try { d = await r.json() } catch (e) { return ouGuardado(json({ url: '' })) }
  const results = (d && d.results) || [];
  // Só vale foto QUE É DO LUGAR (01/10). Antes sorteava entre as 6 primeiras
  // sem olhar: o Unsplash devolve qualquer foto marcada com o nome (tirada lá,
  // de alguém de lá), e "Joinville" virou um retrato. Agora a foto precisa
  // citar o lugar no texto dela e não pode ser de gente. Entre as que passam,
  // a escolha continua estável (deriva do nome).
  // País (09/10): a busca do Unsplash pelo país já é boa por relevância, e a
  // legenda quase nunca cita o nome dele — exigir isso derrubava todas e caía
  // no Google. Pra país, basta não ser foto de gente.
  const pool = results.filter((f) => ehPais ? fotoServeDePais(f) : fotoServe(f, query)).slice(0, 6);
  // País fica com a MAIS relevante; cidade sorteia estável entre as boas.
  let foto = pool.length ? (ehPais ? pool[0] : pool[hashNum(query) % pool.length]) : null;
  let url = foto ? (foto.urls || {}).regular || '' : '';
  // Nenhuma serve: a foto do Google do próprio lugar (cidade, região, praia).
  if (!url) {
    const g = await fotoDoGoogle(env, query);
    if (g) { await gravarKV(env, cacheKey, JSON.stringify(ehPais ? Object.assign({ reescolhido: true }, g) : g), TTL_GOOGLE); return responder(context, g); }
  }

  // Duas exigências dos termos do Unsplash, as duas obrigatórias:
  //
  // 1. Creditar o fotógrafo, com link pro perfil dele e link pro Unsplash,
  //    os dois com o utm_source do app. Por isso autor/autorUrl saem daqui
  //    junto com a URL e vão pro mesmo cache — sem isso o app teria que
  //    reconsultar só pra saber de quem é a foto.
  //
  // 2. Disparar o endpoint de download quando a foto é USADA — aqui, quando
  //    ela é escolhida como capa da cidade. Uma vez, nesta busca original.
  //    (Até 27/09 disparava em TODA resposta, inclusive do cache; conferido na
  //    central de ajuda do Unsplash nesse dia: "something similar to a
  //    download (like when a user chooses the image to ... set as a header)",
  //    não visualização. Disparar por visualização inflava as estatísticas e
  //    podia pesar contra na aprovação de produção.)
  const autor = (foto && foto.user) || {};
  const baixar = foto && foto.links && foto.links.download_location;
  const resultado = {
    url: url,
    autor: autor.name || '',
    autorUrl: (autor.links && autor.links.html)
      ? autor.links.html + '?utm_source=spot&utm_medium=referral' : '',
    // guardado no cache, nunca devolvido ao navegador — ver responder()
    baixar: baixar || ''
  };
  if (!url && guardado) return responder(context, guardado);
  await gravarKV(env, cacheKey, JSON.stringify(resultado), url ? TTL_OK : TTL_FALHA);
  if (baixar && env.UNSPLASH_KEY && typeof context.waitUntil === 'function') {
    context.waitUntil(fetch(baixar + '&client_id=' + env.UNSPLASH_KEY).catch(() => {}));
  }
  return responder(context, resultado);
}

// Resposta pro navegador. O disparo de download NÃO acontece aqui (ver acima:
// só quando a foto é escolhida pra cidade, uma vez).
function responder(context, r) {
  // O campo `baixar` nunca vai pro navegador (carrega a chave quando chamado).
  const { baixar, ...semChave } = r || {};
  return json(semChave);
}

// A foto do Unsplash é do lugar? O texto dela (descrição, alt, tags) tem que
// citar a primeira palavra do nome buscado ("Joinville", "Rio" de Rio de
// Janeiro) — e foto de gente não serve de capa de cidade. O alt do Unsplash é
// em inglês, por isso as palavras de pessoa estão em inglês.
const DE_GENTE = /\b(man|men|woman|women|boy|boys|girl|girls|child|children|kid|kids|baby|person|people|portrait|selfie|couple|family|face|smiling|bride|groom)\b/i;
// A foto tem que citar o NOME INTEIRO do lugar. Conferia só a 1ª palavra —
// em "São Paulo" bastava "São", e passava São Sebastião (05/10). A busca às
// vezes vem com o país no fim ("São Paulo Brasil"): aí vale o nome sem a
// última palavra, desde que sobrem duas ou mais.
export function fotoServeDePais(f) {
  if (!f) return false;
  const texto = [f.description, f.alt_description].concat((f.tags || []).map((t) => t && t.title)).filter(Boolean).join(' ');
  return !DE_GENTE.test(texto);
}
export function fotoServe(f, query) {
  if (!f) return false;
  const texto = [f.description, f.alt_description].concat((f.tags || []).map((t) => t && t.title)).filter(Boolean).join(' ');
  if (DE_GENTE.test(texto)) return false;
  const palavras = String(query).trim().split(/[\s,]+/).map(normKey).filter(Boolean);
  if (!palavras.length || palavras.join('').length < 3) return true;
  const t = '_' + normKey(texto) + '_';
  const cita = (ws) => t.includes('_' + ws.join('_') + '_');
  if (cita(palavras)) return true;
  return palavras.length >= 3 && cita(palavras.slice(0, -1));
}
// A foto que o Google tem do próprio lugar (o resultado que é cidade, região,
// país ou ponto natural). Passa pelo /api/place-photo, que esconde a chave.
// O crédito do autor é exigência do Google, igual à do Unsplash.
const TIPOS_DE_LUGAR = new Set(['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'administrative_area_level_3', 'country', 'colloquial_area', 'sublocality', 'neighborhood', 'natural_feature', 'archipelago', 'island']);
async function fotoDoGoogle(env, query) {
  if (!env.GOOGLE_PLACES_KEY) return null;
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY, 'X-Goog-FieldMask': 'places.types,places.photos' },
      body: JSON.stringify({ textQuery: query, languageCode: 'pt-BR', maxResultCount: 3 })
    });
    if (!r.ok) return null;
    const d = await r.json();
    const p = (d.places || []).find((x) => (x.types || []).some((t) => TIPOS_DE_LUGAR.has(t)) && x.photos && x.photos.length);
    if (!p) return null;
    const ph = p.photos[0];
    const a = (ph.authorAttributions || [])[0] || {};
    return { url: '/api/place-photo?ref=' + encodeURIComponent(ph.name) + '&w=1200', autor: a.displayName || '', autorUrl: a.uri || '', fonte: 'google' };
  } catch (e) { return null; }
}

function hashNum(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function normKey(s) {
  return String(s).toLowerCase().normalize('NFD').replace(new RegExp('[\u0300-\u036f]','g'),'').replace(/[^a-z0-9]+/g, '_');
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
}
