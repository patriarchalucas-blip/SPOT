// Acesso ao KV que NUNCA derruba a resposta.
//
// POR QUE ISTO EXISTE: o KV do plano grátis para de aceitar gravação depois de
// mil por dia, e uma gravação recusada LEVANTA ERRO. Dentro de uma rota que
// não esperava por isso, o erro sobe e mata a rota inteira com 500.
//
// Foi exatamente o que apagou a foto de TODAS as cidades do app por um dia:
// a foto já estava resolvida, a resposta pronta — e um CONTADOR de teto, que
// existe só pra vigiar custo, derrubou tudo ao tentar gravar.
//
// A regra que fica: cache e contador são conveniência. Se o KV está fora, a
// rota responde mais devagar ou sem contar direito, mas responde.

export async function lerKV(env, chave) {
  if (!env || !env.SPOT_KV) return null;
  try { return await env.SPOT_KV.get(chave) } catch (e) { return null }
}

export async function gravarKV(env, chave, valor, ttl) {
  if (!env || !env.SPOT_KV) return false;
  try {
    await env.SPOT_KV.put(chave, valor, { expirationTtl: ttl });
    return true;
  } catch (e) { return false }
}

// Contador de teto por AMOSTRAGEM: grava uma vez a cada quatro, somando
// quatro. A média é a mesma e as gravações caem pra um quarto — e gravação é
// justamente o que é escasso. O teto passa a ter folga pros dois lados, o que
// é aceitável pra um freio que existe pra impedir abuso, não pra cobrar
// pedágio exato. Se um dia precisar ser exato, é contador durable, não isto.
export async function contarUso(env, chave, usado, passo, ttl) {
  if (Math.random() >= 0.25) return;
  await gravarKV(env, chave, String(usado + passo * 4), ttl);
}
