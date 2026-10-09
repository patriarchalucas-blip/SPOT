# Pedido: "Como o Spot funciona" — tour guiado de primeiro uso

## Contexto
O Spot é um app de iPhone tipo "Letterboxd pra viagem": a pessoa salva lugares (restaurante, hotel, passeio) com a nota dela, marca **Fui** ou **Quero ir**, vê os spots dos amigos e planeja viagens com eles.

Logo depois do primeiro acesso, o app faz um **tour pelo próprio app**: escurece a tela, **circula o botão de verdade** e explica numa frase. Um passo por vez, opcional ("Pular" sempre visível), uma vez só. Também abre por Configurações → "Como o Spot funciona".

## O que já existe (funcionando, visual provisório)
Ver `tutorial/tour-1.png` (o "+") e `tutorial/tour-4.png` (a aba Amigos).
- Tela escurecida com um recorte claro em volta do botão (círculo no "+", retângulo de canto 14 nas abas).
- Balão `--base` embaixo do botão (ou em cima, se não couber) com: frase, "Pular" (`--ink3`), contador "1 de 5" e botão verde "Próximo" ("Começar" no último).

## Os 5 passos (texto aprovado — pode sugerir ajuste fino)
1. **"+" do topo da aba Viagens** — "**Adicionar.** Aqui você salva um spot, as cidades e os países onde já foi."
2. **Placar** — "**Seu placar.** Países, cidades e spots. Toque num número pra ver a lista."
3. **Aba Explorar** — "**Explorar.** Lugares perto de você e o que seus amigos salvaram."
4. **Aba Amigos** — "**Amigos.** O que eles salvaram, pedidos de amizade e o convite pelo WhatsApp."
5. **Aba Perfil** — "**Perfil.** Seus melhores spots, as próximas viagens e as configurações."

## O que preciso de você
1. **O desenho do destaque e do balão**: o recorte (borda? halo? só o claro?), o balão (com setinha apontando pro botão ou sem), a entrada/saída entre passos.
2. **Se vale um passo a mais** (ex.: Fui / Quero ir dentro da ficha de um spot) e como mostrar sem a pessoa ter spot nenhum ainda.
3. Mostrar no **tamanho real do iPhone (375 de largura)**, os 5 passos.

## Regras do sistema (direção "F") — sem exceção
- Fundo `--base #F5F5F3` · blocos `--surface #E9E9E6` · tinta `--ink #111111`, `--ink2 #6B6B67`, `--ink3 #9A9A96`
- **Um acento só:** `--green #0B3D2E`
- Nenhuma borda de 1px, nenhuma sombra de card, nenhum gradiente (o escurecido do tour é máscara, não sombra)
- Fonte só **Inter Tight**; sem caixa-alta; sem espaçamento positivo entre letras
- Margem lateral 20; escala 4·8·12·16·20·24·32·48
- Raios: foto 18 · card 14 · botão 10
- A palavra é **spot**, não "lugar"

## Entrega
Mesmo formato dos pacotes anteriores: pasta `handoff-tutorial/` com `tutorial.md` (medidas, cores, comportamento e um **prompt pronto pro Claude Code**) e o `.html` de referência.
