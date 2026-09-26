// Notificação no celular do dono do app (o moderador), pra coisa de operação:
// "a cota de X passou de 80%". Mesmo caminho do aviso de denúncia
// (denuncia-aviso.js): acha a conta pelo e-mail, pega os aparelhos dela e
// manda pela Expo. Texto sempre montado aqui no servidor, nunca vindo do app.
//
// Nunca derruba quem chamou: qualquer falha devolve false e pronto.
const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const EXPO = 'https://exp.host/--/api/v2/push/send';
const DONO_PADRAO = 'patriarchalucas@gmail.com';

// Quem é o dono. A migração 027 tirou o e-mail de profiles (amigos liam o
// e-mail uns dos outros) e criou a tabela `moderadores`, que só o servidor lê.
// Antes da 027 rodar, a tabela não existe e a busca pelo e-mail ainda funciona.
export async function acharDono(sb, env) {
  const [mod] = await sb('/rest/v1/moderadores?select=user_id&limit=1');
  if (mod && mod.user_id) return { id: mod.user_id };
  const email = String(env.MODERADOR_EMAIL || DONO_PADRAO).trim().toLowerCase();
  const [p] = await sb('/rest/v1/profiles?select=id&email=eq.' + encodeURIComponent(email));
  return p || null;
}

export async function avisarDono(env, title, corpo, tipo) {
  try {
    if (!env || !env.SUPABASE_SERVICE_KEY) return false;
    const sb = (caminho) => fetch(SB_URL + caminho, {
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }
    }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    const dono = await acharDono(sb, env);
    if (!dono) return false;
    const tokens = (await sb('/rest/v1/push_tokens?select=token&user_id=eq.' + dono.id))
      .map((x) => x && x.token).filter(Boolean).slice(0, 10);
    if (!tokens.length) return false;
    const r = await fetch(EXPO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'accept-encoding': 'gzip, deflate' },
      body: JSON.stringify(tokens.map((to) => ({ to, title, body: corpo, sound: 'default', data: { tipo: tipo || 'operacao' } })))
    });
    return r.ok;
  } catch (e) { return false }
}
