# Spot — Perfil, busca do Explorar e feedback da Chu (05/10)

Referência visual: `Spot Perfil Explorar Chu.dc.html`. Sistema F sem exceção: sem borda de 1px, sem sombra, um acento (`--green`), Inter Tight, sem pílula preenchida, texto sem gênero.

Componentes que se repetem:
- **Segmentado:** trilho `--surface`, altura 40, raio 10, padding 3, gap 3. A opção ativa tem fundo `--base`, raio 8 e 15/600; as inativas, 15 `--ink2`. Contagem opcional em 14 `--ink3`.
- **Faixa de confirmação:** absoluta, left/right 12, bottom 34 + safe-area, altura mínima 60, raio 14, fundo `--green`, texto `--base`. Leva o check 24 (círculo `--base`, traço `--green`), o título 16/600, o subtítulo 14 e "Ver" 15/600 à direita. Fica visível até a pessoa sair da tela, rolar mais de 80px ou tocar. **Substitui o toast "Spot salvo" de 3 segundos.**

---

## 1. Perfil (p1–p4). Substitui os itens 5 e 8 da Chu

Ordem: **cabeçalho → Próximas viagens → Meus spots → rodapé**.

### Cabeçalho
Avatar 64 com raio 20, nome 26/700 -0.035em e "@lucas · N amigos" 15 `--ink2` (tocar em amigos abre a aba Amigos).

### Próximas viagens
- Título 20/700 + contagem 15 `--ink3`; "+ Nova" 15/600 `--green` à direita.
- Cards 250px que rolam para o lado (gap 12): foto 150 com raio 18, o escurecido do rodapé, o país 22/700 e "Cidades · N spots" 14, com avatares 26 no canto superior esquerdo se a viagem veio de "Planejar com amigos". Embaixo do card, o ícone de cadeado + "Só eu vejo" ou o ícone de pessoas + "Amigos veem", 14 `--ink2`.
- **Regra:** uma viagem com 0 Fui (só Quero ir) é planejada e aparece **só aqui**, nunca na aba Viagens nem no mapa.
- Ordem: a editada por último primeiro.
- **Vazio (p2):** card `--surface` raio 14 com "Para onde é a próxima?" 17/600, o texto "Comece por um destino e junte o que seus amigos já salvaram lá." 15 `--ink2` e dois botões em grid 1fr 1fr: "Nova viagem" (principal; abre a folha c3 no modo planejamento) e "Com amigos" (secundário com fundo `--base`; abre o Planejar com amigos).
- **"Planejar com amigos" → "Montar minha viagem" → Salvar** cria ou atualiza a próxima viagem do destino, com os amigos guardados para os avatares.

### Tela da viagem planejada (p3)
- Hero com "Próxima viagem" 15/600 acima do nome.
- O primeiro bloco do corpo é "Quem vê" + o segmentado [cadeado "Só eu vejo" | pessoas "Amigos veem"]. **O padrão é Só eu vejo.** A mesma pergunta aparece na criação, já respondida.
- Com "Só eu vejo", nada da viagem aparece para amigos (nem no perfil, nem no Planejar, nem na Atividade). Com "Amigos veem", os Quero ir dessa viagem entram no que os amigos já veem.
- Se tiver vindo do Planejar, mostra os avatares + "Montada com Ana e Rafa" 14 `--ink2`.
- As linhas mostram a dica do amigo em `--green`: "Ana foi 5★".
- Sem data.

### Primeiro Fui (p4)
- Folha (raio 28, scrim 35%) **uma vez por viagem**, no primeiro Fui: foto 64 + "{Spot} · Fui" 15 `--ink2` + "{País} agora é uma viagem" 26/700 `--green`; o texto "Ela sai de Próximas viagens e vai pra aba Viagens. O {país} ganha cor no seu mapa e seus amigos passam a ver o que você marcou como Fui."; e os botões "Ver em Viagens" (principal) e "Continuar aqui" (secundário).
- **Privacidade:** ao virar viagem, os Fui ficam visíveis para amigos, como em todas as viagens. Os Quero ir restantes seguem a escolha anterior.
- Na aba Viagens, a linha do país mostra "Acabou de chegar" 14/600 `--green` no lugar do subtítulo, até a próxima abertura do app.

