// "Tem convite aberto por esta conexão?" — ver _convite-conexao.js.
//
// Só com login: quem pergunta é a conta nova, logo depois de entrar. Devolve o
// código (que o app resgata com redeem_invite, só depois que a pessoa
// confirmar) ou nada.
import { quemEsta } from './_auth.js';
import { lerKV } from './_kv.js';
import { chaveDaConexao } from './_convite-conexao.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ codigo: '' }, 401);
  const chave = await chaveDaConexao(request);
  if (!chave || !env.SPOT_KV) return json({ codigo: '' });
  const codigo = await lerKV(env, chave);
  return json({ codigo: /^[A-Za-z0-9_-]{4,64}$/.test(codigo || '') ? codigo : '' });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
