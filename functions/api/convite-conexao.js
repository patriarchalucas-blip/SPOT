// "Tem convite aberto por esta conexão?" — ver _convite-conexao.js.
//
// Só com login: quem pergunta é a conta nova, logo depois de entrar. Devolve o
// código (que o app resgata com redeem_invite, só depois que a pessoa
// confirmar) ou nada.
import { quemEsta, SB_ANON } from './_auth.js';
const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
import { lerKV } from './_kv.js';
import { chaveDaConexao } from './_convite-conexao.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ codigo: '' }, 401);
  const chave = await chaveDaConexao(request);
  if (!chave || !env.SPOT_KV) return json({ codigo: '' });
  // Só conta NOVA (até 48 h), conferido AQUI (09/10, auditoria): a regra
  // existia só no app, e qualquer conta antiga na mesma conexão (rede da
  // operadora, Wi-Fi do escritório) pegava o código do convite de alguém.
  if (!(await contaNova(request))) return json({ codigo: '' });
  const codigo = await lerKV(env, chave);
  return json({ codigo: /^[A-Za-z0-9_-]{4,64}$/.test(codigo || '') ? codigo : '' });
}

// A data de criação da conta, pelo próprio Supabase com o token de quem chama.
async function contaNova(request) {
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_ANON, Authorization: request.headers.get('Authorization') || '' }
    });
    if (!r.ok) return false;
    const u = await r.json();
    const criada = Date.parse(u && u.created_at || '');
    return !!criada && Date.now() - criada < 48 * 3600 * 1000;
  } catch (e) { return false; }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
