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

 Fila da próxima build do iPhone

Build nova só quando valer a pena (pedido do Lucas, 30/09/2026): a cota grátis
da Expo acabou em 29/09 depois de 16 builds em poucos dias. Mudança no site
(`index.html`, `functions/`) NÃO entra aqui — vai pro ar no push e já aparece no
app. Só entra o que é do app nativo: `mobile/*.js`, `app.json`, `eas.json`,
biblioteca nativa.

Antes de compilar: `npx eslint .` e `npx expo export --platform ios` em
`mobile/`, e conferir esta lista inteira. Depois de compilar, mover os itens
pra "Já compilado".

## Na fila

- **"+" no topo da aba Viagens** (`TelaViagens.js`, ao lado do avatar → `acao('novoLugar')`), feito no código em 07/10. O "Adicionar spot" ficava só no fim da tela, depois de todas as viagens; o Lucas reclamou que "arrumamos e não mudou nada" — a arrumação de 05/10 tinha sido só no site, e a aba Viagens do iPhone é nativa.

- Ainda só com app novo (revisão de 06/10):
  - **Páginas /c/ e /l/ usarem spot://** no botão — só quando a build 21 estiver na maioria (as antigas não entendem o esquema).
  - **Toque na notificação de comentário** abrir o spot comentado (mandar `spot_id` no `data` em notificar.js e tratar em `aoTocar`).
  - **Aviso nativo (App.js ~752)** na paleta velha (#16232A, borda, sombra) e duplicado com o toast do site — decidir um só.
  - **Notificação recusada:** caminho pra reabrir (Linking.openSettings).
  - **Sem internet o app não abre** (PROVÁVEL): WKAppBoundDomains ou tirar a promessa de offline.
  - **Cidades visitadas 10b** na lista nativa; botão "+ Adicionar" com o texto "Adicionar".

- **Abas Viagens e Amigos nativas no desenho novo** (lista em linhas, + Adicionar, busca de amigo): pendente de decisão do Lucas — reescrever no app ou deixar o site desenhar.
- Depois da 1.0.2 aprovada: tirar o modo "spots" da tela Lista (lista geral).

## Já foi na build 22 (07/10, 1.0.3)

- **"+" no topo da aba Viagens** (`TelaViagens.js`, ao lado do avatar → `acao('novoLugar')`), feito no código em 07/10. O "Adicionar spot" ficava só no fim da tela, depois de todas as viagens; o Lucas reclamou que "arrumamos e não mudou nada" — a arrumação de 05/10 tinha sido só no site, e a aba Viagens do iPhone é nativa.

- Ainda só com app novo (revisão de 06/10):
  - **Páginas /c/ e /l/ usarem spot://** no botão — só quando a build 21 estiver na maioria (as antigas não entendem o esquema).
  - **Toque na notificação de comentário** abrir o spot comentado (mandar `spot_id` no `data` em notificar.js e tratar em `aoTocar`).
  - **Aviso nativo (App.js ~752)** na paleta velha (#16232A, borda, sombra) e duplicado com o toast do site — decidir um só.
  - **Notificação recusada:** caminho pra reabrir (Linking.openSettings).
  - **Sem internet o app não abre** (PROVÁVEL): WKAppBoundDomains ou tirar a promessa de offline.
  - **Cidades visitadas 10b** na lista nativa; botão "+ Adicionar" com o texto "Adicionar".

- **Abas Viagens e Amigos nativas no desenho novo** (lista em linhas, + Adicionar, busca de amigo): pendente de decisão do Lucas — reescrever no app ou deixar o site desenhar.
- Depois da 1.0.2 aprovada: tirar o modo "spots" da tela Lista (lista geral).

## Já foi na build 21 (06/10, 1.0.2)

- Foto da pessoa no card grande do feed (`CardDeVisita`).
- `conviteDoLink` aceita `spot://c/<código>` e `spot://salvar/<código>.<id>`.
- Troca de conta: `setDadosDaTela({})` no `onLoadStart`.
- Amigos carregando com puxar-pra-atualizar.
- Pedido recebido com @ / "Mora em · N spots" (`recebidos[].detalhe`).

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

## Já foi na build 21 (06/10, 1.0.2)

- Foto da pessoa no card grande do feed (`CardDeVisita`).
- `conviteDoLink` aceita `spot://c/<código>` e `spot://salvar/<código>.<id>`.
- Troca de conta: `setDadosDaTela({})` no `onLoadStart`.
- Amigos carregando com puxar-pra-atualizar.
- Pedido recebido com @ / "Mora em · N spots" (`recebidos[].detalhe`).

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
