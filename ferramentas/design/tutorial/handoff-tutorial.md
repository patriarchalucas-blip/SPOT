# Spot — Tour "Como o Spot funciona"

Referência visual: `Spot Tour.dc.html` (T1–T5 tour, T6 dica na primeira ficha). Tamanho de referência: iPhone com 375 de largura.
Sistema F: sem borda de 1px, sem sombra de card, sem gradiente, `--green` como acento único, Inter Tight. O escurecido é máscara.

## Escurecido + recorte
- Máscara `rgba(17,17,17,.62)` cobrindo a tela inteira, inclusive a barra de abas e a status bar.
- O recorte é **totalmente transparente**, sem borda, sem halo e sem brilho. O elemento aparece com a cor de verdade.
- Folga (padding) do recorte em volta do elemento: **8px** em botão circular (o recorte é circular, com raio = metade do lado); **6px** em card (raio = raio do card + 6).
- Abas: um retângulo de **80×52**, raio 14, centrado no item da aba (ícone + rótulo), com o topo a 4px do topo da barra.
- Implementação: um overlay com caminho de recorte (SVG mask, ou `CAShapeLayer` com even-odd) recalculado a partir do `getBoundingClientRect`/frame do elemento real. Nunca use coordenadas fixas.

## Balão
- `--base`, raio 14, largura = tela − 40 (margem 20), padding 16 16 14, gap 14.
- **Setinha:** um quadrado 14×14 girado 45°, raio 3, `--base`, apontando para o centro horizontal do recorte. Ela fica 6px para fora do balão e é limitada a pelo menos 20px das bordas do balão.
- Posição: **12px abaixo do recorte**; se não couber (o recorte está na metade de baixo da tela), 12px **acima**, com a setinha para baixo. Nos passos 3–5, a posição vertical é a mesma.
- Texto 16/1.4: a palavra-chave em 700 `--ink`, seguida da frase em 400 `--ink2`.
- Rodapé (flex, center, gap 16): "N de 5" 14 `--ink3` (flex 1, à esquerda) · "Pular" 15/500 `--ink2` (área de toque 44) · botão "Próximo" com 40 de altura, padding 0 18, raio 10, `--green`, texto 15/600 `--base`. No último passo, "Começar".

## Passos
1. "+" do topo da aba Viagens: **Adicionar.** Aqui você salva um spot, as cidades e os países onde já foi.
2. O card do placar: **Seu placar.** Países, cidades e spots. Toque num número pra ver a lista.
3. Aba Explorar: **Explorar.** Spots perto de você e o que seus amigos salvaram.
4. Aba Amigos: **Amigos.** O que eles salvaram, pedidos de amizade e o convite pelo WhatsApp.
5. Aba Perfil: **Perfil.** Seus melhores spots, as próximas viagens e as configurações.

O único ajuste de texto foi no passo 3: "Lugares perto de você" virou "**Spots** perto de você", porque a palavra do app é spot.

## Comportamento
- Começa ~400ms depois de a home terminar de carregar (mapa e placar desenhados), uma vez só. Grave `tour_seen=true` ao concluir **ou** pular.
- **Transição entre passos:** o recorte anima posição, tamanho e raio em 280ms (`ease-out`, cubic-bezier(.2,.8,.2,1)). O balão faz fade-out em 120ms antes e fade-in + translate 8px → 0 em 180ms depois que o recorte chega. Durante o tour a tela de fundo não troca de aba: as abas são só apontadas.
- Entrada: a máscara faz fade de 0 → .62 em 200ms e depois o primeiro balão aparece. Saída (Pular ou Começar): tudo faz fade-out em 200ms.
- Toques: "Próximo" avança; tocar **no recorte** também avança, mas não executa a ação do botão; tocar na máscara não faz nada; "Pular" fecha. O gesto de voltar do iOS fecha o tour.
- Acessibilidade: o VoiceOver lê "Passo N de 5. {frase}" e o foco vai para "Próximo". Com "Reduzir movimento", não há animação de deslizar, só um fade.
- Reabrir por Configurações → "Como o Spot funciona": volta para a aba Viagens, rola para o topo e começa do passo 1.

## Passo a mais: Fui / Quero ir (T6) — fora do tour
- Na home, o primeiro uso não tem nenhum spot para mostrar, então essa dica **não entra no tour**.
- Ela aparece **uma vez**, na **primeira ficha** que a pessoa abrir (o spot recém-salvo, um do Explorar ou o de um amigo), ~500ms depois de a ficha carregar.
- O recorte fica em volta do segmentado "Quero ir / Fui / Não recomendo" (folga de 6, raio 16), com o balão embaixo: "**Fui ou Quero ir.** Marque se você já foi ou se quer ir. Onde você foi pinta o seu mapa."
- O rodapé tem só o botão "Entendi", à direita, sem contador e sem Pular. Tocar no segmentado também fecha a dica **e** aplica a escolha. Grave `tip_status_seen=true`.

---

## Prompt para o Claude Code

> Refaça o visual do tour "Como o Spot funciona" conforme `handoff-tutorial/tutorial.md` (referência: `Spot Tour.dc.html`, T1–T6). O escurecido é uma máscara `rgba(17,17,17,.62)`, com o recorte transparente sem borda nem halo, calculado a partir do elemento real: circular com folga de 8 no "+", raio do card + 6 no placar e 80×52 com raio 14 nas abas. O balão é `--base`, com raio 14, margem 20, uma setinha de 14px girada apontando para o centro do recorte, 12px abaixo do recorte ou acima se não couber, o texto com a palavra-chave em 700 `--ink` e o resto em `--ink2`, e um rodapé com "N de 5" à esquerda e "Pular" + "Próximo" (verde, altura 40) à direita. Entre os passos, o recorte desliza em 280ms e o balão faz fade e translate de 8px. Tocar no recorte avança sem executar a ação. Troque "Lugares perto de você" por "Spots perto de você". Adicione também a dica única de Fui/Quero ir na primeira ficha aberta (fora do tour, com o botão "Entendi"). Use os tokens do sistema F.
