// CONVITE QUE SE PERDIA NA INSTALAÇÃO (08/10/2026).
//
// Quem recebe o link de convite sem ter o app abre /c/<código> no Safari, vai
// pra App Store, instala — e o app abre sem saber de onde a pessoa veio: o
// código ficou no Safari, que o app não lê. A família do sócio do Lucas entrou
// assim numa noite (Elton convidou; Roberta, Felipe, Gabriel... ninguém virou
// amigo de ninguém).
//
// O que dá pra saber nos dois lados é a CONEXÃO: o celular que abriu o link e
// o app instalado minutos depois saem pelo mesmo endereço. A página do link
// anota "esta conexão abriu o convite X" por 2 horas; a conta NOVA que entra
// pela mesma conexão recebe a pergunta "X te convidou. Adicionar?".
//
// Pergunta, nunca amizade direta: a conexão pode ser compartilhada (Wi-Fi de
// casa, do escritório), e aí o pior caso é uma sugestão errada que a pessoa
// recusa. O endereço nunca é guardado — só um resumo embaralhado dele.
//
// Não pega quem abre o link no Wi-Fi e instala no 4G, nem quem usa a
// Retransmissão Privada do iCloud no Safari. Pra esses, tocar no link de novo
// com o app instalado continua funcionando.

export const TTL_CONVITE_CONEXAO = 2 * 60 * 60;

export async function chaveDaConexao(request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!ip) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('spot-convite|' + ip));
  return 'convite_con_' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// O robô do WhatsApp (e afins) também abre /c/ pra montar a prévia — do
// servidor dele, não do celular de ninguém. Não anota.
export function ehRobo(request) {
  const ua = request.headers.get('User-Agent') || '';
  return !ua || /bot|crawl|spider|facebookexternalhit|whatsapp|telegram|slack|discord|preview|embedly|curl|wget/i.test(ua);
}
