# Capturas da App Store — estado e receita

**Estas imagens estão VENCIDAS.** Foram feitas em 20/09/2026, antes do
redesenho. O app hoje é claro, com outra tipografia, outro placar, outra nav e
outro ícone — nenhuma das oito representa o que a loja receberia.

`01-inicio.png` é a única no visual novo, e mesmo ela está incompleta: foi
capturada em 21/09 com as fotos faltando (ver abaixo).

**Antes de enviar pra App Store, refaça as oito.**

---

## Por que não deu pra refazer em 21/09

A rede desta máquina passou a bloquear `meuspot.app` no meio do trabalho —
`Web Filter Violation` no navegador, página do filtro no `curl`. Conferido na
mesma hora: `supabase.co` responde, `images.unsplash.com` responde, só o
domínio do app cai.

Isso importa porque **toda foto do app passa por lá**:

| o que | de onde vem |
|---|---|
| foto de capa de viagem e cidade | `/api/city-photo` (Unsplash, cache no KV) |
| foto do lugar | `/api/place-photo` (Google Places) |

O `photo_url` gravado no banco **não** é a URL do Google: é
`/api/place-photo?ref=…`, um caminho relativo. Sem o domínio, nenhuma imagem
carrega, e os cards saem todos no cinza-verde de "sem foto".

Não adianta capturar de `localhost` sem resolver isso: o servidor local não
tem as chaves (elas vivem só no Cloudflare).

---

## A receita, quando a rede deixar

O que já está pronto e funciona — testado, e é como a `01-inicio.png` saiu:

1. **Suba o servidor de bastidor**
   `node ferramentas/srv-capturas.cjs` (porta 8897). Ele serve o app, encaminha
   `/api/*` pra produção e recebe os pixels do print gravando PNG **sem canal
   alfa** (a Apple recusa ícone com alfa; pra print não é exigido, mas o
   caminho é o mesmo).

2. **Abra em 430×932** — é o tamanho lógico do iPhone 6.7". Com `scale:3` o
   html2canvas devolve exatamente **1290×2796**, que é o que o App Store
   Connect pede.

3. **Entre com a conta de demonstração** (`demo@meuspot.app`). Duas contas, não
   uma — ver `../conta-de-demonstracao.md`; sem a segunda, a aba Amigos sai
   vazia no print.

4. **Injete o html2canvas e capture:**

```js
await new Promise((ok, err) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  s.onload = ok; s.onerror = () => err(new Error('cdn'));
  document.head.appendChild(s);
});

window.capturar = async function (nome) {
  const c = await html2canvas(document.body, {
    width: 430, height: 932, windowWidth: 430, windowHeight: 932,
    scale: 3, backgroundColor: '#F5F5F3', useCORS: true, logging: false,
    // A tela entra com fade. Sem matar a animação no clone, metade dos
    // prints sai translúcida — foi o primeiro erro da leva anterior.
    onclone: (doc) => {
      const st = doc.createElement('style');
      st.textContent = '*{animation:none !important;transition:none !important}'
                     + '.screen.active{opacity:1 !important}';
      doc.head.appendChild(st);
    }
  });
  const x = c.getContext('2d');
  const r = await fetch('/gravar?nome=' + nome + '&w=' + c.width + '&h=' + c.height,
    { method: 'POST', body: x.getImageData(0, 0, c.width, c.height).data.buffer });
  return nome + '=' + (await r.text());
};
```

5. **Espere a foto chegar antes de cada print.** `loadDashboard()` devolve
   antes das imagens; 3 a 4 segundos de folga depois dela é o que evita o card
   cinza.

## As oito telas

| arquivo | como chegar |
|---|---|
| `01-inicio.png` | `goTo('dashboard'); await loadDashboard()` |
| `02-mapa-mundi.png` | `abrirMapaMundi('dashboard')` |
| `03-viagem.png` | `openTrip(<id de viagem com foto>)` |
| `04-cidade.png` | `openCityFromTrip(0)` |
| `05-lugar.png` | `openList('spots')` e `openSpotFromList(0)` |
| `06-explorar.png` | `goTo('explore'); loadExplore()` + busca por uma cidade |
| `07-amigos.png` | `goTo('friends'); await loadFriends()` |
| `08-perfil.png` | `goTo('profile'); await loadProfile()` |
