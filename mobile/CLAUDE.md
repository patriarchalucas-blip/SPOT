# LEIA ISTO PRIMEIRO — o que o Lucas veio fazer aqui

Se esta sessão foi aberta nesta pasta, é quase certo que o objetivo é **gerar
o build iOS do Spot**. Comece por aqui antes de perguntar o que ele quer.

## A situação

O Lucas está **num computador emprestado**. O notebook dele é da empresa e tem
um filtro que derruba qualquer conexão com domínios da Apple — confirmado por
diagnóstico: a conexão TCP abre, mas é cortada assim que o nome do site é
`*.apple.com`. Não é DNS, não é proxy, não é firewall do Windows, e acontece
em qualquer rede (WiFi do escritório e 4G do celular). Não tente contornar
isso: é controle de segurança de máquina corporativa.

Por isso este computador é um recurso com prazo. **Tudo que exige falar com a
Apple tem que sair hoje.**

## Como ele trabalha (importante)

- Ele é **leigo em terminal**. "Abre um terminal na pasta" não é instrução
  suficiente — já travou nisso. Prefira rodar os comandos você mesmo.
- Guie **um passo por vez**. Diga o que vai acontecer ANTES, espere ele
  confirmar, só então siga.
- Português brasileiro, direto, sem jargão. Ele odeia explicação longa.
- Quando não souber, diga que não sabe. Ele aceita "não sei"; não aceita ser
  mandado pra parede três vezes.
- **Nunca digite a senha da Apple por ele.** Esse login é dele: você para,
  explica onde digitar, ele digita.

## O que já está pronto (não refaça)

- Projeto já ligado ao EAS — o `projectId` está no `app.json`.
- Conta Expo: **lucaspatriarcha** (a conta pessoal, não a de time).
- Bundle identifier: **app.meuspot.spot**. Ele é permanente depois do primeiro
  envio — não mude.
- O `eas.json` já tem o perfil **development** configurado.
- `expo-dev-client` já está no `package.json`.

Se o `eas-cli` pedir login da Expo e ele não lembrar a senha: existe um token
de acesso, mas ele **não está neste repositório de propósito** (o repositório
é público). Peça pro Lucas buscar na conversa do computador dele.

## As TRÊS tarefas de hoje, nesta ordem

### 1. Build de desenvolvimento

```
npm install
npx eas-cli build --platform ios --profile development
```

O que ele vai encontrar, e a resposta certa:

| pergunta | resposta |
|---|---|
| "Do you want to log in to your Apple account?" | **Y** |
| Apple ID e senha | ele digita — é a conta de desenvolvedor, liberada em 16/09/2026 |
| código de dois fatores | chega no iPhone dele |
| "Generate a new Apple Distribution Certificate?" | **Y** |
| registrar o dispositivo / provisioning profile | **Y** — vai gerar um link/QR pra abrir no Safari DO IPHONE |

A compilação acontece na nuvem da Expo (10 a 25 min). No fim sai um link:
ele abre **no Safari do iPhone** e instala.

O certificado fica guardado nos servidores da Expo, não nesta máquina — é por
isso que isto só precisa ser feito uma vez.

### 2. Chave de API da App Store Connect (arquivo .p8)

Sem ela, enviar o app pra Apple mais tarde vai travar no mesmo bloqueio.

No site do App Store Connect, em **Users and Access → Integrations**, ele cria
uma chave com papel de **Admin** e baixa o `.p8`. **O download só acontece uma
vez** — se perder o arquivo, tem que gerar outra.

Ele precisa guardar três coisas: o arquivo `.p8`, o **Key ID** e o **Issuer
ID**. Oriente-o a salvar num lugar que ele leve embora (não na Área de
Trabalho do computador emprestado) e a NÃO commitar o `.p8` no repositório.

### 3. Registro do app e contratos

No App Store Connect: criar o registro do app (nome **Spot**, bundle
`app.meuspot.spot`) e aceitar os contratos de apps gratuitos, em **Business**
(ou "Acordos"). Sem os contratos aceitos, o envio trava — e é o tipo de coisa
que só aparece na última hora.

## Antes de ele devolver o computador

Confirme com ele que tem em mãos: o app instalado no iPhone, o arquivo `.p8`
com os dois IDs, e os contratos aceitos. Qualquer um desses que falte
significa pedir o computador emprestado de novo.
