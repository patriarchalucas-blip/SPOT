# Planejar com amigos — v2 (pedido pro Claude Design refinar)

**Contexto.** O handoff "crescimento" (telas 4a–4h) desenhou o Planejar como uma
visão: destino + amigos → uma lista que junta o que cada um já salvou lá. O Lucas
usou e apontou dois limites (30/09/2026):

1. Só dava pra escolher **um país**. Ele quer escolher **vários países e várias
   cidades**, misturados.
2. O fluxo **acabava na lista** — "apenas visualização de spots". Faltava o que
   fazer com ela.

Os dois já estão construídos no app, no sistema F, sem desenho novo. Este pedido
é pra revisar e refinar o que foi feito, não pra começar do zero.

## O que foi construído

### 4c Escolher — "Para onde" com vários destinos
- O campo virou um bloco `--surface` raio 10 com **uma linha por destino**
  (48 de altura): nome 17/600 (bandeira antes, se for país), "país" ou "cidade"
  14 `--ink3` à direita e um ✕ `--ink3`. Sem pílula (o sistema proíbe).
- A última linha é "+ Outro país ou cidade" 15/600 `--green`. Sem destino
  nenhum, ela diz "Escolha países ou cidades", em `--ink2`.
- A folha de busca mostra, antes de digitar, as sugestões: até 8 países e 8 cidades
  onde você ou os amigos têm spots (os dos amigos escolhidos pesam mais). Digitando,
  busca entre as cidades conhecidas e os 243 países.
- Na linha do amigo: "N spots lá" / "Nenhum spot lá ainda". O "lá" evita o
  problema da preposição com país ("em Itália").

### 4d Lista juntada — com saída
- O título junta os destinos: "Lisboa e Itália com Ana e Rafa"; com mais de três,
  "Portugal, Itália e mais 2".
- As abas de cidade ganharam "Todas", porque com vários destinos a lista mistura cidades.
- **Compartilhar** (ícone no topo, à direita) manda a lista inteira pro grupo, como texto.
- **Botão fixo "Montar minha viagem"** (só aparece se há spot que ainda não é seu).

### Novo: Montar minha viagem
- A mesma lista com um **check à esquerda** de cada linha, no padrão da revisão
  do Importar notas (check 24, anel `#CFCFCB` / verde cheio).
- Título "Montar minha viagem" 30/700 `--green`; subtítulo "Marque o que entra.
  Vai pra sua lista como Quero ir, na viagem de cada país."
- **Vem marcado o que algum amigo já FOI e você não tem.** O resto você marca.
- O que já é seu aparece apagado (.45), com "Já está na sua lista", e não marca.
- Botão fixo "Salvar N spots na minha viagem", que mostra "Salvando 3 de 12…".

### Novo: Pronto
- "N spots na sua viagem" 38/700 `--green`; "Estão na sua lista como Quero ir,
  com a dica de quem foi." 15 `--ink2`.
- Uma linha por viagem que recebeu spot: "🇵🇹 Portugal · 8 spots novos ›", que abre a viagem.
- Botões: **"Mandar pro grupo"** (principal) e "Voltar pra lista" (secundário).

### Mandar pro grupo (texto)
```
Planejando Portugal com Ana e Rafa:

Lisboa
• Cervejaria Ramiro — Rafa foi 5★
• A Cevicheria — Ana quer ir

Porto
• Majestic Café — Ana foi 4★

Juntei no Spot: https://meuspot.app
```

## O que pedimos pro design decidir

1. **A lista de destinos dentro do bloco `--surface`** está boa, ou existe forma
   melhor de mostrar 4–6 destinos sem ficar comprida?
2. **Montar minha viagem:** faz sentido ser um modo da mesma tela (check na linha),
   ou deveria ser uma tela própria?
3. **Pronto:** falta algo antes de "Mandar pro grupo"? Por exemplo, datas da viagem,
   ou dividir os spots por dia.
4. **Mandar pro grupo como texto** é o certo agora? A alternativa é o link `/p/<código>`
   (tela 4h), que exige cuidado de privacidade: só amigos, e quem desfaz a amizade
   sai do link.
5. **Estado vazio** com vários destinos: hoje o botão é "Explorar {primeiro destino}".

## Regras que valem (sistema F)
Sem borda de 1px, sem sombra, um acento só (`--green`), Inter Tight, nada de
pílula preenchida, ação destrutiva em `--ink3`, texto sem gênero, a unidade se
chama "spot".
