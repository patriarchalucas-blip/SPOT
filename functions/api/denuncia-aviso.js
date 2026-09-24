import { quemEsta } from './_auth.js';

// Cloudflare Pages Function — avisa o moderador que chegou denúncia.
//
// POR QUE ELA EXISTE
//
// A denúncia (016) era gravada na tabela `denuncias` e ficava lá, sem ninguém
// saber. A política de privacidade e o próprio app prometem "analisamos em até
// 24 horas", e a diretriz 1.2 da Apple pede resposta a tempo. Promessa sem
// aviso é promessa que só se cumpre se o Lucas abrir o painel do Supabase por
// acaso. Então: denúncia gravada -> notificação no celular do moderador.
//
// QUEM É O MODERADOR
//
// A conta cujo e-mail é MODERADOR_EMAIL (env do Cloudflare) ou, sem ela, o
// e-mail de contato que a política de privacidade já publica. Achar pela
// conta e não por um id fixo evita mais uma variável pra configurar.
//
// AS TRAVAS
//
// 1. Quem chama tem que estar logado, e a denúncia tem que ser DELE e recente
//    (10 min). Sem isso, qualquer um mandaria notificação pro moderador em
//    laço, com o id de uma denúncia qualquer.
// 2. O texto é fixo. Nada que o denunciante escreveu (o detalhe) vai pra tela
//    de bloqueio — só o tipo e o motivo, que vêm de uma lista fechada do app.
// 3. Teto por pessoa por hora, no KV.
const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const EXPO = 'https://exp.host/--/api/v2/push/send';
const MODERADOR_PADRAO = 'patriarchalucas@gmail.com';
const TETO_POR_PESSOA = 10;
const JANELA_MS = 10 * 60 * 1000;

const ROTULO = { comentario: 'um comentário', spot: 'um lugar', perfil: 'um perfil' };

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const id = String(body.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'id_invalido' }, 400);

  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ enviados: 0, unauthorized: true }, 401);
  if (!env.SUPABASE_SERVICE_KEY) return json({ enviados: 0, configured: false });

  if (env.SPOT_KV) {
    try {
      const k = 'denuncia_' + new Date().toISOString().slice(0, 13) + '_' + quem.uid;
      const usado = parseInt((await env.SPOT_KV.get(k)) || '0', 10);
      if (usado >= TETO_POR_PESSOA) return json({ enviados: 0, capped: true });
      await env.SPOT_KV.put(k, String(usado + 1), { expirationTtl: 3600 });
    } catch (e) { /* KV fora do ar não pode travar o aviso */ }
  }

  const sb = (caminho) => fetch(SB_URL + caminho, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }
  }).then((r) => (r.ok ? r.json() : [])).catch(() => []);

  // 1. a denúncia existe, é de quem chamou e acabou de ser feita
  const [den] = await sb('/rest/v1/denuncias?select=autor_id,tipo,motivo,created_at&id=eq.' + id);
  if (!den || den.autor_id !== quem.uid) return json({ enviados: 0 });
  if (Date.now() - new Date(den.created_at).getTime() > JANELA_MS) return json({ enviados: 0, motivo: 'antiga' });

  // 2. o moderador e os aparelhos dele
  const email = String(env.MODERADOR_EMAIL || MODERADOR_PADRAO).trim().toLowerCase();
  const [mod] = await sb('/rest/v1/profiles?select=id&email=eq.' + encodeURIComponent(email));
  if (!mod) return json({ enviados: 0, motivo: 'sem_moderador' });
  if (mod.id === quem.uid) return json({ enviados: 0, motivo: 'voce_mesmo' });
  const tokens = (await sb('/rest/v1/push_tokens?select=token&user_id=eq.' + mod.id))
    .map((x) => x && x.token).filter(Boolean).slice(0, 10);
  if (!tokens.length) return json({ enviados: 0, motivo: 'sem_aparelho' });

  // 3. texto fixo
  const motivo = String(den.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const title = 'Nova denúncia';
  const corpo = 'Denunciaram ' + (ROTULO[den.tipo] || 'um conteúdo') + (motivo ? ': ' + motivo : '') + '. Responder em até 24 h.';

  try {
    const r = await fetch(EXPO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'accept-encoding': 'gzip, deflate' },
      body: JSON.stringify(tokens.map((to) => ({ to, title, body: corpo, sound: 'default', priority: 'high', data: { tipo: 'denuncia' } })))
    });
    if (!r.ok) return json({ enviados: 0, erro: 'expo_' + r.status });
    const d = await r.json().catch(() => null);
    return json({ enviados: ((d && d.data) || []).filter((x) => x && x.status === 'ok').length });
  } catch (e) {
    return json({ enviados: 0, erro: 'envio' });
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
