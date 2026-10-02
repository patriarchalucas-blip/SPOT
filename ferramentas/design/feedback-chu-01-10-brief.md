# Feedback de teste da Chu — 01/10/2026 (pedido pro Claude Design)

Uma usuária testou o app por quase 4 horas no dia do lançamento e mandou um
relatório (`spot_feedback_chu_01-10.md`). **Os bugs já foram consertados no
app** (resumo no fim). Este pedido junta o que muda a ESTRUTURA das telas, que
precisa de desenho. Ele **substitui e amplia** o pedido "retorno dos primeiros
usuários" do mesmo dia: os itens 1–3 daquele estão aqui também.

Ordem sugerida: primeiro o que mais destrava o uso (A e B), depois o social (D).

---

## A. Separar o que eu fui do que eu quero ir — em todo o app

O app mistura "Fui" e "Quero ir" em quase toda lista, e a pessoa tem que caçar.

1. **Dentro da cidade, na lista de spots e nas listas por categoria:** separar
   "Fui" de "Quero ir". Seções, segmentado ou abas: decisão de vocês. O
   segmentado já é o padrão de "estado" no app.
2. **A lista geral "Melhores / A–Z / Comer / Ficar / Experiências"** junta todas
   as cidades: uma experiência na Grécia ao lado de um restaurante em SP. Ela
   propôs duas saídas, e queremos a sua escolha:
   - pedir cidade ou país antes de mostrar a lista; **ou**
   - tirar essa visão e deixar tudo dentro de cada cidade e país.
3. **O placar do topo (países · cidades · spots):** tirar o toque em "spots"
   (inútil, porque se entra pelo país ou pela cidade) e trocar "spots" por
   **continentes**.

## B. Viagens: onde moro, o que já fiz e o que estou planejando

4. **Separar "Onde você mora" de "Viagens"** de forma mais clara.
5. **Planejamento de viagens:** rascunhos privados de viagens futuras (ex.:
   "Japão", com as dicas de quem acabou de ir). Quando a viagem acontece, o
   rascunho vira uma viagem visível pros amigos.
   - *Contexto técnico:* hoje uma viagem só com spots "Quero ir" já aparece
     como "**Planejando**" no card e **não pinta o país no mapa** (consertado
     hoje). O que falta é o lugar e o desenho desse rascunho: ele é privado?
     Tem data? Como vira "fui"?
   - O "Planejar com amigos" e o "Montar minha viagem" (já no app) deveriam
     desaguar aqui.
6. **Adicionar uma cidade ou um país** (não um restaurante):
   - Hoje isso cai no fluxo de restaurante (categoria, tipo de experiência,
     nota), o que fica estranho. Desde hoje, a busca do "Adicionar spot"
     recusa cidade, estado e país.
   - O que ela propôs: na lista de viagens, adicionar a cidade direto,
     presumindo "Fui"; no planejamento, presumindo "Quero ir"; sem os campos
     de restaurante.
7. **Botão "Salvar" no fim do fluxo de adicionar spot:** ela preencheu tudo e
   o app voltou pra tela inicial sem confirmação clara. (Hoje há um toast
   "Spot salvo" de 3 s, que ela não percebeu.)
8. **Perfil:** ela achou repetitivo. Simplificar, talvez deixando só o mapa, e
   trazer o "Planejar com amigos / planejamento" pra cá.
   - **Decidido pelo Lucas (02/10):**
     - As **viagens planejadas moram no Perfil**, separadas da lista de
       viagens da tela inicial (que fica só com onde moro + viagens feitas).
     - **Privacidade por viagem, escolha da pessoa:** cada viagem planejada
       pode ser privada ou visível pros amigos. Desenhar onde fica essa
       escolha e como ela aparece no card.
     - **"Quero ir de novo" foi descartado** — não desenhar.
     - A aba **continua se chamando "Perfil"**. Não se resume às viagens
       planejadas: entram mais utilidades, ainda em discussão. Deixar espaço
       no desenho pra isso, sem inventar o conteúdo.
