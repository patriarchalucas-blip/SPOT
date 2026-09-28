# O que só o Lucas pode fazer (28/09/2026)

Três tarefas. O código de cada uma já está pronto e desligado; elas só ligam.
Se alguma tela estiver diferente do descrito, mandar print antes de clicar.

---

## 1. Chave "Sign in with Apple" — exclusão de conta avisa a Apple

**Por quê:** regra 5.1.1(v) da Apple. Quem entrou com "Entrar com a Apple" e
exclui a conta tem que ter o vínculo revogado. Sem isso, a Apple pode reprovar
uma atualização. O código está em `functions/api/apple.js` e só espera a chave.

1. developer.apple.com → **Account** → **Certificates, Identifiers & Profiles** → **Keys** → **+**.
2. Nome: `Spot Sign in with Apple`. Marcar **Sign in with Apple** → **Configure** →
   Primary App ID: **app.meuspot.spot** → Save → Continue → Register.
3. **Download** do arquivo `.p8`. **Só dá pra baixar uma vez** — guardar fora do
   repositório (ex.: a pasta `LEVAR-PRO-DRIVE/chaves`). Anotar o **Key ID** (10 letras).
4. Cloudflare → **Workers & Pages** → projeto do Spot → **Settings** →
   **Variables and Secrets** → adicionar, as duas como **Secret**, em Production:
   - `APPLE_SIWA_KEY` = o conteúdo inteiro do `.p8` (abrir no Bloco de Notas e colar, com as linhas BEGIN/END)
   - `APPLE_SIWA_KEY_ID` = o Key ID
5. Avisar o Claude: variável nova só vale depois de um deploy, e ele faz um.

**Nunca** colar o conteúdo do `.p8` no chat nem no GitHub (o repositório é público).

---

## 2. Aprovação de produção do Unsplash — fotos das cidades

**Por quê:** a chave do Unsplash é de app "Demo", e os termos deles pedem
aprovação antes de o app ser público. De graça. As exigências técnicas
(crédito do fotógrafo com link, disparo de download quando a foto é usada)
foram conferidas e corrigidas em 27/09.

1. unsplash.com/oauth/applications → entrar → abrir o app do Spot.
2. Procurar o botão de pedir produção ("Apply for production" ou parecido).
3. Descrição sugerida:
   > Spot is a travel app where people save places they want to visit or have
   > visited. Unsplash photos are used as city cover images (one photo per city),
   > hotlinked from the API, with the photographer credited and linked (with
   > utm_source) on every screen where the photo appears, including the login
   > screen. The download endpoint is triggered when a photo is chosen as a
   > city's cover.
4. Capturas: uma tela de cidade e a tela de login, mostrando o crédito
   "Foto de … no Unsplash".
5. Eles revisam à mão em uns 5 dias úteis.

---

## 3. Liberar "Associated Domains" — link de convite abrindo no app

**Por quê:** hoje o link de convite abre no Safari, e quem instala o app a
partir dele não vira amigo automaticamente. O arquivo que o site precisa
(`.well-known/apple-app-site-association`) e o código da casca estão prontos.

Falta ligar a capacidade "Associated Domains" no cadastro do app na Apple
(igual à do "Entrar com a Apple" em 24/09). O Claude faz isso pela API da
Apple — **só precisa do ok do Lucas**, porque mexe no cadastro da conta de
desenvolvedor. Depois disso entra um build novo.
