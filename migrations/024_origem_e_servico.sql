-- 024 — De quem veio a dica, e a linha de serviço do lugar
--
-- Duas colunas que fecham os dois handoffs, numa migração só.
--
-- ─── spots.from_user_id ─────────────────────────────────────────────────
--
-- POR QUE: quando você vê um lugar no perfil de um amigo e toca em
-- "adicionar à minha lista", o app guarda o lugar e ESQUECE de quem veio.
-- No seu perfil ele aparece igual a um que você achou sozinho. O desenho
-- pede "dica do Bruno" embaixo do nome, e isso é o dado que falta.
--
-- Só vale daqui pra frente: os spots que já existem não têm como saber a
-- origem, e a legenda deles continua mostrando a cidade — que é o que o
-- próprio handoff manda fazer na falta do dado.
--
-- Sem foreign key pra profiles DE PROPÓSITO: se o amigo apagar a conta, o
-- spot é SEU e não pode sumir junto. Um id órfão vira "sem dica de ninguém",
-- que é degradação aceitável; um ON DELETE CASCADE apagaria seu lugar.
--
-- ─── spots.price_level e spots.opening_hours ────────────────────────────
--
-- POR QUE: a ficha nova tem a linha "Aberto · fecha às 23h · $$", e hoje ela
-- só mostra a nota do Google porque os outros dois campos nunca foram
-- pedidos. Eles VÊM DE GRAÇA na mesma busca que já roda quando você adiciona
-- um lugar — é só pedir e guardar.
--
-- Guardados, e não consultados a cada abertura: consultar ao vivo custaria
-- uma chamada paga por visita a uma ficha, e foi exatamente esse padrão que
-- gerou a cobrança desta semana. Horário é um retrato do dia em que o lugar
-- foi salvo; se mudar, corrige quando alguém salvar de novo.
--
-- `opening_hours` como jsonb: o que o Google devolve é uma lista de períodos
-- com dia, hora e minuto. Guardar como texto obrigaria a decodificar na mão
-- toda vez, e jsonb é o tipo que o Postgres tem pra isso.
--
-- Sem RLS nova: a política de `spots` da 008 cobre a linha inteira.

alter table public.spots
  add column if not exists from_user_id uuid,
  add column if not exists price_level integer,
  add column if not exists opening_hours jsonb;

-- ─── Conferir ───────────────────────────────────────────────────────────
--   select column_name, data_type
--     from information_schema.columns
--    where table_schema='public' and table_name='spots'
--      and column_name in ('from_user_id','price_level','opening_hours');
--
-- Tem que voltar TRÊS linhas: uuid, integer e jsonb.
