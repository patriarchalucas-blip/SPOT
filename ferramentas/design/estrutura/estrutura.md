# Spot — estrutura nova · handoff único

Referência visual: `Spot Estrutura.html` (seções 1, 2, 3, +, 4, D). Este documento consolida e substitui os handoffs anteriores no que diz respeito à navegação e ao conteúdo de cada aba. Especificações finas de telas já desenhadas continuam válidas onde citadas (`diario-v2.md`, `voce-mapa.md`, `planejar-v2-e-ajustes.md`).

**Sistema (sem exceção):** fundo `#F5F5F3` · superfície `#E9E9E6` · tinta `#111` / `#6B6B67` / `#9A9A96` · acento único `#0B3D2E` · Inter Tight · marca SPOT em Cinzel 500 espaçada · sem borda de 1px · sem sombra fora do mapa · sem pílula preenchida (exceto etiqueta de status sobre foto) · raios foto 18 · card 14–16 · botão 12 · folha 28 · margem lateral 20 · sem texto explicativo nas telas.

---

## 1. As abas

| Ordem | Nome | Ícone (24px, traço 1,7; ativo 2 + verde + traço 16×2 embaixo) | Cabeçalho da tela |
|---|---|---|---|
| 1 | **Você** | pessoa (círculo + ombros) | SPOT (Cinzel, 15px alto) à esquerda · à direita **amigos** (ícone pessoas) e **sino** (ponto verde quando há novidade) |
| 2 | **Hotspots** | chama | Abas secundárias **Para você** · **Amigos** (17/600, ativa com traço 2px `#111`, inativa `#6B6B67`); sem SPOT |
| + | **Salvar** | "+" em círculo verde 52px, 10px acima da linha dos outros | — (é uma folha) |
| 3 | **Explorar** | lupa | Pílula de busca 48 (raio 24, creme) + avatar 44 à direita, sobre o mapa |
| 4 | **Oficina** (nome aberto) | bússola (placeholder) | "Planos" 40/600 + contagem; sem SPOT |

- Barra: 83px (49 + safe-area), fundo `#F5F5F3`, só ícones, sem rótulo, sem linha divisória.
- Ponto verde (8px, outline 2px creme) no **sino** quando há Atividade não lida. Nenhum badge na barra.
- A aba lembra a rolagem ao voltar. Tocar na aba ativa volta ao topo.

---

## 2. Cada aba

### 1 · Você — objetivo
*"O que eu já vivi, num mapa que dá vontade de mexer."*

Blocos (de cima para baixo), todos com margem lateral 20 exceto o mapa:
1. **Status bar** 47.
2. **Cabeçalho** sobre o mapa, top 56, altura 44: SPOT · amigos · sino. Amigos → tela **Amigos (D6)**; sino → **Atividade (D7)**.
3. **Mapa** full-bleed, **420px** a partir do topo (passa por trás do cabeçalho). Spec completa em `voce-mapa.md`: Natural Earth, terra `#D4D9D3` com sombra e grão, visitados `#0B3D2E`, pontos de cidade pulsando (1,8s), deriva lenta quando ocioso, arrastar + pinça 1–6×, duplo toque volta. Degradê creme de 60px na base. Tocar num país visitado → **País**; num ponto → **Cidade (D3)**.
4. **Frase** (top 426): "Você conheceu **5% do mundo**" 26/600, −0,04em, valor em verde. % = países/195, inteiro. 0 países → não aparece.
5. **Números** (gap 14 abaixo): 9 países · 17 cidades · 86 spots — 22/600 + rótulo 12 `#6B6B67`, gap 28. Toques: países → mapa em tela cheia com lista; cidades → **Cidades (D4)**; spots → **Seus spots** (lista com busca, Fui/Quero ir, filtros).
6. **Onde você mora** (gap 18): título 18/600 + "São Paulo · 24 fui" 13 à direita. Conteúdo: foto larga 150 raio 18 com nome e "N fui · N quero ir", 3 miniaturas 72 dos melhores (ver A6 do Diário v2). Toque → **Cidade (D3)** da casa.
7. **Países** (gap 18): título + contagem; abas de continente (texto 15, ativa 600 com traço); linhas 64 (foto 64×48 raio 12, nome 16/600, "N cidades · N spots" 13, chevron). Toque → **País**.
8. **Seu diário**: últimos spots (foto 52, nome 16/600, cidade 12, estrelas 10 ou "Não recomendo", dica 15). Toque → **Ficha (D1/D2)**.
9. Rodapé: padding-bottom 83 + 20.

