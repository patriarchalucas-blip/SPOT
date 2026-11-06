# Spot — aba Você, rodada nova (fundo escuro)

Anexos: `Spot - Claude Design - CONTEXTO (projeto novo).md`, `estrutura.md` e `voce-mapa.md`. A estrutura das abas está decidida; esta rodada é só a **aba Você**, e muda o visual do app.

## O que mudou desde o estrutura.md

Os sócios testaram várias versões e decidiram rever o visual do app inteiro:

- **Fundo escuro no app todo, em degradê vertical bem discreto**, como o do Whoop (print anexo), só que um pouco mais escuro: medido no print do Whoop: `#273236` no topo, `#20282D` a 20% da tela, `#151A1E` a 37%, `#14171C` a 56%, `#101518` a 78%, `#030305` no pé. A mudança mora no primeiro terço da tela; dali pra baixo é quase plano. Queremos um tom mais escuro que esse. É leve: quem olha vê "cinza-escuro", não "degradê".
- **Degradê puxando pro verde do Spot** (em teste, preferido ao cinza): mesma curva do Whoop, com o topo esverdeado (`#1C3D33` → `#050807`; versão mais sutil `#1D2E29` → `#060807`; versão mais forte começando no próprio `#0B3D2E`).
- **Cor de destaque clara e leve, "luxo silencioso"**, em teste: osso `#E2D9C8`, menta suave `#B8D4C3` ou branco quente `#F2EDE3`. Reprovadas: as saturadas (verde vivo, coral, azul, lilás, lima) por "chamativas demais", a sálvia escura, e o champanhe `#CBB994` por ficar "pesado". O destaque aparece no anel do %, nos pontos das cidades, nos títulos de destaque, no "+" (ícone escuro por cima) e na aba ativa.
- **Referências de app bonito e moderno: Whoop e On (On Running).** Isso substitui a regra antiga de "nenhum gradiente". Preto puro com verde-escuro por cima não funcionou.
- **A fonte pode mudar no app inteiro.** A Inter Tight não agradou. As que chegaram mais perto foram as condensadas: **Archivo** (eixo de largura, condensada nos números e títulos) e **Barlow / Barlow Condensed**. Pode propor outra.
- **A cor de destaque está aberta.** O `#0B3D2E` some no escuro. Um verde mais vivo foi o que mais agradou, mas ainda não é o certo. Teste tons de verde e, se fizer sentido, outra família de cor. Lembre que a cor muda a identidade (ícone na App Store, marca SPOT).
- **Referência: o app Whoop.** Não as cores, e sim a experiência: número grande, anel de progresso, letra condensada, tela que parece moderna e leve de navegar.

## A aba Você, de cima para baixo

1. **Cabeçalho:** SPOT (Cinzel), à direita amigos e sino.
2. **O mapa-múndi** com os países visitados acesos e os pontos das cidades pulsando (`voce-mapa.md`: deriva, arrastar, pinça). No escuro, os países acesos funcionaram bem.
3. **O placar:** % do mundo (anel de progresso) e os três números, países · cidades · spots, cada um tocável. **Tocar em "países" abre a lista de países. Ela NÃO fica nesta tela**: com 30 países, a tela vira uma lista sem fim.
4. **A cidade onde mora**, com um nome melhor que "Onde você mora". O mais aceito até agora foi **"Em casa"**. Tem que ser título de seção visível, não uma etiqueta pequena. Foto grande da cidade, nome, "24 fui · 7 quero ir" e os melhores de lá.
5. **Viagens**, com **filtro por continente** (Todas · Europa · Américas · Ásia). Precisa funcionar com 3 viagens e com 50. Testamos dois jeitos: um trilho de fotos que arrasta pro lado, e uma lista que desce até o fim (nome grande + foto pequena ao lado). Proponha o melhor, ou os dois.

**Saiu, não volta:** "Seus favoritos", a lista de países na tela principal, cards e quadrados empilhados.

## O que reprovou (não repetir)

- **Muitos quadrados:** card dentro de card, foto quadrada em toda linha, blocos do mesmo peso empilhados. Parece painel de estatística, cansa.
- **Pouca imagem:** a lista de viagens só com texto e bandeira ficou pobre. Imagem tem que estar presente, mas sem virar mosaico de caixas.
- **Trocar só a cor:** as últimas rodadas mudaram só o destaque e "ficaram todas iguais". O problema é a composição da tela, não a cor.

## O que entregar

- **3 direções da aba Você**, de composição diferente entre si (não só cor), cada uma com fundo, fonte e cor de destaque próprios. Para cada uma: a tela parada, a tela rolada até o fim, e a conta nova (sem países, sem viagens).
- Uma linha por direção dizendo a ideia dela.
- A recomendação de uma, e por quê, em duas linhas.
- O .md com medidas, cores e fonte, no mesmo formato do `estrutura.md`, pra ir direto pra construção.

Sistema de sempre, ajustado ao escuro: um acento só, nenhuma borda de 1px, nenhuma sombra fora do mapa, margem lateral 20, sem texto explicativo dentro do app. Dados de exemplo do CONTEXTO, com fotos reais de cidade.
