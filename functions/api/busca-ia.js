// BUSCA COM IA (19/11/2026, combinado com o Lucas).
//
// Um campo só no Explorar. Nome de lugar ("Japão", "Barbacoa", "Pinheiros")
// NUNCA passa por aqui: vai pela sugestão de sempre (/api/lugar). Este endpoint
// só é chamado quando o texto é um PEDIDO com condição ("japonês no Itaim até
// 100", "trilha perto de São Paulo", "bar bom pra date") e a pessoa escolhe
// "Buscar com IA".
//
// 1. A IA (Haiku) lê o pedido e devolve o que entendeu: etiquetas pra mostrar,
//    a consulta pro Google, o lugar, a categoria e o preço máximo por pessoa.
// 2. O Google (busca de texto) traz os lugares, com preço e nota.
// 3. O app junta o que os amigos acharam de cada um (isso fica no aparelho:
//    os spots dos amigos já estão lá, e o servidor não precisa saber).
//
// Custo: uma chamada curta de IA + uma busca do Google por pedido. Guardado
// 24 h por pedido+região, tetos por pessoa e por mês, aviso no celular do dono.
import { quemEsta, podeGastar } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';
import { avisarDono } from './_aviso-dono.js';
import { idDaFoto } from './place-photo.js';

const MODELO = 'claude-haiku-5-5';
const MODELO_RESERVA = 'claude-haiku-4-5'; // o do Importar, que já roda
const TETO_PESSOA = 60;   // buscas com IA por mês, por conta
const TETO_MES = 5000;    // no app inteiro
const AVISOS = [50, 80, 100];

