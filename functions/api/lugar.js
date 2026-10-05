import { quemEsta, podeGastar } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';
import { avisarDono } from './_aviso-dono.js';

// Cloudflare Pages Function — sugestões de LUGAR enquanto a pessoa digita no
// Explorar, e o detalhe (onde fica, qual o tamanho) do que ela escolheu.
//
// POR QUE EXISTE (27/09/2026): o campo do Explorar aceita rua, bairro, cidade
// e país. "Itapura" pode ser a cidade no interior de SP ou a Rua Itapura na
// Anália Franco — e o app adivinhava errado. Agora mostra as opções e a pessoa
// escolhe. Usa o Autocomplete do Google, feito pra isso e bem mais barato que
// a busca de texto.
//
// MESMAS TRAVAS DAS OUTRAS FUNÇÕES: só logado; teto por pessoa; teto do mês com
// aviso no celular do Lucas em 50/80/100%; memória no KV (a mesma palavra
// digitada por duas pessoas é paga uma vez só). Nada de usuário vai pro KV: a
// chave é o texto digitado ou o id público do lugar.

const TETO_MES = 30000;
const TETO_PESSOA = 1500;
const MEMORIA_SUGESTAO = 60 * 60 * 24 * 7;
const MEMORIA_DETALHE = 60 * 60 * 24 * 30;   // o Google permite guardar coordenada por 30 dias
const CAMPOS_DETALHE = 'id,displayName,location,viewport,types,addressComponents';

export function limparTexto(t) {
  return String(t || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
export function idValido(id) { return /^[A-Za-z0-9_-]{10,300}$/.test(String(id || '')) }

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const op = String(body.op || '');
  if (op !== 'sugerir' && op !== 'detalhe') return json({ error: 'op_invalida' }, 400);

  const texto = op === 'sugerir' ? limparTexto(body.texto) : '';
  const id = op === 'detalhe' ? String(body.id || '') : '';
  if (op === 'sugerir' && texto.length < 3) return json({ sugestoes: [] });
  if (op === 'detalhe' && !idValido(id)) return json({ error: 'id_invalido' }, 400);

  const quem = await quemEsta(request, env);
  if (!quem.permitir) return json({ unauthorized: true }, 401);
  if (!env.GOOGLE_PLACES_KEY) return json({ configured: false });

  // sug2 (05/10): a resposta ganhou o grupo de spots; a memória antiga não tem.
  const chave = op === 'sugerir'
    ? 'lugar_sug2_' + (await hash(texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')))
    : 'lugar_det_' + (await hash(id));
  const guardado = await lerKV(env, chave);
  if (guardado) { try { return json(JSON.parse(guardado)) } catch (e) {} }

  // Sugerir são dois pedidos ao Google (lugares + spots): conta dois.
  const custo = op === 'sugerir' ? 2 : 1;
  if (!await podeGastar(env, 'lugar', quem.uid, custo, TETO_PESSOA)) return json({ capped: true, scope: 'user' });
  const mes = new Date().toISOString().slice(0, 7);
  const contador = 'lugar_count_' + mes;
  const usado = parseInt((await lerKV(env, contador)) || '0', 10);
  if (usado >= TETO_MES) return json({ capped: true });
  // Por amostragem (1 em 4, somando 4 vezes o custo): o contador gravava a
  // cada letra digitada, e gravação no KV tem teto.
  if (Math.random() < 0.25) {
    await gravarKV(env, contador, String(usado + 4 * custo), 60 * 60 * 24 * 40);
    await avisarSeCruzou(context, mes, usado, usado + 4 * custo);
  }

  let resposta;
  try {
    resposta = op === 'sugerir' ? await sugerir(env, texto) : await detalhe(env, id);
  } catch (e) {
    return json({ erro_rede: true });
  }
  if (!resposta) return json({ erro: true });   // falha do Google: não guarda
  await gravarKV(env, chave, JSON.stringify(resposta), op === 'sugerir' ? MEMORIA_SUGESTAO : MEMORIA_DETALHE);
  return json(resposta);
}

// Dois grupos desde 05/10 (desenho e1): LUGARES (rua, bairro, cidade, país)
// e SPOTS (restaurante, hotel, passeio) — a Chu digitou o nome de um
// restaurante no Explorar e a busca devolvia "o que tem perto dele". São dois
// pedidos em paralelo, cada um com o filtro de tipo dele. Se o Google recusar
// o filtro, pede sem ele e separa aqui pelos tipos que cada sugestão traz.
async function sugerir(env, texto) {
  const pedir = (tipo) => fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY },
    body: JSON.stringify(Object.assign({ input: texto, languageCode: 'pt-BR' }, tipo ? { includedPrimaryTypes: [tipo] } : {}))
  });
  const umGrupo = async (tipo) => {
    let r = await pedir(tipo);
    let filtrarAqui = false;
    if (r.status === 400) { r = await pedir(null); filtrarAqui = true; }
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    return d ? { lista: d.suggestions, filtrarAqui } : null;
  };
  const [lug, spt] = await Promise.all([umGrupo('geocode'), umGrupo('establishment')]);
  if (!lug && !spt) return null;
  return {
    sugestoes: lug ? organizarSugestoes(lug.lista, lug.filtrarAqui) : [],
    spots: spt ? organizarSpots(spt.lista, spt.filtrarAqui) : []
  };
}

