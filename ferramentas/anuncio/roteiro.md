# Anúncio Spot — roteiro (06/10/2026)

**Formato:** vertical 9:16 (1080×1920), 20 segundos, Reels/TikTok/Stories.
**Ideia:** quem chega numa cidade nova não precisa de lista de influencer. Precisa do que os amigos indicaram.
**Regra:** a IA anima só o ambiente (pessoas, luz, pedras). O app entra na edição, com os prints reais de `prints/`. IA deforma celular, texto e rosto pequeno.

---

## Cena 1 — Chegada (0s → 3s)
**Imagem:** a 1 (ele com a mala na rua de Lisboa), **gerada de novo em pé**.
**Animação (IA):** câmera avança devagar; ele olha em volta; luz de fim de tarde. Não animar o celular.
> Prompt: *slow push-in, man with green suitcase looks around a sunny Lisbon street, people walking in background, warm golden light, subtle movement, vertical 9:16*

**Texto na tela (entra em 0,3s):** "Primeira vez em Lisboa."
**Em 1,5s troca para:** "Onde comer?"

## Cena 2 — Ele abre o Spot (3s → 5s)
**Imagem:** a 2 (ele sorrindo pro celular), **sem os cards flutuantes**. Peça pra IA gerar a cena limpa, só ele e o fundo.
**Animação (IA):** leve sorriso, cabelo mexendo, fundo desfocado.
**Edição:** em 4s, o print `1-feed-dos-amigos.png` sobe dentro de uma moldura de iPhone, ocupando ~70% da altura.
**Texto:** "Seus amigos já foram."

## Cena 3 — As dicas flutuando (5s → 9s)
**Fundo:** a mesma cena 2, mais desfocada (ou a 1).
**Edição:** os três cards entram um depois do outro, 0,4s de intervalo, subindo e com leve giro (-3°, 2°, -1°):
1. `2a-card-ana-ramiro.png`
2. `2b-card-rafa-miradouro.png`
3. `2c-card-clara-pasteis.png`

**Texto:** nenhum. O card fala sozinho ("Peça o camarão ao alho…").

## Cena 4 — Salvar (9s → 12s)
**Edição:** tela cheia com `3-ficha-do-spot-da-ana.png`. Zoom lento no bloco "Ana foi 5★" e na dica. Em 11s, um toque simulado (círculo) em "Quero ir".
**Texto:** "Um toque e é seu."

## Cena 5 — A trilha (12s → 16s)
**Imagem:** a 3 (vista de cima, a trilha de pedras), **gerada de novo em pé**.
**Animação (IA):** as pedras acendem uma por uma, de baixo pra cima, enquanto ele caminha.
> Prompt: *top-down view, glowing green stones light up one by one along an S-shaped path on a Lisbon plaza, traveler walking with suitcase, warm late afternoon shadows, vertical 9:16*

**Edição:** os cards pequenos que estão no chão da imagem podem ficar (são cenário). Em 15s, o print `4-lisboa-quero-ir.png` passa rápido no canto, em moldura de iPhone pequena ("dica de Ana", "dica de Clara").
**Texto:** "Sua viagem, montada pelos seus amigos."

## Cena 6 — O logo (16s → 20s)
**Animação:** a câmera sobe; a trilha vira o **S de pedras do ícone** (use `icon-1024`, da pasta do app). Corte seco pro fundo verde `#0B3D2E` com o ícone no centro.
**Texto (claro, `#F5F5F3`):** "Spot" e, abaixo, "Onde ir, pelos seus amigos."
**Selo:** "Baixe na App Store". Use o selo oficial da Apple, sem redesenhar.

---

## Detalhes que fazem diferença
- **Fonte dos textos:** Inter Tight (a do app), peso 600, branco com sombra leve sobre a foto. Nada de serifada.
- **Verde:** só `#0B3D2E`, o mesmo do botão do app.
- **Moldura de iPhone:** uma só, a mesma em todas as cenas.
- **Música:** violão/fado leve e moderno, batida entrando na cena 3.
- **Primeiros 2 segundos** decidem se a pessoa fica: o texto "Primeira vez em Lisboa." tem que estar na tela já em 0,3s.
- **Legenda do post:** "Na próxima viagem, vá onde seus amigos foram. Spot, grátis na App Store."

## Arquivos (`prints/`, 1320×2868 = tela de iPhone em alta)
| arquivo | onde entra |
|---|---|
| `1-feed-dos-amigos.png` | cena 2 |
| `2a/2b/2c-card-*.png` (fundo transparente) | cena 3 |
| `3-ficha-do-spot-da-ana.png` | cena 4 |
| `4-lisboa-quero-ir.png` | cena 5 |

Conta fictícia (Pedro, amigos Ana Lima, Rafa Mendes, Clara Menezes), fotos reais de cada lugar (Wikimedia Commons). Pra gerar de novo: ver o topo de `capturar-anuncio.cjs`.
