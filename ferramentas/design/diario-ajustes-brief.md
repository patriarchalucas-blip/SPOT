# Spot · Claude Design — "Diário + Mapa": ajustes antes de construir

Gostei da direção e é ela que vai ser construída. A barra (Início · Mapa · + · Amigos · Você), o "+" no centro, a capa dos Hotspots, o salvar rápido pelo "+" do card e a ficha com as ações em círculos ficam como estão.

Antes de virar código, preciso de uma 2ª rodada com os ajustes abaixo. O objetivo é **o produto pronto**: toda tela com o estado vazio, o de conta nova e o de quem já usa. Não só a tela bonita com 86 spots.

## 1. Categorias: são substantivos, nunca verbos
Já tínhamos decidido: **Gastronomia · Hospedagem · Experiência**. A direção voltou pros verbos em três lugares:
- A1b (abas dos Hotspots): "Comer / Beber / Fazer" → **Gastronomia · Hospedagem · Experiência**. "Beber" não existe: bar é Gastronomia. Se uma aba vier vazia (Hotspots quase nunca têm hotel), ela não aparece.
- A4c (chips do mapa da cidade): "Comer / Ficar / Fazer" → **Gastronomia · Hospedagem · Experiência**.
- A10 (filtro da cidade): "Comer ▾" → **Gastronomia ▾**.

O tipo do lugar ("Coreana", "Bar", "Hambúrguer") continua na linha de contexto, como está. Ele não é categoria.

## 2. Foto de perfil
Em Você, a pessoa é um avatar de 32 no canto, e a tela não tem identidade: não parece o perfil de alguém. Quero:
- foto de perfil de verdade no topo de Você (64–80), com nome, @ e a cidade onde mora. Tocar na foto troca;
- o estado **sem foto**, que é o de toda conta nova: a inicial sobre o verde, igual em todo lugar onde aparece avatar (cards, pinos, dicas, Amigos);
- o perfil do amigo com a mesma cabeça (foto, nome, @, onde mora). Ele não foi desenhado: desenhem.

## 3. A cidade onde moro precisa de destaque
O Spot é **dia a dia + viagem**. Hoje a cidade onde a pessoa mora é só a 1ª foto da fileira de Cidades e uma linha "Onde você mora" na lista. Do jeito que está, Você virou uma tela de viajante (% do mundo, países).

Proposta:
- **Em Você, um bloco próprio da cidade onde mora**, entre o card do mapa e "Cidades": foto da cidade larga (não um quadradinho da fileira), "São Paulo · onde você mora", os números dela (Fui · Quero ir) e os 3 melhores spots dela em miniatura. Tocar abre a cidade (A10). Ela sai da fileira de Cidades, que fica só com as viagens.
- **No Início**, a capa usa a cidade onde a pessoa mora. Quando ela está viajando (a localização diz outra cidade), a capa troca pra cidade em que está, e um toque leva de volta pra casa.
- **No Mapa**, sem localização, abre na cidade onde mora (não num lugar qualquer).
- **No perfil do amigo**, "Mora em Lisboa" embaixo do nome, e a cidade dele primeiro.
- **Conta nova**: a cidade onde mora já aparece (o cadastro pergunta), com o vazio convidando a salvar o primeiro spot de casa.

## 4. Coisas que contradizem decisões que já tomamos
- **Mapa só com amigos (A4).** Já decidimos: o mapa não pode trazer só os spots dos amigos, mas tem que dar destaque a eles. Os amigos aparecem como pinos de foto, e as sugestões do Google como pontos discretos (é como está no app hoje). Sem isso, quem tem poucos amigos abre o mapa e vê nada.
- **"Planejar com amigos" dentro da cidade no Mapa.** Planejar mora **só em Você e no perfil do amigo**. Tiramos de país/cidade por ser botão demais.
- **"Amigos veem" como padrão.** Viagem que só tem Quero ir nasce como "Só eu vejo" (o Quero ir é privado até a pessoa ir). O Fui é que aparece pros amigos. A linha "Quem vê" continua no A3, mas o padrão segue essa regra.
- **"% do mundo"** é sempre número inteiro, sem casa decimal.
- **Hotspots saem na sexta às 17h**, não na segunda.
- **A dica da curadoria nos Hotspots (A1b).** Não temos texto de curador e não vamos copiar o de ninguém. A linha dos Hotspots é só nome, tipo e bairro (o 1º pode ter foto maior). Dica em itálico só de amigo de verdade.
- **"Pediram para te seguir" / "quem entra já te segue".** No Spot não se segue: é **amizade**, dos dois lados. "Pedidos de amizade", "Aceitar", e quem entra pelo convite vira amigo.
- **"Lisboa agora" (A7).** Isso parece localização em tempo real, e não é. Use "Esteve em Lisboa" ou só "Lisboa · 61 spots".
- **"3 amigas estiveram" (A4b).** Use "3 amigos estiveram", ou os avatares sozinhos.
- **Compartilhar a cidade (A10) "como texto".** Não: compartilhar manda o **link da lista**, que abre uma página bonita no navegador. É a nossa vitrine de crescimento.
- **Ordem dos botões.** A1c tem Quero ir · Fui; A3 tem Fui · Quero ir. Escolham uma ordem e usem em todo lugar.

## 5. Fonte das dicas: decisão minha, mas me mostrem as duas
A direção pôs as dicas em **Instrument Serif itálico**. Isso quebra a regra de uma família só, e serifada em itálico entre aspas é justamente o visual de "app feito por IA" de que fugimos. Quero ver as telas A1, A5 e A6 nas duas versões, lado a lado no tamanho real:
- (a) como está, com a serifada;
- (b) dica em **Inter Tight** (itálico ou não), com as aspas.

## 6. O que falta pro produto ficar pronto
- **Conta nova, sem amigos** (o teste da minha mãe): Início, Mapa e Amigos vazios. O que ela vê? A capa dos Hotspots ajuda, mas só existe em São Paulo e no Rio. Desenhem também uma cidade **sem** Hotspots.
- **A lista compartilhada (era a tela 5b do pedido, não veio):** como chega no WhatsApp e como abre no navegador, com o "Salvar no Spot".
- **Atividade:** pedido de amizade, amizade aceita, "comentou no seu spot", "quer ir no que você indicou". Onde mora e como avisa (o ponto na aba Amigos?).
- **Conversa na ficha:** comentar no spot de um amigo já existe e sumiu.
- **Ficha completa:** horário/aberto agora, faixa de preço, site/cardápio, várias fotos, e no spot salvo: editar, mudar categoria e excluir (excluir como palavra escrita no fim, em `--ink3`).
- **Próximas viagens em Você:** o .md cita, mas a tela A6 não mostra.
- **Status "Não recomendo"** (Fui sem recomendar): onde aparece e como se marca.
- **Viagem × cidade:** a direção só fala de cidades. Hoje o app guarda por viagem (país), e o "Quem vê" é por viagem. Digam como fica: o "Quem vê" passa a ser por cidade?
- **O "+" serve também pro Quero ir** (a amiga mandou no WhatsApp). "Onde você foi?" fecha essa porta. Proponham um título que cubra os dois, ou o Quero ir logo de cara no A2.

## O que eu quero receber
As telas alteradas (A1, A1b, A2, A3, A4, A4c, A5, A6, A7, A9, A10), as novas (perfil do amigo, Atividade, lista compartilhada, estados vazios e de conta nova, cidade sem Hotspots) e as duas versões da fonte. No mesmo formato: zip com o .html + o .md.
