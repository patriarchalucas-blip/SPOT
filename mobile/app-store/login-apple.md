# Entrar com a Apple

**Por quê:** diretriz 4.8. O Spot oferece login do Google; a Apple exige,
junto, uma opção que deixe a pessoa esconder o email. Decidido em 24/09/2026:
adicionar (não tirar o Google).

## Como é feito: NATIVO, não pela web

A folha do sistema, com Face ID (`expo-apple-authentication`). O token volta
pro site dentro do app, que entra com `signInWithIdToken`. Escolhido porque o
caminho pela web exigiria Services ID, uma chave própria e um segredo que
vence a cada 6 meses — três coisas pra configurar com login do Lucas e uma pra
lembrar de renovar. O nativo só precisa do bundle id no Supabase.

**Consequência:** o botão existe só no app de iPhone. No site não aparece — e
a Apple só exige no app.

O botão aparece quando as duas coisas são verdade (`temApple()` no
`index.html`, testado em `tests/apple.test.js`):
- o app tem o módulo — `window.cascaTemApple`, que a casca injeta. **A build 4
  não tem**, então nela o botão nunca aparece;
- o provedor Apple está ligado no Supabase (`/auth/v1/settings`).

## O que falta

1. **Build novo** (eu faço, com o ok do Lucas): `eas build --platform ios
   --profile production` e `eas submit`. O EAS liga a capacidade "Sign In with
   Apple" no identificador do app sozinho, pela chave da App Store Connect que
   já está guardada nele. Substitui a build 4 na versão, antes da revisão.
2. **Supabase** (só o Lucas, é o login dele — 1 minuto): *Authentication →
   Sign In / Providers → Apple* → ligar, e em **Client IDs** pôr
   `app.meuspot.spot`. O campo de segredo fica vazio: é só pro caminho da web.
   Se a tela não deixar salvar sem ele, parar e mostrar.
3. **Testar no iPhone** pelo TestFlight: entrar com a Apple, escolher esconder
   o email, ver o nome certo no perfil.

`ferramentas/segredo-apple.cjs` gera o segredo do caminho pela web. Não é
usado hoje; fica pro dia em que o site quiser o login da Apple também.
