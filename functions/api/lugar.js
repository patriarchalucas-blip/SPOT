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
// BUSCA DE SPOT PELO NOME (11/11/2026). A lista do "Adicionar spot" usava a
// busca de texto do Google: US$ 32 por mil, 5.000 grátis. A sugestão custa
// US$ 2,83 por mil, com 10.000 grátis — e é o pedido que cresce com o número
// de pessoas (cada pausa ao digitar é um). A foto de cada resultado vem do
// detalhe pedindo SÓ `photos`, que o Google não cobra (faixa "IDs Only"; é o
// mesmo pedido de fotoAtualDoLugar no place-photo.js). Se isto falhar ou vier
// vazio, o app volta sozinho pra busca de texto: o pior caso é o de antes.
const MEMORIA_BUSCA = 60 * 60 * 24 * 7;
const MEMORIA_FOTO = 60 * 60 * 24 * 3;

// Onde procurar primeiro. Arredondado a ~0,1° (uns 10 km), como no places.js:
// posição exata de ninguém entra na chave, e a mesma cidade reaproveita.
export function centroDaBusca(centro, raio) {
  if (!centro || centro.latitude == null || centro.longitude == null) return null;
  const la = Math.round(Number(centro.latitude) * 10) / 10, ln = Math.round(Number(centro.longitude) * 10) / 10;
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  const r = Number(raio);
  return { center: { latitude: la, longitude: ln }, radius: Number.isFinite(r) ? Math.min(50000, Math.max(1000, Math.round(r))) : 30000 };
}

export function limparTexto(t) {
  return String(t || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
export function idValido(id) { return /^[A-Za-z0-9_-]{10,300}$/.test(String(id || '')) }

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const op = String(body.op || '');
  if (op !== 'sugerir' && op !== 'detalhe' && op !== 'buscar') return json({ error: 'op_invalida' }, 400);

  const texto = op !== 'detalhe' ? limparTexto(body.texto) : '';
  const area = op === 'buscar' ? centroDaBusca(body.centro, body.raio) : null;
  const id = op === 'detalhe' ? String(body.id || '') : '';
  // Token de sessão do Google (11/10): só formato seguro; fora da chave do cache.
  const sessao = /^[A-Za-z0-9-]{8,64}$/.test(String(body.sessao || '')) ? String(body.sessao) : '';
  if (op === 'sugerir' && texto.length < 3) return json({ sugestoes: [] });
  if (op === 'buscar' && texto.length < 3) return json({ places: [] });
  if (op === 'detalhe' && !idValido(id)) return json({ error: 'id_invalido' }, 400);

  const quem = await quemEsta(request, env);
  // Sem uid não há teto por pessoa (06/10): o "deixa passar" do _auth.js
  // pra Supabase fora do ar virava gasto pago sem dono. Aqui, recusa.
  if (!quem.permitir || !quem.uid) return json({ unauthorized: true }, 401);
  if (!env.GOOGLE_PLACES_KEY) return json({ configured: false });

  // A versão na chave descarta a memória de formato velho: sug2 (05/10) ganhou
  // o grupo de spots; sug3 (05/10, onboarding) passou a levar o tipo de cada
  // sugestão. Mudou o formato da resposta, sobe o número.
  const semAcento = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const chave = op === 'sugerir' ? 'lugar_sug3_' + (await hash(semAcento))
    : op === 'buscar' ? 'lugar_bus1_' + (await hash(semAcento + '|' + (area ? area.center.latitude + ',' + area.center.longitude + ',' + area.radius : '')))
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
    resposta = op === 'sugerir' ? await sugerir(env, texto, sessao)
      : op === 'buscar' ? await buscar(env, texto, area) : await detalhe(env, id, sessao);
  } catch (e) {
    return json({ erro_rede: true });
  }
  if (!resposta) return json({ erro: true });   // falha do Google: não guarda
  await gravarKV(env, chave, JSON.stringify(resposta), op === 'sugerir' ? MEMORIA_SUGESTAO : op === 'buscar' ? MEMORIA_BUSCA : MEMORIA_DETALHE);
  return json(resposta);
}

// Dois grupos desde 05/10 (desenho e1): LUGARES (rua, bairro, cidade, país)
// e SPOTS (restaurante, hotel, passeio) — a Chu digitou o nome de um
// restaurante no Explorar e a busca devolvia "o que tem perto dele". São dois
// pedidos em paralelo, cada um com o filtro de tipo dele. Se o Google recusar
// o filtro, pede sem ele e separa aqui pelos tipos que cada sugestão traz.
async function sugerir(env, texto, sessao) {
  const pedir = (tipo) => fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY },
    body: JSON.stringify(Object.assign({ input: texto, languageCode: 'pt-BR' }, sessao ? { sessionToken: sessao } : {}, tipo ? { includedPrimaryTypes: [tipo] } : {}))
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
        sub: String((f.secondaryText && f.secondaryText.text) || '').slice(0, 160),
        // O tipo vai junto (06/10): o onboarding mostra só cidade.
        tipos: (p.types || []).filter((t) => /^[a-z_0-9]{2,40}$/.test(t)).slice(0, 8)
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

// Devolve no MESMO formato da busca de texto ({places:[...]}), pra lista do
// app não saber a diferença. Sem token de sessão de propósito: sessão que
// termina num detalhe com campo pago sobe pra faixa mais cara do Google.
async function buscar(env, texto, area) {
  const pedir = (comTipo) => fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY },
    body: JSON.stringify(Object.assign({ input: texto, languageCode: 'pt-BR' },
      comTipo ? { includedPrimaryTypes: ['establishment'] } : {}, area ? { locationBias: { circle: area } } : {}))
  });
  let r = await pedir(true), filtrarAqui = false;
  if (r.status === 400) { r = await pedir(false); filtrarAqui = true }
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  if (!d) return null;
  const spots = organizarSpots(d.suggestions, filtrarAqui);
  const fotos = await Promise.all(spots.map((s) => fotosDoLugar(env, s.id)));
  return { places: spots.map((s, i) => ({ id: s.id, displayName: { text: s.titulo }, formattedAddress: s.sub, types: s.tipos, photos: fotos[i] })) };
}

// A 1ª foto do lugar, pelo id. Pedir só `photos` não é cobrado; guardada 3
// dias por lugar (o código da foto vence, e o place-photo.js já cura o vencido).
async function fotosDoLugar(env, id) {
  const k = 'lugar_ft1_' + (await hash(id));
  const g = await lerKV(env, k);
  if (g) { try { return JSON.parse(g) } catch (e) {} }
  try {
    const r = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(id),
      { headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY, 'X-Goog-FieldMask': 'photos' } });
    if (!r.ok) return [];   // passageiro: não guarda
    const p = await r.json().catch(() => null);
    const ph = p && (p.photos || [])[0];
    const a = ph && (ph.authorAttributions || [])[0];
    const lista = ph && ph.name ? [{ name: String(ph.name).slice(0, 600), widthPx: ph.widthPx, heightPx: ph.heightPx,
      authorAttributions: a ? [{ displayName: String(a.displayName || '').slice(0, 120), uri: String(a.uri || '').slice(0, 300) }] : [] }] : [];
    await gravarKV(env, k, JSON.stringify(lista), lista.length ? MEMORIA_FOTO : 60 * 60 * 24);
    return lista;
  } catch (e) { return [] }
}

async function detalhe(env, id, sessao) {
  const r = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(id) + '?languageCode=pt-BR' + (sessao ? '&sessionToken=' + encodeURIComponent(sessao) : ''), {
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
