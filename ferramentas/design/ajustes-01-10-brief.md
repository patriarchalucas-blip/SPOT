# Ajustes do lançamento — 01/10/2026 (pedido pro Claude Design)

O app foi aprovado na App Store em 01/10. O Lucas refez o caminho de quem
chega, com uma conta nova, e apontou o que segue. Os itens 1 e 2 são de desenho;
o 3 já foi resolvido no código e vai aqui só como contexto.

## 1. Trocar a categoria (Comer / Ficar / Experiências) está escondido

**Hoje existem dois lugares pra trocar:**

- **Ao salvar um spot** (folha "Adicionar spot"): o app escolhe a categoria
  sozinho, pelo tipo do lugar no Google. Ela aparece como uma linha "Comer ▾"
  14px logo abaixo do nome do lugar, e um toque abre a folha de categorias.
  O Lucas não percebeu que dava pra tocar: a linha parece rótulo, não controle.
- **Num spot já salvo** (ficha do lugar): só pelo menu "…" → "Mudar categoria".
  São dois toques, e o menu é o lugar de ações raras (denunciar, excluir).

**Por que importa:** a categoria decide em que aba da cidade o spot aparece.
Quando o Google erra (um bar que é restaurante, um hotel com restaurante), o
spot some da aba onde a pessoa vai procurar depois.

**Pedimos:** um jeito de a categoria ser visível como escolha nos dois lugares,
sem voltar a perguntar "Qual categoria?" toda vez. Essa pergunta saiu de
propósito em 29/09: acertar sozinho é melhor na maioria das vezes. Uma ideia é o
**segmentado** do sistema (trilho `--surface`, opção escolhida em `--base`), que já é
o padrão de "escolha de estado" do app, como Quero ir / Fui. Mas a decisão é sua.

## 2. Primeiro acesso: o que fica no lugar do "Qual lugar você indicaria?"

O onboarding tinha 5 passos: cidade → países → **"Qual lugar você indicaria
pra qualquer amigo?"** (buscar um lugar, categoria, frase) → amigos → pronto. O
Lucas mandou tirar o passo 3, e ele já saiu: a barra agora tem 4 pontos e o
fluxo pula direto dos países pros amigos.

**Pergunta em aberto:** o handoff "crescimento" (fluxo 2, Importar notas) previa
"Colar uma lista" como alternativa no primeiro acesso. A importação está pronta,
esperando só a chave da IA. Faz sentido um passo opcional "Tem lugares anotados
no celular? Cole aqui", no lugar do que saiu, ou é melhor o primeiro acesso ficar
mais curto e a importação morar só no "Adicionar spot"?

## 3. Já resolvido no código (contexto)

- **"Dentro de 10 km" ao buscar Maresias:** o título do Explorar mostrava o raio
  da área mesmo quando a busca era um lugar pelo nome. Agora o raio só aparece em
  "Perto de você"; buscando um lugar, o título é "Em Maresias".
- **"Load failed" ao criar conta:** era a rede da empresa bloqueando o site. A
  mensagem agora explica e manda tentar no 4G.

## Regras que valem (sistema F)
Sem borda de 1px, sem sombra, um acento só (`--green`), Inter Tight, nada de
pílula preenchida, texto sem gênero, a unidade se chama "spot".
