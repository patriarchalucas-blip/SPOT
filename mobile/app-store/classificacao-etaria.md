# Classificação etária — respostas do questionário

App Store Connect → **Informações do app → Classificação etária**. Escrito em
23/09/2026, a partir do que o app faz hoje.

> **Escrito sem ver a tela.** A Apple reformulou esse questionário em 2025
> (faixas 4+, 9+, 13+, 16+, 18+ e perguntas novas sobre conteúdo de usuário e
> conversa). Se o texto de alguma pergunta for diferente do que está aqui,
> **pare e mostre a pergunta exata** — não encaixe a resposta por semelhança.

**Alvo: 13+.** É o que os Termos de Uso já dizem ("Você precisa ter 13 anos ou
mais para criar uma conta") e o que a política de privacidade repete. A
classificação e os termos precisam bater.

---

## Recursos do app

| pergunta | resposta | por quê |
|---|---|---|
| Controles parentais | **Não** | não existe |
| Verificação de idade | **Não** | o app não confere idade; os termos exigem 13+ |
| Acesso irrestrito à web | **Não** | o app só carrega `meuspot.app`. Instagram, Maps, site do lugar e telefone abrem **fora** do app, no aplicativo certo |
| Conteúdo gerado por usuário | **Sim** | notas, avaliações, comentários, fotos e nome de perfil, vistos pelos amigos |
| Mensagens e chat | **Sim** ⚠️ decisão sua | não há mensagem privada, mas comentário no lugar de um amigo é conversa entre usuários. Declarar "sim" é o lado seguro: dizer "não" e o revisor achar os comentários é pior do que subir uma faixa |
| Publicidade | **Não** | não há anúncio nenhum |

Com conteúdo de usuário, a Apple costuma pedir que o app tenha **denúncia,
bloqueio e resposta rápida** (diretriz 1.2). Os três existem: denunciar
comentário/perfil, bloquear, e desde 23/09 a denúncia manda notificação pro
seu celular (`functions/api/denuncia-aviso.js`).

## Conteúdo

Para cada tema a resposta é **Nenhum**, **Infrequente/leve** ou
**Frequente/intenso**. O que conta é o que o app mostra — incluindo o que os
usuários escrevem.

| tema | resposta | por quê |
|---|---|---|
| Violência (desenho, realista, prolongada) | Nenhum | |
| Conteúdo sexual ou nudez | Nenhum | o filtro de termos barra, e denúncia existe |
| Linguagem obscena ou humor grosseiro | **Infrequente/leve** | é texto livre de usuário: não dá pra prometer zero, mesmo com o filtro |
| Referências a álcool, tabaco ou drogas | **Infrequente/leve** | bares e cervejarias são lugares salvos comuns, e a própria conta de demonstração tem a Cervejaria Ramiro |
| Temas maduros ou sugestivos | Nenhum | |
| Terror ou medo | Nenhum | |
| Informação médica ou de tratamento | Nenhum | |
| Jogos de azar simulados / apostas reais | Nenhum | |
| Concursos | Nenhum | |
| Armas | Nenhum | |

---

## Resultado esperado

**13+.** Se a tela calcular outra faixa no final, **não force**:
- se der **menos** que 13+, dá pra escolher manualmente uma faixa mais alta;
  escolha 13+, pra bater com os termos;
- se der **mais** que 13+ (16+ ou 18+), é quase certamente a pergunta de
  mensagens ou de linguagem; me mostra a tela antes de mudar qualquer coisa.
