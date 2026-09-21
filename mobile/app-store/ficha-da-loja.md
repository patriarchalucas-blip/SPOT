# Ficha da App Store — textos prontos para colar

Escrito em 20/09/2026. É só copiar campo por campo no App Store Connect.
Os limites de caracteres estão conferidos (script no fim do arquivo).

---

## Nome do app — máx. 30

```
Spot
```

Decidido pelo Lucas em 20/09/2026. O nome da loja bate com o `name` do
`app.json`, que é o nome embaixo do ícone no iPhone.

**Se o formulário recusar** — nome de app é único na App Store, e o registro
recusa na hora se estiver tomado ou reservado. Nesse caso, a saída é acrescentar
um qualificador, sem trocar a marca:

```
Spot — seus lugares
```

Não consegui confirmar a disponibilidade daqui: esta máquina derruba domínio da
Apple, e a API pública de busca da loja também não respondeu de fora. O que a
busca na web mostrou (20/09/2026): **nenhum** app chamado exatamente `Spot`, mas
existe um `Spot: explore the best places`, da Spot Tech, Inc., que é **app de
viagem** — mesma palavra, mesma categoria. Ausência em busca não é prova de
disponibilidade; quem responde é o formulário.

---

## Subtítulo — máx. 30

```
Seus lugares, sua voz
```

---

## Texto promocional — máx. 170

Este campo é o único que dá para trocar **sem passar por revisão**. Serve para
anunciar novidade.

```
Agora com comentário em lugar de amigo, mapa-múndi dos países que você já
visitou e sugestão do que salvar quando você está perto de um lugar bom.
```

---

## Descrição — máx. 4.000

```
O Spot guarda os lugares por onde você passou — com o que VOCÊ achou deles.

Não é mural de avaliação de estranho. É a sua lista, e a dos seus amigos.

COMO FUNCIONA

Você cria uma viagem escolhendo a cidade. O país é identificado sozinho. A
partir daí, cada lugar que você salva entra na viagem certa: um restaurante,
um hotel, uma experiência.

Em cada lugar você escreve uma nota — por que aquele lugar te chamou atenção.
É a nota que diferencia a sua lista de qualquer outra. Depois marca "quero ir"
ou "já fui", dá de uma a cinco estrelas e escreve o que achou.

A BUSCA FAZ O TRABALHO CHATO

Você digita o nome do lugar e o Spot traz endereço, telefone, foto e a nota do
Google. Você só acrescenta o que é seu.

Quando você está perto de um lugar bem avaliado, o app pergunta se você está
lá — e salva em dois toques, sem digitar nada.

SEUS AMIGOS, NÃO A INTERNET INTEIRA

Amizade é por pedido aceito, ou por link de convite. Não existe perfil público
nem feed aberto.

No feed você vê os lugares que seus amigos marcaram como visitados, com a foto
e a nota que eles escreveram — e salva na sua lista em um toque. Dá para
comentar no lugar de um amigo e perguntar o que ele achou.

Lugares marcados como "quero ir" ficam só com você. Lista de desejo não vira
mural.

O MAPA E O SEU PLACAR

O perfil tem um mapa-múndi com os países que você já visitou pintados, e o
contador de quantos são. Dá para marcar país que você visitou antes de usar o
app, sem precisar cadastrar lugar nenhum.

Abaixo do mapa, seus números: quantos lugares, quantas cidades, quantas
viagens — e a estante com todos os seus lugares por cidade, com a sua média de
estrelas em cada uma.

EXPLORAR

Digite uma cidade e veja o que está bem avaliado por lá, junto com o que seus
amigos já salvaram naquele lugar. Achou bom, salva direto na sua viagem.

O QUE O SPOT NÃO FAZ

Não tem anúncio. Não tem feed público. Não vende seus dados. Não mostra o seu
perfil para quem você não aceitou.

O Spot nasceu de uma viagem em grupo em que todo mundo mandava link de
restaurante no WhatsApp e ninguém achava nada depois.
```

---

## Palavras-chave — máx. 100, separadas por vírgula, sem espaço

Não repita palavra que já está no nome ou no subtítulo (`spot`, `lugares`,
`voz`) — a Apple já indexa essas, e repetir desperdiça caracteres.

```
viagem,viagens,roteiro,restaurante,hotel,mapa,paises,amigos,recomendacao,guia,visitados,cidade
```

---

## Categoria

| campo | valor |
|---|---|
| Categoria principal | **Viagens** |
| Categoria secundária | **Redes Sociais** |

A secundária é opcional, mas o app tem amizade, feed e comentário — declarar
isso é coerente com as respostas do questionário de classificação etária
(abaixo). Declarar "Viagens" e depois responder que existe feed social não é
contradição; a Apple pergunta as duas coisas separadamente.

---

## URLs da ficha

| campo | valor |
|---|---|
| URL de suporte (obrigatória) | `https://meuspot.app/suporte` |
| URL de marketing (opcional) | `https://meuspot.app` |
| Política de privacidade (obrigatória) | `https://meuspot.app/privacidade` |

As três responderam **200** em 20/09/2026.

---

## Direitos autorais

```
2026 Lucas Patriarcha
```

---

## Classificação etária — o questionário