### Meus spots (p1, p1b)
- Título "Meus spots" e, nesta ordem: o segmentado **Fui N | Quero ir N**; os seletores de linha "Todas as cidades ▾" e "Todas as categorias ▾" (15/600, ▾ 13 `--ink2`; abrem uma folha como a de cozinha). As categorias são Gastronomia / Hospedagem / Experiência.
- Sem cidade filtrada, a lista vem **agrupada por cidade**: cabeçalho "São Paulo · 24" 14/600 `--ink2`, com as cidades ordenadas pelo spot mais recente. Mostra até 8 linhas, depois "Ver os N" 15/600 `--green` (abre a lista inteira).
- Linha: foto 56 raio 14, o nome 17/600, o subtítulo "bairro" (ou a categoria, quando a categoria não está filtrada), a sua nota em `--green` à direita (em Fui).

### Rodapé
Linhas de 52 de altura, 16 `--ink2`, valor + › `--ink3` à direita: "Países que visitei · 23", "Onde moro · São Paulo", "Ajustes" (sair e excluir conta ficam dentro). Sem título, sem fundo.

---

## 2. Explorar: buscar spot pelo nome (e1–e6)

### Sugestões
- Enquanto a pessoa digita (debounce de 250ms, a partir de 2 caracteres): dois grupos, **Spots** e **Lugares**, com título 14/600 `--ink2` e **até 3 linhas cada**.
- Ordem dos grupos: primeiro o que tiver o resultado com melhor score de texto; no empate, Spots.
- Linha com altura mínima 56: **spot** com foto 44 raio 10, nome 16/600 e "Tipo · Bairro, Cidade" 14 `--ink2`; **lugar** com um quadrado `--surface` 44 raio 10 com o pino, nome 16/600 e "Cidade · País" / "Bairro · Cidade, País" / "País".
- À direita, quando existir: "Você quer ir" / "Você foi" 14/600 `--green`, ou "{Amigo} foi" 14 `--ink2`.
- **Um grupo só (e2):** mostre só esse grupo, com o título. Nunca uma linha de "nenhum resultado" para o outro.
- Nenhum resultado: "Nada com esse nome" 15 `--ink2`.
- Tocar num **lugar** busca na área, como hoje. Tocar num **spot** abre a ficha.

### Ficha (a mesma em todo o app; ver C10)
- Foto 250 full-bleed com ← e ⋯ sobre ela; nome 28/700; "Tipo · Bairro, Cidade" 14 `--ink2`; preço + "· 4,7 no Google" 14 `--ink2`.
- Bloco de status: o rótulo + o segmentado Quero ir / Fui / Não recomendo.
  - **Novo (e3):** rótulo "Salvar como", **sem opção marcada**. Um toque salva.
  - **Já é seu (e4):** "Na sua lista" + a cidade 14 `--ink3` à direita; o seu status marcado; a sua frase 16 logo abaixo.
  - **De amigo (e5):** "Salvar como" (ou "Na sua lista", se também for seu) e, abaixo, o bloco do amigo: avatar 36, "Ana foi 5★" 15/600 e a frase pública 15; depois, "Rafa quer ir".
- Ações: Ligar / Instagram / Rota (grid de 3, secundários). Cardápio não entra.
- Depois do primeiro save, o bloco "Aparece em" (categoria) entra abaixo das ações, como em `planejar-v2-e-ajustes.md` a2.
- **Depois do toque (e6):** o segmentado marca na hora (otimista) e a faixa verde sobe: "Salvo como Quero ir" / "Salvo como Fui", com o subtítulo "Em {cidade} · N spots" ou, se a cidade for de uma próxima viagem, "Em Próximas viagens · {país}". "Ver" abre a cidade ou a viagem.
- Ao salvar um spot de cidade sem viagem, a viagem do país é criada sozinha: como Quero ir, ela vira uma próxima viagem com "Só eu vejo"; como Fui, uma viagem.

---

