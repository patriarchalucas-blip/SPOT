# Brief pro Claude Design — tela 4: Viagem em grupo

Continuação do brief das três telas de crescimento (lista pública, importar
notas, resumo da viagem). Anexe de novo o `index.html` atual do app.

---

## A ideia

Um grupo de amigos planeja uma viagem junto: todo mundo joga lugares na mesma
viagem ("vamos em 6 pra Portugal em março"). É o que puxa gente pro app — uma
pessoa traz as outras cinco.

## As regras (já decididas com o Lucas — o desenho precisa respeitar)

1. **Quem entra:** só amigos já conectados no Spot.
2. **O que cada um faz:** todos adicionam spots; cada um só apaga o que é seu.
   Só quem criou muda nome e datas da viagem.
3. **A nota é de cada um:** cada pessoa dá a própria nota e escreve a própria
   frase. A viagem mostra "3 foram"; tocar mostra a nota de cada um.
4. **A viagem aparece pra todos do grupo.**
5. **"Quero ir" de dentro da viagem é visível pro grupo** (é o objetivo de
   planejar junto). O "Quero ir" de fora continua privado.
6. **Quem sai leva os spots dele** (saem da viagem, ficam no país dele).
7. **Bloqueado não entra** no mesmo grupo de quem bloqueou.

## O ponto mais delicado: NÃO DUPLICAR NADA

O Lucas já foi pra Portugal sozinho e tem o card "Portugal" com os spots
dele. Agora vai pra Portugal com 4 amigos que nunca foram. O desenho tem que
deixar isso claro, sem ruído:

- **Nada migra.** Os spots antigos dele ficam onde estão. A viagem em grupo
  começa VAZIA.
- **Só entra o que a pessoa escolhe, um por um.** Spot antigo só aparece pro
  grupo se ela tocar em algo como "colocar nesta viagem" — e continua no card
  dela, sem ser copiado. Pode existir uma SUGESTÃO ao criar ("você já foi a 12
  lugares em Portugal — quer indicar algum pro grupo?"), nunca automática.
- **Spot novo salvo de dentro da viagem** fica no país de quem salvou e
  aparece na viagem pra todos.
- **O mesmo lugar salvo por dois vira UMA linha:** "Você e Ana querem ir".
- **O placar não conta em dobro:** países/cidades/spots de cada pessoa contam
  só os spots DELA.
- Quando a viagem acontece e a pessoa marca "Fui", aquele spot passa a contar
  no país dela (porque é dela).

## Onde a viagem aparece na tela inicial — decida você

Duas opções foram discutidas; escolha e justifique no desenho:

- **A — seção "Em grupo" separada no topo** da tela inicial, com o card da
  viagem ("Portugal · mar/2027 · com Ana, Rafa e Bia · 14 spots"). O card
  "Portugal" pessoal continua embaixo, em Viagens. Aparecem dois "Portugal",
  com papéis diferentes e nenhum spot repetido. (Recomendação do Claude Code:
  a viagem em grupo é algo vivo, merece estar à vista.)
- **B — dentro do card do país:** um card "Portugal" só, e a viagem em grupo
  como seção lá dentro ("12 spots · 1 viagem em grupo"). Mais limpo, mas fica
  escondida.

## Telas pra desenhar

1. **Criar viagem em grupo:** destino, datas, escolher amigos. E a sugestão
   opcional "quer indicar algum spot seu pro grupo?".
2. **Tela da viagem em grupo:** quem está (avatares), os spots por cidade e
   categoria, com quem foi / quem quer ir em cada um, e o botão de adicionar.
3. **"Colocar nesta viagem"** a partir de um spot antigo.
4. **Convite chegando pro amigo** (aviso/notificação e o aceite).
5. **Onde aparece na tela inicial** (opção A ou B).
6. **Sair do grupo** e **apagar a viagem** (quem criou) — com o que acontece
   com os spots dito em uma frase.
7. **Estados:** viagem vazia, só uma pessoa aceitou, alguém saiu.

## Sistema visual (regras duras)

O mesmo das outras três telas: `--base #F5F5F3`, `--surface #E9E9E6`,
`--ink #111`, `--ink2 #6B6B67`, `--ink3 #9A9A96`, `--green #0B3D2E` (único
acento). Sem borda de 1px, sem sombra, sem gradiente. Inter Tight; "SPOT" em
Cinzel. Nada de caixa-alta. Margem 20. A unidade chama **spot**. Nada de rosto
de pessoa real nos exemplos.

## Entregue

As telas com os estados e um `.md` com as medidas e as regras, como nos
handoffs anteriores.
