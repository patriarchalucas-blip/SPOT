# Capturas da App Store — estado e receita

**As oito estão no visual de hoje**, refeitas em 22/09/2026 com a conta de
demonstração, todas **1290×2796** e em PNG **sem canal alfa**.

O que elas ainda não resolvem é o CONTEÚDO: a conta de demonstração tem 3
países, 1 cidade em cada e 12 spots. Em duas telas isso aparece como espaço
vazio — o mapa-múndi com três países acesos, e a tela de viagem, onde um país
com uma cidade só deixa metade da tela em branco. Encher a conta de
demonstração é o que melhora essas duas, não mexer no app.

---

## A receita

1. **Suba o servidor de bastidor**
   `node ferramentas/srv-capturas.cjs`. Ele serve o app do disco, encaminha
   `/api/*` pra produção e recebe os pixels do print gravando PNG sem alfa.

   **O `curl` do encaminhador precisa de `-L`.** A foto do lugar responde
   **302** pro servidor de imagem do Google, e o encaminhador só repassava
   `Content-Type`: sem o `Location`, o navegador não tinha pra onde ir e
   **toda foto de spot caía no ícone de categoria**. O sintoma engana — parece
   spot sem foto no banco, e não é: os 12 têm `photo_url`. Com `-L` o curl
   segue o salto e o que chega aqui já é a imagem. Como ele imprime o
   cabeçalho de CADA salto, vale sempre o ÚLTIMO.

2. **Abra em 430×932** — o tamanho lógico do iPhone 6.7". Com `scale:3` o
   html2canvas devolve exatamente **1290×2796**, que é o que a loja pede.

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
  // O print pega o TOPO da tela; sem isto, o que ficou rolado sai cortado.
  document.querySelectorAll('.screen').forEach(s => s.scrollTop = 0);
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 400));
  const c = await html2canvas(document.body, {
    width: 430, height: 932, windowWidth: 430, windowHeight: 932,
    scale: 3, backgroundColor: '#F5F5F3', useCORS: true, logging: false,
    onclone: (doc) => {
      const st = doc.createElement('style');
      st.textContent =
        // A tela entra com fade. Sem matar a animação no clone, metade dos
        // prints sai translúcida — foi o primeiro erro da leva anterior.
        '*{animation:none !important;transition:none !important}' +
        '.screen.active{opacity:1 !important}' +
        // O html2canvas não faz backdrop-filter: a nav saía transparente e o
        // conteúdo de baixo aparecia através dela.
        '.bottom-nav{background:#F5F5F3 !important;backdrop-filter:none !important;' +
        '-webkit-backdrop-filter:none !important}' +
        // E desenha box-shadow inset como retângulo inteiro: a aba ativa,
        // que no app é um traço embaixo, virava uma caixa em volta da palavra.
        '.cont-aba.on,.filter-chip.on,.cat-tab.active,.subcat-chip.on,.am-abas button.on' +
        '{box-shadow:none !important;border-bottom:2px solid var(--ink) !important}' +
        '.cont-aba,.filter-chip,.cat-tab,.subcat-chip,.am-abas button' +
        '{box-shadow:none !important;border-bottom:2px solid transparent !important}';
      doc.head.appendChild(st);
    }
  });
  const x = c.getContext('2d');
  const r = await fetch('/gravar?nome=' + nome + '&w=' + c.width + '&h=' + c.height,
    { method: 'POST', body: x.getImageData(0, 0, c.width, c.height).data.buffer });
  return nome + '=' + (await r.text());
};

// SEMPRE dispare por aqui, nunca por capturar() direto.
window.capturarSe = async function (nome, telaEsperada) {
  const a = document.querySelector('.screen.active');
  if (!a || a.id !== telaEsperada) return nome + ' ABORTADO: ativa=' + (a && a.id);
  return await capturar(nome);
};
```

5. **Espere a foto chegar antes de cada print.** `loadDashboard()` devolve
   antes das imagens; 4 a 5 segundos de folga depois dela é o que evita o card
   cinza. A busca do Explorar pede mais — 9 segundos.

6. **Confira que não saíram duas iguais.** `md5sum *.png` — numa leva anterior
   o arquivo `03-viagem.png` guardava a tela de Perfil, e só o hash denunciou:
   a imagem sozinha parecia certa, só estava com o nome de outra. É pra isso
   que serve o `capturarSe`.

7. **Um print por chamada, ou duas no máximo.** A ponte com o navegador corta
   em 45 segundos, e cada print com espera passa de 10.

## As oito telas

| arquivo | como chegar | tela ativa esperada |
|---|---|---|
| `01-inicio.png` | `goTo('dashboard'); await loadDashboard()` | `dashboard` |
| `02-mapa-mundi.png` | `abrirMapaMundi('dashboard')` | `mapaMundi` |
| `03-viagem.png` | `openTrip(<id de viagem com foto>)` | `trip` |
| `04-cidade.png` | `openCityFromTrip(0)` | `city` |
| `05-lugar.png` | `openPlace(<id de spot com nota e foto>,'city')` | `place` |
| `06-explorar.png` | `goTo('explore'); loadExplore()` + busca por uma cidade | `explore` |
| `07-amigos.png` | `goTo('friends'); await loadFriends()` | `friends` |
| `08-perfil.png` | `goTo('profile'); await loadProfile()` | `profile` |

No `05`, escolha um spot **com nota e com nota pessoal escrita** — o primeiro
da lista pode ser um sem nota, e aí o print mostra cinco estrelas vazias.
