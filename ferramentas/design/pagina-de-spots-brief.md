# Página dos seus spots — 05/10/2026 (pedido pro Claude Design)

## O problema
Na aba **Viagens**, o placar tem três números: **países · cidades · spots**. Tocar em
"spots" abria o Perfil (o Lucas achou horrível). Hoje abre uma lista provisória,
"Todos os seus spots" (busca + Fui / Quero ir + filtros de cidade e categoria,
agrupada por cidade). Ela funciona, mas não foi desenhada pra ser o destino do placar.

**Pedido:** desenhar a página que abre ao tocar em "N spots" no placar — o lugar onde
a pessoa vê e acha TODOS os spots dela.

## O que a página precisa resolver
- **"Qual era aquele lugar?"** — achar um spot pelo nome, bairro ou cidade, rápido.
- **Fui × Quero ir** — os dois mundos separados (é a regra do app inteiro desde o
  feedback da Chu).
- **Por onde** — cidade e país (a pessoa lembra pelo lugar).
- **Por tipo** — Gastronomia / Hospedagem / Experiências.
- Abrir a ficha do spot com um toque.

## O que já existe e pode ser reaproveitado
- A linha de lista do sistema (foto 56, nome, meta, nota à direita).
- O segmentado Fui / Quero ir com contagem.
- Os seletores de linha "Cidade ▾" / "Categoria ▾".
- O número do placar (146 spots no caso do Lucas): a página precisa aguentar centenas.

## Fora do escopo
- Ranking / "Seus melhores" — isso mora no Perfil.
- Mapa — existe no Explorar.

## Regras (sistema F)
Sem borda de 1px, sem sombra, um acento só (`--green`), Inter Tight, nada de pílula
preenchida, texto sem gênero, a unidade se chama "spot". Mobile, ~375px.
Categorias: **Gastronomia / Hospedagem / Experiências** (não Comer/Ficar).
