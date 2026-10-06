# SPOT — Contexto do projeto

Este arquivo é lido automaticamente pelo Claude Code ao abrir esta pasta. Ele existia antes como um documento colado manualmente em cada novo chat no claude.ai; a partir de agora, vive aqui.

## Quem é o usuário

**Lucas** — Estagiário de FP&A na Sólides Tecnologia (HR tech B2B SaaS, SP), estudante da FGV EAESP. Estilo: direto, sem rodeios, português brasileiro casual, odeia over-explanation e retrabalho evitável. Quando o Claude erra, quer reconhecimento direto + solução, sem desculpa longa. Prefere que o Claude verifique o código antes de pedir pra ele testar. Não tolera hardcode/gambiarra. Quando não sabe algo, quer que o Claude diga isso, não chute.

## O projeto

App pessoal de viagem — "Letterboxd para viagem". Salva lugares (restaurante/hotel/experiência) com nota pessoal, marca "quero ir"/"já fui", avalia. Tagline: "seus lugares · sua voz". Caso de uso: viagem aos Bálcãs (Croácia + Montenegro + Bósnia) com grupo de 6 amigos. Lucas está pensando em profissionalizar isso como produto de verdade (não é urgente, é intenção de médio prazo).

## O Spot é SÓ o app (05/10/2026)

Decisão do Lucas: ninguém usa pelo navegador. Aberto fora do app, `index.html`
mostra "O Spot é um app — Baixar na App Store" (bloco `soNoApp` no começo do
script; reconhece o app por `window.enderecoDeVoltaDoLogin` ou
`ReactNativeWebView`). Seguem abrindo: links de confirmação de cadastro/troca de
senha, `/l/`, `/c/`, `/sobre`, `/privacidade`, e localhost (testes). Mudança
nas telas do site chega em TODOS os apps (App Store e TestFlight) na hora: não
há área de teste — ver Dívida técnica 4.

## Arquitetura atual

- **Frontend:** `index.html` — single file, HTML+CSS+JS inline, sem framework, sem build step. ~10.500 linhas em 24/09/2026 (este número envelhece rápido; ver Dívida técnica 3).
- **Backend:** Supabase (auth + Postgres via REST direto — **nunca usar o SDK JS pra writes**, tem bug de schema cache que trava infinito; toda a camada de dados usa `fetch` direto com `apikey`+`Authorization: Bearer <token>`).
- **Deploy:** Cloudflare Pages, auto-deploy a cada push no branch `main` do GitHub.
- **Repo:** `github.com/patriarchalucas-blip/SPOT`
- **Site:** `meuspot.app` — domínio próprio, comprado no Cloudflare Registrar em 13/09/2026. O endereço antigo (`spotted-38b.pages.dev`) continua no ar em paralelo e não deve ser desligado: é o que estava gravado em versões anteriores.

### Credenciais
```
Supabase URL:      https://kzidnilsyrvauzgelsqd.supabase.co
Supabase anon key: no <script> do index.html — é PÚBLICA por desenho, quem
                   protege os dados é o RLS (migração 008)
Google Places:     NÃO está no client. Vive como env var no Cloudflare,
                   atrás de /api/places e /api/place-photo
Unsplash:          idem, atrás de /api/city-photo
```
Nenhuma chave da Anthropic está no projeto ainda — e **não pode** ir direto no client (ver "Próximos passos").

**Como conferir que nenhuma vazou:** `grep -n "const GAPI\|UNSPLASH_KEY" index.html`
tem que voltar vazio. Os únicos `/api/` que o client chama são `city-photo`,
`place-photo`, `places`, `climate`, `find-instagram`, `notificar`, `mapa`,
`mapa-chave`, `lugar` (sugestões e detalhe do Explorar), `apple` (guardar/revogar o "Entrar com a Apple") e `denuncia-aviso` (notificação no celular do moderador quando
chega denúncia — sem isso o "respondemos em até 24 h" era promessa no escuro).

## Banco de dados (Supabase)

```sql
trips: id, user_id, name, destinations[], dates, date_start, date_end, status, created_at
spots: id, user_id, trip_id, name, category(food/hotel/experience), my_note, city, address,
       photo_url, place_type, status(want/been/skip), my_rating, my_review, rating_google, created_at
profiles: id (=auth.users.id), email, display_name, username, created_at
follows: id, follower_id, following_id, status(pending/accepted), created_at
```

- `profiles` tem trigger `handle_new_user` que popula automaticamente no signup.
- `follows` tem RLS: só vê quem tem vínculo (próprio, pedido pendente, ou aceito). Busca por username passa por uma função `find_profile_by_username(uname text)` (security definer) que **nunca** devolve email — só id/nome/username. Isso existe pra impedir qualquer usuário logado de varrer a tabela de emails de todo mundo via chamada direta à API (a anon key é pública no código).
- **Pegadinha já mordida uma vez:** a tabela `trips` não tinha política de UPDATE (só INSERT/DELETE foram testados originalmente). Se qualquer feature nova precisar dar UPDATE numa tabela, confirma que a política existe antes de assumir que vai funcionar.
- Trips com `dates==='__quickvisit__'` e sem spots são o recurso "marcar país que já visitei" (Perfil → botão dedicado) — contam pro mapa/stats mas **não** aparecem na lista "Minhas viagens" do Dashboard (ver `isQuickVisit()` no JS).