Estados:
- **Conta nova:** foto = inicial sobre verde; mapa só terra (nenhum visitado), sem deriva de pontos; frase vira "Você ainda não marcou nenhum país"; números 0 · 1 · 0 (a cidade onde mora conta); bloco Onde você mora vazio ("0 fui · 0 quero ir"); dois botões 48: **Marcar países** (abre seleção de países) e **Salvar o primeiro spot** (abre +). Países e Diário não aparecem.
- **Viajando:** a aba não muda (é a sua história). Só o sino pode trazer "Ana foi em Lisboa" se amigos salvarem onde você está.

### 2 · Hotspots — objetivo
*"O que vale a pena agora: a curadoria da semana e o que meus amigos salvaram."*

Cabeçalho: abas secundárias **Para você** · **Amigos**, top 56, altura 40, gap 22, alinhadas à esquerda com margem 20; deslizar horizontal troca de aba; a escolha é lembrada.

**Para você** (desenho: A1b do Diário v2 adaptado):
1. Linha 13/600 verde: "Sexta, 24 de outubro" (data da curadoria).
2. Título 34/600 em duas linhas: "Hotspots de / São Paulo". Cidade = localização atual; sem localização, onde mora. Tocar na cidade → seletor de cidades com curadoria.
3. Abas de categoria (15/600 + contagem 400 `#9A9A96`): Gastronomia · Hospedagem · Experiência; com 0, some.
4. Lista ranqueada, gap 18: número 24/600 verde (1º = 34), foto 64 raio 14 (1º = 84 raio 18), nome 17/600 (1º = 20), "tipo · bairro" 13 `#6B6B67`. Sem dica de curador. Toque → **Ficha (D1)**. Deslizar a linha para a esquerda → salvar rápido (Fui · Quero ir).
5. Publicação: sexta 17h; cache local por semana.

**Amigos** (base: cards da A1; sem desenho final):
1. Agrupado por dia ("Hoje", "Ontem", "Seg 20"): rótulo 13/600 `#6B6B67`.
2. Card de largura total, gap 20: foto 16:10 raio 18 com avatar 22 de quem indicou no canto inferior esquerdo e **"+"** (30, creme .92) no superior direito; abaixo, nome 17/600, "Ana foi" + estrelas 11, dica 15 (2 linhas). Toque → **Ficha**; "+" → **Salvar rápido (T+c)**.
3. Inclui Fui e Quero ir dos amigos ("Rafa quer ir"); nunca "Não recomendo".

Estados:
- **Conta nova / sem amigos:** Para você igual; Amigos mostra card verde raio 18 "Convidar um amigo" (64) e abaixo "Dos seus contatos" com "Adicionar" (pede permissão só ao tocar). **Cidade sem curadoria:** Para você mostra "Perto de você" via Google (tipo · nota) com "+" em cada card; título vira só o nome da cidade.
- **Viajando:** Para você troca para a cidade atual automaticamente; linha 13/600 com ícone casa "Voltar pra São Paulo" acima do título. Amigos filtra por "aqui" primeiro, depois o resto.

### 3 · Explorar — objetivo
*"Achar um lugar ou uma cidade, vendo primeiro onde meus amigos foram."*

1. Mapa da cidade atual em tela cheia (fundo `#E4E8E4`, ruas creme, parques `#D5DED6`). Pinos de foto 44 (outline 3 creme) com avatar 20 = spots de amigos; etiqueta com nome nos 3 mais próximos; pontos 10px `#8E9A92` = Google (sem chamada ao mover; tocar num ponto = 1 chamada). Ponto azul-verde 16 = você.
2. Busca (pílula 48) + avatar 44, top 56. Ao digitar: véu creme .86; seções "Cidades" (com "N amigas estiveram") e "Spots de amigos"; no fim, botão 48 superfície "Buscar “x” no Google".
3. Folha de baixo (peek em 540, raio 28): "Perto de você" 20/600 + "N spots de amigos" 13; linhas 56 (foto, nome 16/600, "Ana foi" + estrelas, dica). Arrastar sobe até 100.
4. Cidade escolhida: mapa pula; chips 34 (raio 17): "Amigos · N" verde, Gastronomia · Hospedagem · Experiência creme; folha com avatares + "Ana, Marina e Bia estiveram aqui" 16/600.
5. Toques: pino/ponto/linha → **Ficha (D1)**; avatar → **Você**; cidade → **Cidade (D3)** via a linha da folha.

Estados: **conta nova** = só pontos do Google na cidade onde mora, folha com o nome da cidade; **viajando** = abre na cidade atual (já é o padrão).

