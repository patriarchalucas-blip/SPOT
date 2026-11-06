# Aba Você: decisões de 05–06/11/2026 (desenhado aqui no Claude Code)

Canvas: https://claude.ai/artifact/37Ttr1ukJn4YpXADnypeCN, quadro "Você · mapa: pinça, arrasto e card do país". Componente: `Voce.dc.html` (props `fundo="verdeFundo" acento="brancoQuente" fonte="archivo"`).

## Visual (vale pro app inteiro)
- **Fundo escuro em degradê verde**, do verde do Spot ao verde muito escuro, sem chegar ao preto: `#0B3D2E` (topo) → `#0A3528` 200px → `#092D22` 420px → `#08261D` 640px → `#072019` (900px em diante e na barra). Superfície de folha/card: `#092D22`.
- **Destaque: branco quente `#F2EDE3`** (texto escuro `#0C1714` por cima). Reprovados: verde vivo, coral, azul, lilás, lima, sálvia escura, champanhe ("pesado").
- **Fonte: Archivo**, condensada (`font-stretch: 68%`) nos números e títulos, normal no resto. Testadas e não escolhidas: Stack Sans, Geist, Instrument Sans, Schibsted, Familjen, Barlow.
- Referências de app bonito: Whoop e On.

## A aba, de cima pra baixo
1. Cabeçalho: SPOT (Cinzel) · amigos · sino.
2. **Mapa**: mundo inteiro centralizado, países visitados acesos. **Só gesto**: pinça e arrasto, dois toques voltam. **Sem botões de zoom** ("nojento") e **sem pontos brancos**; de perto, cada cidade vira um pontinho verde-escuro com o nome.
3. Placar: anel do % do mundo + países · cidades · spots (tocar em "países" abre a lista de países).
4. **Em casa** (título de seção) + foto grande da cidade.
5. **Viagens** com filtro por continente em **pílulas** (a escolhida acende no destaque).

## Card do país (tocar num país visitado do mapa)
- Cobre a tela do mapa até a barra; o resto só volta ao fechar (X).
- Conteúdo: silhueta + nome · **foto fina do país** (120 de altura, ex.: Brasil = Cristo Redentor) · **amigos que foram** + "N spots deles que você não salvou" · **básico**: capital, habitantes, fuso, língua, moeda, US$ 1 vale.
- **Fora, não voltar:** frase "você foi em 2023" embaixo do nome, frase de descrição, suas cidades e seus números no país, spots soltos (Maní no card do Brasil não diz nada), botão "Ver país".
- No app: câmbio atualizado por serviço de cotação; população e foto escolhidas por nós.

# Aba Hotspots: decisões de 06/11/2026

Quadros "Hotspots · Para você · capa (nova)" e "Hotspots · Amigos" no mesmo canvas. Mesmo fundo verde, branco quente e Archivo da Você.

## Para você (versão capa, aprovada)
- O **1º lugar é a capa**: foto de ponta a ponta (520 de altura), escurecida em cima e embaixo. As abas Para você · Amigos ficam por cima da foto.
- No pé da foto: "Nº 1 da semana · São Paulo" (13/600, branco quente), o nome bem grande (64, condensada) e "tipo · bairro".
- Abaixo: categorias em pílula (Gastronomia · Experiência) e a lista do 2º ao 5º (número condensado em branco quente, foto 68, nome, tipo · bairro).
- **Fora:** data ("Sexta, 6 de novembro"), título "Hotspots de São Paulo", a seta pra trocar de cidade (a cidade segue onde a pessoa está; tocar no nome troca), título "Hotspots da semana" em cima da foto.

## Amigos
- O que os amigos salvaram, do mais novo pro mais antigo, **sem "Hoje"/"Ontem"**.
- Card: foto grande (219) com a inicial de quem indicou e "+" pra salvar; nome e cidade; "Ana foi ★★★★★" ou "Rafa quer ir"; a dica entre aspas. Nunca "Não recomendo".
- **Coração** (curtir) com contagem, à direita da linha "Ana foi". No app pede tabela nova e uma linha na Atividade: **"Rafa curtiu seu spot Cervejaria Ramiro"**.

# Aba + (Salvar um spot): decisões de 06/11/2026

Quadro "+ · Salvar um spot" (interativo) no mesmo canvas.

1. **Primeiro o lugar, nada mais.** Folha "Salvar um spot" com:
   - **Você está aqui**: uma **fileira que rola pro lado** com TODOS os lugares próximos, do mais perto pro mais longe (foto, nome, distância). **Tocar = adicionar** (sem botão por item). Mesma altura com 3 ou 30 lugares (rua movimentada). **X** fecha o bloco quando nenhum é o certo.
   - Busca "Buscar pelo nome" e "Colar uma lista do WhatsApp ou Notas".
