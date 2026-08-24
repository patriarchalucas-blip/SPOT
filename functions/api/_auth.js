// Verificação de "quem está chamando" para as functions que gastam cota paga.
// O `_` no nome impede o Cloudflare Pages de expor isso como rota.
//
// O PROBLEMA: /api/climate e /api/find-instagram eram endereços públicos sem
// nenhuma checagem. Um curl num laço queimava a cota do mês em segundos e a
// feature morria pra todo mundo até o mês virar.
//
// A REGRA, e a razão de ela ser assim:
//   - LER CACHE: liberado pra qualquer um. Temperatura média não é dado
//     sensível e cache não custa nada. Quem chama fica sem gastar nada.
//   - GASTAR COTA: só quem está logado no app. Sem conta não há token, e sem
//     token válido a function nem chega a chamar a API paga.
//
// A parte que mais importa para não punir usuário legítimo: só RECUSA quando
// o Supabase diz explicitamente que o token não vale (401/403). Se o Supabase
// estiver lento, fora do ar ou devolver 5xx, DEIXA PASSAR — o teto mensal
// continua protegendo o custo, e ninguém perde a feature por um problema de
// infra que não é dele. Fecha para token inválido, abre para falha de infra.

// URL e anon key ficam aqui em vez de virarem env var nova: as duas já são
// públicas (estão no index.html, é o que o navegador manda em toda request).
// Guardar como env só criaria mais uma coisa pra configurar no Cloudflare sem
// esconder nada de ninguém.
const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6aWRuaWxzeXJ2YXV6Z2Vsc3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODE5NDAsImV4cCI6MjA5Njg1Nzk0MH0.BMgiP_lTe8mCfe0eSPNUCksXatOntuWAhcqGtR8hco4';

// 10 min: uma sessão ativa valida uma vez e as chamadas seguintes saem do KV.
// Sem isso, abrir uma viagem com 5 cidades novas viraria 5 idas ao Supabase.
const AUTH_TTL = 600;

async function hashToken(t) {
  // O token nunca vai cru pro KV — só o hash serve de chave de cache.
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Devolve { permitir, uid, motivo }.
//   permitir=false  -> só o Supabase dizendo que o token é inválido
//   uid=null com permitir=true -> passou por fail-open (não dá pra contar por
//                                 usuário nesse caso, só o teto global vale)
export async function quemEsta(request, env) {
  const h = request.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return { permitir: false, uid: null, motivo: 'sem_token' };

  const kv = env.SPOT_KV;
  let chave = null;
  if (kv) {
    try {
      chave = 'auth_' + (await hashToken(token));
      const uidCache = await kv.get(chave);
      if (uidCache) return { permitir: true, uid: uidCache, motivo: 'cache' };
    } catch (e) { /* KV indisponível: segue e valida direto */ }
  }

  let r;
  try {
    r = await fetch(SB_URL + '/auth/v1/user', {
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + token }
    });
  } catch (e) {
    // rede falhou — não é culpa de quem está chamando
    return { permitir: true, uid: null, motivo: 'supabase_inacessivel' };
  }

  // Só esses dois status são uma resposta de verdade sobre o token.
  if (r.status === 401 || r.status === 403) {
    return { permitir: false, uid: null, motivo: 'token_invalido' };
  }
  if (!r.ok) return { permitir: true, uid: null, motivo: 'supabase_erro_' + r.status };

  let u;
  try { u = await r.json() } catch (e) { return { permitir: true, uid: null, motivo: 'resposta_ilegivel' } }
  if (!u || !u.id) return { permitir: true, uid: null, motivo: 'sem_id' };

  if (kv && chave) {
    try { await kv.put(chave, u.id, { expirationTtl: AUTH_TTL }) } catch (e) {}
  }
  return { permitir: true, uid: u.id, motivo: 'validado' };
}

// Contador por usuário, para uma conta criada de propósito não queimar a cota
// de todos. Devolve true se ainda pode gastar.
export async function podeGastar(env, prefixo, uid, custo, teto) {
  if (!uid || !env.SPOT_KV) return true; // sem id (fail-open) só o teto global vale
  const mes = new Date().toISOString().slice(0, 7);
  const k = prefixo + '_user_' + uid + '_' + mes;
  try {
    const usado = parseInt((await env.SPOT_KV.get(k)) || '0', 10);
    if (usado + custo > teto) return false;
    await env.SPOT_KV.put(k, String(usado + custo), { expirationTtl: 60 * 60 * 24 * 40 });
    return true;
  } catch (e) { return true } // KV com problema não bloqueia usuário
}