## Sistema de design — direção "F" (aplicada em 20–21/09/2026)

O visual anterior (creme + serifada de alto contraste + acento terracota + rótulos
em monoespacada caixa-alta) é um dos padrões mais reconhecíveis de "app feito por
LLM". Lucas percebeu, encomendou uma direção de design por fora e mandou aplicar.
O que está no app hoje é essa direção, tela por tela.

### Fichas (`:root`)
```css
--base:#F5F5F3      /* fundo da página e da nav */
--surface:#E9E9E6   /* blocos secundários: ações, campos, segmentado */
--map-bg:#E4E8E4    /* o mar, no mapa */
--map-dot:#C8CFC9   /* sobrou da trama de pontos, que saiu */
--ink:#111111  --ink2:#6B6B67  --ink3:#9A9A96
--green:#0B3D2E    /* ÚNICO acento: país visitado, botão, nav ativa, estrela */
--on-green:#F5F5F3
--photo-empty:#6E7F73  /* fundo de quando não há foto */
--r-photo:18px  --r-card:14px  --r-btn:10px  --r-sheet:28px
```

**As regras duras, que valem pra qualquer tela nova:**
- **Nenhuma borda de 1px. Nenhuma sombra.** O que separa é o espaço ou a superfície.
- **Um acento só** (`--green`). Erro e ação destrutiva são `--ink3`, não vermelho.
- **Nenhum gradiente**, com duas exceções: o escurecido no rodapé de foto com texto
  por cima (`linear-gradient(to top,rgba(0,0,0,.55),transparent 55%)`) e nada mais.
- **Uma família só: `Inter Tight`.** Cinzel sobrou só no wordmark. Fraunces, DM Sans
  e IBM Plex Mono saíram. Nenhum `text-transform:uppercase`, nenhum tracking positivo.
- Escala de espaço 4·8·12·16·20·24·32·48. **Margem lateral 20.**

**Pontes:** os nomes velhos (`--terra`, `--amber`, `--white`, `--dark`, `--border`,
`--mono`, `--shadow-*`) continuam no `:root` apontando pro sistema novo. Elas existem
pra que o CSS que ainda não foi reescrito já saia no visual certo — foi o que evitou
300 edições de uma vez. Ao mexer numa regra antiga, troque a ponte pelo token real.

### Componentes
- **Linha de lista** (spot, cidade, país, amigo): foto 64 raio `--r-card` · nome 16/600
  · meta 13 `--ink2` · valor à direita 13. Sem card, sem divisor.
- **Abas de texto** (categoria, filtro, Amigos): 15/600 `--ink3`; ativa `--ink` com
  `box-shadow:inset 0 -2px 0 var(--ink)`. Pílula preenchida saiu do app inteiro.
- **Segmentado** (só onde é escolha de estado — quero ir / fui / pular): trilho
  `--surface`, opção escolhida com o fundo `--base` por cima.
- **Estrela**: duas empilhadas, a de baixo `--ink3` e a de cima `--green`, com
  `clip-path` cortando a de cima — 0% cheia, 50% meia, 100% vazia. Meia estrela existe
  desde a migração 020; o toque na metade esquerda vale x,5.
- **Ação destrutiva**: palavra escrita no fim da tela, em `--ink3`. Nunca ícone de
  lixeira num canto de foto.

### Logo

São **duas peças, com papéis separados** — e isso é deliberado, decidido em
21/09/2026 depois de as duas conviverem por algumas horas e ficar claro que
competiam.

**1. O wordmark: "SPOT"**, em Cinzel maiúsculo (`letter-spacing` 6), e mais nada.
Aparece na tela de carregamento, no cabeçalho da tela inicial e no login.
- **Cor por fundo:** `#0B3D2E` sobre fundo claro · `#F5F5F3` sobre a foto do login.
- `viewBox="3 77 273 76"`, com a linha de base em `y=150` e `font-size` 100.
  **Medido, não a olho:** com a Cinzel de fato carregada, a tinta de "SPOT" vai de
  x=5 a x=274.5 e sobe 72 acima da linha de base (o S passa da altura de maiúscula
  — overshoot de letra redonda) e desce 2 abaixo. O `viewBox` antigo começava em
  y=81 e cortaria 3px do topo do S. **Mexeu na fonte ou no espaçamento, remede** —
  dá pra medir no navegador com `measureText` depois de `document.fonts.load`.

**2. O símbolo — desde 02/10/2026: "Trilha"**, um S feito de pedras de trilha que termina numa pilha de pedras, claro `#F5F5F3` sobre o verde `#0B3D2E` (escolha do Lucas, "por enquanto"). Original em `ferramentas/marca-trilha-original.webp`; todos os tamanhos saem de `node ferramentas/icone-trilha.cjs` (o original já é claro sobre verde: repinta pela luminância, limiares medidos 0,27–0,92; desenho com margem própria, escala 1; Android 70%). Prévia de link: `compartilhar-v3.png`.

