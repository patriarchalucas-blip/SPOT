import { quemEsta, podeGastar } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';

// Cloudflare Pages Function — completa a POSIÇÃO (lat/lng) de spot antigo.
//
// POR QUE EXISTE (30/09/2026): o Explorar com mapa busca os spots dos amigos
// pela posição, dentro da área na tela. Spot salvo antes de o app gravar
// lat/lng não tinha posição e simplesmente não aparecia — o Lucas buscou
// perto de casa, em São Paulo, onde os amigos salvaram vários lugares, e viu
// "Nenhum spot por aqui".
//
// COMO: o app manda só os IDs dos spots sem posição que encontrou. Aqui o
// servidor lê o spot (nome, endereço, cidade), pergunta ao Google onde fica e
// grava lat/lng no próprio spot. Uma vez só por spot: depois disso ele tem
// posição pra sempre, pra todo mundo. O app NÃO manda coordenada nenhuma — se
// mandasse, qualquer um poderia mover o pino do spot de outra pessoa.
//
// TRAVAS: só logado; até 20 spots por chamada; teto por pessoa e do mês;
// spot que o Google não achou fica marcado por 30 dias pra não gastar de novo.

const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const TETO_PESSOA = 600;
const TETO_MES = 5000;
const POR_CHAMADA = 20;

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function melhorResultado(lugares, nome) {
  const alvo = norm(nome);
  if (!alvo) return null;
  const lista = (lugares || []).filter((p) => p && p.location);
  const bate = (p) => { const n = norm(p.displayName && p.displayName.text); return n && (n.includes(alvo) || alvo.includes(n)); };
  return lista.find(bate) || null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))]
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, POR_CHAMADA);
  if (!ids.length) return json({ posicoes: {} });

  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ unauthorized: true }, 401);
  if (!env.GOOGLE_PLACES_KEY || !env.SUPABASE_SERVICE_KEY) return json({ configured: false });

  const sb = (caminho, opcoes) => fetch(SB_URL + caminho, Object.assign({
    headers: Object.assign({ apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json' }, (opcoes && opcoes.headers) || {})
  }, opcoes && { method: opcoes.method, body: opcoes.body }));

  // Só os que ainda estão sem posição, e que não falharam há pouco.
  const r = await sb('/rest/v1/spots?select=id,name,city,address,lat&id=in.(' + ids.join(',') + ')');
  const spots = r.ok ? await r.json() : [];
  const faltam = [];
  for (const s of spots) {
    if (s.lat != null) continue;
    if (await lerKV(env, 'pos_falhou_' + s.id)) continue;
    faltam.push(s);
  }
  if (!faltam.length) return json({ posicoes: {} });

  if (!await podeGastar(env, 'posicao', quem.uid, faltam.length, TETO_PESSOA)) return json({ capped: true, scope: 'user' });
  const mes = new Date().toISOString().slice(0, 7);
  const contador = 'posicao_count_' + mes;
  const usado = parseInt((await lerKV(env, contador)) || '0', 10);
  if (usado >= TETO_MES) return json({ capped: true });
  await gravarKV(env, contador, String(usado + faltam.length), 60 * 60 * 24 * 40);

  const posicoes = {};
  await Promise.all(faltam.map(async (s) => {
    try {
      const onde = [s.address, s.city].filter(Boolean).join(', ');
      const g = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.location' },
        body: JSON.stringify({ textQuery: s.name + (onde ? ', ' + onde : ''), languageCode: 'pt-BR', maxResultCount: 3 })
      });
      const d = g.ok ? await g.json() : null;
      const p = melhorResultado(d && d.places, s.name);
      if (!p) { await gravarKV(env, 'pos_falhou_' + s.id, '1', 60 * 60 * 24 * 30); return; }
      const lat = Number(p.location.latitude), lng = Number(p.location.longitude);
      // `lat=is.null` no filtro: nunca sobrescreve uma posição que já existe.
      const w = await sb('/rest/v1/spots?id=eq.' + s.id + '&lat=is.null', {
        method: 'PATCH', body: JSON.stringify({ lat, lng }), headers: { Prefer: 'return=minimal' } });
      if (w.ok) posicoes[s.id] = { lat, lng };
    } catch (e) { /* um que falha não derruba os outros */ }
  }));
  return json({ posicoes });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
