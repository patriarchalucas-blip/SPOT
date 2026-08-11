// Cloudflare Pages Function — roda no servidor da Cloudflare, nunca no
// navegador do usuário. Existe só pra isso: esconder a chave da Brave (que
// não pode ir pro client, senão qualquer um que abrir o app pode usá-la) e
// travar um teto rígido de buscas por mês.
//
// Teto de segurança: a Brave dá 1000 buscas/mês de graça. MONTHLY_CAP fica
// bem abaixo disso de propósito — o pior cenário matemático é *nunca*
// passar do crédito grátis, ou seja, R$0/US$0 de risco. Quando o teto é
// atingido, devolve instagram_url:null e o app simplesmente cai pro
// fallback que já existe (Google Maps) — sem erro, sem cobrança extra.
const MONTHLY_CAP = 900;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'bad_request' }, 400);
  }

  const query = String(body.query || '').trim();
  if (!query) return json({ error: 'missing_query' }, 400);
  if (!env.BRAVE_API_KEY || !env.SPOT_KV) {
    // Configuração ainda não feita no painel do Cloudflare — falha em
    // silêncio pro app, nunca trava a experiência do usuário por isso.
    // DEBUG temporário: diz exatamente qual dos dois está faltando, pra não
    // ficar adivinhando às cegas — remover depois de confirmar.
    return json({
      instagram_url: null,
      configured: false,
      debug: { hasKey: !!env.BRAVE_API_KEY, hasKV: !!env.SPOT_KV, envKeys: Object.keys(env || {}) },
    });
  }

  const monthKey = new Date().toISOString().slice(0, 7); // "2026-08"
  const counterKey = 'brave_count_' + monthKey;
  const current = parseInt((await env.SPOT_KV.get(counterKey)) || '0', 10);

  if (current >= MONTHLY_CAP) {
    return json({ instagram_url: null, capped: true });
  }

  let braveResp;
  try {
    braveResp = await fetch(
      'https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(query + ' instagram') + '&count=5',
      { headers: { Accept: 'application/json', 'X-Subscription-Token': env.BRAVE_API_KEY } }
    );
  } catch (e) {
    return json({ instagram_url: null });
  }

  // Conta a tentativa mesmo se a Brave falhar — é a chamada que gera custo
  // (ou consome o crédito grátis), não a resposta.
  await env.SPOT_KV.put(counterKey, String(current + 1), { expirationTtl: 60 * 60 * 24 * 40 });

  if (!braveResp.ok) return json({ instagram_url: null });

  const data = await braveResp.json();
  const results = (data.web && data.web.results) || [];
  const hit = results.find((r) => /instagram\.com\/[a-zA-Z0-9._]+\/?($|\?|#)/i.test(r.url || ''));

  return json({ instagram_url: hit ? hit.url : null });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
