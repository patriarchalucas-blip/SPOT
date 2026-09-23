-- 023 — Onde o lugar fica, de verdade
--
-- POR QUE ISTO EXISTE
--
-- Os dois desenhos novos (Perfil e Ficha) pedem a mesma coisa que o banco não
-- tem: a coordenada. O Perfil quer o mapa com pins e as bolhas por cidade; a
-- Ficha quer o mini-mapa e o "4,2 km de você". Sem isto, nenhum dos dois sai
-- do papel.
--
-- E o mais irritante: O DADO JÁ CHEGA E É JOGADO FORA. A busca que o app faz
-- ao adicionar um spot já pede `places.location` ao Google (a máscara está em
-- searchSpot), a resposta já traz latitude e longitude, e o código que monta
-- S.searchResults simplesmente não copia os dois campos. Guardar daqui pra
-- frente não custa nenhuma chamada nova.
--
-- Os spots que já existem são preenchidos uma vez, pelo próprio app, com a
-- mesma busca — que tem cache, teto por usuário e teto global. Ver
-- `preencherCoordenadasQueFaltam()` no index.html.
--
-- double precision, não numeric: é coordenada, não dinheiro. O erro de
-- arredondamento do float é da ordem de centímetros, e o Google devolve 7
-- casas. Também é o que o PostGIS usaria se um dia virar geografia de verdade.
--
-- Sem índice: a consulta que existe é "os spots desta pessoa", que já passa
-- pelo índice de user_id. Índice geográfico só faz sentido em busca por raio,
-- que o app não faz — o filtro por proximidade acontece no cliente, sobre os
-- spots que ele já carregou.
--
-- Sem RLS nova: a política de `spots` da 008 cobre a linha inteira.

alter table public.spots
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- ─── Conferir ───────────────────────────────────────────────────────────
--   select column_name, data_type
--     from information_schema.columns
--    where table_schema='public' and table_name='spots'
--      and column_name in ('lat','lng');
--
-- Tem que voltar DUAS linhas, as duas `double precision`.