9. **"Fulano também tem spots aqui" dentro da cidade:** com 400 amigos em São
   Paulo vira uma lista gigante. Proposta dela: não mostrar na cidade onde a
   pessoa mora, só nas de viagem.

## C. A ficha do spot

10. **Uma tela só:** abrir o restaurante de um amigo mostra uma tela diferente
    e mais pobre do que abrir pela busca. Usar sempre a ficha completa: Quero
    ir / Fui / Não recomendo, Ligar, Cardápio, Instagram, Rota, mapa e
    endereço, mais o bloco do amigo (nota e frase dele). Com o tempo, as
    pessoas decidem pela dica dos amigos e não podem precisar sair do app.
    - *Hoje:* a tela do amigo já mostra "Você também foi" / "Você quer ir"
      quando o spot também é seu (consertado hoje).
11. **Mais de uma foto**, passando com o dedo (vem do pedido anterior: cada foto
    mostrada é cobrada pelo Google, então só carregar a que a pessoa estiver
    vendo).
12. **Faixa de preço:** ela pediu "$ barato · $$$ médio · $$$$$ muito caro".
    *Limite técnico:* o Google dá só 4 níveis (de barato a muito caro), então
    uma escala de 5 não tem de onde vir. Pedimos o desenho com 4 níveis.
13. **Comentários entre amigos:** já existem na ficha do spot de amigo, mas ela
    não encontrou. Como deixar visível?

## D. Social

14. **Buscar amigo em todas as abas** onde aparecem amigos.
15. **Atividade / interações** (vem do pedido anterior): "Fulano marcou Quero ir
    no restaurante que você indicou", "Fulano também foi e disse: …",
    pedidos de amizade enviados e recebidos com o status de cada um.
16. **Perfil do amigo:** a foto e, **sempre primeiro**, de onde a pessoa é
    (cidade natal, que o app já guarda), pra consultar quem é do lugar pra onde
    você vai.
17. **Aba "Mundo" no Explorar**, ao lado de "Amigos": buscar contas públicas por
    país ("Japão" → pessoas do Japão). São três fontes de opinião: moradores,
    amigos e Google.
    - ⚠️ **Decisão de produto antes do desenho:** hoje não existe conta pública.
      Todo spot é visível só pra amigos aceitos, garantido no banco. "Mundo"
      pede um "perfil público" opcional, com a escolha clara do que fica
      público. Isso também mexe na política de privacidade e na revisão da
      Apple.

## Não precisa de desenho (contexto)

- **Airbnb / hospedagem de link próprio:** parado por decisão do Lucas
  (02/10). Não desenhar agora.
- **Várias fotos por spot (carrossel):** parado ("nada de carrossel agora").

**Consertado hoje (01/10):**
- Pedido aceito agora some de "Enviados", dos dois lados.
- Pedido enviado pode ser cancelado.
- Erro de envio do pedido deixou de ser mudo.
- Spot já salvo mostra o status na busca e no spot do amigo.
- O mesmo lugar não é salvo duas vezes: "Quero ir" → "Fui" atualiza o que existe.
- Viagem só com "Quero ir" não pinta o mapa.
- A foto de perfil confere com o banco a cada abertura.
- A busca dá preferência à área da viagem.
- Cidade, estado e país não viram spot.
- A foto de cidade só é aceita se for do lugar.
- Voltar restaura a rolagem.
- A lentidão caiu: Amigos em 2 rodadas de consulta em vez de 5.

**Sem conserto ainda, falta informação:**
- **Instagram "não encontrado":** falta saber qual spot. Provavelmente o perfil
  mudou de nome.
- **Notificação por localização com o app fechado:** não existe. O check-in por
  proximidade só funciona com o app aberto (uma faixa "Você está no X?").
  Notificar com o app fechado pede localização em segundo plano, que é
  permissão nova, build nova e uma justificativa forte pra Apple.

## Regras que valem (sistema F)
Sem borda de 1px, sem sombra, um acento só (`--green`), Inter Tight, nada de
pílula preenchida, texto sem gênero, a unidade se chama "spot".
