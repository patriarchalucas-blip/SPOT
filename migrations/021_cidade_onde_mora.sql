-- 021 — A cidade onde a pessoa mora
--
-- POR QUE ISTO EXISTE
--
-- O Explorar abre vazio e pede pra pessoa digitar uma cidade. No primeiro dia
-- de uso, isso é um app em branco pedindo trabalho antes de dar qualquer
-- coisa. Com a cidade de casa guardada, ele abre já cheio — o que os amigos
-- marcaram por perto, e o que está bem avaliado ali.
--
-- `profiles.home_country` já existia desde a 008 (o país onde mora, que o
-- mapa usa). A cidade é o mesmo dado numa granularidade menor, e mora ao lado
-- dele em vez de virar tabela nova.
--
-- O nome vem do Google Places (`includedType: 'locality'`), não digitado à
-- mão: é a mesma fonte que já nomeia a cidade de cada spot, então "São Paulo"
-- aqui é a mesma string de "São Paulo" lá, e o Explorar casa os dois.
--
-- Sem RLS nova: a política de `profiles` da 008 já cobre a tabela inteira —
-- cada um escreve a própria linha, e amigo lê.

alter table public.profiles
  add column if not exists home_city text;

-- ─── Conferir ───────────────────────────────────────────────────────────
-- Tem que voltar UMA linha, com a coluna existindo:
--
--   select column_name, data_type
--     from information_schema.columns
--    where table_schema='public' and table_name='profiles'
--      and column_name='home_city';