**Símbolo anterior (28/09–02/10): "Travessia"**, um S em fita dando a volta no
mundo, claro `#F5F5F3` sobre o verde `#0B3D2E` (o Lucas escolheu a versão de fundo
verde). Original em `ferramentas/marca-travessia-original.webp`; todos os tamanhos
saem de `node ferramentas/icone-travessia.cjs` (repinta, 88% do quadro, sem alfa).
Simulado no tamanho real antes da troca: forte na tela inicial, confuso a 29 pt
(Ajustes) por causa dos continentes — avisado e aceito; uma versão simplificada
pra ícone (menos continentes, fita mais grossa) ficou como melhoria possível.
O wordmark "SPOT" em Cinzel NÃO mudou.

**Símbolo anterior (21–28/09): uma estrada em "S" com o sol nascendo**, claro sobre azulejo verde.
É o ícone do app, e só isso — não entra em tela nenhuma junto do wordmark.
- Desenho do Lucas (opção "01" de uma folha que ele gerou), entregue em 1024 sem
  cantos arredondados, que é como a Apple pede: ela aplica a máscara dela, e arte
  já arredondada sai com borda dupla.
- **Repintado**, porque as cores dele eram de outra família: verde `#345C44` e creme
  `#F4ECE4` (quente) viraram `#0B3D2E` e `#F5F5F3`. Importa porque o ícone fica ao
  lado de coisas pintadas no verde exato — botão, nav ativa — e verde quase-igual
  aparece como desleixo.
- Em `icon-180/192/512.png`, `mobile/assets/icon.png` (1024) e
  `mobile/app-store/icon-1024.png`. O favicon é PNG, não SVG: o desenho veio como
  imagem, não como vetor.
- **Pra repintar de novo:** `ferramentas/repintar-marca.html` (o original dele está
  em `ferramentas/marca-original-do-lucas.webp`). Ele mede as duas cores dominantes
  do arquivo e reconstrói cada pixel como a mesma mistura entre as duas cores de
  destino — trocar por igualdade exata deixaria halo da cor velha em cada curva,
  porque o contorno tem centenas de tons intermediários. A zona morta nas pontas é
  o que faz o chapado bater exatamente no `#0B3D2E`.
- Todo PNG de ícone sai **sem canal alfa** (`ferramentas/png-sem-alfa.cjs`): a Apple
  recusa o ícone de 1024 com transparência, e não há sharp nem PIL nesta máquina.

**A esfera armilar saiu.** Ela era o "O" de SPOT e foi a marca do app por um tempo;
está no histórico porque custou muitas rodadas. Histórico de rejeição, pra não
reabrir sem pedido: pin de localização → anel tracejado + ponto → círculo com elipse
sozinha ("parece um olho") → círculo com elipse + equador ("bola de basquete" —
simetria + laranja) → esfera com o anel inclinado -22° (o que resolveu, quebrando a
simetria) → aposentada quando a estrada em S virou o símbolo.
### Vocabulário
A unidade chama **spot**, não "lugar". Vale no placar, na lista, nos botões e nos
avisos. As exceções são a tagline ("seus lugares · sua voz") e o texto de divulgação
do site, onde "lugares" é a palavra que explica o que é um spot pra quem nunca entrou.

### Telas já na direção nova
Início, nav, Viagem, Cidade, Lista, Perfil, Ficha do lugar, Amigos, Explorar, Login,
folhas, mapa-múndi, perfil/viagem/cidade de amigo, comentários.

As **quatro abas nativas** (`mobile/Tela*.js`, `BarraDeAbas.js`) saíram do escuro em
21/09: as cinco listas de cor que cada arquivo declarava viraram um `mobile/cores.js`
só. Os NOMES lá são os de antes (`INK`, `ESCURO`, `ELEV`, `TERRA`...) pra não
reescrever nenhum lugar de uso — então alguns mentem, e `ESCURO` hoje é a cor mais
CLARA da tela. Está anotado linha por linha no módulo.

A fonte delas também já é a Inter Tight (`@expo-google-fonts/inter-tight`, um
arquivo por peso — no React Native `fontWeight` é ignorado com fonte carregada), e
o "+" flutuante da aba Viagens saiu em 22/09. **Nada do nativo é visto rodando
nesta máquina** (Windows, sem simulador de iPhone): a verificação é `npx eslint .`
mais `npx expo export --platform ios`, que pega import quebrado — o erro que vira
tela branca no celular. Ver na tela depende do TestFlight no iPhone do Lucas.

## Estado da App Store (01/10/2026)

**1.0 APROVADA e no ar desde 01/10** (só Brasil, grátis): https://apps.apple.com/br/app/spot-seus-lugares/id6814856044 — a busca por nome leva até 1–2 dias pra indexar. **1.0.1 criada** no App Store Connect (id `8587766a-0ea8-4ac7-be0b-31ca3d087584`) com o **nome novo "Spot: Been There"**, subtítulo "Onde ir, pelos seus amigos", palavras-chave e novidades já gravadas; **1.0.1 APROVADA e no ar (05/10)**, build 19. Enviada em 03/10 03:03 UTC (logo Trilha + Viagens "Seu primeiro spot"), WAITING_FOR_REVIEW, `AFTER_APPROVAL` (aprovou, publica sozinho). Script: `_local/app-store-connect/enviar-1.0.1.cjs`. `?salvar` entrou no AASA em 05/10. **Ainda dizem "Spot - seus lugares" e NÃO podem mudar sem cuidado:** a marca verificada no Google (tela de login — trocar pede nova verificação) e a /sobre, que precisa ter escrito o nome da marca do Google.

