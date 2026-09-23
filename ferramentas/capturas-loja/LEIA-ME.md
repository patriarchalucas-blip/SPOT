# Capturas da App Store

As cinco em `capturas/` são as que vão pra loja (23/09/2026): 1320×2868, o
tamanho do iPhone de 6,9". Substituem as oito de `mobile/app-store/capturas/`,
que são do visual escuro antigo.

## Como gerar de novo

Saem de um **Chrome de verdade** em modo automático, não do html2canvas — ele
errava em cinco coisas diferentes (PNG preto, desfoque, `<textarea>`, aba
emoldurada, cartão sem margem). O que o Chrome desenha é o que existe.

```
npm install --no-save puppeteer-core
node ferramentas/capturas-loja/srv.js . ferramentas/capturas-loja/capturas
node ferramentas/capturas-loja/capturar.cjs
```

- `srv.js` — serve o app a partir da raiz do projeto e guarda em cache as fotos
  externas (sem cache o Wikimedia devolve 429). Argumentos: raiz, pasta de
  saída, porta (padrão 8795).
- `demo.js` — a conta de demonstração: nada toca o Supabase. Toda foto é do
  lugar que a tela nomeia, tirada do Wikimedia Commons. **Lugar sem foto dele
  mesmo não entra** — captura que representa mal o app é recusa (2.3.3).
- `capturar.cjs` — abre as cinco telas a 440×956 com `deviceScaleFactor: 3`.
  O caminho do Chrome está fixo no topo do arquivo.
