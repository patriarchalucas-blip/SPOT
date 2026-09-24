# Entrar com a Apple — configuração

**Por quê:** diretriz 4.8. O Spot oferece login do Google; a Apple exige,
junto, uma opção que deixe a pessoa esconder o email. Sem isso, a revisão
costuma reprovar. Decidido em 24/09/2026 (opção B: adicionar, não tirar o
Google).

**O código já está no ar** (commit 83e7385) e o botão fica **escondido** até o
Supabase dizer que o provedor Apple está ligado. Não precisa de build novo: o
login é a parte web do app, e a casca abre qualquer login no navegador do
sistema.

**Fazer ANTES de clicar em "Adicionar para revisão"** no App Store Connect.

> Os nomes de menu abaixo são os de setembro/2026 escritos de memória. Tela de
> terceiro muda: se algo não bater, pare e mostre a tela — não procure por
> semelhança.

---

## 1. Apple Developer (developer.apple.com → Account)

Em **Certificates, Identifiers & Profiles**:

**a) Ligar no app.** *Identifiers* → `app.meuspot.spot` → marcar
**Sign In with Apple** → Save. Se avisar que perfis de provisionamento ficam
inválidos, pode confirmar: a build 4 já enviada não é afetada, e o EAS gera
perfil novo sozinho no próximo build. **Não revogar nada.**

**b) Criar o Services ID** (é o "cliente" do login pela web). *Identifiers* →
**+** → *Services IDs* →
- Description: `Spot login`
- Identifier: `app.meuspot.spot.web`

Depois de registrar, abrir ele, marcar **Sign In with Apple** → *Configure*:
- Primary App ID: `app.meuspot.spot`
- Domains: `kzidnilsyrvauzgelsqd.supabase.co`
- Return URLs: `https://kzidnilsyrvauzgelsqd.supabase.co/auth/v1/callback`

**c) Criar a chave.** *Keys* → **+** → nome `Spot login` → marcar
**Sign In with Apple** → *Configure* → `app.meuspot.spot` → registrar →
**Download**. O download acontece **uma vez só**. Anotar o **Key ID**.

É uma chave DIFERENTE da `AuthKey_56ZN5Z4H2V.p8` (aquela é da App Store
Connect). Guardar no gerenciador de senhas, nunca no repositório.

**d) Team ID** — aparece em *Membership details*. Anotar.

## 2. Gerar o segredo (eu rodo)

```
node ferramentas/segredo-apple.cjs <chave.p8> <TEAM_ID> <KEY_ID> app.meuspot.spot.web
```

Imprime um texto longo. **Vence em 6 meses** — o script diz a data. Depois
dela, o login com a Apple para sem aviso; renovar é rodar de novo e colar.

## 3. Supabase (projeto `kzidnilsyrvauzgelsqd`)

*Authentication* → *Sign In / Providers* → **Apple** → ligar:
- Client IDs: `app.meuspot.spot.web,app.meuspot.spot`
- Secret Key: o texto do passo 2

Salvar. Na hora, o botão "Continuar com a Apple" aparece no login do site e
do app.

## 4. Conferir (eu faço)

- `/auth/v1/settings` devolve `apple: true`;
- entrar com a Apple no navegador e no iPhone, e ver o perfil criado.