### Histórico (29/09/2026)

**Em revisão: versão 1.0, build 11** (WAITING_FOR_REVIEW desde 28/09 17:21 UTC,
só Brasil, grátis, `releaseType AFTER_APPROVAL` — aprovou, publica sozinho).
Duas rejeições "2.1" já respondidas: 26/09 pediram vídeo + 5 respostas
(`mobile/app-store/resposta-revisao-2.1.md`); 28/09 a conta demo estava sem
conteúdo de amigo (resolvido com `demo2@meuspot.app` como amiga, SQL em
`ferramentas/conta-demo/`). **Build 16** (tudo de 27–29/09) está no TestFlight e
vai na 1.0.1, com o texto de `mobile/app-store/novidades-1.0.1.md`.

**Não usar EAS Update enquanto a 1.0 estiver em revisão:** a atualização pelo ar
alcança o runtime da build que o revisor está testando.

**Android (29/09):** preparado, não publicado — o Lucas pausou. APK de teste pelo
perfil `preview`; textos, capturas 1080×1920 e destaque 1024×500 em
`mobile/play-store/` e `ferramentas/capturas-loja/capturas-android/`. Falta dele:
conta Google Play (US$ 25), 12 testadores por 14 dias, Firebase pras notificações.

**Mexer na submissão pela API** (`_local/app-store-connect/asc.cjs`): trocar a build
é `PATCH appStoreVersions/{id}/relationships/build`. Reenviar depois de rejeição dá
409 "Version is not ready" até marcar o item rejeitado
`reviewSubmissionItems {resolved:true}`; aí `PATCH reviewSubmissions {submitted:true}`.

**Atualização pelo ar existe:** `runtimeVersion: appVersion` no app.json — mudança
só de JS nas telas nativas pode ir por EAS Update sem passar pela Apple. Mudança
de config/permissão/biblioteca nativa pede build.

O resto do histórico (build 4, App Store Connect) está em
`_local/PASSAGEM-DE-BASTAO.md` (fora do git: tem IDs de conta). O contexto completo —
o que foi feito no App Store Connect, decisões e pendências — está em
`_local/PASSAGEM-DE-BASTAO.md` (fora do git: tem IDs de conta). Os textos da loja e
as respostas dos questionários estão em `mobile/app-store/` (`ficha-da-loja.md`,
`etiquetas-de-privacidade.md`, `classificacao-etaria.md`, `login-apple.md`), e as
capturas e a receita que as gera em `ferramentas/capturas-loja/`.

**Entrar com a Apple** (diretriz 4.8, obrigatório porque existe Google) é nativo —
ver `mobile/app-store/login-apple.md`. Pede um build novo que substitui a build 4.
## Features construídas (funcionando em produção)

- Auth (Google OAuth + email/senha; Apple nativo só no app de iPhone, a partir do
  build que vier depois da 4), CRUD de viagens/spots, foto do lugar via Google
  Places e foto de destino via Unsplash — as duas atrás de Pages Function, com cache
  compartilhado no KV (ver Dívida técnica).
- **Nota de 0,5 em 0,5** no spot: toque na metade esquerda da estrela vale x,5
  (migração 020).
- Em spot de comida: botão de **Ligar** (telefone do Places), cardápio/site e
  Instagram. O TheFork saiu — busca genérica caía no lugar errado.
- **Amigos:** pedido de amizade por username (não por email — decisão explícita do Lucas), aceitar/recusar/cancelar, feed de atividade dos amigos (viagens marcadas, spots com status "been" — spots "want" não entram no feed, decisão deliberada pra não virar mural de lista de desejos).
- **Perfil:** mapa-múndi (d3-geo + world-atlas), username editável, "X/243 países" (lista completa ISO 3166-1 em pt-BR, gerada via pycountry — antes só tinha 47 países hardcoded).
- 243 países com bandeira + região + nome geo (pra bater com o TopoJSON do mapa) — tudo numa fonte única (`COUNTRIES`), não existe mais lista duplicada.
- **Explorar (26–27/09):** abas **Para você** (Google) e **Amigos** (spots dos amigos
  DENTRO da área buscada, pela coordenada do spot; ordem: 1º quantos amigos foram,
  2º nota) acima da busca. Busca aceita **rua, bairro, cidade ou país**: primeiro
  `resolverLugarDoExplorar` acha o retângulo do lugar (pede 5 resultados e fica com
  o 1º geográfico — "São Paulo" voltava um HOSPITAL em 1º), depois procura dentro
  (`locationRestriction.rectangle`, aceito no proxy). Tipo de comida é uma linha
  "Japonesa ▾" que abre folha com fotos de prato (`fotos-cozinha/`, domínio
  público, procedência em `creditos.json`); sem contagem por cozinha (decisão do
  Lucas: contar pediria uma busca paga por cozinha).
- **Foto de spot de amigo** sem foto ou com foto QUEBRADA (o `photos[].name` do
  Places expira): `fotoParaVer` busca a foto atual do lugar e só exibe.
