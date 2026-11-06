# Google Play — o que falta e os textos prontos

Escrito em 29/09/2026, **revisto em 06/11/2026** (nome e descrição iguais aos
da App Store 1.0.4; links de convite no Android). Campo por campo, pra colar.

---

## A ordem (06/11)

O teste fechado de 14 dias é o caminho crítico: tudo se organiza em volta dele.

1. **Lucas — criar a conta** em `play.google.com/console` (US$ 25, conta
   **pessoal**, verificação com documento — pode levar alguns dias, por isso
   é o primeiro passo).
2. **Lucas — juntar 12 testadores** enquanto a conta é verificada: o Gmail de
   cada um, gente com Android. Mensagem pronta em
   `Downloads/Spot - convite testadores Android.txt`. São também os primeiros
   usuários de verdade: escolher quem vai usar, não só instalar.
3. **Lucas — Firebase** (notificações). Criar projeto em
   `console.firebase.google.com` com a mesma conta Google, adicionar app
   Android com o pacote `app.meuspot.spot`, baixar o `google-services.json` e
   me mandar. O resto (ligar no app e na Expo) é comigo.
4. **Eu — build Android** de produção (AAB) com o código de hoje, já com
   Firebase. O APK de 29/09 é da 1.0.0 e não serve mais.
5. **Lucas — primeiro envio é à mão** (regra do Google: o 1º arquivo sobe pelo
   site). Eu digo o que clicar com a tela aberta.
6. **14 dias de teste fechado** com os 12 inscritos o tempo todo (quem sai do
   teste no meio pode zerar a contagem — chamar uns 15 pra ter folga). Depois,
   pedir acesso à produção; o Google pergunta como foi o teste.
7. **Eu — no dia de abrir:** `assetlinks.json` (precisa da impressão digital
   da chave que o Google mostra no console, em Integridade do app → Assinatura)
   e botão "Google Play" nas páginas /c/, /l/, /sobre e na tela "O Spot é um
   app" — hoje todas só mandam pra App Store.

## O que já está feito do meu lado

- A versão Android compila (mesmo código do iPhone).
- **Links de convite** `meuspot.app/c/...` declarados pro Android abrir o app
  (06/11, `intentFilters` no app.json). Só passam a abrir direto depois do
  passo 7; até lá abrem no navegador, como hoje. `/?c=` e `/?salvar=` não
  entram: o Android não filtra por parâmetro, e pegar a raiz inteira faria
  link de confirmação de e-mail abrir o app.
- **Botão voltar do Android**: fecha a janela aberta, volta de tela, vai pra
  aba Viagens e só então sai do app.
- **Ícone adaptativo**: símbolo a 70% do quadro, fundo verde.
- **Permissões**: só localização e câmera.
- Perfil `preview` do `eas.json` gera **APK** pra instalar por link, sem loja.

## Imagens da loja — conferir antes de enviar

Em `ferramentas/capturas-loja/capturas-android/`: 5 capturas 1080×1920 e o
destaque 1024×500. **São de 29/09** — antes do Explorar no mapa e do
redesenho. Refazer com `LOJA=android node ferramentas/capturas-loja/capturar.cjs`
quando o redesenho estiver no ar. Ícone 512: `icon-512.png` da raiz.

---

## Nome do app — máx. 30

```
Spot: Been There
```

O mesmo da App Store desde a 1.0.1. (A marca do LOGIN do Google continua
"Spot - seus lugares" — é outra coisa e não muda.)

## Descrição curta — máx. 80

```
Onde ir, pelos seus amigos. Salve seus lugares com nota e veja os deles.
```

## Descrição completa — máx. 4.000

Igual à da App Store 1.0.4 (lida pela API em 06/11):

```
Spot é onde você guarda os lugares que importam.

Achou um restaurante num vídeo, um hotel numa conversa, uma trilha num blog? Salva no Spot antes de esquecer. Quando for, marca que foi, dá sua nota e escreve o que achou — do seu jeito, sem precisar agradar ninguém.

O QUE DÁ PRA FAZER

· Salvar restaurantes, hotéis e experiências com uma nota sua
· Separar entre "quero ir" e "já fui"
· Dar nota de meia em meia estrela e escrever uma resenha
· Organizar tudo por viagem e por cidade, com os lugares da sua cidade à parte
· Ver seus lugares no mapa da cidade
· Acompanhar quantos países você já visitou, num mapa-múndi
· Seguir amigos e ver onde eles foram
· Mandar sua lista de uma cidade pra quem for viajar pra lá

POR QUE NÃO É MAIS UM APP DE AVALIAÇÃO

Nota de estranho na internet é média de gente que você não conhece. No Spot a nota que vale é a sua, e a dos seus amigos. O resto é ruído.

Grátis, sem anúncio.
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
