# Spot — Perfil v5: Próximas viagens + Seus melhores

Referência visual: `Spot Perfil v3.dc.html`, seção **v5** (7a, 7a2, 7b, 7c, 7d, 7e) + **6c** (desempate). Este documento substitui o Perfil de `perfil-explorar-chu.md` (p1/p1b/p2). Continuam valendo de lá: as regras de próxima viagem (p3, p4), a privacidade e o vazio.
Sistema F sem exceção: sem borda de 1px, sem sombra, `--green` como acento único, Inter Tight, sem pílula preenchida, texto sem gênero.

## Estrutura (7a → 7a2)
1. **Topo:** avatar 36 raio 11 + o primeiro nome 17/600 à esquerda; "Ajustes" 15 `--ink2` à direita. O nome não é título.
2. **Próximas viagens:** título 24/700 -0.03em. Cards que rolam para o lado: 220px, foto 130 raio 18 com escurecido, o país 21/700, "N spots" 13 e avatares 24 no canto se a viagem foi montada com amigos. Embaixo, cadeado + "Só eu vejo" ou pessoas + "Amigos veem", 14 `--ink2`. **O último card é sempre "+ Planejar viagem"** (120×130, `--surface`, raio 18, `--green`), que abre o Planejar com amigos (fluxo v2), com a opção de seguir sem amigos.
   - Sem próxima viagem: só o card "+ Planejar viagem", com 100% da largura e 88 de altura, com o texto "Planejar viagem" e "Junte o que seus amigos já salvaram no destino." 14 `--ink2`.
3. **Seus melhores:** título 24/700 e, à direita, "Mandar" 15/600 `--green` com o ícone de compartilhar (7e).
   - Seletor de linha "{Cidade} ▾" 16/600 (abre o 7b). O padrão é a cidade onde a pessoa mora; se ela tiver menos de 3 notas lá, a cidade com mais notas.
   - Abas Comer / Ficar / Experiências (o padrão de abas do app) com a contagem de spots **com nota** em 14 `--ink3`. Abas com 0 ficam ocultas.
   - Linhas do ranking: o número 26/700 `--green` (largura 30), foto 56 raio 14, nome 17/600 e "nota★ · frase" 14 `--ink2`. **A 1ª linha é maior:** número 34, foto 72, nome 19.
   - Mostra até 5 e depois "Ver os N, em ordem" 15/600 `--green`, que abre a lista completa, que pode ser arrastada para reordenar (salva a ordem manual por cidade + categoria).
   - **Aviso de empate** (só se houver): card `--surface` raio 14, "N empates no seu top" 16/600 + "Escolha qual você prefere. Leva 10 segundos." 14 `--ink2` + ›. Abre o 6c.
4. **O melhor de cada tipo:** título 20/700 e "Em todas as cidades" 14 `--ink2`. Linhas de 52 de altura: o tipo 16 `--ink2` à esquerda, o spot 16/600 e a cidade 13 `--ink3` à direita, e ›. Só os tipos (subcategoria/cozinha) com **2 ou mais spots com nota**, ordenados por quantidade. Máximo de 6, depois "Ver todos os tipos". Abre o 7d.
5. **Rodapé:** linhas de 52, 16 `--ink2`: "Todos os seus spots · N ›" (a lista com busca + o segmentado Fui / Quero ir + os filtros de cidade e categoria; é a antiga "Meus spots"), "Países que visitei · N ›" e "Onde moro · Cidade ›".

## Regra do ranking
- Entram os spots **Fui com nota** (1–5) da cidade e categoria. "Não recomendo" e "Quero ir" ficam de fora.
- Ordem: a ordem manual, se existir. Senão, a nota (desc), depois as decisões do desempate e, por último, o mais recente.
- **Empate** = 2 ou mais spots com a mesma nota entre os 10 primeiros, sem decisão de desempate. Conte os pares adjacentes.
- "Todas as cidades" = o mesmo cálculo sem o filtro de cidade (o top da vida).