- **Cidade onde mora** (`dates='__casa__'`): o card abre a mesma tela das viagens;
  lá "Excluir viagem" some. Desde 29/09 todo spot da cidade de casa vai pra ela:
  `saveSpot` redireciona na hora de salvar e `juntarSpotsDeCasa` move os antigos
  (só `trip_id`, nunca apaga viagem). O inverso também: lugar de fora salvo da
  tela de casa vai pra viagem dele.
- **Adicionar spot sem "Qual categoria?" (29/09):** `categoriaDoLugar` decide pelo
  tipo do Google (`primaryType` primeiro); a categoria aparece na folha da nota
  e troca num toque. A folha de categoria só sobrou pro "Mudar categoria" de spot
  salvo. **Foto própria** opcional na mesma folha (`NOTA_FOTO`, sobe só ao salvar).
- **Explorar sem fim (29/09):** esgotadas as 3 páginas da consulta, segue a fila
  de cozinhas/tipos vizinhos (`filaDoExplorar`); duas consultas seguidas com
  menos de 5 lugares novos encerram — trava contra rajada de busca paga.
- **Perfil do amigo (29/09, desenho 2b/3a/3b):** lista de Cidades com 3 fotos, busca por cidade/país (>6 cidades) que sobe pro topo; mostra Fui E Quero ir.
- **Explorar com mapa (30/09) — ATRÁS DE CHAVE:** só liga com `?mapa=1` (guarda no aparelho; `?mapa=0` desliga) e nunca dentro da casca do iPhone. Código em `EXM`/`exm*` no index.html; handoff em `ferramentas/design/`. Uma lista só (amigos primeiro, Google completa), filtros Amigos/Quero ir/Aberto agora/Comer ▾, folha de 3 paradas, card do pino. Falta: o Lucas validar, e a versão nativa (react-native-maps) no iPhone, que pede build.
- **Lista pública `/l/<código>` (30/09):** compartilhar cidade OU país inteiro (janela `ov-compartilhar`). Tocar num spot abre folha com "Salvar no meu Spot" (`/?salvar=<código>.<id>` → `SALVAR_GUARDADO` no localStorage → depois do login `salvarSpotPendente` pede o spot a `/api/lista` op `spot` e salva em Quero ir) e "Ver no mapa". O `?salvar=` NÃO abre o app de iPhone (o AASA só tem convite): vai pelo site. Confirmação de cadastro por email aberta em outro navegador perde o pedido.
- **Planejar com amigos (30/09, desenho 4a–4g + pedido do Lucas):** só uma VISÃO (`PLN`/`pln*`), sem viagem do grupo. Destinos = vários países E cidades misturados (`PLN.destinos`). Spots dos amigos vêm TODOS de uma vez (cache 2 min) e o país de cada um sai da viagem ou, se ela não é de país (casa "São Paulo"), do ENDEREÇO. Fim do fluxo: **Montar minha viagem** (marca o que entra → salva como Quero ir na viagem de cada país, com `from_user_id`) e **Mandar pro grupo** (texto por cidade via `mandarTextoPraFora`). Entradas: tela do país/cidade e perfil do amigo (só amizade aceita). Texto evita preposição com país. **Entrada pelo Explorar: o Lucas é contra — não sugerir.** Fora: link `/p` (4h).
- **Importar notas (01/10, desenho 2a–2e):** `functions/api/importar.js` (Claude Haiku 4.5 com saída estruturada, até 150 lugares/15 mil caracteres, tetos 40/pessoa e 3.000/mês com aviso no celular; chave `ANTHROPIC_API_KEY` como Secret no Cloudflare; GET diz se está ligado e o app esconde a entrada sem chave). No app: `IMP`/`imp*`; a busca de cada lugar no Google pede só campos da faixa Pro. Entradas: "Colar uma lista" no Adicionar spot, texto com 2+ vírgulas na busca, vazio do Planejar. Privacidade cita a Anthropic.
- **Perfil, Explorar e feedback da Chu (05/10, handoff `ferramentas/design/perfil-explorar-chu/`, branch `perfil-explorar-chu`):**
  - **Próximas viagens** = SÓ viagem criada como próxima (`trips.proxima`: "Nova viagem" no Perfil ou "Montar minha viagem") e ainda sem Fui (`viagemPlanejada`). Decisão do Lucas, 05/10: "fui pra Argentina e deixei restaurantes em Quero ir não é planejar viagem" — viagem só com Quero ir fica na aba Viagens e só não pinta o mapa (`viagemConta`). Placar continua países · cidades · spots (continentes reprovado); feed continua na aba Amigos. Mora SÓ no Perfil (`naAbaViagens` tira da aba Viagens, do placar e do nativo). "Quem vê" por viagem (`trips.privada`, padrão Só eu vejo) — quem garante é o RLS da **028** (Quero ir de viagem privada, e viagem privada sem Fui, não chegam a amigo). Viagem criada sozinha só com Quero ir vira privada (`marcarViagemNova`/`fecharViagensNovas`). Primeiro Fui: folha `ov-virou` 1x por viagem + "Acabou de chegar".
  - **Meus spots**: Fui (inclui Não recomendo) | Quero ir, agrupado por cidade, 8 linhas + "Ver os N" no lugar. Rodapé: países, onde moro, Ajustes.
  - **Explorar**: `/api/lugar` sugere em 2 grupos (`sugestoes` + `spots`, 2 pedidos ao Google, KV `lugar_sug2_`); spot abre a prévia da ficha (`EXPLORE.avulso`, índice 'avulso'). Confirmação de salvar = faixa verde (`mostrarFaixaSalvo`), também depois do "Salvar spot".
  - **Ficha única**: spot de amigo abre a MESMA ficha (`abrirFichaDoSpotDeAmigo`: se é seu, a sua; senão a prévia, com `_comentId` = o spot dele). Bloco "Ana foi 5★ / Rafa quer ir" (`pintarDelesNaFicha`), Conversa N, preço em 4 níveis, carrossel de até 5 fotos (`montarCarrossel`, baixa só a visível + a próxima; `chaveDaFoto` lê o `ref` decodificado). A tela `friendPlace` saiu.
  - **Viagens**: placar países · cidades · continentes; "Onde você mora" em card; lista em linhas; "+ Adicionar" = só cidade/país, entra como viagem feita. Cidade: segmentado Fui | Quero ir. Fundo das telas = --base.
  - **Amigos**: busca "Buscar amigo ou @" (sem amigo, procura no Spot), "De {cidade}", e a tela **Atividade** (pedidos + Quero ir no que você indicou / também foi / comentou).
  - **Lista geral (Melhores/A–Z) saiu do site**; a tela fica no código só porque o placar nativo da build 19 ainda abre ela.
