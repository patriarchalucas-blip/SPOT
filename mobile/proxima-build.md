# Fila da próxima build do iPhone

Build nova só quando valer a pena (pedido do Lucas, 30/09/2026): a cota grátis
da Expo acabou em 29/09 depois de 16 builds em poucos dias. Mudança no site
(`index.html`, `functions/`) NÃO entra aqui — vai pro ar no push e já aparece no
app. Só entra o que é do app nativo: `mobile/*.js`, `app.json`, `eas.json`,
biblioteca nativa.

Antes de compilar: `npx eslint .` e `npx expo export --platform ios` em
`mobile/`, e conferir esta lista inteira. Depois de compilar, mover os itens
pra "Já compilado".

## Na fila

- **Foto da pessoa no card grande do feed** (06/10, `CardDeVisita` em TelaAmigos.js): a build 20 só tinha iniciais ali. Já no código, `expo export` ok.
- Da revisão com agentes (06/10) — só resolve com app novo:
  - **Convite e "Salvar no meu Spot" a partir do Safari:** link do mesmo domínio tocado no Safari não abre o app. `conviteDoLink` aceitar `spot://c/<código>` e `spot://salvar/<código>.<id>`, e as páginas `/c/` e `/l/` usarem esse endereço no botão (caindo na App Store se não abrir).
  - **Troca de conta:** `setDadosDaTela({})` no `onLoadStart` do WebView (o site já manda `pronto:false`, isto é o reforço).
  - **Amigos carregando sem saída:** o "carregando" da TelaAmigos dentro de ScrollView com RefreshControl.
  - **Toque na notificação de comentário** abrir o spot comentado (mandar `spot_id` no `data` em notificar.js e tratar em `aoTocar`), não só a aba Amigos.
  - **@ e "De cidade · N spots" no pedido recebido** na aba Pedidos nativa (o dado já chega em `recebidos`).
  - **Aviso nativo (App.js ~752)** ainda na paleta velha (#16232A, borda, sombra) e aparece junto com o toast do site — decidir um só.
  - **Notificação recusada:** caminho pra reabrir (Linking.openSettings) quando a permissão está negada.
  - **Sem internet o app não abre** (PROVÁVEL): service worker não roda em WKWebView sem App-Bound Domains. Decidir: ligar WKAppBoundDomains (meuspot.app + Supabase) ou tirar a promessa de offline.
  - **Cidades visitadas 10b** na lista de viagens nativa: país sem cidade mostra "+ Marcar cidades"; botão "+ Adicionar" com o texto "Adicionar".

- **Abas Viagens e Amigos nativas no desenho novo** (lista em linhas, + Adicionar, busca de amigo): pendente de decisão do Lucas — reescrever no app ou deixar o site desenhar.
- Depois da 1.0.2 aprovada: tirar o modo "spots" da tela Lista (lista geral).

## Já foi na build 20 (05/10, 1.0.2)

- **Foto do amigo no feed de Amigos** (`TelaAmigos.js`): o Avatar nativo só desenhava iniciais; agora recebe `foto` (o site já manda em `pessoaPraTela`).
- **Botão "Atividade" no topo da aba Amigos** (`TelaAmigos.js`, `acao('atividade')` → `abrirAtividade`), com o ponto verde de `dados.atividadeNova` — feito no código.
- **Anel do placar** (`TelaViagens.js`): o "12%" descia em cima do "de 195" no iPhone (print do Lucas, 05/10). Linha de base fixa pra cada texto, sem alignmentBaseline/dy — conferido desenhando o mesmo SVG.
- ~~Placar com continentes~~ — reprovado pelo Lucas (05/10); o placar continua países · cidades · spots.
- **Pendente de decisão do Lucas:** a aba Viagens e a aba Amigos nativas ainda têm o desenho antigo (sem "Onde você mora" em card, sem lista em linhas, sem busca de amigo, sem Atividade). Ou reescrever as duas em React Native, ou deixar o site desenhar essas abas como já faz com o Explorar (`cascaTemExplorarWeb`).
- Depois desta build: tirar o modo "spots" da tela Lista (lista geral).

## Já foi na build 19 (02/10, 1.0.1)

- **Logo novo "Trilha"** — `ferramentas/icone-trilha.cjs`.
- **Viagens sem nenhum spot**: "Seu primeiro spot" + "Colar uma lista do celular" (`TelaViagens.js`).
- Textos: "spots" no lugar de "lugares" no vazio de Amigos; convite sem "dele".

## Já foi na build 18 (01/10, 1.0.1)


- **Link de convite abre o app** — `ios.associatedDomains` no app.json
  (capacidade já ligada na Apple em 29/09) + leitura do link sem `new URL`.
- **Placar da aba Viagens igual ao do site** — `TelaViagens.js`.
- Barra de abas mais baixa e sem a barra do teclado — já foram na 16, conferir.
- **Explorar com mapa dentro do app** (pedido do Lucas, 30/09): a casca avisa
  `window.cascaTemExplorarWeb` e, quando o site responde `explorarWeb`, não
  cobre a aba com a `TelaExplorar` nativa. O site liga o mapa sozinho nessa
  casca; as builds antigas (inclusive a 11, em revisão) seguem com o nativo.
  Testado simulando as duas cascas no navegador.
- **"Salvar no meu Spot" da lista pública abre o app** (30/09): hoje o link
  `meuspot.app/?salvar=<código>.<id>` abre no Safari, e funciona por lá. Pra
  abrir no app: `conviteDoLink` (App.js) passa a aceitar `salvar=` e repassa
  `SITE + '/?salvar=' + valor` pro WebView. **Só DEPOIS dessa build** entra
  `{ "/": "/", "?": { "salvar": "?*" } }` no
  `.well-known/apple-app-site-association` — antes disso o iPhone abriria o
  app sem saber o que fazer com o link, e o spot não seria salvo.

## Já compilado

- 16 (29/09): categoria automática, foto própria, Explorar sem fim, barra
  menor, teclado sem barra de navegador, botão voltar Android, etc.
