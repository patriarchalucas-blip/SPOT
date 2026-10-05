-- ═══════════════════════════════════════════════════════════════════════
-- 029 — Perfil v5 "Seus melhores" (05/10/2026)
-- ═══════════════════════════════════════════════════════════════════════
-- Rodar INTEIRO no SQL Editor do projeto kzidnilsyrvauzgelsqd (o do Spot).
-- Só ACRESCENTA dois campos; não mexe em nada que existe. Pode rodar de novo.
--
--   1. spots.tipo — o tipo do lugar que o Google informa (japanese_restaurant,
--      pizza_restaurant, cafe...). É o que monta "O melhor de cada tipo".
--   2. profiles.ranking — a ordem que a pessoa arrastou no "Ver os N, em
--      ordem" e as escolhas do desempate ("qual você prefere?"). Fica na conta,
--      não no aparelho.
-- As regras de quem lê e quem grava já existentes valem pros dois campos
-- (dono grava; amigo só lê o que já lia).
-- ═══════════════════════════════════════════════════════════════════════

alter table public.spots    add column if not exists tipo text;
alter table public.profiles add column if not exists ranking jsonb not null default '{}'::jsonb;

-- Conferência: tem que voltar 2 linhas "true"
select 'spots.tipo' as item, exists (select 1 from information_schema.columns where table_name='spots' and column_name='tipo') as ok
union all
select 'profiles.ranking', exists (select 1 from information_schema.columns where table_name='profiles' and column_name='ranking');
