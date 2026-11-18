// Resumo de um país (V3, "Você · país", 18/11/2026): capital, habitantes,
// língua, moeda, fuso e câmbio do dólar.
//
// Três fontes públicas e grátis, sem chave:
//   - Wikidata (SPARQL): capital em português, coordenada dela, população,
//     línguas oficiais em português e o código da moeda.
//   - Open-Meteo: o fuso (nome IANA) a partir da coordenada da capital. O app
//     calcula a diferença pra São Paulo na hora, com horário de verão certo.
//   - ExchangeRate-API (open.er-api.com): cotação do dólar, uma vez a cada 12 h.
//
// Cada país é pedido UMA vez e guardado 30 dias no KV; a cotação, 12 h. O REST
// Countries foi descartado: a versão aberta foi desligada (deprecated) em 2026.
import { quemEsta } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';

const DIA = 86400;
const UA = { 'User-Agent': 'spot-app/1.0 (meuspot.app)' };

function json(obj, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });
}

export async function onRequestPost({ request, env }) {
  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ error: 'login' }, 401);
  let b = {};
  try { b = await request.json() } catch (e) {}
  const iso = String(b.iso || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return json({ error: 'iso' }, 400);
  const [dados, cambio] = await Promise.all([dadosDoPais(env, iso), cotacaoDoDolar(env)]);
  if (!dados) return json({ error: 'fonte' }, 502);
  const r = Object.assign({}, dados);
  if (dados.moeda && cambio && cambio[dados.moeda]) r.dolar = cambio[dados.moeda];
  if (cambio && cambio.BRL) r.dolarEmReal = cambio.BRL;
  return json(r);
}

async function dadosDoPais(env, iso) {
  const k = 'pais_v1_' + iso;
  const guardado = await lerKV(env, k);
  if (guardado) { try { return JSON.parse(guardado) } catch (e) {} }
  const d = await doWikidata(iso);
  if (!d) return null;
  if (d.lat != null && d.lng != null) d.fuso = await fusoDe(d.lat, d.lng);
  await gravarKV(env, k, JSON.stringify(d), 30 * DIA);
  return d;
}

export function consultaDoPais(iso) {
  return `SELECT ?capL ?coord ?pop ?lingL ?cod WHERE {
  ?p wdt:P297 "${iso}".
  OPTIONAL { ?p wdt:P36 ?cap. ?cap rdfs:label ?capL FILTER(lang(?capL)="pt"). OPTIONAL { ?cap wdt:P625 ?coord } }
  OPTIONAL { ?p wdt:P1082 ?pop }
  OPTIONAL { ?p wdt:P37 ?l. ?l rdfs:label ?lingL FILTER(lang(?lingL)="pt") }
  OPTIONAL { ?p wdt:P38 ?m. ?m wdt:P498 ?cod }
}`;
}

// As várias linhas que o SPARQL devolve viram um resumo só. Pura: testada.
export function resumirWikidata(linhas) {
  const v = (x) => (x && x.value) || '';
  let capital = '', lat = null, lng = null, pop = 0, moeda = '';
  const linguas = [];
  for (const r of linhas || []) {
    if (!capital && v(r.capL)) {
      capital = v(r.capL);
      const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(v(r.coord));
      if (m) { lng = Number(m[1]); lat = Number(m[2]) }
    }
    const p = Number(v(r.pop));
    if (p > pop) pop = p;
    const l = v(r.lingL);
    if (l && !linguas.includes(l) && linguas.length < 3) linguas.push(l);
    if (!moeda && /^[A-Z]{3}$/.test(v(r.cod))) moeda = v(r.cod);
  }
  if (!capital && !pop && !moeda) return null;
  return { capital, lat, lng, habitantes: pop || null, linguas, moeda };
}

async function doWikidata(iso) {
  try {
    const u = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(consultaDoPais(iso));
    const r = await fetch(u, { headers: Object.assign({ Accept: 'application/sparql-results+json' }, UA) });
    if (!r.ok) return null;
    const d = await r.json();
    return resumirWikidata(d && d.results && d.results.bindings);
  } catch (e) { return null }
}

async function fusoDe(lat, lng) {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&timezone=auto&current=is_day', { headers: UA });
    if (!r.ok) return '';
    const d = await r.json();
    return /^[A-Za-z_]+\/[A-Za-z_\/-]+$/.test(d.timezone || '') ? d.timezone : '';
  } catch (e) { return '' }
}

async function cotacaoDoDolar(env) {
  const k = 'cambio_usd_v1';
  const guardado = await lerKV(env, k);
  if (guardado) { try { return JSON.parse(guardado) } catch (e) {} }
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { headers: UA });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.result !== 'success' || !d.rates) return null;
    await gravarKV(env, k, JSON.stringify(d.rates), 12 * 3600);
    return d.rates;
  } catch (e) { return null }
}
