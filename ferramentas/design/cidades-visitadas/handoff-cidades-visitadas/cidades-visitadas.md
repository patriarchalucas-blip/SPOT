# Spot — Cidades visitadas (marcar cidades sem spot)

Referência visual: `Spot Cidades Visitadas.dc.html`. A rodada 2 (10a–10c) traz as entradas visíveis; a rodada 1 (9a–9f) traz a folha, a cidade sem spot, como desmarcar e o onboarding.
Sistema F: sem borda de 1px, sem sombra, `--green` como acento único, Inter Tight, sem pílula preenchida, texto sem gênero, a unidade se chama "spot".

## Regra de produto
- Nova entidade leve: **cidade visitada** = (usuário, place id da cidade, país). Não é viagem nem spot.
- Conta no placar de **cidades**. Pinta o **país** no mapa e, se o país não estiver marcado, marca o país também.
- Aparece dentro da viagem do país como cidade **sem spots** (o card do 9d). Se a viagem do país não existir, ela é criada (`__quickvisit__`, como hoje).
- Quando a pessoa adiciona um spot nessa cidade, ela vira uma cidade normal; a marcação continua por baixo, mas deixa de importar.
- Desmarcar remove só a cidade. **O país continua marcado.** Uma cidade com spots não pode ser desmarcada.

## Entradas (em ordem de prioridade)
1. **10a · "Adicionar":** o botão da aba Viagens abre uma folha com Um spot / Cidades onde já fui / Países onde já fui (linhas de 64, quadrado de ícone 44 `--surface` raio 12, ícone `--green`, título 17/600, subtítulo 14 `--ink2`, ›). O subtítulo de Países mostra "N marcados". *Se o botão já abre uma tela do site, isto sai sem versão nova; o texto do botão vira "Adicionar" na próxima versão nativa.*
2. **10c · Depois de salvar o 1º spot num país:** uma folha com "Salvo em {cidade}" 14/600 `--green`, "Passou por outras cidades {do país}?" 24/700 e "Marque e elas entram no seu mapa." 15 `--ink2`. As 4 cidades mais visitadas do país viram botões de toque (44, raio 10, `--surface`; selecionado = `--green` com texto `--base`) + "Outra…" `--green`, que abre o 9b filtrado no país. Botões "Agora não" (secundário) / "Marcar" (principal). **Uma vez por país:** depois de "Agora não", não pergunta mais desse país.
3. **9a · Placar "N cidades":** a lista de cidades que já abre do placar ganha, no topo, o botão principal "+ Marcar cidades onde já fui". Lista agrupada por país (cabeçalho 20/700 + contagem). A linha é a foto da cidade 72×56 raio 14, o nome 17/600 e o subtítulo: "Onde você mora · N spots" / "N spots" / **"Esteve aqui"** (sem spot).
4. **9d · Viagem do país:** "+ Marcar cidade" 15/600 `--green` à direita do título "Cidades". Abre o 9b filtrado no país.
5. **10b · Lista de viagens (nativa, na próxima versão):** um país marcado sem nenhuma cidade mostra "+ Marcar cidades" 14/600 `--green` no lugar da contagem, e o quadrado `--surface` com + no lugar da foto. Some quando tiver 1 cidade.
6. **9f · Onboarding:** passo opcional "E as cidades?" depois de Países (só se marcou 1 ou mais país), com o mesmo conteúdo do 9b em tela cheia, "Pular" no topo e "Continuar · N cidades".

## 9b / 9c Folha "Onde você já foi?"
- Folha com raio 28, o título 24/700 e a busca (a mesma busca de cidade do onboarding).
- **Selecionadas** no topo, quebrando linha: o nome 15/600 `--green` + ✕ 12 `--ink2` (gap 8×16). Não são pílulas preenchidas.
- **Sem texto digitado:** para cada país marcado com 0 cidades (depois o resto, por número de spots), o cabeçalho "{País}" 15/600 + "você já marcou o país" `--ink3`, as 4 cidades mais visitadas (a fonte é uma lista fixa por país; se a cidade não estiver nela, use a busca) e "Ver mais {do país}" `--green`.
- **Digitando:** os resultados, com o país (ou estado, país) no subtítulo. Tocar marca **sem fechar a busca**. Uma cidade num país não marcado pinta o país.
- Linha com altura mínima 52, o nome 17/600, o subtítulo 14 `--ink2` e o check 24 (o padrão).
- O botão fixo "Marcar N cidades" grava tudo de uma vez (um único request). Com o teclado aberto, o botão fica escondido; ao fechar o teclado, ele volta.
- As cidades já marcadas aparecem com o check preenchido; tirar o check e salvar desmarca.

## 9e Tocar numa cidade sem spot
Em vez de abrir uma tela de cidade vazia, abre uma folha: a foto 72×56, o nome 22/700, "{País} · esteve aqui, sem spots" 14 `--ink2`; os botões "Adicionar spot em {cidade}" (principal; abre a busca de spot já na cidade) e "Desmarcar cidade" (secundário, com o texto `#8A2B1F`); e "Sai do placar de cidades. {País} continua marcado." 14 `--ink2`.
Desmarcar é um toque, sem confirmação, e mostra a faixa "{Cidade} desmarcada · Desfazer" por 5s.

## Cards na viagem (9d)
A cidade sem spot é um card igual aos outros: a foto da cidade (a mesma busca de foto das viagens), o nome 17/600 e, no lugar de "N spots", "+ Adicionar spot" 14/600 `--green`. Fica depois das cidades com spots. Tocar no card abre o 9e.

## Contagem e cabeçalhos
"N cidades" no placar, no país ("3 cidades · 17 spots") e no perfil inclui as cidades sem spot.

---

## Prompt para o Claude Code

> Implemente "cidades visitadas" conforme `handoff-cidades-visitadas/cidades-visitadas.md` (referência: `Spot Cidades Visitadas.dc.html`, 9a–9f e 10a–10c). Crie a entidade cidade visitada (usuário + place id + país), que conta no placar de cidades, marca e pinta o país e aparece na viagem do país como cidade sem spots. Desmarcar não desmarca o país, e cidades com spot não podem ser desmarcadas. A folha "Onde você já foi?" marca várias cidades de uma vez: tem sugestões dos países marcados sem cidade, usa a busca do onboarding, marca sem fechar a busca e grava num único request. Entradas, nesta ordem: a folha "Adicionar" (Um spot / Cidades / Países), a pergunta depois do 1º spot salvo num país (uma vez por país), o botão no topo da lista do placar "N cidades", o "+ Marcar cidade" na viagem do país e o passo opcional no onboarding. A cidade sem spot aparece com foto e "Esteve aqui" / "+ Adicionar spot"; tocar nela abre a folha com Adicionar spot / Desmarcar e o Desfazer. O 10b (lista de viagens) é tela nativa: deixe para a próxima versão. Use os tokens do sistema F sem exceção.
