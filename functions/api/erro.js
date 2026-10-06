import { lerKV, gravarKV } from './_kv.js';
import { avisarDono } from './_aviso-dono.js';

// Cloudflare Pages Function — o app CONTA OS PRÓPRIOS ERROS: /api/erro.
//
// POR QUE EXISTE (01/10/2026, véspera de divulgar pra família e amigos):
// quando algo quebrava no celular de alguém, a gente só ficava sabendo se a
// pessoa reclamasse — e o Lucas não quer ficar pedindo teste pra ninguém.
// Agora o app manda o erro técnico pra cá, e erro NOVO vira notificação no
// celular do Lucas.
//
// PRIVACIDADE: chega só o erro técnico, a tela, e se foi no app ou no
// navegador. Sem usuário, sem e-mail, sem id, sem o que a pessoa escreveu: o
// app limpa antes de mandar e limparTexto() limpa de novo aqui. Não há login
// nem IP guardado.
//
// COTA: o KV grátis aceita mil gravações por DIA no app inteiro. Por isso é
// UMA chave por dia, com os erros agrupados por assinatura (mesma mensagem na
// mesma tela = um registro com contador), e teto de gravações por dia. Um
// erro que dispara em laço não consome a cota de mais nada.
//
// LER: GET /api/erro (hoje) ou /api/erro?dia=AAAA-MM-DD. É público de
// propósito — só tem erro técnico já limpo, e o código do app é público.

const TETO_GRAVACOES_DIA = 300;
const TETO_AVISOS_DIA = 8;
const MAX_ASSINATURAS = 150;
const UM_MES = 60 * 60 * 24 * 31;

export function limparTexto(t, max) {
  return String(t || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/https?:\/\/[^\s)'"]+/g, (u) => u.split(/[?#]/)[0])
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, '<token>')
    .replace(/(["'`])[^"'`]{40,}\1/g, '$1…$1')
    .replace(/\d{5,}/g, '<n>')
    .replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ')
    .slice(0, max);
}
export function assinatura(msg, tela) {
  const base = String(msg || '').replace(/\d+/g, '#').slice(0, 160) + '|' + String(tela || '');
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.SPOT_KV) return json({ ok: false });
  let b;
  try { b = await request.json() } catch (e) { return json({ ok: false }, 400) }
  const msg = limparTexto(b.msg, 300);
  if (!msg) return json({ ok: false }, 400);
  const tela = limparTexto(b.tela, 40).replace(/[^\w-]/g, '');
  const tipo = ['erro', 'promessa', 'console'].includes(b.tipo) ? b.tipo : 'erro';
  const onde = b.onde === 'app' ? 'app' : 'navegador';
  const pilha = limparTexto(b.pilha, 900);
  const sistema = limparTexto(b.sistema, 40);

  const dia = new Date().toISOString().slice(0, 10);
  const chave = 'erros_' + dia;
  let d = {};
  try { d = JSON.parse((await lerKV(env, chave)) || '{}') || {} } catch (e) { d = {} }
  d.escritas = d.escritas || 0;
  d.avisos = d.avisos || 0;
  d.erros = d.erros || {};
  if (d.escritas >= TETO_GRAVACOES_DIA) return json({ ok: true, teto: true });

  const sig = assinatura(msg, tela);
  const agora = new Date().toISOString();
  const ja = d.erros[sig];
  if (ja) {
    ja.n = (ja.n || 1) + 1;
    ja.ultimo = agora;
    if (onde === 'app') ja.app = (ja.app || 0) + 1;
    // Erro já conhecido e repetido: só grava de vez em quando — o contador
    // fica aproximado, e a cota não vai embora com um laço de erro.
    if (ja.n > 5 && Math.random() > 0.15) return json({ ok: true });
  } else {
    if (Object.keys(d.erros).length >= MAX_ASSINATURAS) return json({ ok: true, cheio: true });
    d.erros[sig] = { msg, tela, tipo, pilha, sistema, n: 1, app: onde === 'app' ? 1 : 0, primeiro: agora, ultimo: agora };
  }
  d.escritas++;
  const novo = !ja && d.avisos < TETO_AVISOS_DIA;
  if (novo) d.avisos++;
  // gravarKV nunca levanta erro: devolve false quando o KV recusa (o teto
  // grátis de mil gravações por dia, no app inteiro). A resposta conta.
  const gravou = await gravarKV(env, chave, JSON.stringify(d), UM_MES);
  if (novo) {
    // Texto FIXO (06/10): /api/erro não pede login, e a mensagem vinha de quem
    // chamou — qualquer um escrevia o que quisesse na tela de bloqueio do
    // Lucas. A mensagem fica só no registro do KV (GET /api/erro).
    const telaSegura = String(tela || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    const aviso = avisarDono(env, 'Erro novo no app',
      (telaSegura ? 'Tela ' + telaSegura : 'Tela desconhecida') + (onde === 'app' ? ' · no app' : ' · no navegador'), 'operacao');
    if (typeof context.waitUntil === 'function') context.waitUntil(aviso); else await aviso;
  }
  return json({ ok: true, gravou });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.SPOT_KV) return json({ configured: false });
  const p = new URL(request.url).searchParams.get('dia') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return json({ error: 'dia' }, 400);
  let d = {};
  try { d = JSON.parse((await lerKV(env, 'erros_' + p)) || '{}') || {} } catch (e) {}
  const lista = Object.values(d.erros || {}).sort((a, b) => (b.n || 0) - (a.n || 0));
  return json({ dia: p, total: lista.reduce((s, e) => s + (e.n || 0), 0), erros: lista });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