### + · Salvar um spot — objetivo
*"Guardar um lugar em dois toques."*

Folha (top 300 em Fui, 380 em Quero ir), raio 28, sobre escurecido .3:
1. Alça 36×4. Título "Salvar um spot" 32/600.
2. Segmentado **Fui · Quero ir** 44 (raio 12), nessa ordem sempre.
3. Em Fui: card superfície raio 18 "Você está aqui" (13/600 verde com ícone pin) + nome 18/600 + bairro 13 + botão verde 40 **Este**. Em Quero ir: o card some.
4. Busca 56 raio 14 "Buscar pelo nome": locais primeiro (spots de amigos, cidades), Google ao tocar no botão do fim.
5. Linha 44 "Colar uma lista do WhatsApp ou Notas" + chevron → importador.
6. Escolhido o lugar → **Salvar (T+b)**: foto 300 + nome; segmentado; 5 estrelas 36; "Não recomendo" 14/600 abaixo (toca = apaga estrelas e marca); dica 20px (placeholder "Qual é a dica?"); linha "Amigos veem · São Paulo" (toque troca visibilidade/cidade); botão **Salvar** 52. Padrões: Fui → Amigos veem; Quero ir → Só eu vejo.
7. **Salvar rápido (T+c)**, vindo de um "+" em card: folha baixa com Fui · Quero ir (60). Quero ir salva e fecha; Fui expande com estrelas e dica.

### 4 · Oficina — objetivo
*"Planejar a próxima viagem juntando o que eu e meus amigos já queremos."*

Esqueleto (sem estética):
1. "Planos" 40/600 + contagem.
2. Cards 140 raio 18 por destino: foto, nome do destino, avatares de quem está junto, "N spots"; datas opcionais, nunca obrigatórias.
3. Botão verde 56 **Novo plano** → "Para onde?" (busca de destino + sugestões: países com seu Quero ir, cidades onde amigos têm muitos spots).
4. "Sugestões": linhas 56 ("Lisboa · Ana tem 22 spots lá").
5. **Um plano**: destino + pessoas; lista = união do Quero ir de todos no destino, uma linha por lugar ("Você e Ana querem ir", "Rafa foi 5★"); seções por cidade e categoria; "+" adiciona ao plano; marcar Fui durante a viagem. Fluxo detalhado em `planejar-v2-e-ajustes.md` (Planejar com amigos).
6. Colaboração: convidar por link ou lista de amigos; todos editam; quem sai leva só os próprios spots.

Estados: **conta nova** = só "Para onde?" + sugestões por cidades populares entre amigos (ou Google se sem amigos). **Viajando** = o plano do destino atual sobe para o topo com "Você está em Lisboa".

---

## 3. O que mudou em relação a Viagens · Explorar · Amigos · Perfil

| Antes | Agora |
|---|---|
| **Viagens** (mapa-múndi + placar + países) | É a aba **1 · Você**, primeira tela. Ganha relevo/deriva/zoom no mapa, bloco "Onde você mora" e "Seu diário". "Adicionar spot" sai: o "+" cobre. |
| **Explorar** (busca + mapa) | Continua como **3 · Explorar**, com a lupa. Regras: amigos primeiro, Google sob pedido. |
| **Amigos** (aba) | Sai da barra. Vira **ícone no cabeçalho de Você** → tela Amigos (D6). Pedidos de amizade e Atividade ficam no **sino** (D7). |
| **Perfil** (aba) | Some como aba. Foto, nome, @ e ajustes ficam no topo de Você (engrenagem dentro de Amigos/Ajustes). "Seus melhores" e "Próximas viagens" saem daqui: planos vão para **4 · Oficina**. |
| Início (capa + fileiras, do Diário v2) | Deixa de existir. Hotspots vira **aba 2** com abas secundárias; as fileiras de amigos viram a aba secundária **Amigos**. |
| Hotspots "só ao tocar" | Agora é a própria aba 2: a lista aparece ao abrir. Regra passa a ser: **Hotspots nunca aparece fora da aba 2**. |
| Barra com rótulos | Só ícones. |
| "Planejar com amigos" no Mapa | Só em **Oficina** e no **Perfil do amigo (D5)**. |

---

## 4. Decisões

