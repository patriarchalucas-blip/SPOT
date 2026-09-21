# Conta de demonstração para o revisor da Apple

> **Nunca escreva a senha em arquivo deste repositório.** O
> `github.com/patriarchalucas-blip/SPOT` é **público** — conferido em
> 20/09/2026, a API do GitHub responde 200 sem nenhuma autenticação. A senha da
> conta do revisor vive em dois lugares e só neles: no formulário do App Store
> Connect e no seu gerenciador de senhas.

É o último item da lista que depende de você. O revisor **não cria conta**: se
ele não entra, a reprovação é imediata e sem discussão. E se ele entra e vê um
app vazio, ele reprova por outro motivo — "não dá para avaliar a
funcionalidade".

---

## São duas contas, não uma

Isso não é preciosismo. O Spot tem uma aba inteira (Amigos) e um feed que só
existem com amizade aceita. Com uma conta só, o revisor abre Amigos, vê "Sem
amigos ainda", e metade do app fica invisível para ele.

A alternativa — fazer sua conta real virar amiga da conta de teste — está
fora: entregaria suas viagens, seus lugares e suas notas para um revisor da
Apple. Então:

| conta | para quê |
|---|---|
| `revisor@...` | é a que vai no formulário de envio |
| `amiga@...` | existe só para ser amiga da primeira e povoar o feed |

As duas precisam de um e-mail que **você** controle, porque o cadastro pede
confirmação por e-mail (o Resend manda). Serve `+` no seu endereço, do tipo
`seunome+revisor@gmail.com` — cai na sua caixa normal.

---

## O que eu preciso que você faça

1. Criar as duas contas pelo `meuspot.app`, com senha que não seja a sua.
2. Confirmar as duas pelo e-mail que chegar.
3. Mandar a amiga pedir amizade para a do revisor, e aceitar.
4. Me passar o e-mail e a senha da conta do revisor.

São uns cinco minutos. O cadastro por e-mail e a recuperação de senha dividem a
mesma cota do Resend — **100 por dia no plano grátis** —, então duas contas não
chegam perto do teto.

## O que eu faço depois

Com a senha na mão eu povoo as duas pela API, sem você precisar cadastrar lugar
a lugar:

- na conta do revisor: 4 ou 5 viagens em continentes diferentes (para o trilho
  de continentes ter o que mostrar), uns 15 lugares nas três categorias, com
  nota pessoal e avaliação escrita, e alguns países marcados no mapa;
- na conta da amiga: 2 viagens com lugares marcados como "já fui", que é o que
  alimenta o feed, mais um comentário num lugar do revisor.

**Isso escreve no banco de produção.** Só faço com você mandando, e as linhas
ficam identificadas por `user_id` das duas contas — dá para apagar depois sem
tocar em nada seu.

---

## Onde isso vai, na hora do envio

App Store Connect → a versão → **Informações para revisão do app**:

- marcar que o app **exige login**;
- e-mail e senha da conta do revisor;
- no campo de notas, o texto que está em `ficha-da-loja.md`, na seção "Nota
  para o revisor" — ele já explica onde ficam denunciar, bloquear e excluir
  conta, que é o que a diretriz 1.2 manda o revisor procurar.

---

## Depois de publicado

Não apague essas contas. Toda atualização passa por revisão de novo, e o
revisor vai usar a mesma conta. Se a senha mudar, a atualização trava.
