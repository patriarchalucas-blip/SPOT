-- 039 — Viagem com data, roteiro por dia e "viagem feita" (V4 das Listas)
--
-- A V4 (13/11/2026) pede três coisas que a 038 não guarda:
--   1. DATA de ida e volta da viagem (a 038 só tem `quando`, texto livre).
--   2. ROTEIRO: em que dia e turno cada spot da lista cai.
--   3. VIAGEM FEITA: no primeiro Fui a viagem sai da aba Listas.
--
-- Rode este arquivo inteiro de uma vez no SQL Editor do Supabase. É
-- idempotente. A conferência no fim tem que devolver tudo true.
--
-- Este projeto (São Paulo) abre EXECUTE pra anon em função nova por padrão:
-- o revoke de PUBLIC e de anon vai escrito, função por função.

-- ═══ 1. DATA E ROTEIRO NA LISTA ════════════════════════════════════════════
alter table public.listas
  add column if not exists data_ini     date,
  add column if not exists data_fim     date,
  add column if not exists feita_em     timestamptz,
  add column if not exists roteiro_dias smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'listas_datas_em_ordem') then
    alter table public.listas add constraint listas_datas_em_ordem
      check (data_fim is null or (data_ini is not null and data_fim >= data_ini));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listas_roteiro_dias_ok') then
    alter table public.listas add constraint listas_roteiro_dias_ok
      check (roteiro_dias is null or roteiro_dias between 1 and 30);
  end if;
end $$;

-- ═══ 2. DIA E TURNO DE CADA SPOT ═══════════════════════════════════════════
-- dia: 1, 2, 3... (null = fora do roteiro, "Se der tempo").
-- turno: 0 manhã · 1 almoço · 2 tarde · 3 jantar.
alter table public.lista_spots
  add column if not exists dia   smallint,
  add column if not exists turno smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lista_spots_roteiro_ok') then
    alter table public.lista_spots add constraint lista_spots_roteiro_ok
      check ((dia is null and turno is null) or (dia between 1 and 30 and turno between 0 and 3));
  end if;
end $$;

-- A 038 não tinha UPDATE em lista_spots. Quem é da lista mexe no roteiro...
drop policy if exists "mexer no roteiro da minha lista" on public.lista_spots;
create policy "mexer no roteiro da minha lista" on public.lista_spots
  for update using (public.sou_da_lista(lista_id)) with check (public.sou_da_lista(lista_id));

-- ...e SÓ no roteiro: nome, foto, quem pôs e de que lista é não mudam.
create or replace function public.lista_spots_so_roteiro()
returns trigger language plpgsql as $$
begin
  new.id := old.id; new.lista_id := old.lista_id; new.spot_id := old.spot_id;
  new.posto_por := old.posto_por; new.nome := old.nome; new.cidade := old.cidade;
  new.foto := old.foto; new.categoria := old.categoria; new.created_at := old.created_at;
  return new;
end $$;
revoke all on function public.lista_spots_so_roteiro() from public, anon;
drop trigger if exists lista_spots_so_roteiro on public.lista_spots;
create trigger lista_spots_so_roteiro before update on public.lista_spots
  for each row execute function public.lista_spots_so_roteiro();

-- ═══ 3. VIAGEM FEITA ═══════════════════════════════════════════════════════
-- Qualquer pessoa da lista marca (o UPDATE de listas é só do dono). Só vale
-- pra viagem, e só a primeira vez: a data não anda depois.
create or replace function public.lista_feita(l uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_da_lista(l) then return false; end if;
  update public.listas set feita_em = now() where id = l and tipo = 'viagem' and feita_em is null;
  return found;
end $$;
revoke all on function public.lista_feita(uuid) from public, anon;
grant execute on function public.lista_feita(uuid) to authenticated;

-- ═══ CONFERÊNCIA — tudo true ═══════════════════════════════════════════════
select
  (select count(*) = 4 from information_schema.columns where table_schema = 'public'
     and table_name = 'listas' and column_name in ('data_ini','data_fim','feita_em','roteiro_dias')) as lista_ok,
  (select count(*) = 2 from information_schema.columns where table_schema = 'public'
     and table_name = 'lista_spots' and column_name in ('dia','turno')) as roteiro_ok,
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lista_spots'
     and policyname = 'mexer no roteiro da minha lista') as politica_ok,
  not has_function_privilege('anon', 'public.lista_feita(uuid)', 'execute') as anon_barrado,
  has_function_privilege('authenticated', 'public.lista_feita(uuid)', 'execute') as logado_ok;