- **Cidade sem localidade no Google** (praia, parque): `cidadeDoEndereco` tira do
  endereço escrito — a Barceloneta virava "Catalunha".
- **Voltar do Android:** `window.voltarDoAndroid` (o site não usa histórico).

## Custo e cotas (27/09/2026) — o Lucas disse: "isso não pode falhar"

- **Google Cloud (projeto spot-499219), cotas por dia na Places API (New)**, postas
  pelo Lucas: SearchTextRequest e GetPhotoMediaRequest. Conferir no painel antes de
  afirmar valor — em 27/09 os números no painel não eram os que eu tinha sugerido.
- **Brave (Instagram): pago** desde 26/09, US$ 5 por mil. Teto do mês 20.000 em
  `find-instagram.js` é só rede contra desastre; o que segura o gasto é a MEMÓRIA
  por restaurante no KV (`ig_<hash nome|cidade>`, 180 dias achado / 30 não).
- **Aviso no celular do Lucas** em 50/80/100% das cotas de Instagram e de fotos
  (`functions/api/_aviso-dono.js`, acha o dono pela tabela `moderadores`).

## Dívida técnica conhecida (Lucas já está ciente, discutido explicitamente)

> Os dois primeiros itens desta lista **já foram resolvidos** e ficaram desatualizados
> aqui por semanas — em 21/09/2026 eu repeti pro Lucas que o Unsplash era um problema
> aberto sem conferir o código, e estava errado. **Confira antes de repetir.**

1. ~~Chaves de API expostas no client~~ — **resolvido.** Google Places e Unsplash
   vivem como env var no Cloudflare, atrás de Pages Functions. A anon key do Supabase
   continua no client porque é pública por desenho; quem protege é o RLS (008).
2. ~~Unsplash 50 req/hora~~ — **resolvido.** O cache saiu do localStorage (que era por
   aparelho: dez pessoas abrindo "Split" gastavam dez requisições pela mesma foto) e
   virou KV compartilhado com validade de 6 meses, em `functions/api/city-photo.js`.
   Hoje só cidade **inédita** gasta cota: pra estourar, 50 cidades nunca vistas por
   ninguém na mesma hora. Há ainda teto mensal (1200) e por usuário (80).
   **O que sobra:** a chave é de app "Demo" no Unsplash, e os termos deles pedem
   aprovação de produção antes de publicar. **A documentação deles diz 1.000/hora**;
   o número 5.000 aparece na central de ajuda e em artigos de terceiros, e pode ser
   antigo. De todo jeito é de graça nos dois níveis. Pede-se em
   `unsplash.com/oauth/applications`, ou por `partnerships@unsplash.com`; eles revisam
   à mão em ~5 dias úteis e pedem capturas — as mesmas que a App Store precisa.
   As três exigências técnicas (hotlink da URL da API, disparo do endpoint de
   download, crédito com link e `utm_source`) já estão atendidas em
   `functions/api/city-photo.js`.
3. **Single HTML file gigante** — ótimo pra iterar rápido em chat, ruim pra qualquer dev revisar/testar depois. Candidato natural a virar múltiplos arquivos agora que o projeto migrou pro Claude Code.
4. **Sem staging** — cada push no `main` vai direto pra produção. Existe CI
   (`.github/workflows/ci.yml`: `node --test` + sintaxe do script e das functions),
   mas ele roda EM PARALELO com o deploy: avisa, não impede. Rodar `node --test`
   antes de todo push.

## Próximos passos discutidos (não construídos ainda, sem ordem de prioridade fechada)

