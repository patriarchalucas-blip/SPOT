# Spot · Claude Design — a PRIMEIRA ABA (hoje "Viagens", nome em aberto)

## O app
O Spot é um app de iPhone tipo "Letterboxd pra viagem": a pessoa salva lugares (restaurante, hotel, experiência) com nota, marca "Quero ir" ou "Fui", e vê o que os amigos recomendam. Usado hoje por um grupo pequeno de amigos. A unidade se chama **spot**, não "lugar".

## Como eu quero trabalhar
Não quero te direcionar a solução. Quero **2–3 opções** que resolvam a dor abaixo, dentro do sistema de design, e **eu escolho**. Caminhos bem diferentes entre si são bem-vindos.

## O que essa aba vira
É a **primeira aba** do app, e passa a ser a **oficina**: onde a pessoa adiciona, organiza e planeja. (O Perfil é a identidade; se no futuro as duas se juntam ou não, a gente decide depois. **Desenhe esta aba como se ela fosse ficar sozinha.**)

**O nome está em aberto.** "Viagens" não descreve mais o que ela faz (tem a cidade onde a pessoa mora, tem planejamento, tem spot solto). Me sugere **2–3 nomes** curtos, uma palavra de preferência, que caibam na barra de abas ao lado de "Explorar", "Amigos" e "Perfil".

## O que ela tem hoje (função a preservar)
De cima pra baixo:
- **Topo:** a marca "SPOT", um **"+"** (adicionar spot) e o avatar (abre o Perfil).
- **Mapa-múndi** dos países visitados, pintados de verde, ocupando o alto da tela. Tocar abre o mapa grande.
- **"Você conheceu N% do mundo"** e o **placar: países · cidades · spots** (cada número é um atalho: países → mapa; cidades → lista de cidades; spots → lista de spots).
- **Faixa de check-in**, quando a pessoa está num lugar que dá pra salvar ("Você está no X · Adicionar").
- **"Onde você mora":** um card grande com a foto da cidade.
- **Viagens:** abas por continente ("Europa · 4") e um **mosaico de cards com foto** (o 1º é o dobro dos outros). Tocar abre o país; dentro dele, as cidades; dentro delas, os spots.
- **Conta vazia:** "Seu primeiro spot" com "Adicionar spot" e "Colar uma lista do celular".

## O que chega nela (sai do Perfil)
- **Próximas viagens:** viagem criada pra planejar e ainda sem nenhum "Fui".
- **Planejar viagem com amigos:** escolher destinos (vários países e cidades juntos) e ver o que os amigos marcaram lá.

## A DOR (anotações da conversa com meu sócio)
- **Os cards são grandes demais.** O mosaico e o card de "Onde você mora" ocupam a tela inteira com pouca informação.
- **O "+" está escondido e apagado.** Adicionar spot é a ação principal do app e não parece.
- **Adicionar spot dá preguiça**, e a tela do spot novo é feia. Quero ver o fluxo de adicionar desenhado junto (é a ação desta aba).
- **Adicionar pela localização:** "estou no restaurante agora, salva este" tem que ser um toque.
- **Hospedagem de Airbnb:** não é achada na busca; colar o link do Airbnb devia funcionar.
- **Países e cidades pouco intuitivos:** hoje são três números soltos embaixo do mapa. Quero entender de relance onde já fui.
- **O mapa só aproxima tocando:** dá pra navegar nele direto (pinça e arrasto) sem abrir outra tela?
- **Tocar na contagem de cidades não abre as cidades** como a gente esperava.
- **Cabe tudo sem virar entulho?** Mapa + números, onde moro, viagens feitas, próximas viagens, planejar e o "+". Como organizar é com você (abas, seções, o que vai pra outra tela).

## Ideia em aberto (meu sócio)
**"Viagens realizadas"** como visão própria, separada do que é planejado, alimentando os spots por país e cidade. Se encaixar numa das opções, mostra; se não fizer sentido, me diz por quê.

## Travas (não dá pra quebrar)
- Placar é **países · cidades · spots** (continentes foi reprovado como número). "% do mundo" sempre **inteiro** ("6%", nunca "5,6%").
- **Próximas viagens** = só viagem criada como próxima e ainda sem "Fui". Viagem que só tem "Quero ir" (fui pra Argentina e deixei restaurantes pra próxima) **não** é próxima viagem: fica com as outras e não pinta o mapa.
- Cada viagem tem **"Quem vê"** (Só eu vejo / Amigos).
- "Adicionar" de **cidade ou país** (marcar onde já fui, sem spot) continua existindo, separado de adicionar spot.
- **Onde você mora** não é viagem e nunca some.
- Planejar é **multi-destino** (vários países e cidades num planejamento só).

## Sistema de design (obrigatório — direção "F")
- Fundo `#F5F5F3`, superfície `#E9E9E6`, tinta `#111` / `#6B6B67` / `#9A9A96`
- **Um acento só: verde `#0B3D2E`** (país visitado no mapa, botão, aba ativa, estrela). Erro/destrutivo é cinza `#9A9A96`, nunca vermelho
- **Sem borda de 1px, sem sombra, sem gradiente** (exceto o escurecido sobre foto com texto)
- Uma fonte só: **Inter Tight**, sem caixa-alta, sem tracking positivo. "SPOT" em Cinzel só na marca
- Espaços 4·8·12·16·20·24·32·48, margem lateral 20; raios: foto 18, card 14, botão 10, folha 28
- Linha de lista: foto 64 (raio 14), nome 16/600, meta 13 cinza, valor à direita 13 — sem card, sem divisor
- Abas de texto (não pílula): 15/600 cinza, ativa em tinta com traço de 2 embaixo

## O que eu quero receber
- **2–3 opções** pra aba, em 375 pt (iPhone), no sistema F, cada uma com uma sugestão de **nome** pra ela
- Em cada opção, os estados: **conta cheia** (muitas viagens + próximas viagens), **conta quase vazia** (acabou de entrar) e o **fluxo de adicionar spot** (buscar, pela localização, colar link, salvar)
- Handoff no formato de sempre: zip com as telas + um .md explicando cada decisão, com o prompt pro Claude Code no fim
