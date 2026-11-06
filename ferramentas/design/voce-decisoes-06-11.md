# Aba Você: decisões de 05–06/11/2026 (desenhado aqui no Claude Code)

Canvas: https://claude.ai/artifact/37Ttr1ukJn4YpXADnypeCN, quadro "Você · mapa: pinça, arrasto e card do país". Componente: `Voce.dc.html` (props `fundo="verdeFundo" acento="brancoQuente" fonte="archivo"`).

## Visual (vale pro app inteiro)
- **Fundo escuro em degradê verde**, do verde do Spot ao verde muito escuro, sem chegar ao preto: `#0B3D2E` (topo) → `#0A3528` 200px → `#092D22` 420px → `#08261D` 640px → `#072019` (900px em diante e na barra). Superfície de folha/card: `#092D22`.
- **Destaque: branco quente `#F2EDE3`** (texto escuro `#0C1714` por cima). Reprovados: verde vivo, coral, azul, lilás, lima, sálvia escura, champanhe ("pesado").
- **Fonte: Archivo**, condensada (`font-stretch: 68%`) nos números e títulos, normal no resto. Testadas e não escolhidas: Stack Sans, Geist, Instrument Sans, Schibsted, Familjen, Barlow.
- Referências de app bonito: Whoop e On.

## A aba, de cima pra baixo
1. Cabeçalho: SPOT (Cinzel) · amigos · sino.
2. **Mapa**: mundo inteiro centralizado, países visitados acesos. **Só gesto**: pinça e arrasto, dois toques voltam. **Sem botões de zoom** ("nojento") e **sem pontos brancos**; de perto, cada cidade vira um pontinho verde-escuro com o nome.
3. Placar: anel do % do mundo + países · cidades · spots (tocar em "países" abre a lista de países).
4. **Em casa** (título de seção) + foto grande da cidade.
5. **Viagens** com filtro por continente em **pílulas** (a escolhida acende no destaque).

## Card do país (tocar num país visitado do mapa)
- Cobre a tela do mapa até a barra; o resto só volta ao fechar (X).
- Conteúdo: silhueta + nome · **foto fina do país** (120 de altura, ex.: Brasil = Cristo Redentor) · **amigos que foram** + "N spots deles que você não salvou" · **básico**: capital, habitantes, fuso, língua, moeda, US$ 1 vale.
- **Fora, não voltar:** frase "você foi em 2023" embaixo do nome, frase de descrição, suas cidades e seus números no país, spots soltos (Maní no card do Brasil não diz nada), botão "Ver país".
- No app: câmbio atualizado por serviço de cotação; população e foto escolhidas por nós.