const SISTEMA = `Você recebe um pedido de alguém procurando onde ir (comer, beber, ficar, fazer). Responda o que entendeu, para uma busca no Google Maps.

- etiquetas: de 1 a 4 rótulos curtos que resumem o pedido, na ordem em que aparecem, em português ("Japonês", "Itaim Bibi", "Até R$ 100", "Trilhas", "Perto de São Paulo", "Pra date"). Sem frases.
- consulta: o que procurar no Google Maps, curto, em português, SEM preço e SEM o lugar ("restaurante japonês", "trilha", "bar romântico", "café tranquilo para trabalhar").
- lugar: onde, se o pedido disser (bairro, cidade, região: "Itaim Bibi, São Paulo"; "São Paulo"). Vazio se não disser.
- perto: true se o pedido fala de "perto de mim", "aqui perto", "por perto" sem nomear lugar.
- categoria: "food" (comer, beber, café, bar), "hotel" (ficar, hospedagem) ou "experience" (fazer: passeio, trilha, museu, parque, praia, show).
- preco_max: preço máximo POR PESSOA em reais, se o pedido disser ("até 100" → 100; "barato" → 60). 0 se não disser.

Não invente lugar específico. Só interprete o pedido.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    etiquetas: { type: 'array', items: { type: 'string' } },
    consulta: { type: 'string' },
    lugar: { type: 'string' },
    perto: { type: 'boolean' },
    categoria: { type: 'string', enum: ['food', 'hotel', 'experience'] },
    preco_max: { type: 'number' }
  },
  required: ['etiquetas', 'consulta', 'lugar', 'perto', 'categoria', 'preco_max'],
  additionalProperties: false
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export async function onRequestGet(context) {
  return json({ ligado: !!(context.env.ANTHROPIC_API_KEY && context.env.GOOGLE_PLACES_KEY) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY || !env.GOOGLE_PLACES_KEY) return json({ ligado: false }, 503);
  let b = {};
  try { b = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const q = String(b.q || '').replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (q.length < 3) return json({ lugares: [], etiquetas: [] });
  const lat = Number(b.lat), lng = Number(b.lng);
  const temPos = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const cidade = String(b.cidade || '').replace(/\s+/g, ' ').trim().slice(0, 80);

  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ unauthorized: true }, 401);

  // O mesmo pedido na mesma região, nas últimas 24 h, sai do guardado: não
  // gasta IA, nem Google, nem a cota da pessoa.
  const regiao = temPos ? (Math.round(lat * 20) / 20) + ',' + (Math.round(lng * 20) / 20) : normalizar(cidade);
  const chave = 'buscaia_v1_' + await resumo(normalizar(q) + '|' + regiao);
  const guardado = await lerKV(env, chave);
  if (guardado) { try { return json(JSON.parse(guardado)) } catch (e) {} }

  // DUAS MEMÓRIAS A MAIS (25/11, preparação pra divulgação). O que a IA
  // entendeu do pedido não depende de onde a pessoa está: "japa barato" é o
  // mesmo pra todo mundo (30 dias). E pedidos DIFERENTES que a IA entende
  // igual ("japa barato", "japonês baratinho") viram a mesma busca do Google,
  // guardada por região (7 dias). Só o que não está guardado gasta — e só
  // então contam os tetos.
  let conferido = false;
  const podePagar = async () => {
    if (conferido) return null;
    conferido = true;
    if (!await podeGastar(env, 'buscaia', quem.uid, 1, TETO_PESSOA)) return 'pessoa';
    if (!await dentroDoMes(env)) return 'mes';
    return null;
  };

  const chaveEnt = 'buscaia_ent_' + await resumo(normalizar(q));
  let ent = null;
  try { ent = lerEntendimento(JSON.parse(await lerKV(env, chaveEnt) || 'null')) } catch (e) {}
  if (!ent) {
    const teto = await podePagar();
    if (teto) return json({ capped: teto });
    ent = await entender(env, q);
    if (!ent) return json({ error: 'ia' }, 502);
    await gravarKV(env, chaveEnt, JSON.stringify(ent), 60 * 60 * 24 * 30);
  }

  const onde = ent.lugar || (ent.perto ? '' : cidade);
  // A posição vai pro Google já arredondada (~5 km), a mesma da chave: quem
  // está no mesmo pedaço da cidade recebe a mesma resposta.
  const pos = temPos ? { lat: Math.round(lat * 20) / 20, lng: Math.round(lng * 20) / 20 } : null;
  const chaveGoogle = 'buscaia_g_' + await resumo([ent.consulta, onde, ent.categoria, ent.preco_max,
    pos && !ent.lugar ? pos.lat + ',' + pos.lng : ''].map((x) => normalizar(String(x))).join('|'));
  let lugares = null;
  try { lugares = JSON.parse(await lerKV(env, chaveGoogle) || 'null') } catch (e) {}
  if (!Array.isArray(lugares)) {
    const teto = await podePagar();
    if (teto) return json({ capped: teto });
    lugares = await buscarNoGoogle(env, ent, onde, pos);
    if (!lugares) return json({ error: 'google' }, 502);
    if (lugares.length) await gravarKV(env, chaveGoogle, JSON.stringify(lugares), 60 * 60 * 24 * 7);
  }
  const r = {
    etiquetas: (ent.etiquetas || []).map((x) => String(x).slice(0, 30)).filter(Boolean).slice(0, 4),
    categoria: ent.categoria,
    lugares
  };
  if (lugares.length) await gravarKV(env, chave, JSON.stringify(r), 60 * 60 * 24 * 7);
  return json(r);
}

async function dentroDoMes(env) {
  const mes = new Date().toISOString().slice(0, 7);
  const k = 'buscaia_mes_' + mes;
  const usado = parseInt((await lerKV(env, k)) || '0', 10);
  if (usado >= TETO_MES) return false;
  const depois = usado + 1;
  await gravarKV(env, k, String(depois), 60 * 60 * 24 * 40);
  for (const pct of AVISOS) {
    const marca = Math.ceil(TETO_MES * pct / 100);
    if (usado < marca && depois >= marca) {
      const ka = 'buscaia_aviso_' + mes + '_' + pct;
      if (await lerKV(env, ka)) continue;
      await gravarKV(env, ka, '1', 60 * 60 * 24 * 40);
      await avisarDono(env, 'Busca com IA: ' + pct + '% do teto do mês',
        depois + ' de ' + TETO_MES + ' buscas em ' + mes + '. '
        + (pct >= 100 ? 'A busca com IA parou — suba TETO_MES em functions/api/busca-ia.js.' : 'Se for uso de verdade, suba o teto antes de acabar.'), 'cota');
    }
  }
  return true;
}

// A IA lê o pedido. Tenta o Haiku atual; se a API recusar (modelo ou campo
// que a conta ainda não tem), cai no Haiku que o Importar já usa.
async function entender(env, q) {
  for (const modelo of [MODELO, MODELO_RESERVA]) {
    const corpo = {
      model: modelo,
      max_tokens: 2000,
      system: SISTEMA,
      messages: [{ role: 'user', content: q }],
      output_config: Object.assign({ format: { type: 'json_schema', schema: ESQUEMA } }, modelo === MODELO ? { effort: 'low' } : {})
    };
    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(corpo)
      });
    } catch (e) { return null }
    if (r.status === 400 || r.status === 404) continue;
    if (!r.ok) return null;
    let d;
    try { d = await r.json() } catch (e) { return null }
    if (d.stop_reason === 'refusal') return null;
    const txt = (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    try { return lerEntendimento(JSON.parse(txt)) } catch (e) { return null }
  }
  return null;
}

// Pura (testada): o que a IA devolveu, conferido e com limites.
export function lerEntendimento(o) {
  if (!o || typeof o !== 'object') return null;
  const consulta = String(o.consulta || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!consulta) return null;
  return {
    etiquetas: Array.isArray(o.etiquetas) ? o.etiquetas.map((x) => String(x).trim()).filter(Boolean).slice(0, 4) : [],
    consulta,
    lugar: String(o.lugar || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    perto: o.perto === true,
    categoria: ['food', 'hotel', 'experience'].includes(o.categoria) ? o.categoria : 'food',
    preco_max: Number(o.preco_max) > 0 ? Math.min(5000, Math.round(Number(o.preco_max))) : 0
  };
}

// Faixa de preço do Google a partir do máximo por pessoa (R$).
export function niveisDoPreco(max) {
  if (!max) return null;
  if (max <= 60) return ['PRICE_LEVEL_INEXPENSIVE'];
  if (max <= 150) return ['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE'];
  if (max <= 350) return ['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE'];
  return null;
}

const NIVEL = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

async function buscarNoGoogle(env, ent, onde, pos) {
  const corpo = {
    textQuery: ent.consulta + (onde ? ' em ' + onde : ''),
    languageCode: 'pt-BR',
    regionCode: 'BR',
    pageSize: 15
  };
  if (pos && !ent.lugar) corpo.locationBias = { circle: { center: { latitude: pos.lat, longitude: pos.lng }, radius: ent.categoria === 'experience' ? 50000 : 15000 } };
  const niveis = ent.categoria === 'food' ? niveisDoPreco(ent.preco_max) : null;
  if (niveis) corpo.priceLevels = niveis;
  let d;
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.priceRange,places.photos,places.primaryType,places.googleMapsUri,places.websiteUri'
      },
      body: JSON.stringify(corpo)
    });
    if (!r.ok) return null;
    d = await r.json();
  } catch (e) { return null }
  return lugaresDoGoogle(d && d.places, ent);
}

// Pura (testada): resposta do Google → o que o app desenha. Lugar com faixa de
// preço que passa do máximo pedido (com 20% de folga) sai.
export function lugaresDoGoogle(places, ent) {
  const max = (ent && ent.preco_max) || 0;
  return (places || []).filter((p) => p && p.id && p.displayName).map((p) => {
    const pr = p.priceRange || {};
    const de = pr.startPrice ? Number(pr.startPrice.units) || null : null;
    const ate = pr.endPrice ? Number(pr.endPrice.units) || null : null;
    const ph = (p.photos || [])[0];
    return {
      id: p.id, nome: p.displayName.text || '', endereco: p.formattedAddress || '',
      lat: p.location ? p.location.latitude : null, lng: p.location ? p.location.longitude : null,
      nota: Number(p.rating) || null, preco: NIVEL[p.priceLevel] || null, precoDe: de, precoAte: ate,
      tipo: p.primaryType || '', maps: p.googleMapsUri || '', site: /^https:\/\//.test(p.websiteUri || '') ? p.websiteUri : '',
      foto: ph && ph.name ? '/api/place-photo?ref=' + encodeURIComponent(ph.name) + '&s=' + idDaFoto(ph) + '&w=400' : '',
      categoria: (ent && ent.categoria) || 'food'
    };
  }).filter((x) => !max || !x.precoDe || x.precoDe <= max * 1.2);
}

function normalizar(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim() }
async function resumo(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
