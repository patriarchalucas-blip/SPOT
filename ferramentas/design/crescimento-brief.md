# Brief pro Claude Design — o que faz alguém usar o Spot

Cole isto no Claude Design e anexe o `index.html` atual (o app), pra ele copiar
o visual real. São três telas novas, todas no sistema visual do app.

---

## Contexto

O Spot é um "Letterboxd de viagem": a pessoa salva restaurantes, hotéis e
passeios ("spots") com a própria nota e marca "Quero ir" ou "Fui". O
diferencial é ver onde os AMIGOS foram — mas isso só funciona se os amigos já
estiverem no app. Estas três telas existem pra resolver esse começo:

1. alguém de fora ver o valor antes de ter conta (lista pública);
2. quem entra não começar do zero (importar notas soltas);
3. quem viajou ter algo bonito pra postar (resumo da viagem).

## Tela 1 — Lista pública: `meuspot.app/l/<código>`

"Me passa suas dicas de Lisboa?" — a pessoa toca em compartilhar na tela da
cidade e manda um LINK. Quem recebe abre no navegador do celular, **sem conta
e sem app**. Tem que:

- dizer de cara de quem é e onde: "Os spots do Lucas em Lisboa" (+ país, contagem);
- mostrar os spots em duas partes: **Fui** (foto, nome, categoria, nota em
  estrelas, a frase que a pessoa escreveu) e **Quero ir** (foto, nome, categoria);
- terminar com um convite pra conhecer o Spot (botão), sem parecer propaganda;
- a prévia no WhatsApp (título + foto do primeiro spot) — desenhe como fica.

Estados: lista com 1 spot, com 30 spots, só "Quero ir", e o link que não
existe mais. O que NÃO aparece: a nota privada de "por que te chamou atenção".

## Tela 2 — Importar notas soltas

A pessoa cola um texto bagunçado (bloco de notas, conversa do WhatsApp:
"lisboa: taberna da rua das flores, pastéis de belém, miradouro da graça...")
e a IA separa em spots. Fluxo:

1. **Colar**: um campo grande, com exemplo de texto bagunçado.
2. **Revisar**: a lista que a IA achou — cada item com o lugar real encontrado
   (foto, nome, endereço), a cidade, a categoria e "Quero ir"/"Fui". A pessoa
   desmarca o que veio errado, troca o status de cada um, e confirma.
3. **Pronto**: "12 spots salvos em 3 cidades".

Estados: a IA pensando (sem spinner de máquina: algo calmo), item que ela não
achou ("não encontrei 'aquele bar do João'"), texto sem nenhum lugar.
Onde mora a entrada: sugestão, no "Adicionar spot" e no primeiro acesso.

## Tela 3 — Resumo da viagem

Na tela da viagem, um botão gera um **texto narrativo** juntando as notas e os
spots da viagem ("Cinco dias em Lisboa: começou pelos pastéis de Belém..."),
pra compartilhar ou postar. Desenhe:

- o botão na tela da viagem;
- a folha com o texto gerado, com "Gerar de novo", "Copiar" e "Compartilhar";
- a versão imagem pro story (1080×1920): título da viagem, o texto curto, 3–4
  fotos dos spots, o selo SPOT.

Deixe claro que o texto é sugestão (a pessoa pode editar antes de mandar).

## Sistema visual (regras duras)

```
--base #F5F5F3   --surface #E9E9E6   --ink #111111   --ink2 #6B6B67   --ink3 #9A9A96
--green #0B3D2E  (ÚNICO acento)      raios: foto 18 · card 14 · botão 10 · folha 28
```

- Nenhuma borda de 1px, nenhuma sombra, nenhum gradiente (exceto o escurecido
  no rodapé de foto com texto por cima).
- Uma família só: **Inter Tight**; o wordmark "SPOT" em Cinzel. Nada de
  caixa-alta nem tracking positivo. Margem lateral 20.
- A unidade chama **spot**, não "lugar" (exceto em texto de divulgação).
- Nomes e frases de exemplo: marque como exemplo; nada de rosto de pessoa real.

## Entregue

As telas de cada fluxo com os estados, e um `.md` com as medidas, como nos
handoffs da aba Amigos e do Explorar com mapa.