2. **Depois de escolher o lugar:** foto grande + nome, e os dois botões grandes **Já fui · Quero ir**, **nenhum marcado** (o tocado fica claro). O Salvar só aparece depois de escolher.
   - Já fui: estrelas (no app, meia estrela) + "Não recomendo" + dica + quem vê (padrão "Amigos veem").
   - Quero ir: dica + quem vê (padrão "Só eu vejo").
- **Fora:** segmentado Fui · Quero ir no topo ("já confunde"), escolher o status antes do lugar, lista vertical de 3 lugares próximos, o rótulo "Este" (virou "Adicionar" e depois o toque no cartão).

# Aba 5: Listas (no lugar da Oficina) · 06/11/2026

A Oficina (só planos de viagem) foi reprovada: vazia, ela não serve pra nada. A aba vira **Listas** (ícone: 4 quadradinhos).

- **Toda lista pode ser compartilhada**: quem é convidado adiciona junto. Dois tipos:
  - **Uma viagem**: presa a um destino, data opcional ("Portugal em março", com aviãozinho no nome).
  - **Uma lista**: um tema ("Pra ir com a Nati", "Bares pra sexta").
- **Tela cheia**: "Dos seus spots" (automáticas: Quero ir, Nota 5, Bares, Cafés), "Suas listas" (+ "Nova lista"), "Dos amigos". Capas em **mosaico de 4 fotos**, grade de 2 colunas.
- **Por dentro de uma lista compartilhada**: nome, quem está + convidar, botão Adicionar, filtro Todos · Quero ir · Já fomos, cada spot com **quem pôs** ("Nati pôs") e **coração** pro outro curtir.
- **Criar**: dois botões grandes "Uma viagem" / "Uma lista"; depois destino ou nome, "Quando" (opcional, só viagem), "Com quem" (bolinhas dos amigos, toque marca), Criar.
- **Vazia (conta nova)**: 3 capas de exemplo em leque (Pra ir com a Nati no meio), a frase "Junte spots numa lista e chame quem vai com você." e o botão "Criar minha primeira lista". É a única frase explicativa permitida, aprovada.
- **Fora:** "Tema", "Do seu Spot" (virou "Dos seus spots"), seções "Pra começar" e capas vazias com 0 spots no estado vazio.

# Explorar · 06/11/2026
Desenhado no visual novo (mapa escuro, amigos como pinos de foto, Google em pontos, folha "Perto de você"). O Lucas: "não sei se curti, mas blz — Explorar não é um problema visual hoje". Sem mudança decidida.

# Telas que saem das abas · 06/11/2026

Mesmo canvas, faixa "Telas que saem das abas". Todas aprovadas.

- **Atividade (o sino)**: pedidos de amizade em cards no topo (Aceitar / ×); pílulas **Seus spots · Listas · Amigos** com ponto onde há novidade; linha = "**quem** fez **onde**" + tempo + foto. Vazia: 3 exemplos apagados + "Quando seus amigos curtirem ou salvarem seus spots, aparece aqui." + "Chamar amigos". **Fora:** separar "Novas/Antes", misturar aceite de amizade com curtida.
- **Ficha do spot**: foto 420 que troca no toque; Quero ir / Já fui; meia estrela; Ligar · Rota · Cardápio · Instagram; seção **"Amigos"** (cards com nota, frase, coração e Responder) + "Rafa e Téo querem ir"; **Conversa N** com curtir e responder comentário; "Tirar dos meus spots" em cinza.
- **Perfil do amigo**: Planejar juntos + ✓ Amigos; mapa dele; anel % do mundo + países/cidades/spots; Em comum; Em casa; Viagens. Cartões só com o nome.
- **Amigos**: Convidar; busca por nome ou @; Sugestões (Adicionar → Enviado); Seus amigos com 3 fotos dos últimos spots.
- **Cidade/viagem**: foto com o nome; pílulas Fui N | Quero ir N + "+"; nota ou rostos dos amigos à direita; "Excluir viagem".
- **Ajustes**: grupos Conta · Preferências · Privacidade · Sobre; Sair; "Apagar conta" em cinza.
- **Login**: foto, SPOT em Cinzel, Apple (claro) · Google · e-mail; termos numa linha.
- **Primeiro acesso**: Onde você mora (obrigatório) → países (mapa + número ABAIXO) → cidades desses países → lugares anotados (só com IA) → Amigos → "Seu mapa, Lucas" com anel e continentes. A boas-vindas saiu: o login já faz esse papel.

**Regras que valeram em todas:** nada de frase informal em título ("Quem foi", "por sua causa"); cartão de foto só com o nome; texto nunca por cima do mapa.
