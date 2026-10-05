-- ═══════════════════════════════════════════════════════════════════════
-- 030 — Várias fotos suas por spot (05/10/2026)
-- ═══════════════════════════════════════════════════════════════════════
-- Rodar INTEIRO no SQL Editor do projeto kzidnilsyrvauzgelsqd. Pode rodar
-- de novo. A foto em si vai pro bucket `uploads` (027: 5 MB, só imagem); aqui
-- fica o endereço dela e de qual spot ela é.
--
-- Quem vê: quem vê o spot. A consulta a `spots` dentro da regra passa pela
-- regra de spots, então viagem "Só eu vejo" (028) esconde as fotos também.
-- Quem põe: só o dono do spot. Quem tira: quem pôs. Teto de 10 por spot fica
-- no app.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.spot_fotos (
  id         uuid primary key default gen_random_uuid(),
  spot_id    uuid not null references public.spots(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url        text not null check (char_length(url) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists spot_fotos_spot_idx on public.spot_fotos(spot_id, created_at);

alter table public.spot_fotos enable row level security;

drop policy if exists "ve foto de spot que ve" on public.spot_fotos;
create policy "ve foto de spot que ve" on public.spot_fotos
  for select using (exists (select 1 from public.spots s where s.id = spot_fotos.spot_id));

drop policy if exists "dono poe foto" on public.spot_fotos;
create policy "dono poe foto" on public.spot_fotos
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.spots s where s.id = spot_id and s.user_id = auth.uid()));

drop policy if exists "dono tira foto" on public.spot_fotos;
create policy "dono tira foto" on public.spot_fotos
  for delete using (auth.uid() = user_id);

revoke all on public.spot_fotos from anon;

select 'tabela spot_fotos' as item, exists (select 1 from information_schema.tables where table_name='spot_fotos') as ok
union all
select 'regras (3)', (select count(*) from pg_policies where tablename='spot_fotos') = 3;
