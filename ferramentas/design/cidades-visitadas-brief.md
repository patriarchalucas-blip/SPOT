# Marcar cidades que já visitei — 06/10/2026 (pedido pro Claude Design)

## O pedido
O pessoal que está usando o Spot quer **marcar as cidades onde já esteve, mesmo sem
nenhum spot pra adicionar nela**. Hoje dá pra marcar só **países** (Perfil → "Países
que visitei"), e cidade só aparece no app quando tem spot dentro.

O Lucas não quer isso escondido no Perfil. **Pergunta pro design: onde mora e como é
o fluxo**, pra que seja fácil de achar e rápido de fazer (de preferência várias
cidades de uma vez).

## O que o app já tem (pra encaixar, não reinventar)
- **Aba Viagens:** mapa-múndi, placar **países · cidades · spots**, "Onde você mora",
  lista de viagens por continente. É aqui que a pessoa vê "onde já fui".
- **Viagem = um país** (ou vários); dentro dela, as **cidades** viram cards; dentro da
  cidade, os spots.
- **Busca de cidade** que já funciona bem (a do onboarding, que acha "São Paulo" sem
  "SP"), e a folha "Nova viagem" que aceita **vários destinos de uma vez** (marcados
  em cima, com ✕).
- Onboarding: hoje pergunta onde a pessoa mora e oferece marcar países.

## O que a cidade marcada precisa fazer (regra de produto)
- Contar no placar de **cidades** e pintar o **país** no mapa.
- Aparecer dentro da viagem do país, como cidade **sem spots ainda** — de onde a
  pessoa pode adicionar spots depois.
- Poder desmarcar (marcou errado).

## Perguntas pro design responder
1. Onde fica a entrada (aba Viagens? o placar "N cidades"? o onboarding? mais de um?).
2. Como marca várias de uma vez.
3. Como a cidade sem spot aparece na viagem e na lista (sem parecer vazio/quebrado).
4. Como desmarca.

## Regras (sistema F)
Sem borda de 1px, sem sombra, um acento só (`--green`), Inter Tight, nada de pílula
preenchida, texto sem gênero, a unidade se chama "spot". Mobile, ~375px.
Lembrete técnico: a aba **Viagens no iPhone é tela nativa** — o que for desenhado ali
só chega ao app com versão nova pela Apple; telas abertas a partir dela (viagem,
cidade, folhas) são do site e chegam na hora.