A Apple trocou esse questionário em 2026: as faixas agora são 4+, 9+, 13+, 16+
e 18+, e foram acrescentadas perguntas sobre rede social. **Responder virou
obrigatório para envio novo a partir de setembro de 2026** — ou seja, agora.

### As duas perguntas de rede social

**1. "O app redistribui, promove ou expõe conteúdo de usuário para públicos
amplos, por feed, comunidade, busca ou recomendação?"**

Esta é a única resposta que eu não decido por você, porque muda a faixa e
porque errar para menos é motivo de reprovação.

- O caso para **Não**: no Spot não existe perfil público, feed aberto nem
  descoberta de estranho. Você só vê quem aceitou seu pedido de amizade, e a
  RLS do banco garante isso — não é só a tela que esconde. Não há busca de
  conteúdo de terceiro, nem recomendação de conteúdo de quem você não conhece.
- O caso para **Sim**: existe, sim, um feed de conteúdo escrito por outras
  pessoas, e o revisor pode ler "feed" como feed, sem olhar o alcance.

**Minha recomendação: Não**, com a ressalva escrita na nota de revisão (texto
pronto na seção seguinte) explicando que o grafo é fechado e recíproco. Se você
preferir não arriscar, responder **Sim** custa a faixa mínima de 13+ e nada
mais — o app não tem nada que empurre para 16+ ou 18+.

**2. "Usuários com menos de 13 anos são de fato impedidos de acessar os
recursos sociais, usando a Declared Age Range API?"**

**Não.** O app não usa essa API hoje. Responder "sim" sem ter implementado é
declaração falsa.

### O resto do questionário

Todas as respostas abaixo são **Nenhum / Não**, porque não existe nada disso no
app: violência, conteúdo sexual, nudez, linguagem imprópria, álcool/tabaco/
drogas, terror, jogo de azar, apostas, competição, conteúdo médico ou de
bem-estar, controles de compra dentro do app.

Um ponto que costuma pegar: **"o app tem conteúdo gerado por usuário sem
moderação?"** A resposta é que existe conteúdo gerado por usuário **com**
moderação — o Spot tem denúncia (de comentário e de perfil) e bloqueio, os dois
funcionando, e o bloqueio já desfaz a amizade e some com a pessoa de todas as
telas. Isso é exatamente o que a diretriz 1.2 exige.

---

## Nota para o revisor (campo "Notas" do envio)

```
O Spot é um app de viagem: a pessoa salva lugares (restaurante, hotel,
experiência) com uma nota pessoal e uma avaliação, e vê o que os amigos
salvaram.

CONTA DE DEMONSTRAÇÃO
E-mail e senha vão nos campos próprios do formulário, logo acima desta caixa.
A conta já vem com viagens, lugares, um amigo e comentários, para a revisão não
esbarrar num app vazio.

SOBRE O GRAFO SOCIAL
Não existe perfil público nem feed aberto. Só é possível ver o conteúdo de
alguém depois de um pedido de amizade aceito pelas duas partes, e essa regra
está no banco (RLS do Postgres), não só na interface. Por isso respondemos
"não" à pergunta de redistribuição de conteúdo para públicos amplos.

MODERAÇÃO (diretriz 1.2)
- Denunciar: disponível em cada comentário e no menu do perfil de um amigo.
- Bloquear: no menu do perfil do amigo. Bloquear desfaz a amizade e remove a
  pessoa do feed, da lista e dos comentários.
- Excluir a própria conta: Perfil > Configurações > Excluir minha conta.

LOCALIZAÇÃO
Usada só para sugerir o lugar em que a pessoa está ("Você está em X?"). A
coordenada é enviada para a API do Google Places e descartada — não é gravada
no banco nem em cache.

PARTE NATIVA
As quatro abas principais (Viagens, Explorar, Amigos, Perfil) são telas
nativas. Localização, câmera, galeria, compartilhamento pela folha do sistema
e abertura de Instagram, Maps e telefone nos aplicativos nativos.
```

> **Antes de colar, confirme o push.** O encadeamento existe inteiro no código
> — `App.js` pega o endereço com `getExpoPushTokenAsync`, entrega para a página
> em `window.__spotPush`, o `index.html` grava em `push_tokens` e
> `functions/api/notificar.js` chama a API de push da Expo. Mas isso **nunca
> foi visto funcionando num aparelho**, porque ainda não existe build. Se no
> primeiro build o aviso chegar no iPhone, acrescente "notificação push" na
> lista acima: é o item de maior peso contra uma reprovação por 4.2 ("é só um
> site embrulhado"). Se não chegar, deixe fora — prometer ao revisor recurso
> que não funciona é pior do que não ter.

---

## Conferência dos limites

Rode isto na pasta `mobile/app-store` para conferir que nada estourou:

```bash
node -e "const t={'Nome':'Spot','Subtitulo':'Seus lugares, sua voz','Palavras-chave':'viagem,viagens,roteiro,restaurante,hotel,mapa,paises,amigos,recomendacao,guia,visitados,cidade'};const lim={'Nome':30,'Subtitulo':30,'Palavras-chave':100};for(const k in t)console.log(k.padEnd(16),String(t[k].length).padStart(3),'/',lim[k],t[k].length<=lim[k]?'ok':'ESTOUROU')"
```
