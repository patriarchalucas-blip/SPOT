# Spot — casca nativa para a App Store

O app continua sendo o mesmo `index.html` publicado no Cloudflare. Esta pasta é só
a casca que permite ele morar na App Store. Quando você publica o site, o app
atualiza junto — sem reenviar nada para a Apple.

O Expo compila na nuvem, então **não é preciso ter um Mac**.

---

## O que você faz, na ordem

### 1. Conta de desenvolvedor da Apple — comece por aqui, hoje

https://developer.apple.com/programs/ — US$ 99 por ano.

É o item de maior espera: exige verificação de identidade e pode levar dias, às
vezes pedindo documento extra. **Nada mais pode ser enviado sem isso**, e todo o
resto abaixo roda em paralelo enquanto ela sai.

### 2. Conta no Expo

https://expo.dev — gratuita. Só criar.

### 3. Instalar e conferir versões

```bash
cd mobile
npm install
npx expo install --fix
```

O `--fix` alinha as versões das bibliotecas com o SDK do Expo. Eu escrevi o
`package.json` conferindo as versões publicadas em 11/09/2026, mas esse comando é
quem manda — se ele mudar alguma coisa, está certo.

### 4. Ver rodando no seu iPhone, antes de qualquer envio

```bash
npm start
```

Instale o app **Expo Go** no iPhone e leia o código na tela. Isso mostra o Spot
dentro da casca, na hora, sem build e sem conta da Apple. É aqui que você
descobre se ficou bom.

### 5. Conectar ao Expo e gerar o app

```bash
npm install -g eas-cli
eas login
eas init            # preenche o projectId no app.json
eas build --platform ios --profile production
```

O primeiro build pergunta as credenciais da Apple e **cria os certificados
sozinho**. É a parte que costuma travar quem faz na mão, e o Expo resolve.

### 6. Enviar para a App Store

Crie o app em https://appstoreconnect.apple.com, preencha os três campos em
branco no `eas.json` e rode:

```bash
eas submit --platform ios --profile production
```

---

## O que ainda falta no app, antes de enviar

Estes não são da casca, são do `index.html`, e a Apple reprova sem eles:

- [ ] **Denunciar conteúdo e bloquear usuário.** Exigência para qualquer app com
      conteúdo escrito por outra pessoa, e o Spot tem comentário em spot de amigo.
      Hoje não existe. É a reprovação mais provável.
- [ ] **Política de privacidade** numa URL pública. O app coleta e-mail,
      localização e foto.
- [ ] **Conta de demonstração** com usuário e senha que funcionem, entregue no
      formulário de envio. O revisor não cria conta: se ele não entra, é
      reprovação imediata. Precisa estar povoada, senão ele entra, vê app vazio e
      reprova por outro motivo.
- [ ] **Recuperação de senha.** Quem esquece a senha hoje não tem caminho de volta.
- [ ] **Capturas de tela** nos tamanhos que a Apple pede.

Já prontos: excluir a própria conta dentro do app, e uso real de localização,
câmera e compartilhamento — que é o que diferencia um app de verdade de um site
embrulhado aos olhos do revisor.

---

## Decisões que ficaram travadas e não mudam depois

**Identificador do app:** `app.meuspott.spot`

Isso é permanente. Depois do primeiro envio, a Apple não deixa trocar — mudar
significa publicar um app novo, do zero, sem os usuários. Se você quiser outro,
fale **antes** do primeiro build.

**Endereço que a casca carrega:** hoje aponta para `spotted-38b.pages.dev`
(constante `SITE` no `App.js`). Quando o domínio próprio estiver apontado, troque
ali. Vale trocar antes de enviar: o endereço fica visível para o revisor.

---

## O risco que existe e você deve saber

A regra 4.2 da Apple reprova app que é "só um site embrulhado". O que joga a
nosso favor, e está construído nesta casca:

- Link do Instagram, do Google Maps e telefone abrem no aplicativo nativo, em vez
  de navegar por cima do Spot e prender o usuário.
- Tela de sem-conexão de verdade, com botão de tentar de novo.
- Compartilhamento pela folha nativa do sistema.
- Localização e câmera pedidas pelo aparelho, com texto em português.
- Botão físico de voltar do Android navegando no histórico.

Não é garantia. Se reprovar por 4.2, o caminho é aumentar a parte nativa —
notificação push é o próximo item de maior peso.
