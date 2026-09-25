// Porta de entrada do login com Google no app de iPhone (25/09/2026).
//
// POR QUE ELA EXISTE
//
// Antes de abrir o login, o iOS pergunta: "Spot deseja usar ___ para iniciar
// sessão". O que vai no espaço é o domínio do PRIMEIRO endereço que o app abre
// — e era o do Supabase, "kzidnilsyrvauzgelsqd.supabase.co", que parece golpe.
// Abrindo primeiro meuspot.app/entrar, o iOS mostra "meuspot.app", e daqui o
// navegador segue na hora pro endereço de autorização do Supabase.
//
// A TRAVA: isto é um redirecionamento, e redirecionamento que aceita qualquer
// destino vira ferramenta de golpe ("clique em meuspot.app/entrar?u=site-falso").
// Só passa o endereço de autorização DO NOSSO projeto no Supabase, e mais nada.
const DESTINO_OK = 'https://kzidnilsyrvauzgelsqd.supabase.co/auth/v1/authorize?';

export function destinoPermitido(u) {
  const s = String(u || '');
  if (!s.startsWith(DESTINO_OK)) return null;
  try {
    const url = new URL(s);
    if (url.origin !== 'https://kzidnilsyrvauzgelsqd.supabase.co' || url.pathname !== '/auth/v1/authorize') return null;
    return url.toString();
  } catch (e) { return null }
}

export function onRequestGet({ request }) {
  const destino = destinoPermitido(new URL(request.url).searchParams.get('u'));
  if (!destino) return new Response('Endereço de login inválido.', { status: 400 });
  return new Response(null, { status: 302, headers: { Location: destino, 'Cache-Control': 'no-store' } });
}
