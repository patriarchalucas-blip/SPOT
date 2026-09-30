# Landing do Spot (meuspot.app/sobre)

Desenhada pelo Lucas no Claude Design (29/09/2026) e convertida para HTML
estático. O original está em `fonte/` (`index.dc.html`, `spot-world-map.js` e
o LEIA-ME que veio junto).

## Onde fica e por quê

Em **`/sobre`**, não na raiz. A raiz do meuspot.app É o app: o app de iPhone
abre `https://meuspot.app`, o login com Google volta pra lá e o link de convite
é `/?c=`. Tirar o app da raiz pede build novo do iPhone e mexer no login.

`/sobre` já era a página pública que o Google confere na verificação da marca
do login. Por isso **o nome "Spot - seus lugares" tem que continuar escrito
nela** (está no `<title>` e no rodapé) e o link pra `/privacidade` também.

## Regerar

```
node ferramentas/landing/converter.cjs
```

Lê `fonte/`, escreve `sobre.html` e `landing/spot-world-map.js`. O que ele
muda em relação ao original:

- `<x-import>` do Claude Design vira o próprio componente (`<spot-city-search>`,
  `<spot-paint-map>`); o `support.js` não é necessário.
- Os `<iframe>` com a cópia do app viram **capturas reais** em `landing/*.jpg`.
- Foto de rosto do randomuser.me (pessoa real) vira a inicial, como o app mostra.
- Botões da App Store apontam pra `apps.apple.com/br/app/id6814856044`
  (funciona quando o app for aprovado); "ou use no navegador" leva ao app web.
- Campo de busca de cidade que vazava da tela no celular: corrigido.
- Mapa de pintar: a altura passou pra seção (o componente se estica a 100%).

## Capturas dos celulares

`landing/viagens.jpg`, `explorar.jpg`, `perfil.jpg`, `ficha.jpg` — 390×844 a
3×. Saem do `index.html` de hoje com `fonte/demo-do-app.js` (a conta de
exemplo do Claude Design, sem foto de rosto), abrindo `#viagens`, `#explorar`,
`#perfil` e `#ficha@230` num Chrome automático. Quando o app mudar de cara,
tirar de novo.

## Falta

- **Selo oficial da Apple** ("Download on the App Store"): baixar em
  developer.apple.com → App Store Marketing Guidelines e trocar o botão de
  texto. Esta máquina não abre site da Apple.
- Os nomes, frases e fotos de exemplo (Marina, Carol, os restaurantes) são
  ilustrativos, do desenho. Trocar por reais quando houver.
