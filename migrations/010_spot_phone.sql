-- ═══════════════════════════════════════════════════════════════════════
-- 010 — Telefone do lugar
--
-- Motivo: o botão "Reservar mesa" apontava pro TheFork, que (a) descartava a
-- busca e jogava o usuário numa lista de restaurantes de Paris, e (b) encerrou
-- as operações no Brasil em 2021. Não havia o que reservar.
--
-- O Google Places já devolve `nationalPhoneNumber` — em todo país, testado no
-- Brasil e na Croácia. Guardando aqui, o botão vira "Ligar" com um link tel:,
-- que é o que se faz de verdade pra reservar mesa.
--
-- Sem RLS novo: as políticas da 008 são por tabela e já cobrem colunas novas.
-- Seguro rodar de novo.
-- ═══════════════════════════════════════════════════════════════════════

alter table spots add column if not exists phone text;
