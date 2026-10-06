# Anúncio — correções das 6 imagens (06/10/2026)

Formato de tudo: **vertical 9:16 (1080×1920)**. As peças citadas estão na pasta `Spot - anuncio`.

---

## 01 · Chegada — APROVADA
- Mantém. O texto "Primeira vez em Lisboa." já entra no começo, que é o que segura quem passa o dedo.
- Ao animar: só ele, as pessoas ao fundo e a luz. **Não animar o celular na mão** (deforma).

## 02 · Ele olhando o celular — REFAZER A TELA
**Problema:** a IA redesenhou a tela do app. Os textos já saem levemente tortos e, animando, as letras derretem.
**Correção:** gerar a mesma cena com a **tela do celular lisa** (verde ou cinza, sem nada) e, na edição, colar por cima o print real **`1-feed-dos-amigos.png`**, ajustado à tela (perspectiva).
> Prompt: *same scene, man holding a black iPhone, phone screen completely blank flat light gray, no interface, no text, no reflections, vertical 9:16, Lisbon street background softly blurred*

Se não der pra colar na edição: usar a imagem como está, **sem animar o celular**, só cabelo, fundo e luz.

## 03 · Os cards flutuando — TROCAR OS CARDS
**Problema:** os cards foram redesenhados pela IA, e o terceiro ("João Costa salvou Pastéis de Belém") não existe no app.
**Correção:** gerar só o fundo (a rua desfocada, sem cards) e, na edição, fazer entrar os 3 cards reais, um depois do outro:
1. `2a-card-ana-ramiro.png`
2. `2b-card-rafa-miradouro.png`
3. `2c-card-clara-pasteis.png`

Eles já saem com fundo transparente e placa clara. Entrada sugerida: subindo, 0,4 s de intervalo, giro leve (-3°, 2°, -1°).
> Prompt do fundo: *blurred sunny Lisbon street with bougainvillea and tiles, shallow depth of field, warm golden light, empty center area, no people in focus, no text, vertical 9:16*

## 04 · O toque em "Quero ir" — REFAZER A TELA
**Problema:** igual à 02, a tela foi redesenhada pela IA.
**Correção:** gerar a mão com o **celular de tela lisa** e colar por cima **`3-ficha-do-spot-da-ana.png`**. O brilho verde do toque em "Quero ir" entra na edição: um círculo `#0B3D2E` que cresce e some em 0,4 s, em cima do botão "Quero ir".
> Prompt: *close-up of a hand holding a black iPhone, thumb about to tap the screen, screen completely blank flat light gray, no interface, warm Lisbon background blurred, vertical 9:16*

## 05 · A trilha — APROVADA, com um ajuste
- Mantém. É a melhor imagem do conjunto.
- Os mini cards no chão ("Restaurante", "Café", "Miradouro") podem ficar: são cenário, e com texto genérico não prometem tela nenhuma.
- **Ajuste:** na transição pra 06, a pilha de pedras no fim da trilha tem que virar **o ícone real**. Fade da pilha pro `tela-final-1080x1920.png`, com o ícone na mesma posição da pilha, ou corte seco no verde.

## 06 · O final — SUBSTITUIR
**Problema:** o S de pedras foi redesenhado pela IA (não é o ícone do app), "Spot" está numa fonte comum (a marca é SPOT em Cinzel) e "Disponível na App Store" foi digitado (tem que ser o selo oficial).
**Correção:** usar pronta a **`tela-final-1080x1920.png`**: ícone real + SPOT em Cinzel + "Onde ir, pelos seus amigos." + selo oficial "Baixar na App Store".
Se preferir montar no editor, as peças soltas (fundo transparente):
- `marca-SPOT-clara.png` (sobre o verde) e `marca-SPOT-verde.png` (sobre fundo claro)
- `selo-app-store-branco.png` (sobre o verde) e `selo-app-store-preto.png` (sobre fundo claro)
- `icone-1024.png`
- Verde do fundo: `#0B3D2E`. Texto claro: `#F5F5F3`.

---

## Regras pra qualquer imagem nova
- Tela do app **nunca** gerada por IA: sempre print real colado na edição.
- Marca: só o ícone real e o SPOT em Cinzel. Nada de "Spot" em outra fonte.
- Selo da App Store: só o oficial, sem redesenhar nem mudar a cor.
- Um verde só: `#0B3D2E`.
- Textos na tela em **Inter Tight** (a fonte do app; arquivos em `fontes/`), branco com sombra leve sobre foto.
- Nome na loja: **Spot: Been There**. Link: https://apps.apple.com/br/app/id6814856044