**Fechadas**
- 5 posições: Você · Hotspots · + · Explorar · Oficina; só ícones; "+" no centro.
- Você é a primeira tela e o mapa é o protagonista: plano claro, relevo, deriva, zoom (spec `voce-mapa.md`).
- Categorias: Gastronomia · Hospedagem · Experiência (sem Beber/Fazer/Ficar).
- Ordem dos botões: Fui · Quero ir, sempre. "Não recomendo" sob as estrelas, só em Fui.
- Quem vê: por spot; padrão Fui → Amigos veem, Quero ir → Só eu vejo.
- Hotspots: curadoria do Spot, sexta 17h, por cidade; sem dica de curador; lista ranqueada.
- Amigos primeiro, Google só quando a pessoa pede (botão explícito ou toque num ponto).
- Amizade (pedido/aceite), não "seguir". Avatar sem foto = inicial sobre verde.
- Fonte das dicas: Inter Tight regular (sem serifada).
- % do mundo inteiro, sem decimal; denominador 195.
- Compartilhar cidade = link `spot.app/l/<slug>` com página pública e "Salvar no Spot".

**Abertas**
- Nome e ícone da aba 4 (Oficina / Planos / Próximas; bússola é placeholder).
- Hotspots "Para você": só curadoria, ou mistura "bem avaliados perto" do Google quando a curadoria for curta?
- Aba Amigos (secundária): mostra Quero ir dos amigos ou só Fui? (proposta: os dois, com o verbo.)
- Altura do mapa em Você: 420 (R1) ou 540 (R3).
- Onde fica Ajustes: engrenagem no topo de Você ou dentro da tela Amigos.
- Estética final de Hotspots e Oficina (hoje esqueleto).
- Importador "Colar uma lista": escopo e parser.

---

## 5. Telas que saem de cada aba

| Tela | Abre de | Desenho |
|---|---|---|
| Ficha do spot (D1) e estado salvo (D2) | todas as abas | ✅ Diário v2 A5/A5b |
| Cidade (D3) | Você (onde mora, ponto do mapa), Cidades, Explorar | ✅ A10 |
| Cidades (D4) | Você → "cidades" | ✅ A9 |
| País | Você → país / país no mapa | ⚠️ base antiga (Viagens); refazer no novo sistema |
| Seus spots (lista completa) | Você → "spots" | ✅ handoff `seus-spots` |
| Mapa-múndi em tela cheia | Você → "países" / toque no mapa | ❌ |
| Marcar países | Você conta nova | ⚠️ existe no onboarding; reaproveitar |
| Amigos (D6) | ícone no cabeçalho de Você | ✅ A7 |
| Atividade (D7) | sino | ✅ B2 |
| Perfil do amigo (D5) | qualquer avatar | ✅ B1 |
| Ajustes | engrenagem | ❌ |
| Hotspots lista (T2b) | aba 2 | ✅ A1b (adaptar: sem ←, com abas) |
| Seletor de cidade dos Hotspots | título da aba 2 | ❌ |
| Salvar um spot (T+), Salvar (T+b), Salvar rápido (T+c) | "+" e cards | ✅ A2/A3/A1c |
| Importar lista colada | T+ | ❌ |
| Explorar busca (A4b) | aba 3 | ✅ Diário v2 |
| Plano (um destino) | Oficina | ✅ fluxo em `planejar-v2` (4c–4h); reestilizar |
| Novo plano "Para onde?" | Oficina | ❌ |
| Lista pública (D8) + prévia WhatsApp | compartilhar cidade/plano | ✅ B3a/B3b |
| Onboarding, Tour, Login | primeiro acesso | ✅ handoffs anteriores (revisar o tour para a nova barra) |

---

## Prompt para o Claude Code

> Reestruture o Spot conforme `handoff-estrutura/estrutura.md` e `Spot Estrutura.html`. Barra de 5 posições só com ícones: Você (pessoa) · Hotspots (chama) · + (círculo verde central) · Explorar (lupa) · Oficina (bússola, placeholder). Você é a primeira tela: cabeçalho SPOT · amigos · sino sobre um mapa plano de 420px com relevo, deriva e zoom (`voce-mapa.md`), depois "Você conheceu N% do mundo", os três números, Onde você mora, Países e Seu diário; conta nova com 0 · 1 · 0 e os dois botões. Hotspots com abas secundárias Para você (curadoria ranqueada por categoria) e Amigos (cards por dia com "+"). Explorar como está no Diário v2 (amigos como pinos, Google como pontos, busca local primeiro). "+" abre "Salvar um spot" com Fui · Quero ir. Oficina como esqueleto de planos colaborativos (reaproveite o fluxo Planejar v2). Amigos e Atividade saem da barra para o cabeçalho de Você. Siga as decisões fechadas da seção 4 e o CLAUDE.md sem exceção; deixe as abertas como TODO no código.
