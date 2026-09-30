# Spot — Explorar com mapa

Referência visual: `Spot Explorar Mapa.dc.html`, com as telas 1 a 5.

## Estrutura
Na aba Explorar, **"Para você" e "Amigos" deixam de existir**. Fica uma lista só, que junta as duas fontes: os spots de amigos na área entram sempre e primeiro, e os bem avaliados do Google completam.

### Cabeçalho (fixo, fundo `--base`, 160px com a safe-area)
- **Busca** `flex:1`, altura 44, raio 10, `--surface`, lupa 16 `--ink3`, texto 16 `--ink`. Placeholder "Rua, bairro ou cidade".
- **Seletor Mapa / Lista** à direita, com gap 8. Trilho `--surface` raio 10, padding 3, altura 44. A opção ativa tem fundo `--base` raio 8, 15/600 `--ink`; a inativa 15/400 `--ink2`.
- **Filtros rápidos** 18px abaixo, gap 20, `nowrap` com rolagem horizontal se não couberem: `Amigos` · `Quero ir` · `Aberto agora` · `Comer ▾`. Visual de aba de texto: 15/600 `--ink3`; o ativo em `--ink` com sublinhado de 2px (padding-bottom 6). **Eles são independentes**, então vários podem ficar ativos ao mesmo tempo.
  - `Amigos`: só spots que algum amigo salvou (Fui ou Quero ir).
  - `Quero ir`: só a minha lista Quero ir na área.
  - `Aberto agora`: usa `opening_hours`.
  - `Comer ▾`: abre a folha de categoria e cozinha que já existe. O rótulo mostra a escolha ("Japonesa ▾", "Ficar ▾"…).

### Mapa (entre o cabeçalho e a folha)
- Estilo **claro** e sem pontos de interesse do provedor. Fundo e mar em `#E4E8E4`; ruas em branco ou cinza claro; rótulos de rua em `--ink3`. O desenho usa tiles do OpenStreetMap em cinza, só como referência; no app, use o estilo claro do SDK (MapKit `.mutedStandard` ou Google Maps com um JSON de estilo claro).
- **Pinos** (sem sombra, com anel de 3px `--base` para separar do mapa):
  - **Amigos foram:** círculo de 30px `--green` cheio e o número de amigos que **foram** em 13/700 `--base`.
  - **Amigos só querem ir:** círculo de 30px `--base` com contorno interno de 3px `--green` e o número de quem quer ir em 13/700 `--green`.
  - **Google, sem amigo:** círculo de 12px `--base` com contorno interno de 3px `--ink3`. Não é clicável em níveis de zoom abaixo de 15.
  - **Você:** ponto de 16px `#2F7BF6` com anel branco de 3px e halo de 44px `rgba(47,123,246,.16)`.
  - Mostre no máximo ~40 pinos. Agrupe (cluster) os de Google primeiro; **os de amigos nunca são agrupados**.
- **Botão de recentralizar:** 44×44, raio 10, `--base`, ícone de seta de 18px, no canto inferior direito, 16px acima da folha.
- Atribuição exigida pelo provedor no canto inferior esquerdo, em 9px `--ink3`.

### Folha puxável
- Fundo `--base`, raio superior 28, alça 36×4 `#CFCFCB` a 10px do topo.
- Três paradas: **baixa** (título + 1 spot, ~150px acima da barra), **meio** (topo em ~430px), **alta** (topo em 150px, cobrindo o mapa: é a mesma tela do "Lista").
- Título: "Dentro de 1,4 km" 15/600 à esquerda e "24 spots" 14 `--ink3` à direita (padding 14/20/16). O raio vem da área visível do mapa.
- **Linha:** foto 64 raio 14, gap 12; nome 16/600 -0.02em com ellipsis; meta em 13 `--ink2`, por exemplo: "**3 amigos foram** · 1 quer ir · 350 m · aberto". A parte "N amigos foram" vai em `--green` 600; "quer ir" fica em `--ink2`. A nota fica à direita, em 14/600 com estrela 12 `--green`. Gap de 14 entre linhas.
- **Ordem:** quantos amigos foram (desc) → quantos querem ir (desc) → nota (desc) → distância.

### Pino tocado (tela 4)
- O pino cresce para 40px (número em 16px), e o nome aparece abaixo dele num rótulo `--base` raio 8, 13/600.
- A folha sobe até ~340px e troca a lista pelo **card do spot**: foto 120px raio 18; nome 22/700 com a nota à direita; "Categoria · distância · aberto" 14 `--ink2`; avatares 28 (raio 9, sobrepostos -6) + "**Carol, Rafa e Marina foram** · Bia quer ir"; uma frase de amigo (a mais recente) em 15 `--ink` + "— Nome" `--ink2`; botões lado a lado com altura 48, raio 10: "Ver spot" (`--green`) e "Quero ir" (`--surface`). Se já estiver na minha lista, o segundo botão mostra o status atual.
- Tocar no mapa fora dos pinos ou arrastar a folha para baixo volta à lista.

### Estados
- **O que abre primeiro:** o **mapa**, se houver permissão de localização. A **lista** (folha alta), se a pessoa buscou uma cidade distante ou negou a localização. O seletor lembra a última escolha dentro da sessão.
- **Área vazia (tela 5):** só o ponto azul. A folha mostra "Nenhum spot por aqui" 20/700, um texto 15 `--ink2` e o botão "Buscar em toda a cidade" (altura 48, `--green`), que amplia o raio para a cidade.
- **Buscando:** os pinos atuais continuam. No título da folha, "Buscando…" em `--ink3` substitui a contagem. Sem spinner no mapa.
- **Sem internet:** o mapa mostra o que estiver em cache. O título da folha vira "Sem conexão · mostrando o que já estava salvo", e só os spots de amigos que já estão no aparelho aparecem.

## Regras
Tokens do sistema F. Sem borda de 1px, sem sombra, sem gradiente. Inter Tight, sem caixa-alta. A unidade chama **spot**. Não mude a barra inferior.

---

## Prompt para o Claude Code

> Implemente a vista de mapa na aba Explorar conforme `explorar-mapa.md` (referência visual: `Spot Explorar Mapa.dc.html`, telas 1 a 5). Remova as abas "Para você" e "Amigos" e junte tudo numa lista só, com os spots de amigos primeiro e o Google completando. Adicione o seletor Mapa/Lista ao lado da busca e os filtros rápidos independentes em estilo de aba de texto: Amigos, Quero ir, Aberto agora e Comer ▾. O mapa é claro (fundo `#E4E8E4`) e usa pinos sem sombra: verde cheio com o número de amigos que foram, contorno verde com o número de quem quer ir e um ponto cinza pequeno para o Google, sem agrupar os de amigos. A folha puxável tem 3 paradas, ordena por foram → querem ir → nota e, ao tocar num pino, mostra o card do spot. Faça também os estados de área vazia, buscando e sem internet. Use os tokens do sistema F e não mude a barra inferior.
