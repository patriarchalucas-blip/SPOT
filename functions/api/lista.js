import { quemEsta, podeGastar } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';

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
  const ja = await lerKV(env, indice);
  // 'estado': o app pergunta se já existe link (pra oferecer "Parar de compartilhar").
  if (body.op === 'estado') return json({ codigo: ja || '' });
  // 'parar': o link antigo passa a responder 410 ("Esta lista não está mais aqui"),
  // e compartilhar de novo gera um código NOVO — quem tinha o velho não volta a ver.
  if (body.op === 'parar') {
    if (ja) {
      await gravarKV(env, 'lista_' + ja, JSON.stringify({ revogado: true, t: Date.now() }), 60 * 60 * 24 * 730);
      try { await env.SPOT_KV.delete(indice) } catch (e) {}
    }
    return json({ parado: true });
  }
  if (ja) {
    // Link antigo sem nome (criado antes de o app mandar): completa agora.
    if (nome) { try { const d = JSON.parse((await lerKV(env, 'lista_' + ja)) || 'null'); if (d && !d.revogado && d.nome !== nome) { d.nome = nome; await gravarKV(env, 'lista_' + ja, JSON.stringify(d), 60 * 60 * 24 * 730) } } catch (e) {} }
    return json({ codigo: ja });
  }

  if (!await podeGastar(env, 'lista', quem.uid, 1, TETO_PESSOA)) return json({ capped: true });
  const codigo = codigoAleatorio();
  const dois_anos = 60 * 60 * 24 * 730;
  await gravarKV(env, 'lista_' + codigo, JSON.stringify({ uid: quem.uid, cidades, titulo, pais, nome, t: Date.now() }), dois_anos);
  await gravarKV(env, indice, codigo, dois_anos);
  return json({ codigo });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
