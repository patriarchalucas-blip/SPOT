# Brief pro Claude Design — Explorar com mapa

Cole isto no Claude Design. Se ele aceitar anexo, mande junto o `index.html`
atual (o app) pra ele copiar o visual real.

---

Redesenhe a aba **Explorar** do app Spot (iPhone, 390×844) acrescentando uma
**vista de mapa**, inspirada parcialmente no TotalPass. Mantenha o sistema
visual do app, que é o do anexo.

## O que é o Spot

Um "Letterboxd de viagem": a pessoa salva restaurantes, hotéis e passeios
("spots") com a própria nota e marca "Quero ir" ou "Fui". O Explorar serve pra
achar onde ir numa área, dando peso ao que **os amigos** já foram.

Hoje o Explorar é só lista:
- abas de texto "Para você" (resultados bem avaliados do Google) e "Amigos"
  (spots que os amigos salvaram naquela área);
- busca por rua, bairro, cidade ou país;
- abas de categoria Comer / Ficar / Experiências;
- linha "Japonesa ▾" pra tipo de comida;
- lista de cards com foto.

## O que entra (inspirado no TotalPass)

1. **Seletor Mapa / Lista** ao lado da busca (segmentado: trilho `--surface`,
   opção escolhida com fundo `--base`).
2. **Filtros rápidos** embaixo da busca: "Amigos foram", "Quero ir",
   "Aberto agora" e o tipo de comida ("Comer ▾"). No mesmo estilo de **aba de
   texto** do app, não pílula preenchida.
3. **Mapa** ocupando o meio da tela, com poucos pinos:
   - spot onde amigos foram: pino verde `#0B3D2E` com o **número de amigos**;
   - spot bem avaliado sem amigo: pino pequeno, claro, discreto;
   - você: ponto azul.
   - Tocar num pino destaca o spot na folha de baixo.
4. **Folha puxável** embaixo do mapa (raio 28 em cima), com
   "Exibindo dentro de 1,4 km · N spots" e a lista. Ordem: primeiro os lugares
   onde **mais amigos foram**, depois nota. Cada linha tem foto 64 (raio 14),
   nome 16/600, e "3 amigos foram · 350 m · aberto" 13 `--ink2` (a parte dos
   amigos em verde), e a nota à direita.
   - Puxar a folha pra cima vira a lista inteira; pra baixo, sobra só o título.

## O que NÃO copiar do TotalPass

- Tela escura e dezenas de pinos neon. O mapa é **claro**, na cor do app
  (mar `#E4E8E4`), e com poucos pinos.
- Cadeado de "fora do plano" (não existe no Spot).
- Mais de uma cor de destaque.

## Perguntas pra você resolver no desenho

- O que abre primeiro: mapa ou lista? (Sugestão: mapa quando o app sabe onde
  você está; lista quando você busca outra cidade.)
- A aba "Amigos" do topo continua, ou o filtro "Amigos foram" substitui?
- Estado vazio: área sem nenhum spot.
- Estado "buscando" e "sem internet".

## Sistema visual (regras duras)

```
--base #F5F5F3   --surface #E9E9E6   --map-bg #E4E8E4
--ink #111111    --ink2 #6B6B67      --ink3 #9A9A96
--green #0B3D2E  (ÚNICO acento: botão, aba ativa, estrela, "amigos foram")
raios: foto 18 · card 14 · botão 10 · folha 28
```

- Nenhuma borda de 1px, nenhuma sombra, nenhum gradiente (exceto o escurecido
  no rodapé de foto com texto por cima).
- Uma família só: **Inter Tight**. Nada de caixa-alta, nada de tracking positivo.
- Margem lateral 20; espaços 4·8·12·16·20·24·32·48.
- Abas de texto: 15/600 `--ink3`; a ativa `--ink` com sublinhado de 2px.
- A unidade chama **spot**, não "lugar".
- Barra de baixo do app (Viagens · Explorar · Amigos · Perfil) continua igual.

## Entregue

As telas: mapa aberto, folha puxada até o meio, folha puxada até em cima,
pino tocado, estado vazio. E um `.md` com as medidas, como no handoff da aba
Amigos.
