# Retorno dos primeiros usuários — 01/10/2026 (pedido pro Claude Design)

O app está na App Store desde 01/10. As primeiras pessoas de fora (a namorada
do Lucas, o pai dele) usaram e trouxeram o que segue. **Os bugs já foram
consertados** (no fim, como contexto). Aqui estão os três pedidos que precisam
de desenho, mais uma pergunta sobre convites.

---

## 1. Mais de uma foto por spot

**O que aconteceu:** ao abrir um spot, ela arrastou a foto pro lado por
instinto, esperando a próxima. Hoje a ficha tem uma foto só. "Num restaurante,
ela queria ver um prato" — sem isso, pra conhecer o lugar a pessoa sai do app
(Google, Instagram).

**O que dá pra ter:** o Google tem até 10 fotos por lugar. Mostrar mais não
custa busca nova pra achar o lugar, mas **cada foto exibida é uma cobrança do
Google** (cerca de US$ 0,007 por foto, com cota grátis por mês). O ideal é
carregar cada uma só quando a pessoa chega nela, não todas de uma vez.

**Pedimos:**
- Fotos que passam com o dedo, na foto grande do topo da ficha.
- Um indicador de posição (quantas fotos e em qual está), dentro das regras
  do sistema F: sem sombra e sem pílula.
- **Onde fica a foto da própria pessoa** (a que ela tirou e subiu) em relação
  às do Google. Hoje, quando existe, ela substitui a do Google.
- O crédito do autor de cada foto, que o Google exige junto da foto.
- Vale para a ficha do spot salvo, a prévia do Explorar e o spot de um amigo.

## 2. Filtrar Quero ir / Fui na lista de spots

**O que aconteceu:** no início, o número "4 spots" do placar abre uma lista com
todos os spots da pessoa misturados (cidades, Quero ir, Fui). Ela queria
separar o que quer conhecer do que já conhece.

**Hoje:** a lista ordena por nota e filtra por categoria e por país/cidade, com
pílulas de filtro antigas (`filter-chip`), que o sistema F já tinha tirado do
resto do app.

**Pedimos:** o desenho dessa lista no sistema F, com um jeito de escolher Todos /
Quero ir / Fui. O segmentado é o padrão do app pra "estado", mas a decisão é sua.

## 3. Uma aba de atividade

**O que aconteceu:** ela mandou um pedido de amizade e o Lucas não viu chegar.
Ela sugeriu uma tela como a de atividade do Instagram: um lugar onde a pessoa vê
tudo o que acontece com ela.

**O que essa tela juntaria (tudo isso já existe no banco):**
- pedidos de amizade recebidos e enviados, com aceitar, recusar e cancelar;
- "Fulano marcou Quero ir num spot que você indicou" (o spot guarda de quem
  veio a dica, em `from_user_id`);
- "Fulano também foi a [lugar] e deu 4★";
- comentários nos seus spots;
- alguém que entrou pelo seu convite e virou seu amigo.

**Pedimos:**
- Onde ela mora: aba nova na barra de baixo, sino no topo do Início, ou dentro
  da aba Amigos.
- Como marcar o que é novo.
- O estado vazio.
- Hoje a barra tem 4 abas (Viagens, Explorar, Amigos, Perfil). Uma quinta mexe
  no app nativo do iPhone, então pede versão nova na App Store.

## 4. Pergunta: convite por link × pedido no app

**O que aconteceu:** ela mandou o **link de convite** pelo WhatsApp. O Lucas já
tinha conta, e o link não aparece como pedido dentro do app: ele só soube porque
abriu o link. Quando quem recebe o link já tem conta, o que deve acontecer?
- **(a)** Abrir o link já os torna amigos, como hoje, sem nada dentro do app.
- **(b)** Também cria um pedido no app, que aparece na atividade (item 3).

---

## Já consertado (contexto, não precisa de desenho)

- **Voltar de um spot jogava pro topo da lista**, no Explorar e em outras telas.
  Agora voltar devolve a pessoa exatamente onde ela estava, em todas as telas.
- **Fotos com resolução baixa:** a foto grande vinha com 800 px. Agora vem na
  largura da tela do aparelho, até 1.600 px.
- **"60 spots" no canto do Explorar:** saiu.
- **O card "Onde você mora" não abria:** agora sempre abre a tela da cidade.
- **Quem enviou um pedido não tinha onde cancelar:** agora aparece "1 pedido
  enviado ›" com Cancelar.
- **A prévia dos links no WhatsApp tinha o logo antigo (a esfera) e as cores
  antigas:** imagem nova no sistema F.
- **"1 lugar em 1 cidade"** virou **"1 spot"** em todo lugar.

## Regras que valem (sistema F)
Sem borda de 1px, sem sombra, um acento só (`--green`), Inter Tight, nada de
pílula preenchida, texto sem gênero, a unidade se chama "spot".
