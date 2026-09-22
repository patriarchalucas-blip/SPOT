# LEIA ISTO PRIMEIRO — a máquina emprestada tem UMA HORA

Escrito em 22/09/2026. Se esta sessão foi aberta nesta pasta, o Lucas está
**de novo no computador emprestado**, e desta vez com prazo de uma hora.

## Por que esta máquina existe

O notebook dele é da empresa e tem um filtro que derruba qualquer conexão com
domínios da Apple — diagnosticado: a conexão TCP abre e é cortada assim que o
nome do site é `*.apple.com`. Não é DNS, não é proxy, não é firewall do
Windows, e acontece em qualquer rede. **Não tente contornar**: é controle de
segurança de máquina corporativa.

## A MISSÃO DESTA HORA, em ordem de valor

O objetivo não é entregar o app hoje. É **acabar com a necessidade desta
máquina**. Depois destes passos, tudo que falta pode ser feito do notebook
dele, porque quem fala com a Apple passa a ser o servidor da Expo, não o
computador.

### 1. A chave da App Store Connect (.p8) — É ESTE O ITEM

Sem ela, enviar o app pra Apple, hoje ou daqui a um mês, trava no bloqueio.
Com ela guardada na Expo, o `eas submit` roda **de qualquer máquina**, porque
a conversa com a Apple acontece nos servidores deles.

No site do App Store Connect: **Users and Access → Integrations → App Store
Connect API**, criar chave com papel **Admin**, baixar o `.p8`.

- **O download acontece UMA VEZ.** Perdeu, tem que gerar outra.
- Guardar três coisas: o arquivo, o **Key ID** e o **Issuer ID**.
- Salvar num lugar que ele leve embora — não na Área de Trabalho desta
  máquina, que não é dele.
- **Nunca commitar o `.p8`.** O repositório é público.

Depois de baixar, registre na Expo para não depender do arquivo de novo:

```
npx eas-cli credentials
```

(iOS → o app → App Store Connect API Key → adicionar). Confirme com ele antes
de enviar, e **não revogue nem apague** nada que já exista.

### 2. Registro do app e contratos

No App Store Connect: criar o registro do app (nome **Spot**, bundle
`app.meuspot.spot`) e aceitar os contratos de apps gratuitos em **Business**.
Sem os contratos aceitos, o envio trava — e isso só aparece na última hora.

Se o registro já existir, não crie outro. Confirme e siga.

### 3. Se sobrar tempo: um build com o código de hoje

O build que está no iPhone dele é de **antes do redesenho inteiro**. Entre lá
e hoje mudou: todas as telas da web, o ícone do app, o splash, a paleta e a
fonte das quatro abas nativas — e **nada disso foi visto rodando**, porque não
há como abrir o app nativo na máquina dele.

**Esta pasta pode estar velha.** Ela veio de um ZIP. Antes de compilar,
confira se `mobile/cores.js` existe: se não existir, baixe o repositório de
novo (é público) —
`https://github.com/patriarchalucas-blip/SPOT/archive/refs/heads/main.zip` —
e trabalhe na pasta `mobile` de dentro dele.

```
npm install
npx eas-cli build --platform ios --profile development
```

O `development` instala direto por QR code e serve pra ele ver o redesenho no
telefone hoje. O `production` só vale a pena depois que o registro e os
contratos estiverem de pé, e as capturas da loja ainda não estão prontas —
então não é o alvo desta hora.

A compilação roda na nuvem da Expo (10 a 25 min) e não precisa desta máquina
depois de começar.

## O que já está pronto (não refaça)

- Projeto ligado ao EAS — o `projectId` está no `app.json`.
- Conta Expo: **lucaspatriarcha** (pessoal, não a de time).
- Bundle identifier **app.meuspot.spot** — permanente depois do primeiro envio.
- `eas.json` já tem os perfis `development`, `preview` e `production`.
- Um build de desenvolvimento já foi gerado uma vez e instalado no iPhone dele.
  O certificado ficou guardado nos servidores da Expo, então não precisa ser
  criado de novo.

Se o `eas-cli` pedir login da Expo e ele não lembrar a senha: existe um token
de acesso, mas ele **não está neste repositório de propósito**. Peça pro Lucas
buscar na conversa do computador dele.

## Como ele trabalha (importante)

- Ele é **leigo em terminal**. "Abre um terminal na pasta" não é instrução
  suficiente — já travou nisso. **Rode os comandos você mesmo.**
- **Ele não consegue copiar e colar nesta máquina.** Não peça textos longos;
  digite você.
- Guie **um passo por vez**: diga o que vai acontecer, espere ele confirmar,
  só então siga.
- Português brasileiro, direto, sem jargão. Ele odeia explicação longa.
- Quando não souber, diga que não sabe. Ele aceita "não sei"; não aceita ser
  mandado pra parede três vezes.
- **Nunca digite a senha da Apple por ele.** Esse login é dele: você para,
  explica onde digitar, ele digita.

## LIMITES

1. **Não mude o bundle identifier** (`app.meuspot.spot`).
2. **Não revogue, apague nem regenere** certificado ou perfil que já exista. Se
   o `eas` oferecer *revoke* ou *remove*, a resposta é NÃO — pergunte antes.
   Criar o que falta, pode.
3. **Não reescreva nem refatore código.** Esta pasta é cópia descartável: nada
   daqui volta pro repositório. Achou um problema, **diga qual é** em vez de
   corrigir — o conserto sai no outro computador, onde está o git.
4. **Não tente contornar** o bloqueio corporativo do outro notebook.
5. Diante de qualquer pergunta cuja resposta você não tenha certeza —
   principalmente vindas da Apple — **pare e mostre o texto exato** ao Lucas.
   A maioria dos estragos vem de um "sim" dado rápido demais.

## Antes de ele devolver o computador

Confirme que ele tem em mãos:

- [ ] o arquivo `.p8`, com o **Key ID** e o **Issuer ID** anotados
- [ ] o registro do app criado e os contratos aceitos
- [ ] (se deu tempo) o build novo instalado no iPhone

Os dois primeiros são o que encerra a dependência desta máquina. Se faltar
algum, é pedir o computador emprestado de novo.