## 3. Feedback da Chu (c1–c8 + e5/e6)

### A1/A2 Separar Fui e Quero ir (c2)
- Na tela da cidade, abaixo das abas Comer/Ficar/Experiências: o segmentado **Fui N | Quero ir N**. Ele substitui o "Todos ▾" da rodada anterior.
- Abre em Fui; se a categoria só tem Quero ir, abre em Quero ir; lembra a última escolha por cidade.
- O status sai das linhas, e elas mostram a nota + a frase (Fui) ou a dica do amigo (Quero ir).
- Nas listas por categoria vale o mesmo segmentado.
- **A lista geral "Melhores / A–Z / Comer / Ficar / Experiências" sai.** Para achar um spot sem a cidade, use Meus spots (Perfil) ou a busca do Explorar.

### A3 Placar (c1)
"N países ›" · "N cidades ›" · "N continentes" (sem ›, não tocável). "Spots" sai do placar. Os continentes contam a partir dos países com Fui.

### B4 Onde moro (c1)
Abaixo do placar: o rótulo "Onde você mora" 14/600 `--ink2` e um card `--surface` raio 14 padding 10 (foto 72×56 raio 10, a cidade 18/600, "N spots" 14 `--ink2`, ›). Depois, o título "Viagens N" + "+ Adicionar" 15/600 `--green`, as abas de continente e a lista. Ela não inclui próximas viagens.

### B6 Adicionar viagem (c3)
- A folha "Adicionar viagem": busca que **só aceita cidade e país**; linhas de lugar como em e1; check 24 na escolhida; o texto "Entra como viagem feita e pinta o mapa. Os spots você adiciona depois." 14 `--ink2`; e o botão "Adicionar {nome}".
- Nenhum campo de restaurante. Pela aba Viagens, presume **Fui**.
- **Modo planejamento** (Perfil > "+ Nova" / "Nova viagem"): o título vira "Nova viagem", presume **Quero ir**, ganha o bloco "Quem vê" (padrão Só eu vejo) e o texto vira "Entra em Próximas viagens."
- Uma viagem sem spots precisa existir no banco, com o país e a cidade. Com Fui, ela pinta o mapa.

### B7 Salvar
O "Salvar spot" já existe. Depois dele, **abra a ficha do spot salvo com a faixa verde** (e6), e não a tela inicial.

### B9 Amigos na cidade (c2)
Uma linha: avatares 24 (até 3) + "Ana, Rafa e mais N têm spots aqui" 14 `--ink2` + ›. Abre a lista de amigos com spots na cidade (com busca). **Não aparece na cidade onde a pessoa mora.**

### C10 Ficha única (e5)
Toda entrada (busca, cidade, perfil de amigo, Planejar, Atividade) abre a **mesma** ficha. O bloco de amigos aparece quando algum amigo tem o spot.

### C11 Várias fotos (e7) — entrou em 05/10
- O topo da ficha vira um carrossel horizontal de **até 5 fotos** do Google Places, com 300 de altura (era 250), de borda a borda, `scroll-snap-type:x mandatory`, uma foto por vez, sem bounce lateral nas pontas.
- **Contador** "1 de 5" 13/600 `--base` no canto inferior direito, sobre o escurecido `linear-gradient(to top, rgba(0,0,0,.55), transparent 40%)`. Sem bolinhas e sem barra. Na última foto, "Fotos do Google" 13 à esquerda (atribuição).
- ← e ⋯ ficam fixos por cima, sem rolar.
- Com 1 foto: sem contador, como hoje. Sem foto: fundo `--surface` com 200 de altura.
- **Custo:** carregar só a foto visível + a próxima (pré-busca de 1). Nunca as 5 ao abrir. Guardar em cache as URLs já buscadas por place id (sem baixar de novo na mesma sessão).
- Tocar: abre um visualizador em tela cheia (fundo `#111`), com a mesma rolagem, o contador no topo e ✕ para fechar; arrastar para baixo também fecha.
- Se a pessoa salvou uma foto própria no spot, ela é a primeira.