- **IA dentro do Spot** — duas ideias concretas already discutidas com o Lucas:
  1. **Recapitulação de viagem**: gerar texto narrativo juntando notas+spots de uma viagem, pra compartilhar.
  2. **Buscar sugestões via blogs** (complementaria a aba "Explorar", que hoje busca por cidade e mostra o que os amigos marcaram; o Lucas chamou a ideia de "SpotAI" em 23/09, sem decisão): backend chama Claude com a ferramenta de web search ativada, pesquisa blogs de viagem reais sobre o destino, devolve lugares sugeridos com motivo — usuário confirma e adiciona (cai no fluxo normal de Google Places + nota pessoal). Enquadrar como sugestão, nunca como fato.
  - As duas precisam da MESMA peça de infra (function serverless escondendo a chave Anthropic) — construir uma vez, os dois recursos em cima.
  - Modelo sugerido: Claude Haiku (rápido/barato, mais que suficiente pra essas tarefas). Não confiar em preço de cabeça — checar docs.claude.com antes de decidir volume de uso.
- ~~**Rebranding do app inteiro**~~ — **feito** em 20–21/09/2026. Os emoji de
  interface já tinham virado ícones SVG (`icon()`/`ICONS`/`data-ic`) numa leva
  anterior; a direção "F" cobriu o resto, tela por tela (ver "Sistema de design").
  **O que sobrou dessa frente:**
  - A aba **Explorar** existe e funciona (busca por cidade + o que os amigos
    marcaram), mas ainda é a mais fraca — foi a única que o pacote de design não
    desenhou, só herdou os tokens.
- **Placar entre amigos** (gamificação) — Lucas achou "fraco", não vale reintroduzir sem uma abordagem nova.
- **Importar notas soltas via IA** — colar bagunçado (bloco de notas/WhatsApp) e a IA separa em lugares estruturados. Mesma peça de infra do recap/explorar.

## Email de autenticação (Resend)

O Supabase manda confirmação de cadastro e recuperação de senha por SMTP
próprio, configurado em **Authentication → Emails** — não em Settings; a tela
mudou de lugar e procurar por "SMTP Settings" não acha.

```
Host:     smtp.resend.com    Port: 465
Username: resend             (a palavra literal, não um email)
Password: a chave do Resend, começa com re_
De:       nao-responda@meuspot.app
```

**Por que isto existe:** o remetente embutido do Supabase entrega **2 emails
por hora no projeto inteiro** e é documentado como não sendo pra produção. Na
prática, ninguém conseguia criar conta no Spot — o email de confirmação
simplesmente não chegava, e o sintoma parecia problema do usuário.

**Pegadinha que já mordeu:** o Resend verifica o domínio RAIZ (`meuspot.app`).
O subdomínio `send.meuspot.app` que aparece no DNS é só o caminho de retorno
das mensagens. Mandar **de** `@send.meuspot.app` devolve
`unexpected_failure: Error sending confirmation email` — erro que não diz nada
sobre a causa e custou uma rodada inteira pra achar.

**Os dois tetos, e qual aperta primeiro:**

| onde | limite |
|---|---|
| Supabase → Rate Limits → sending emails | 100/hora (configurável, de graça) |
| **Resend plano grátis** | **100 por DIA**, 3.000/mês |

O do Resend é o que aperta. Se estourar, o plano Pro custa US$ 20/mês, dá
50.000 e acaba com o limite diário — dois minutos, sem tocar em código.

**Login com Google não gasta email nenhum.** Só cadastro por email/senha e
recuperação de senha consomem a cota, e os dois dividem o mesmo bolo.

**Como testar sem pedir nada ao Lucas:** um POST em `/auth/v1/signup` com a
anon key devolve **200 + `confirmation_sent_at`** quando o SMTP está de pé, e
**500 `unexpected_failure`** quando não está.

## Estado do banco (migrações aplicadas)

001 a 031 já foram rodadas no Supabase (**031** = `search_profiles` devolve `home_city` e `spots` (Fui fora de viagem privada) e põe conta com uso antes da vazia — três contas "Lucas Patriarcha" iguais na busca fizeram o pedido da Isabella ir pra conta errada; rodada em 06/10/2026, anon false/logado true. **030** = tabela `spot_fotos`: várias fotos suas por spot (até 10, no app), vê quem vê o spot, põe só o dono; rodada em 05/10/2026. **029** = `spots.tipo` (tipo do Google, monta "O melhor de cada tipo") + `profiles.ranking` jsonb (ordem arrastada e desempate do "Seus melhores"); rodada em 05/10/2026, 2/2 true. **028** = próximas viagens: trips.privada/proxima + RLS que esconde de amigo os Quero ir de viagem privada; rodada em 05/10/2026, 4/4 true. Efeito colateral esperado: consulta SEM login a trips/spots agora dá 401 "permission denied for function" em vez de []; o servidor usa a service key e não é afetado) — 001–025 conferidas coluna a coluna em
23/09/2026, 026 rodada e conferida (`anon = false` nas duas) em 25/09/2026, **027**
rodada em 27/09/2026 (5/5 "true" na conferência; RPCs novas recusam anon).
**027** = cadastro não quebra com username repetido (`handle_new_user` com sufixo);
bloqueio desfaz amizade no banco e `redeem_invite` recusa bloqueado; **e-mail saiu
de `profiles`** (gatilho zera; o dono do app mora em `moderadores`, lida só pelo
servidor); spot só em viagem do dono; busca de pessoas sem curinga;
`registrar_aparelho`; bucket `uploads` 5 MB só imagem.
**Pegadinha da 026:** função criada sem `revoke ... from public` continua
executável por `anon` mesmo depois de `revoke ... from anon`, porque o EXECUTE
padrão do Postgres vai pra PUBLIC. Função nova precisa dos DOIS. Destaques:

