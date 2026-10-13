# E-mails de cadastro e de troca de senha, em português e inglês (13/10/2026)

O Supabase manda um e-mail só por tipo, sem saber a língua da pessoa. Então
cada e-mail leva as duas: português em cima, inglês embaixo.

**Onde colar:** Supabase → Authentication → Emails → Templates.

| Modelo no Supabase | Assunto | Corpo |
|---|---|---|
| Confirm signup | `Confirme seu e-mail · Confirm your email` | `confirmar-cadastro.html` |
| Reset password | `Trocar sua senha · Reset your password` | `trocar-senha.html` |

`{{ .ConfirmationURL }}` é o link que o Supabase preenche. Não troque.