### C12 Preço
Quatro níveis: `$$$$`, com os níveis usados em `--ink` e o resto em `#C4C4C0`. Sem preço do Google, a parte some.

### C13 Conversa
O bloco "Conversa N" 15/600 entra na ficha abaixo das ações, quando há amigo no spot. Mostra as 2 últimas mensagens ("**Nome** texto", 15) e um campo "Comentar" ao tocar. Sai do ⋯.

### D14 Buscar amigo (c7)
O campo "Buscar amigo ou @" (altura 44, raio 10, `--surface`) no topo da aba Amigos, do Planejar (escolher) e da aba Amigos do Explorar. Ele procura pelo nome e pelo @, sem diferenciar acento.

### D15 Atividade (c6)
- Entrada: "Atividade" 16/600 no topo direito da aba Amigos, com um ponto 8 `--green` quando há algo não visto.
- Seção **Pedidos**: os recebidos ("{Nome} quer adicionar você", com "Aceitar" — botão `--green` de 36 de altura e raio 10 — e "Recusar" 15 `--ink2`) e os enviados ("Pedido enviado pra {Nome}" + "Cancelar").
- Seção **Esta semana** / **Antes**: "{Nome} marcou Quero ir no {Spot}, que você indicou", "{Nome} também foi no {Spot} e disse: '…'", "{Nome} comentou na {Spot}: '…'"; avatar 40 à esquerda e a foto do spot 44 à direita. Tocar abre a ficha.
- **Privacidade:** viagem "Só eu vejo" não gera atividade para ninguém.

### D16 Perfil do amigo (c8)
Avatar 72 raio 22, **"De {cidade}, {país}" 15/600 `--green` antes do nome**, e depois o nome e o subtítulo, como hoje. Na lista de Cidades, a cidade onde a pessoa mora vem primeiro, com "onde mora" em `--green` no subtítulo. Na aba Amigos, cada linha começa por "De {cidade}".

### Fora desta rodada
- D17 (aba Mundo): exige decisão sobre o perfil público.
- Airbnb: parado.

---

## Prompt para o Claude Code

> Aplique `handoff-perfil-explorar-chu/perfil-explorar-chu.md` (referência visual: `Spot Perfil Explorar Chu.dc.html`).
> (1) **Perfil**: cabeçalho → Próximas viagens (cards que rolam para o lado; viagem com 0 Fui aparece só aqui; privacidade por viagem "Só eu vejo"/"Amigos veem", com padrão Só eu vejo, escolhida na criação e no topo da tela da viagem; folha "{País} agora é uma viagem" no primeiro Fui; vazio com "Nova viagem" e "Com amigos"; o Planejar com amigos deságua aqui) → Meus spots (segmentado Fui/Quero ir primeiro, depois os seletores de cidade e categoria, agrupado por cidade) → rodapé discreto.
> (2) **Explorar**: as sugestões em dois grupos, Spots e Lugares (até 3 cada, o grupo com o melhor match primeiro, só o grupo com resultado aparece); spot abre a ficha única com o segmentado "Salvar como" sem nada marcado; confirmação com a faixa verde persistente no lugar do toast de 3 segundos.
> (3) **Feedback da Chu**: o segmentado Fui/Quero ir na cidade e nas listas por categoria; tirar a lista geral; o placar países · cidades · continentes (continentes não tocável); "Onde você mora" num card separado das Viagens; "Adicionar viagem" só com cidade e país (Fui na aba Viagens, Quero ir no planejamento, sem os campos de restaurante); depois de salvar um spot, abrir a ficha com a faixa; os amigos na cidade numa linha, oculta na cidade onde a pessoa mora; a ficha única em todo o app, com o preço de 4 níveis e o bloco Conversa visível; a busca de amigo nas listas de amigos; a tela Atividade com os pedidos enviados e recebidos; "De {cidade}" antes do nome no perfil de amigo.
> Inclua também (e7): fotos da ficha num carrossel horizontal de até 5, com o contador "1 de 5", carregando só a foto visível + a próxima e o visualizador em tela cheia ao tocar. Não desenhe nem implemente: aba Mundo, Airbnb. Use os tokens do sistema F sem exceção.
