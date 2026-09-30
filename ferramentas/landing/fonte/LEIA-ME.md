# Spot — Landing page

Abra `index.dc.html` no navegador. Precisa de internet para carregar as fontes, as fotos e o mapa.

## Arquivos
- `index.dc.html`: a landing.
- `spot-world-map.js`: o mapa "Quantos países você já pisou?" e a busca "Pra onde você vai?".
- `app-real/app.html` + `demo.js`: uma cópia do app com dados de exemplo, usada dentro dos celulares da landing.
- `support.js`: o que faz a página funcionar.

## Antes de publicar
1. Ponha o link do app nos botões "Baixar na App Store" (hoje eles apontam para `#`).
2. Troque o botão de texto pelo selo oficial da Apple ("Download on the App Store").
3. As fotos (Unsplash e randomuser) e os nomes de amigos e lugares são exemplos inventados. Troque pelos reais antes de publicar.
4. Os celulares mostram uma cópia do app, que não se atualiza sozinha. Quando o app mudar, gere uma cópia nova com o arquivo mais recente do app.

## Prompt para o Claude Code
> Publique a landing em `spot-landing/` como página inicial pública do meuspot.app (o app continua em /app ou onde já está). Converta `index.dc.html` para HTML estático mantendo o visual, os textos e as interações (`spot-world-map.js`). Para os celulares, prefira capturas PNG reais do app (390×844 @3x) em vez do iframe de `app-real/`. Coloque o link da App Store e o selo oficial da Apple, e adicione as meta tags og: que já existem em `index.html` do app.
