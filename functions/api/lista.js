import { quemEsta, podeGastar } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';
import { viagensPrivadas, semQueroIrPrivado } from './_privada.js';

// Cloudflare Pages Function — cria o LINK PÚBLICO de uma lista de spots.
//
// POR QUE EXISTE (30/09/2026): quem viaja ouve "me passa suas dicas de
// Lisboa?". Mandar um link que abre pra qualquer pessoa, sem baixar nada, é o
// jeito mais natural de alguém conhecer o Spot — a pessoa vê o valor antes de
// ter conta. Antes, "compartilhar cidade" mandava só um texto corrido.
//
// COMO: o app manda os nomes de cidade da lista (como estão gravados nos
// spots). Aqui fica guardado, no KV, só "de quem" e "quais cidades", com um
// código aleatório. A página /l/<código> (functions/l/[codigo].js) lê os spots
// NA HORA — spot novo naquela cidade entra sozinho, spot apagado some.
//
// PRIVACIDADE: só a própria pessoa cria link dos próprios spots (o uid vem do
// login, nunca do corpo do pedido). O link é aleatório (72 bits) e a página
// não é indexada. Mesma lista pedida de novo devolve o mesmo link.

const TETO_PESSOA = 120; // links novos por mês
const DOIS_ANOS = 60 * 60 * 24 * 730;
// Links lembrados por pessoa (o mais velho sai): 120 por mês é o teto de
// criação, e quem compartilha tanto assim não tem 300 alvos vivos.
const MAX_REGISTRO = 300;