- **008** — RLS de verdade em `follows`, `profiles`, `trips` e `spots`. Antes disso a
  política de INSERT em `follows` não checava o `status`, então dava pra virar amigo
  de alguém sem ser aceito. Rodar `migrations/008_verificar.sql` devolve 8 linhas OK.
- **009** — `spots.subcategory` (subcategoria de experiência).
- **010** — `spots.phone` (o botão "Ligar" que substituiu o TheFork).
- **011** — tabela `invites` + `invite_owner()` + `redeem_invite()` (convite por link).
- **020** — `my_rating` virou `numeric(2,1)`: a nota aceita meia estrela. Antes era
  `integer`, e mandar 4.5 devolvia **400 `22P02`** — o PostgREST valida o TIPO da
  coluna antes da permissão, então o erro não tem nada a ver com RLS.
- **012** — tabela `spot_comments` (comentar no spot de um amigo). Ficou pendente por
  uma semana enquanto o código já estava em produção: comentar simplesmente não
  funcionava, e a mensagem de erro ("Tenta de novo em alguns segundos") sugeria
  problema passageiro. **Tabela** que não existe devolve **404 `PGRST205`** — diferente
  de coluna, que é 400 `42703`.

**Como conferir o schema sem pedir SQL ao Lucas:** a anon key está no `index.html` e o
PostgREST valida a coluna antes da permissão. Então
`curl "$SB_URL/rest/v1/spots?select=<coluna>&limit=1"` com `apikey`+`Authorization`
devolve **400 `42703`** se a coluna não existe e **200 `[]`** se existe (o `[]` é o RLS
barrando, o que de brinde confirma que ele está ligado).

## Login com Google: a marca na tela de consentimento

A tela do Google mostrava "para continuar em kzidnilsyrvauzgelsqd.supabase.co".
Em 25/09/2026 a marca foi mandada pra verificação no Google Cloud (projeto
`spot-499219` → Google Auth Platform → Branding), com o nome
**"Spot - seus lugares"** — "Spot" sozinho foi recusado por poder ser
confundido com outras marcas. **Verificada e publicada no mesmo dia**, SEM
logo: o logo foi recusado duas vezes ("não identifica a marca") mesmo aparecendo
na /sobre, e é opcional — o nome é o que tira o endereço do Supabase da tela.
Público-alvo em produção.

O que a verificação exige e já está no ar — **não apagar nada disto**:
- `meuspot.app/sobre` (`sobre.html`): a página inicial pública. A raiz do
  site é o app (um login), e o Google recusa login como página inicial. Ela
  precisa ter o nome exato "Spot - seus lugares" escrito.
- `functions/googlee9a933c6e0f8cda5.html.js`: a verificação do domínio no
  Search Console. É function e não arquivo porque a Cloudflare redireciona
  `.html` pro endereço sem extensão (308). O Google reconfere de tempos em
  tempos; se sumir, a propriedade cai e a marca junto.
- `privacidade.html`: a linha do que o app recebe do Google/Apple no login.
- Logo de 120×120: `ferramentas/capturas-loja/logo-google-120.png`.

## Acesso ao GitHub

O push é por **SSH** (`git@github.com:patriarchalucas-blip/SPOT.git`), com a chave em
`~/.ssh/id_ed25519` registrada na conta como "Claude Code - notebook Lucas".

**A porta 22 é bloqueada em algumas redes** (funcionou de casa e falhou com
`Connection timed out` no dia seguinte, provavelmente na rede do trabalho). Por isso
`~/.ssh/config` aponta `github.com` para `ssh.github.com:443` — a porta do HTTPS, que
nenhuma rede fecha. Se o push falhar por timeout, confira se esse arquivo existe.

Não havia credencial HTTPS do GitHub nesta máquina em momento nenhum — as guardadas no
Windows Credential Manager são do GitLab. O que funcionava antes vinha do ambiente do
agente e se perdia a cada reinício de sessão, o que gerou uma tarde inteira de upload
manual pela interface do GitHub. **Se o push falhar com "could not read Username",
confira se o remote voltou pra HTTPS** — não tente autenticar por HTTPS, não há
credencial pra isso.

## Como Lucas trabalha (importante pro Claude Code também)

- Prefere que decisões de escopo grande (redesign, arquitetura) sejam **discutidas antes de executar** — ele literalmente diz "não execute ainda" quando quer só pensar junto, e "execute" quando quer que rode. Respeitar isso.
- Detesta ficar subindo SQL manualmente no Supabase repetidas vezes — sempre que possível, preferir soluções client-side/migração automática em vez de pedir mais uma rodada de SQL, e quando for inevitável, avisar antes e agrupar tudo num único script.
- Valoriza diagnóstico antes de pedir pra ele testar às cegas — checar código, simular localmente (ex: headless browser) antes de afirmar "deve estar funcionando".