const TIPOS_DE_LUGAR = new Set(['route', 'street_address', 'intersection', 'neighborhood', 'sublocality',
  'sublocality_level_1', 'sublocality_level_2', 'locality', 'administrative_area_level_1',
  'administrative_area_level_2', 'administrative_area_level_3', 'country', 'postal_code', 'colloquial_area', 'geocode']);
export function organizarSugestoes(lista, filtrarAqui) {
  return (lista || []).map((s) => s && s.placePrediction).filter(Boolean)
    .filter((p) => !filtrarAqui || (p.types || []).some((t) => TIPOS_DE_LUGAR.has(t)))
    .slice(0, 6)
    .map((p) => {
      const f = p.structuredFormat || {};
      return {
        id: p.placeId || '',
        titulo: String((f.mainText && f.mainText.text) || (p.text && p.text.text) || '').slice(0, 120),
        sub: String((f.secondaryText && f.secondaryText.text) || '').slice(0, 160)
      };
    })
    .filter((x) => idValido(x.id) && x.titulo);
}

// O grupo SPOTS: estabelecimento, nunca lugar no mapa. Os tipos vão junto —
// o app escolhe a categoria (Gastronomia/Hospedagem/Experiência) por eles.
export function organizarSpots(lista, filtrarAqui) {
  return (lista || []).map((s) => s && s.placePrediction).filter(Boolean)
    .filter((p) => {
      const t = p.types || [];
      if (!filtrarAqui) return true;
      return t.includes('establishment') || !t.some((x) => TIPOS_DE_LUGAR.has(x));
    })
    .slice(0, 5)
    .map((p) => {
      const f = p.structuredFormat || {};
      return {
        id: p.placeId || '',
        titulo: String((f.mainText && f.mainText.text) || (p.text && p.text.text) || '').slice(0, 120),
        sub: String((f.secondaryText && f.secondaryText.text) || '').slice(0, 160),
        tipos: (p.types || []).filter((t) => /^[a-z_]{2,40}$/.test(t)).slice(0, 8)
      };
    })
    .filter((x) => idValido(x.id) && x.titulo);
}

async function detalhe(env, id) {
  const r = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(id) + '?languageCode=pt-BR', {
    headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY, 'X-Goog-FieldMask': CAMPOS_DETALHE }
  });
  if (!r.ok) return null;
  const p = await r.json().catch(() => null);
  if (!p || !p.location) return null;
  return { lugar: { displayName: p.displayName, location: p.location, viewport: p.viewport || null, types: p.types || [], addressComponents: p.addressComponents || [] } };
}

async function avisarSeCruzou(context, mes, antes, depois) {
  for (const pct of [50, 80, 100]) {
    const marca = Math.ceil(TETO_MES * pct / 100);
    if (antes < marca && depois >= marca) {
      const k = 'lugar_aviso_' + mes + '_' + pct;
      if (await lerKV(context.env, k)) continue;
      await gravarKV(context.env, k, '1', 60 * 60 * 24 * 40);
      context.waitUntil(avisarDono(context.env, 'Sugestões de lugar: ' + pct + '% da cota do mês',
        depois + ' de ' + TETO_MES + ' em ' + mes + '. ' + (pct >= 100 ? 'Pararam — suba TETO_MES em lugar.js.' : 'Se precisar, suba o teto antes de acabar.'), 'cota'));
    }
  }
}

async function hash(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
