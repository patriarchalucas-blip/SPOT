import { quemEsta } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';

// Cloudflare Pages Function — "Entrar com a Apple": guardar a chave de
// revogação no login e REVOGAR quando a pessoa exclui a conta.
//
// POR QUE EXISTE (27/09/2026): a Apple exige (diretriz 5.1.1(v)) que app com
// "Entrar com a Apple" revogue o vínculo quando a conta é excluída. Sem isto,
// o Apple ID da pessoa continua listando o Spot como app com acesso, e a
// Apple pode reprovar uma atualização por isso.
//
// COMO:
//   op 'guardar' — no login, o iPhone entrega um código de uso único
//     (authorizationCode). Aqui ele é trocado com a Apple por um refresh
//     token, que fica no KV por conta (só o servidor lê).
//   op 'revogar' — na exclusão da conta, o refresh token é mandado pro
//     endpoint de revogação da Apple e apagado do KV.
//
// PRECISA DE UMA CHAVE "Sign in with Apple" (developer.apple.com → Keys), que
// só o Lucas cria. Env vars no Cloudflare: APPLE_SIWA_KEY (conteúdo do .p8),
// APPLE_SIWA_KEY_ID. Sem elas, responde {configured:false} e NADA quebra — a
// exclusão de conta segue normal.
const TIME = 'JULM2M3YJJ';
const APP = 'app.meuspot.spot';

// Conferência sem login: diz só SE a chave está posta e SE ela abre (monta o
// segredo). Nenhum dado da chave sai daqui. Existe pra que dê pra confirmar a
// configuração sem precisar de uma conta de teste com "Entrar com a Apple".
export async function onRequestGet(context) {
  const { env } = context;
  const configurado = !!(env.APPLE_SIWA_KEY && env.APPLE_SIWA_KEY_ID);
  let chaveValida = false;
  if (configurado) { try { await segredoDoCliente(env); chaveValida = true } catch (e) {} }
  return json({ configurado, chaveValida });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const op = String(body.op || '');
  if (op !== 'guardar' && op !== 'revogar') return json({ error: 'op_invalida' }, 400);

  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ unauthorized: true }, 401);
  if (!env.APPLE_SIWA_KEY || !env.APPLE_SIWA_KEY_ID || !env.SPOT_KV) return json({ configured: false });

  const chave = 'apple_rt_' + quem.uid;
  let segredo;
  try { segredo = await segredoDoCliente(env) } catch (e) { return json({ erro: 'chave_invalida' }) }

  if (op === 'guardar') {
    const codigo = String(body.codigo || '');
    if (!/^[A-Za-z0-9._-]{10,2000}$/.test(codigo)) return json({ error: 'codigo_invalido' }, 400);
    const r = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: APP, client_secret: segredo, code: codigo, grant_type: 'authorization_code' })
    }).catch(() => null);
    const d = r && r.ok ? await r.json().catch(() => null) : null;
    if (!d || !d.refresh_token) return json({ guardado: false });
    await gravarKV(env, chave, d.refresh_token, 60 * 60 * 24 * 365 * 5);
    return json({ guardado: true });
  }

  // revogar
  const token = await lerKV(env, chave);
  if (!token) return json({ revogado: false, motivo: 'sem_token' });
  const r = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: APP, client_secret: segredo, token, token_type_hint: 'refresh_token' })
  }).catch(() => null);
  if (!r || !r.ok) return json({ revogado: false, motivo: 'apple_recusou' });
  try { await env.SPOT_KV.delete(chave) } catch (e) {}
  return json({ revogado: true });
}

// O "segredo do cliente" da Apple é um JWT ES256 assinado com a chave .p8,
// válido por poucos minutos (gerado a cada chamada).
export async function segredoDoCliente(env) {
  const pem = String(env.APPLE_SIWA_KEY).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const b64 = (o) => btoa(typeof o === 'string' ? o : String.fromCharCode(...new Uint8Array(o))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64(JSON.stringify({ alg: 'ES256', kid: env.APPLE_SIWA_KEY_ID }));
  const corpo = b64(JSON.stringify({ iss: env.APPLE_TEAM_ID || TIME, iat: agora, exp: agora + 300, aud: 'https://appleid.apple.com', sub: APP }));
  const ass = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, new TextEncoder().encode(cab + '.' + corpo));
  return cab + '.' + corpo + '.' + b64(ass);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