## 6c Desempate
Tela cheia: "Fechar" 16 `--ink2` à esquerda e "2 de 4" 15 `--ink3` à direita; o título "Qual você prefere?" 32/700 `--green`; "Os dois têm 5 estrelas em {cidade}." 15 `--ink2`; duas fotos 3:4 raio 18 lado a lado (gap 12), com o nome 18/700 e o bairro 14 abaixo. Tocar numa foto grava a decisão (vencedor > perdedor) e avança. "Não sei dizer" 16 `--ink2` no rodapé mantém o empate. Nunca abre sozinho, só pelo aviso.

## 7b Trocar a cidade
Folha (raio 28): o título "Seus melhores em" 22/700. A primeira linha é "Todas as cidades" (quadrado 52 `--green` com ★ `--base`) com "O melhor da sua vida · N com nota". Depois, as cidades por número de spots com nota: foto 52, nome 17/600 e "N com nota" 14 `--ink2`; com menos de 3, "N com nota · faltam X". Check 24 na cidade ativa.

## 7c Poucas notas (menos de 3 na cidade + aba)
No lugar do ranking: "Falta{m} N nota{s} pro seu top" 26/700 `--green`; "Você foi em X lugares aqui e deu nota pra Y. Como foram estes?" 15 `--ink2`. Embaixo, até 3 spots Fui **sem nota**: foto 56, nome, "categoria · bairro" e uma fileira de 5 estrelas de 24 (gap 6, vazias `#D8D8D4`). **Tocar numa estrela salva a nota na hora** (otimista), e com 3 notas o ranking aparece. Sem nenhum Fui na cidade: "Marque onde você já foi em {cidade} pra montar seu top." + o botão secundário "Ver {cidade}".

## 7d Um tipo
← no topo; o tipo 38/700 `--green`; "N com nota · N cidades" 15 `--ink2`. O ranking do tipo em todas as cidades: a linha mostra "Cidade · nota★"; a 1ª é maior. **Ponte com o Planejar:** se existir uma próxima viagem com spots Quero ir desse tipo, aparece um card `--surface` raio 14 com "Vai pro {país}?" 16/600 e "Seus N melhores {tipo} ficam em {cidade}. A viagem planejada tem N {tipo} que {amigo} deu 5 estrelas." 14 `--ink2`. Tocar abre a viagem já filtrada nesse tipo.

## 7e Mandar seu top
- "Mandar" (em Seus melhores, no 7d e em "Todas as cidades") abre uma folha: "Alguém pediu dica?" 24/700 `--green`; "Mande seu top de {cidade}, pronto pra colar." 15 `--ink2`; "Quantos" + o segmentado Top 3 / Top 5 / Top 10 (padrão Top 5); a prévia do texto num card `--surface` raio 14; os botões "Mandar no WhatsApp" (principal; abre `whatsapp://send?text=` e, se não tiver WhatsApp, o share sheet) e "Copiar texto" (secundário; mostra a faixa de confirmação "Copiado").
- Formato do texto:
  ```
  Meu top de {cidade}{ · categoria se não for Comer}:

  1. {Spot}: {frase em minúscula inicial}
  2. {Spot}
  ...

  Os {N} no Spot: meuspot.app
  ```
  Sem frase, vai só o nome. Para um tipo: "Meu top de {tipo}:", e cada linha ganha " ({cidade})". Sem travessão. **Nunca** inclui a nota privada nem a nota numérica.

---

## Prompt para o Claude Code

> Refaça a aba Perfil conforme `handoff-perfil-v5/perfil-v5.md` (referência: `Spot Perfil v3.dc.html`, seção v5, telas 7a–7e, mais o 6c). A ordem é: topo compacto (avatar + nome + Ajustes) → Próximas viagens (cards que rolam para o lado, com o último sempre "+ Planejar viagem") → Seus melhores (seletor de cidade, abas Comer/Ficar/Experiências, ranking dos Fui com nota, com a 1ª linha maior, "Ver os N" reordenável e o aviso de empate que abre o desempate) → O melhor de cada tipo (em todas as cidades) → rodapé (Todos os seus spots, Países, Onde moro). Inclua: a folha de trocar cidade com "Todas as cidades"; o estado de poucas notas, com estrelas que salvam na hora; a tela de um tipo, com o card ponte para a próxima viagem; e "Mandar", que gera o texto do top para WhatsApp ou copiar, sem a nota privada. Mantenha as regras de próxima viagem e privacidade de `perfil-explorar-chu.md` (p3, p4). Use os tokens do sistema F sem exceção.
