# Spot · Claude Design — aba EXPLORAR, ajustes da rodada 2 (v2 → v3)

## Onde estamos
Recebi a rodada 2 (`handoff-explorar-mapa-v2`, N1–N6). **A direção está aprovada**: uma tela só, mapa de borda a borda, um campo no topo que vira busca, folha puxável (peek / cards / lista), pino com a foto do lugar e o rosto de quem marcou, amigos sempre antes das sugestões, prévia com a frase do amigo. Sumir com as abas, os chips, a saudação e o Mapa/Lista era exatamente a dor. **Não quero voltar atrás em nada disso.**

Sobre o pedido anterior: eu tinha dito "Explorar em LISTA, mapa fora do pedido". Estava desatualizado — o app já abre no mapa desde 06/10. Mapa é o caminho certo.

O que falta são **quatro pontos**. Nos dois primeiros quero **2–3 opções** pra eu escolher; nos outros dois, uma solução basta.

---

## 1. Abrir com poucos amigos (quero opções)
Hoje a maioria das pessoas tem 0 a 3 amigos no Spot. Na v2, quem abre sem amigo por perto vê um mapa vazio e "Nenhum amigo marcou nada por aqui ainda". Pra quem acabou de instalar, essa é a primeira impressão da aba mais importante do app.

E vem gente nova por aí: a aposta de crescimento são **curadores** (perfis de gente que indica lugar, tipo @oquemaissai, com lista visível pra todo mundo, sem precisar ser amigo) e **hotspots da semana** (o que curadores + amigos mais marcaram na semana, por cidade). Nenhum dos dois existe ainda, mas o Explorar precisa ter lugar pra eles.

**Quero ver:**
- Como curadores entram no mapa e na folha **sem confundir com amigo** (amigo = alguém que eu conheço; curador = alguém que eu sigo pelo gosto). Ordem: amigos → curadores → Google.
- O peek e os cards de abertura em três cenários: **com amigos por perto**, **sem amigo mas com curador**, e **só sugestões** (nem amigo nem curador). Neste último, as sugestões seguram a tela, mas quero ver como o app convida a trazer amigos sem virar um aviso de vazio.
- Onde mora o **hotspot da semana**, se mora aqui.
- **Mudança em relação à v2:** o mapa **não pode trazer só spots de amigos**. Sugestões (Google, e curadores quando existirem) aparecem sempre, inclusive na abertura, mas os **amigos têm o destaque**: pino maior, com foto e rosto, por cima de tudo, e primeiro na folha. A sugestão é o fundo; o amigo é o que salta. O "Ver sugestões em {bairro}" como único caminho pras sugestões sai.
- **Custo da abertura:** ela pode trazer sugestões do Google, mas de uma busca **guardada por área** (o app já arredonda a posição em ~500 m e reaproveita a busca de quem está no mesmo pedaço). Do lado do desenho, isso quer dizer: na abertura, uma leva só de sugestões, sem buscar de novo a cada arrasto do mapa.

## 2. Funções que sumiram (quero opções de onde ficam)
O único filtro da v2 é a cozinha ("Todas ▾"). Hoje o Explorar também tem, e eu não quero perder:
- **Categoria:** Comer / Ficar / Fazer (hospedagem e experiências sumiram na v2).
- **Quero ir:** ver só o que está marcado como Quero ir na área.
- **Aberto agora.**
- **Amigos:** mostrar só os spots de amigos (sem sugestões).

**Trava:** sem voltar a fileira de chips — foi ela que poluiu a tela. Resolva como achar melhor (uma folha de filtros atrás do "Todas ▾", o título da folha virando seletor, outra coisa). Me mostra a folha de filtros aberta e o estado com filtro ligado (a pessoa precisa saber que tem filtro ligado). Mesma regra de custo: mudar categoria ou cozinha pode refazer a busca **uma vez**, com o aviso que vocês já desenharam; Amigos, Quero ir e Aberto agora filtram o que já veio, sem busca nova.

## 3. Coisas que já existem e precisam aparecer no desenho (uma solução basta)
- **Buscas recentes** no N3: campo focado e vazio mostra as últimas buscas.
- **Busca por nome de spot** no N3: digitar "Mocotó" acha o spot, com o status (seu Quero ir / Fui, ou "Ana foi"). Hoje existe, com dois grupos: Spots e Lugares.
- **País inteiro** ("vou pro Japão"): como fica o N4 pra um país, e não pra uma cidade. Grupos por cidade? Peek diferente?
- **Lista que não acaba:** na folha puxada até o topo, rolar até o fim carrega mais sugestões. Precisa de um estado "carregando mais" e de um fim ("Isso é tudo por aqui").
- **Estados de falha:** limite de buscas do mês atingido e sem internet. Nenhum dos dois pode aparecer como "Nada encontrado".
- **Sem localização e sem cidade** (conta nova que negou a localização): o que aparece.

## 4. Pino com foto: o custo (uma solução basta)
O que mais pesa na conta do Google é **foto**. O pino de amigo vai usar a foto que o spot **já tem salva**: nenhuma foto nova é buscada só pra desenhar um pino. Então preciso ver:
- O **pino sem foto** (spot de amigo sem foto salva): como ele fica, mantendo o anel verde/claro e os avatares.
- O pino **enquanto a foto carrega**.

---

## Travas (iguais à v2)
- Busca paga só em: abrir a aba (uma leva, guardada por área), escolher sugestão, trocar categoria/cozinha, e "Buscar nesta área" quando a pessoa leva o mapa pra outro lugar (botão, nunca automático). Nunca por letra, nunca por filtro.
- O mapa sempre tem amigos **e** sugestões; os amigos sempre em destaque (pino com foto, por cima, primeiro na folha).
- Sem contagem por cozinha ("Japonesa (12)" não).
- Sem "Planejar com amigos" aqui.
- Salvar: prévia → Quero ir/Fui só escolhe → botão **Salvar** grava → faixa verde.
- Crédito do OpenStreetMap e "Foto: Google" sempre visíveis.
- Sistema F, sem exceção: fundo `#F5F5F3`, superfície `#E9E9E6`, tinta `#111`/`#6B6B67`/`#9A9A96`, acento único `#0B3D2E`, sem borda de 1px, sem sombra, sem gradiente (só o escurecido sobre foto), Inter Tight sem caixa-alta, margem 20, raios foto 18 · card 14 · botão 10 · folha 28.

## O que eu quero receber
- Em 375 pt, no mesmo arquivo da v2, como **rodada 3**.
- **Ponto 1:** 2–3 opções, cada uma nos três cenários (amigos / só curador / só sugestões).
- **Ponto 2:** 2–3 opções, cada uma com a folha de filtros aberta + o estado com filtro ligado.
- **Pontos 3 e 4:** os estados listados, uma versão cada.
- Handoff no formato de sempre: zip com as telas + um .md atualizado que substitui o `explorar-mapa-v2.md` (com o prompt pro Claude Code no fim).