function codigoAleatorio() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return [...a].map((b) => 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 57]).join('');
}
async function hash(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function limparCidades(l) {
  return [...new Set((Array.isArray(l) ? l : []).map((c) => String(c || '').replace(/[\u0000-\u001f,()"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean))].slice(0, 30);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  if (body.op === 'spot') return umSpotDaLista(body, env);
  const cidades = limparCidades(body.cidades);
  const titulo = String(body.titulo || cidades[0] || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 80);
  const pais = String(body.pais || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
  const nome = String(body.nome || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 40);
  if (!cidades.length) return json({ error: 'sem_cidade' }, 400);

  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ unauthorized: true }, 401);
  if (!env.SPOT_KV) return json({ configured: false });

  // A mesma lista (mesma pessoa, mesmas cidades) sempre tem o mesmo link.
  const indice = 'lista_de_' + await hash(quem.uid + '|' + cidades.slice().sort().join('|'));
  // O ALVO (06/10): o que a pessoa vê na tela — a cidade ou o país que ela
  // compartilhou. As cidades mudam (salvou spot numa cidade nova do país, ou o
  // Google grafou diferente) e aí sai link novo; o alvo continua o mesmo. Era
  // por isso que "Parar de compartilhar" só desligava o link mais novo: o
  // índice das cidades de hoje não acha o link das cidades de ontem.
  const alvo = await hash(quem.uid + '|alvo|' + titulo.toLowerCase() + '|' + pais.toLowerCase());
  // Os links de cada pessoa, com o alvo de cada um. A chave leva o hash do
  // uid, como o índice: o KV não guarda id de ninguém às claras.
  const doDono = 'listas_do_' + await hash(quem.uid);
  let ja = await lerKV(env, indice);
  // Índice apontando pra link já desligado (um 'parar' que pegou este link
  // por outro índice) ou vencido: não é link pra oferecer.
  if (ja) { const d = await lerLista(env, ja); if (!d || d.revogado) ja = null }
  const registro = await lerRegistro(env, doDono);
  // Link de antes de 06/10 não está no registro: entra quando é visto, com o
  // alvo de agora. Link antigo que nunca mais for visto (cidades mudaram antes
  // desta versão) não tem como ser achado — o KV não lista por dono.
  const registrar = async (codigo) => {
    if (registro.some((e) => e.c === codigo)) return;
    registro.push({ c: codigo, a: alvo, i: indice });
    await gravarKV(env, doDono, JSON.stringify(registro.slice(-MAX_REGISTRO)), DOIS_ANOS);
  };
  // 'estado': o app pergunta se já existe link (pra oferecer "Parar de compartilhar").
  if (body.op === 'estado') { if (ja) await registrar(ja); return json({ codigo: ja || '' }) }
  // 'parar': TODOS os links deste alvo passam a responder 410 ("Esta lista não
  // está mais aqui"), e compartilhar de novo gera um código NOVO — quem tinha
  // qualquer um dos velhos não volta a ver. Só o alvo, não todos da pessoa:
  // parar Lisboa não pode derrubar o link de Portugal que ela mandou pro grupo.
  // (Casa: a lista da cidade onde mora e a de uma cidade de mesmo nome têm o
  // mesmo título e país — aí as duas param juntas, o lado seguro do erro.)
  if (body.op === 'parar') {
    const alvos = registro.filter((e) => e.a === alvo);
    if (ja && !alvos.some((e) => e.c === ja)) alvos.push({ c: ja, a: alvo, i: indice });
    for (const e of alvos) {
      const d = await lerLista(env, e.c);
      if (!d || d.revogado || d.uid !== quem.uid) continue;
      // Sem gravar a revogação, o link continuaria aberto: aí não é 'parado'.
      if (!await gravarKV(env, 'lista_' + e.c, JSON.stringify({ revogado: true, t: Date.now() }), DOIS_ANOS)) return json({ parado: false, erro: 'kv' });
    }
    for (const i of new Set(alvos.map((e) => e.i).concat(indice))) { try { await env.SPOT_KV.delete(i) } catch (e) {} }
    if (alvos.length) {
      const resto = registro.filter((e) => e.a !== alvo);
      if (resto.length) await gravarKV(env, doDono, JSON.stringify(resto), DOIS_ANOS);
      else { try { await env.SPOT_KV.delete(doDono) } catch (e) {} }
    }
    return json({ parado: true });
  }
  if (ja) {
    await registrar(ja);
    // Link antigo sem nome (criado antes de o app mandar): completa agora.
    if (nome) { try { const d = await lerLista(env, ja); if (d && !d.revogado && d.nome !== nome) { d.nome = nome; await gravarKV(env, 'lista_' + ja, JSON.stringify(d), DOIS_ANOS) } } catch (e) {} }
    return json({ codigo: ja });
  }

  if (!await podeGastar(env, 'lista', quem.uid, 1, TETO_PESSOA)) return json({ capped: true });
  const codigo = codigoAleatorio();
  // Link só sai se foi GRAVADO (01/10: o KV grátis bateu o teto de mil
  // gravações do dia, o código voltava mesmo assim e quem abria via 'esta
  // lista não está mais aqui'). Sem gravar, o app cai no texto de reserva.
  if (!await gravarKV(env, 'lista_' + codigo, JSON.stringify({ uid: quem.uid, cidades, titulo, pais, nome, t: Date.now() }), DOIS_ANOS)) return json({ erro: 'kv' });
  await gravarKV(env, indice, codigo, DOIS_ANOS);
  await registrar(codigo);
  return json({ codigo });
}

async function lerLista(env, codigo) {
  try { return JSON.parse((await lerKV(env, 'lista_' + codigo)) || 'null') } catch (e) { return null }
}
async function lerRegistro(env, chave) {
  try { const l = JSON.parse((await lerKV(env, chave)) || '[]'); return Array.isArray(l) ? l.filter((e) => e && typeof e.c === 'string') : [] } catch (e) { return [] }
}

// "Salvar no meu Spot" (30/09): quem abriu a lista pública toca num spot, cria
// a conta e o spot já entra na lista dela. O app pede aqui os dados daquele
// spot — só se ele ESTÁ na lista (mesma pessoa, cidade da lista, Fui ou Quero
// ir) e o link não foi desativado. Sem login: a lista já é pública, e isto
// devolve menos do que a página mostra (nada de nota nem frase de quem fez).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function umSpotDaLista(body, env) {
  const codigo = String(body.codigo || ''), id = String(body.id || '');
  if (!/^[A-Za-z0-9]{8,24}$/.test(codigo) || !UUID.test(id)) return json({ error: 'bad_request' }, 400);
  if (!env.SPOT_KV || !env.SUPABASE_SERVICE_KEY) return json({ configured: false });
  let dado = null;
  try { dado = JSON.parse((await lerKV(env, 'lista_' + codigo)) || 'null') } catch (e) {}
  if (!dado || dado.revogado || !dado.uid || !Array.isArray(dado.cidades)) return json({ sumiu: true });
  const r = await fetch('https://kzidnilsyrvauzgelsqd.supabase.co/rest/v1/spots?select=name,category,subcategory,city,address,photo_url,photo_author,photo_author_url,maps_url,website_url,phone,lat,lng,rating_google,price_level,status,trip_id'
    + '&id=eq.' + id + '&user_id=eq.' + dado.uid + '&status=in.(been,want)',
    { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } });
  if (!r.ok) return json({ error: 'banco' }, 502);
  // Quero ir de viagem "Só eu vejo" não sai daqui (06/10): a página não mostra,
  // e o id não pode ser adivinhado pra contornar.
  let achados = await r.json();
  if (achados[0] && achados[0].status === 'want') achados = semQueroIrPrivado(achados, await viagensPrivadas(env, dado.uid));
  const s = achados[0];
  if (!s || !dado.cidades.includes(String(s.city || '').trim())) return json({ sumiu: true });
  delete s.status; delete s.trip_id;
  // O país: o que a lista diz (lista de cidade guarda o país; lista de país
  // tem o país no título). Quem confere se é país de verdade é o app.
  return json({ spot: s, pais: dado.pais || dado.titulo || '' });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
