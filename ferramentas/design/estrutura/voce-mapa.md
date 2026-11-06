# Spot — aba 1 "Você": o mapa (relevo, deriva, zoom)

Referência visual: `Spot Voce Mapa.html`, quadros **R1–R3** (os globos G1–G3 ficaram como registro, descartados). Componente de referência: `spot-relief-map.js` (canvas + d3, pode ser portado).

## Decisão
Mapa plano claro (Natural Earth), de borda a borda, no topo da aba Você. Movimento contínuo e sutil; textura e volume na terra; arrastar e pinçar.

## Como é
- **Área:** 420px de altura (R1) a partir do topo, sob a status bar e o cabeçalho (SPOT · amigos · sino). R3 mostra 540px como alternativa.
- **Fundo (mar):** `#E4E8E4` com vinheta muito leve (centro +branco .18 → borda +preto .05).
- **Terra:** `#D4D9D3`, com sombra projetada (`rgba(17,17,17,.22)`, blur 10·√zoom, offset Y 3·√zoom), grão (ruído 160px em multiply, alpha .16) e realce fino branco no contorno superior-esquerdo (relevo). Linha de costa `rgba(17,17,17,.10)` 0,5px.
- **Visitado:** `--green #0B3D2E` sólido, sombra `rgba(11,61,46,.35)` blur 4, grão em multiply alpha .10 e gradiente vertical branco .04 → preto .10. A cor medida deve ficar perto de rgb(11–30, 61–80, 46–65). Nunca "screen" sobre o verde.
- **Cidades:** ponto 2,6px creme com borda verde 1px; **pulso** a cada 1,8s (anel creme crescendo de 2,5 a 11,5px, alpha .35 → 0).
- **Deriva:** quando ninguém toca há 2,5s, o mapa desliza `x = sin(t/9s)·8px`, `y = cos(t/13s)·4px`. Para ao tocar.
- **Interação:** arrastar move; pinça/scroll dá zoom de 1× a 6×; duplo toque volta ao enquadramento inicial. Zoom inicial 1,35 centrado em lon −20, lat 15 (mostra Américas + Europa + África).
- **Degradês de borda:** topo 100px (`rgba(228,232,228,.9)` → 0) para o cabeçalho assentar; base 60px (creme → 0) para o mapa dissolver no corpo.
- Tocar num país visitado abre a tela do país; num ponto de cidade, a cidade.

## Abaixo do mapa
"Você conheceu **5% do mundo**" 26/600 (valor em verde) · 9 países · 17 cidades · 86 spots (22/600 + 12 `--ink2`, gap 28, cada um um toque) · Onde você mora · Países (lista) · Seu diário. Igual ao R1.

## Performance
Canvas 2D com devicePixelRatio ≤ 2; redesenha só quando há deriva/pulso/gesto (rAF). Atlas 110m em cache. No iOS, se o canvas pesar, trocar grão por imagem PNG pré-renderizada e pulso por CSS sobre o canvas.

---

## Prompt para o Claude Code

> Implemente o mapa da aba Você conforme `handoff-voce-mapa/voce-mapa.md` e os quadros R1–R3 de `Spot Voce Mapa.html` (porte `spot-relief-map.js`). Mapa plano claro Natural Earth, 420px, de borda a borda: terra `#D4D9D3` com sombra, grão em multiply e realce de relevo; visitados em `#0B3D2E` sólido (grão só em multiply, nunca screen); pontos de cidade pulsando a cada 1,8s; deriva lenta quando ocioso; arrastar, pinçar 1–6× e duplo toque para voltar; degradês de borda no topo e na base. Abaixo, "Você conheceu N% do mundo" e os três números. Siga o CLAUDE.md.
