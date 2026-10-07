# Spot — Tela final do onboarding (11b · Anel + continentes)

Referência visual: `Spot Onboarding Final.dc.html`, opção **11b**.
Sistema F: sem borda de 1px, sem sombra, `--green` como acento único, Inter Tight, sem caixa-alta.

## Estrutura (de cima para baixo)
1. **Mapa:** faixa com fundo `--map-bg`, ~200px de altura contando a safe-area, de borda a borda. O mesmo mapa da home (terra `#CBD3CD`, visitados `--green`), com os países marcados no passo anterior.
2. **Bloco do anel** (padding 28 20 0, flex, gap 20, alinhado ao centro):
   - **Anel** 120×120, traço 12, trilho `#E2E2DE`, arco `--green` com ponta arredondada, começando às 12h, sentido horário. O preenchimento é `países/195`, com mínimo visual de 2,5% quando houver 1 ou mais país.
   - Dentro do anel: a porcentagem 30/700 -0.04em (no formato da home: inteiro a partir de 10%, uma casa abaixo de 10%, como "1,5%") e "do mundo" 13 `--ink2`.
   - À direita: "Seu mapa está pronto, {primeiro nome}." 28/700 -0.04em, line-height 1.05, text-wrap balance; e "N de 195 países" 15 `--ink2` (singular: "1 de 195 países" continua no plural, porque se refere a 195).
3. **Continentes** (22 abaixo): linhas com altura mínima 48. O nome 17/500 à esquerda e "N de T" 15 `--ink2` à direita.
   - Só os continentes com 1 ou mais país marcado, ordenados por N (desc) e, no empate, por N/T. **Máximo de 4.**
   - Totais (T) com base nos 195: África 54 · Ásia 48 · Europa 44 · América do Norte 23 (inclui Central e Caribe) · América do Sul 12 · Oceania 14.
   - Países fora da lista de 195 (territórios) não contam.
4. **Botão** "Começar a usar" fixo embaixo (52, raio 10, `--green`, margem lateral 20, 34 de safe-area). Vai para a home.

## Animação (curta, uma vez)
Ao entrar: o arco anima de 0 até o valor em 700ms (ease-out) e a porcentagem conta junto. Os continentes aparecem em sequência, com fade de 150ms e 60ms entre um e outro. Sem animação se o sistema estiver com "Reduzir movimento" ligado.

## Casos
- **0 países** (a pessoa pulou o passo): sem anel e sem continentes. Título "Seu mapa está pronto, {nome}." + "Marque países quando quiser, em Viagens." 15 `--ink2`.
- Nome ausente: "Seu mapa está pronto."

---

## Prompt para o Claude Code

> Refaça a tela final do onboarding ("Seu mapa está pronto") conforme `handoff-onboarding-final/onboarding-final.md` (referência: opção 11b de `Spot Onboarding Final.dc.html`). No topo fica a faixa do mapa (~200px), com os países marcados. Abaixo, o anel de 120 (traço 12, `--green`, preenchimento países/195) com a porcentagem e "do mundo" dentro e, à direita, o título com o primeiro nome e "N de 195 países". Embaixo, até 4 linhas de continentes com "N de T" (totais base 195), só os que têm 1 ou mais país, ordenados por quantidade. Por último, o botão "Começar a usar". Inclua a animação curta do arco e dos continentes (respeitando "Reduzir movimento") e o caso de 0 países. Use os tokens do sistema F.
