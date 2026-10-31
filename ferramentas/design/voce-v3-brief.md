# Spot — aba Você, rodada 3

Continua o "Diário + Mapa" rodada 2 (`handoff-diario-v2`). Só a aba **Você** (A6, A6s e B4e) é redesenhada; o resto da rodada 2 está aprovado e não muda.

## Por que a A6 da rodada 2 não passou

Ela empilha cinco blocos do mesmo peso: card do mapa com painel de 3 números, bloco da cidade onde mora, Próximas viagens, Cidades e Seu diário. Lida de cima a baixo, parece um painel de estatísticas, não o perfil de uma pessoa. Nada diz o gosto dela.

## O que a Você precisa ser

O perfil do Letterboxd, pra lugares: abrir a tela de alguém e entender em 3 segundos **o gosto** dela. Número é o que menos diz isso.

Desenhe **três direções**, cada uma com UM centro claro, todas em 375 pt e com a mesma pessoa:

1. **Diário** — 4 Favoritos no topo (fotos verticais, escolhidos pela pessoa), depois o diário em ordem de data com estrela e dica. Abas Fui · Quero ir · Cidades.
2. **Mapa de capa** — o mapa-múndi como capa da tela, sem card, a % sobre ele. Embaixo, abas Cidades · Diário · Próximas.
3. **Casa primeiro** — a cidade onde mora abre a tela, com o top 5 dela; viagens viram uma fileira de países; o mapa fica pequeno.

Pra cada direção: a tela parada, a tela rolada, e a conta nova (sem spot, sem foto).

## O que tem que estar em todas

- Foto de perfil (toque troca); sem foto, inicial sobre verde.
- Nome, @ e "Mora em {cidade}"; engrenagem pros Ajustes.
- A cidade onde mora em destaque.
- 9 países · 17 cidades · 86 spots · 5% do mundo — em algum lugar, sem virar o centro.
- Próximas viagens = países com Quero ir; o "+" abre Planejar com amigos.
- "Não recomendo" no lugar das estrelas; ordem Fui · Quero ir.
- Mesma tela serve de modelo pro perfil do amigo (B1).

## Qualidade (onde a tentativa anterior falhou)

- **Fotos reais e diferentes em cada spot e cidade.** Nada de repetir a mesma foto entre direções.
- O mapa desenhado de verdade (países visitados em verde), não um retângulo.
- Hierarquia tipográfica forte: o nome e o centro da direção têm que dominar; o resto recua.
- Sistema F sem exceção: `--base #F5F5F3`, `--surface #E9E9E6`, tinta `#111/#6B6B67/#9A9A96`, um acento só `#0B3D2E`, Inter Tight, nenhuma borda de 1px, nenhuma sombra, nenhum gradiente fora do escurecido sobre foto, margem 20, raios 18/14/10.
- Zero texto explicativo dentro do app.

## Entrega

Um HTML com as três direções lado a lado (parada · rolada · conta nova) e um `voce-v3.md` com as medidas, como na rodada 2. Recomende uma e diga por quê, em duas linhas.
