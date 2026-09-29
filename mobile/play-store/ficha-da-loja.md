# Google Play — o que falta e os textos prontos

Escrito em 29/09/2026. Mesmo espírito do `mobile/app-store/`: campo por campo,
pra copiar e colar. Os limites de caracteres foram conferidos por script.

---

## O que é do Lucas (e só dele)

1. **Criar a conta de desenvolvedor** em `play.google.com/console`, com a conta
   Google dele. Taxa única de **US$ 25**, verificação de identidade com
   documento. Tipo de conta: **pessoal** (sem CNPJ; ver a conversa de 29/09).
2. **Os 12 testadores.** Conta pessoal criada depois de novembro de 2023 só
   libera o app pro público depois de um **teste fechado com pelo menos 12
   pessoas, por 14 dias seguidos**. Cada testador precisa aceitar o convite e
   instalar pela Play. Precisa do e-mail Google (Gmail) de cada um.
3. **Notificações no Android** pedem um projeto no Firebase (do Google), na
   conta dele. Sem isso o app funciona inteiro, só não chega aviso no celular.
   Quando a conta existir, eu guio — não vou escrever o passo a passo de uma
   tela que eu não estou vendo.

## O que já está feito do meu lado

- A versão Android compila (mesmo código do iPhone).
- **Botão voltar do Android**: fecha a janela aberta, volta de tela, vai pra
  aba Viagens e só então sai do app. Antes ele fecharia o app no meio de
  qualquer tela, porque o site não usa o histórico do navegador.
- **Ícone adaptativo**: o Android recorta o ícone em círculo/gota; o símbolo
  foi reduzido pra 60% do quadro pra não perder as pontas, com fundo verde.
- **Permissões**: só localização e câmera. Microfone e armazenamento antigo
  saíram — estavam pedidos sem uso, e o Google pergunta o porquê de cada um.
- Perfil `preview` do `eas.json` gera **APK** — instala direto no celular por
  link, sem loja, pra testar antes da conta existir.

## O que falta do meu lado

- **Capturas de tela novas.** As do iPhone (1290×2796) não servem: a Play
  recusa imagem com o lado maior passando de 2× o menor. Precisa de 1080×1920
  (9:16) — sai da mesma receita de `ferramentas/capturas-loja/`.
- **Imagem de destaque** 1024×500 (obrigatória na Play, não existe na Apple).
- **Ícone da loja** 512×512: já existe, é o `icon-512.png` da raiz.

---

## Nome do app — máx. 30

```
Spot - seus lugares
```

"Spot" sozinho foi recusado pelo Google na verificação da marca do login
(25/09) por poder ser confundido com outras marcas; o nome aprovado lá foi este.
Usar o mesmo aqui evita a mesma discussão.

## Descrição curta — máx. 80

```
Salve os lugares das suas viagens com a sua nota e veja o que seus amigos amaram
```

## Descrição completa — máx. 4.000

```
O Spot guarda os lugares por onde você passou — com o que VOCÊ achou deles.

Não é mural de avaliação de estranho. É a sua lista, e a dos seus amigos.

COMO FUNCIONA

Busque o lugar pelo nome e salve. O Spot descobre sozinho se é restaurante,
hotel ou passeio, em que cidade e país fica, e coloca na viagem certa.

Em cada lugar você escreve por que ele te chamou atenção, marca "quero ir" ou
"já fui", dá a sua nota e, se quiser, coloca a sua foto — a do prato, a da
vista. Endereço, telefone e horário vêm do Google; o resto é seu.

Quando você está perto de um lugar bem avaliado, o app pergunta se você está
lá — e salva em dois toques.

SEUS AMIGOS, NÃO A INTERNET INTEIRA

Amizade é por pedido aceito, ou por link de convite. Não existe perfil público.

Você vê os lugares que seus amigos visitaram, com a nota e a foto deles, e
salva na sua lista em um toque. Dá pra comentar e perguntar o que acharam. A
lista "quero ir" de cada um só aparece pros amigos.

EXPLORAR

Busque uma cidade, um bairro ou até uma rua. Em "Para você", o que está bem
avaliado por ali, com filtro por tipo de comida. Em "Amigos", só o que seus
amigos salvaram naquela área — primeiro os lugares onde mais amigos foram.

O SEU MAPA

Os países que você já visitou ficam pintados no mapa-múndi, com a contagem de
países, cidades e spots. Dá pra marcar país que você visitou antes de usar o
app, sem cadastrar lugar nenhum.

O QUE O SPOT NÃO FAZ

Não tem anúncio. Não tem feed público. Não vende seus dados.
```

## Categoria

**Viagens e turismo** (Travel & Local).

## Contato

- E-mail: o mesmo do suporte da App Store.
- Site: `https://meuspot.app/sobre`
- Política de privacidade: `https://meuspot.app/privacidade`

---

## Segurança dos dados (Data safety)

É a versão Google das etiquetas de privacidade da Apple. **A fonte da verdade
continua sendo `mobile/app-store/etiquetas-de-privacidade.md`** — as mesmas
coisas saem do aparelho nos dois sistemas. Tradução pro formulário do Google:

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha dados? | **Sim, coleta** |
| Os dados são criptografados em trânsito? | **Sim** (tudo é HTTPS) |
| A pessoa pode pedir pra apagar os dados? | **Sim** — Perfil → Excluir minha conta, e por e-mail (ver privacidade) |
| Compartilha com terceiros? | **Não** no sentido do Google: Supabase, Cloudflare e Google Places são prestadores de serviço trabalhando pro app, o que o formulário diz que não conta como compartilhamento |

Tipos coletados (todos: **funcionalidade do app**, nenhum pra publicidade):

- **Informações pessoais** → nome, e-mail, ID do usuário
- **Localização** → aproximada e precisa (check-in e "perto de você"; só com
  permissão, não em segundo plano)
- **Fotos** → foto de perfil e de spot, quando a pessoa envia
- **Mensagens / conteúdo gerado** → notas, avaliações, comentários
- **Identificadores do dispositivo** → o endereço de notificação (push)

Antes de enviar, conferir de novo contra o código — como foi feito pra Apple.

## Classificação de conteúdo

Questionário IARC. Mesmas respostas do `mobile/app-store/classificacao-etaria.md`:
sem violência, sem conteúdo sexual, sem apostas; **há conteúdo gerado por
usuário e interação entre usuários** (comentários entre amigos), com denúncia e
bloqueio disponíveis.

## Público-alvo

**13 anos ou mais** — é o que os termos de uso dizem (`termos.html`). Marcar
só faixas a partir de 13 mantém o app fora das regras de app pra crianças, que
valem quando o público inclui menores de 13.

## Exclusão de conta

O Google pede um endereço na web onde a pessoa possa pedir a exclusão sem
instalar o app. `https://meuspot.app/privacidade` já explica que basta escrever
pro e-mail de contato; dentro do app é Perfil → Excluir minha conta.
