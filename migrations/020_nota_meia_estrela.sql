-- 020 — a nota do spot aceita meia estrela
--
-- RODADA POR LUCAS EM 21/09/2026. Este arquivo existe pra registrar o que foi
-- feito no banco; rodar de novo não faz mal (numeric(2,1) pra numeric(2,1) é
-- no-op no Postgres).
--
-- POR QUE: my_rating nasceu integer. Mandar 4.5 devolvia
--   400 · 22P02 · invalid input syntax for type integer: "4.5"
-- Não era erro de permissão nem de RLS: o PostgREST valida o TIPO da coluna
-- antes de qualquer outra coisa.
--
-- numeric(2,1) guarda de 0.0 a 9.9 com uma casa. As notas que já existem
-- continuam válidas — 5 vira 5.0, e o app imprime "5" (sem casa decimal) pra
-- nota inteira e "4,5" pra meia, com vírgula, que é o separador em português.
--
-- NÃO use real/float: nota é comparada por igualdade em vários lugares do app
-- (acender estrela, filtrar por nota), e ponto flutuante binário não
-- representa 4.5... representa, mas não representa 0.1 — e o dia em que
-- alguém quiser passo de 0.1 o bug aparece sem aviso. numeric é decimal de
-- verdade.

alter table spots
  alter column my_rating type numeric(2,1)
  using my_rating::numeric(2,1);

-- Conferência: devolve a linha com data_type = 'numeric', numeric_scale = 1.
--
-- select column_name, data_type, numeric_precision, numeric_scale
--   from information_schema.columns
--  where table_name = 'spots' and column_name = 'my_rating';
