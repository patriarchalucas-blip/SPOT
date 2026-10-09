# Pedido: "Como o Spot funciona" — tutorial de primeiro uso (4 telas)

## Contexto
O Spot é um app de iPhone tipo "Letterboxd pra viagem": a pessoa salva lugares (restaurante, hotel, passeio) com a nota dela, marca **Fui** ou **Quero ir**, vê os spots dos amigos e planeja viagens com eles.

Hoje o primeiro acesso só **configura** a conta (onde mora, países, cidades, amigos) — ninguém explica o que o app faz. Este tutorial entra **logo depois do primeiro acesso, uma vez só**, e é **opcional**. Também abre de novo por Configurações → "Como o Spot funciona".

## O que já existe (provisório)
Ver `tutorial/tutorial-provisorio-tela1.jpg`. Tela cheia em `--base`, "Pular" no canto superior direito, ícone num círculo `--surface`, título, uma frase, 4 pontinhos e o botão verde "Continuar" ("Começar" na última). Desliza entre as telas.

**O que preciso:** o desenho de verdade no lugar do ícone.

## As 4 telas (texto aprovado — pode sugerir ajuste fino)
1. **Seus spots, sua voz** — "Salve restaurantes, hotéis e passeios com a sua nota. Um spot é um lugar que você indicaria pra um amigo."
2. **Fui ou Quero ir** — "Marque o que você já viveu e o que está na sua lista. Onde você foi pinta o seu mapa."
3. **Onde seus amigos foram** — "Veja os spots de quem você confia, com a nota de quem esteve lá."
4. **Planeje a próxima viagem** — "Escolha o destino e junte os spots que seus amigos já salvaram lá."

## Visual — mostrar DUAS direções pra escolher
- **A · pedaços reais do app:** a ficha de um spot com a nota; o segmentado Fui / Quero ir com o mapa pintando; um card do feed de amigos ("Ana foi · 5★"); a tela do Planejar.
- **B · ilustração simples** no sistema do app.

Mostrar no **tamanho real do iPhone (375 de largura)** — detalhe que não aparece no tamanho real não vale.

## Regras do sistema (direção "F") — sem exceção
- Fundo `--base #F5F5F3` · blocos `--surface #E9E9E6` · tinta `--ink #111111`, `--ink2 #6B6B67`, `--ink3 #9A9A96`
- **Um acento só:** `--green #0B3D2E`
- Nenhuma borda de 1px, nenhuma sombra, nenhum gradiente
- Fonte só **Inter Tight**; sem caixa-alta; sem espaçamento positivo entre letras
- Margem lateral 20; escala 4·8·12·16·20·24·32·48
- Raios: foto 18 · card 14 · botão 10
- A palavra é **spot**, não "lugar"

## Não mudar
"Pular" sempre visível · os 4 pontinhos · botão verde de largura inteira embaixo, respeitando a área de baixo do iPhone.

## Entrega
Mesmo formato dos pacotes anteriores: pasta `handoff-tutorial/` com `tutorial.md` (medidas, cores, comportamento e um **prompt pronto pro Claude Code**) e o `.html` de referência com as opções numeradas.
