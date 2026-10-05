# Perfil e busca do Explorar — 05/10/2026 (pedido pro Claude Design)

Duas frentes, aprovadas pelo Lucas em 05/10. Este pedido **substitui** o item 8
(Perfil) e o item 5 (planejamento) do pedido "Feedback de teste da Chu" — o
resto daquele pedido continua valendo.

---

## A. Perfil: "o que eu levo comigo"

Hoje o Perfil é quase só cadastro (foto, nome, @, marcar países, marcar onde
moro): a pessoa usa uma vez e não volta. A aba **continua se chamando
"Perfil"**.

O que entra, de cima pra baixo:

1. **Cabeçalho** — foto, nome, @, amigos (como hoje).

2. **Próximas viagens** — o motivo principal de abrir a aba.
   - Viagem **planejada** = viagem que só tem spots "Quero ir". Ela aparece
     **só aqui**; a aba Viagens fica com "Onde moro" + viagens feitas. As duas
     listas **não se misturam**.
   - Quando a pessoa marca o primeiro spot como "Fui", a viagem passa sozinha
     pra aba Viagens. Desenhar como isso fica claro (um aviso no momento? um
     selo?).
   - **Privacidade por viagem, escolha da pessoa:** "Só eu vejo" / "Amigos
     veem". Padrão: **Só eu vejo**. Desenhar onde fica a escolha (na criação?
     na tela da viagem?) e como o card mostra o estado.
   - O "Planejar com amigos" e o "Montar minha viagem" (já existem no app)
     desaguam aqui: o que a pessoa monta vira uma próxima viagem.
   - Vazio: como é a seção pra quem não tem nenhuma viagem planejada.

3. **Meus spots, com "Fui / Quero ir" no topo** — já existe, mas escondido e
   bagunçado (reclamação da Chu). O segmentado Fui / Quero ir vem primeiro;
   cidade e categoria (Gastronomia / Hospedagem / Experiência) depois. É o
   lugar de responder "qual era aquele restaurante?".

4. **Rodapé, discreto** — marcar países que já visitei, marcar onde moro,
   Ajustes (sair, excluir conta). Cadastro, não destaque.

**Fora desta rodada (não desenhar):**
- "Meus links" (listas compartilhadas, link do perfil) — o Lucas não gostou.
- Retrospectiva da viagem com IA — fica pra depois.
- "Quero ir de novo" — descartado.
- Placar / ranking entre amigos — descartado.

---

## B. Explorar: buscar um spot pelo nome

**O problema:** a Chu foi no Explorar e digitou o nome de um restaurante. É o
gesto mais intuitivo — e não funciona: a busca do Explorar só entende ÁREA
(rua, bairro, cidade, país). As sugestões enquanto digita só mostram áreas, e
o nome de um restaurante vira "o que tem perto dele". O "Adicionar spot", que
é o caminho que funciona, fica escondido.

**O que muda:**
- Enquanto a pessoa digita, as sugestões vêm em **dois grupos: Lugares**
  (cidade, bairro, rua, país) e **Spots** (restaurante, hotel, passeio). Cada
  linha mostra o suficiente pra distinguir (nome + bairro/cidade; categoria).
- Tocar num **lugar** → busca na área, como hoje.
- Tocar num **spot** → abre a ficha dele com **Quero ir / Fui** ali mesmo
  (o mesmo segmentado do resto do app). Se o spot já é seu ou de algum amigo,
  a ficha mostra isso ("Você quer ir", "Ana foi").
- O Explorar vira também a forma natural de adicionar spot. O "Adicionar spot"
  continua existindo; não precisa ser redesenhado.

**Desenhar:**
- a lista de sugestões com os dois grupos (e o caso de só um grupo ter
  resultado);
- a ficha aberta a partir da busca, nos três estados: spot novo pra pessoa /
  já salvo por ela / salvo por amigo;
- o que acontece depois de tocar "Quero ir" ou "Fui" (confirmação visível — a
  Chu não percebeu o aviso de 3 s de "Spot salvo").

---

## Regras que valem (sistema F)
Sem borda de 1px, sem sombra, um acento só (`--green`), Inter Tight, nada de
pílula preenchida, texto sem gênero, a unidade se chama "spot". Mobile, ~375px.
