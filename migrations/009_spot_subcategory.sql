-- ═══════════════════════════════════════════════════════════════════════
-- 009 — Subcategoria de spot (usada hoje só em Experiências)
--
-- Uma coluna de texto livre, sem check constraint de propósito: a lista de
-- subcategorias vive no JS (EXP_SUBCATS) e vai mudar mais vezes que o
-- schema. Um check aqui significaria uma migração nova a cada rótulo novo,
-- exatamente o retrabalho que a gente quer evitar.
--
-- Nada de RLS aqui: as políticas da 008 são por tabela e já cobrem colunas
-- novas automaticamente.
--
-- Seguro rodar de novo.
-- ═══════════════════════════════════════════════════════════════════════

alter table spots add column if not exists subcategory text;

-- Índice só se for filtrar muito por subcategoria no banco. Hoje o filtro é
-- client-side (os spots já vêm todos pra montar as telas), então não vale o
-- custo de escrita. Deixado aqui documentado pra quando/se virar necessário:
-- create index if not exists spots_subcategory_idx on spots (subcategory);
