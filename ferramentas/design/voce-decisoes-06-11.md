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

# Aba Hotspots: decisões de 06/11/2026

Quadros "Hotspots · Para você · capa (nova)" e "Hotspots · Amigos" no mesmo canvas. Mesmo fundo verde, branco quente e Archivo da Você.

## Para você (versão capa, aprovada)
- O **1º lugar é a capa**: foto de ponta a ponta (520 de altura), escurecida em cima e embaixo. As abas Para você · Amigos ficam por cima da foto.
- No pé da foto: "Nº 1 da semana · São Paulo" (13/600, branco quente), o nome bem grande (64, condensada) e "tipo · bairro".
- Abaixo: categorias em pílula (Gastronomia · Experiência) e a lista do 2º ao 5º (número condensado em branco quente, foto 68, nome, tipo · bairro).
- **Fora:** data ("Sexta, 6 de novembro"), título "Hotspots de São Paulo", a seta pra trocar de cidade (a cidade segue onde a pessoa está; tocar no nome troca), título "Hotspots da semana" em cima da foto.

## Amigos
- O que os amigos salvaram, do mais novo pro mais antigo, **sem "Hoje"/"Ontem"**.
- Card: foto grande (219) com a inicial de quem indicou e "+" pra salvar; nome e cidade; "Ana foi ★★★★★" ou "Rafa quer ir"; a dica entre aspas. Nunca "Não recomendo".
- **Coração** (curtir) com contagem, à direita da linha "Ana foi". No app pede tabela nova e uma linha na Atividade: **"Rafa curtiu seu spot Cervejaria Ramiro"**.

# Aba + (Salvar um spot): decisões de 06/11/2026

Quadro "+ · Salvar um spot" (interativo) no mesmo canvas.

1. **Primeiro o lugar, nada mais.** Folha "Salvar um spot" com:
   - **Você está aqui**: uma **fileira que rola pro lado** com TODOS os lugares próximos, do mais perto pro mais longe (foto, nome, distância). **Tocar = adicionar** (sem botão por item). Mesma altura com 3 ou 30 lugares (rua movimentada). **X** fecha o bloco quando nenhum é o certo.
   - Busca "Buscar pelo nome" e "Colar uma lista do WhatsApp ou Notas".
2. **Depois de escolher o lugar:** foto grande + nome, e os dois botões grandes **Já fui · Quero ir**, **nenhum marcado** (o tocado fica claro). O Salvar só aparece depois de escolher.
   - Já fui: estrelas (no app, meia estrela) + "Não recomendo" + dica + quem vê (padrão "Amigos veem").
   - Quero ir: dica + quem vê (padrão "Só eu vejo").
- **Fora:** segmentado Fui · Quero ir no topo ("já confunde"), escolher o status antes do lugar, lista vertical de 3 lugares próximos, o rótulo "Este" (virou "Adicionar" e depois o toque no cartão).
