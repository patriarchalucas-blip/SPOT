-- 037 · conta oculta na busca de pessoas + índices das consultas mais comuns
-- (05/11/2026).
--
-- 1. A conta dos Hotspots (`oqms_previa`) aparecia na busca de pessoas: dava
--    pra achar e mandar pedido de amizade pra ela. `profiles.oculta` tira a
--    conta da busca (search_profiles) sem mexer em mais nada — o username
--    continua reservado (find_profile_by_username não filtra) e os spots
--    dela seguem chegando a quem tem o vínculo. Vale pra qualquer conta da
--    casa no futuro, sem lista escrita no código.
-- 2. Índices nas colunas que toda tela filtra (auditoria de 11/10): o banco
--    cresce e, sem eles, cada carga lê a tabela inteira.
--
-- Só a linha `and not p.oculta` muda na search_profiles; o resto é igual à 036.
-- Rodar INTEIRO no SQL Editor do projeto. Pode rodar de novo.

alter table public.profiles add column if not exists oculta boolean not null default false;
update public.profiles set oculta = true where username = 'oqms_previa';

drop function if exists public.search_profiles(text);
create function public.search_profiles(termo text)
returns table (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  home_city text,
  spots integer
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  with q as (
    select lower(unaccent(trim(coalesce(termo, '')))) as t
  ), e as (
    select t, replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') as te from q
  ), achados as (
    select p.id, p.display_name, p.username, p.avatar_url,
           case when exists (
             select 1 from public.follows f
             where f.status = 'accepted'
               and ((f.follower_id = auth.uid() and f.following_id = p.id)
                 or (f.following_id = auth.uid() and f.follower_id = p.id))
           ) then p.home_city else null end as home_city,
           (select count(*)::int from public.spots s
             where s.user_id = p.id and s.status = 'been'
               and not public.viagem_privada(s.trip_id)) as spots,
           (lower(unaccent(coalesce(p.username, ''))) = e.t) as exato
    from public.profiles p, e
    where length(e.t) >= 3
      and p.id <> auth.uid()
      and not p.oculta
      and (
        lower(unaccent(coalesce(p.username, '')))        like e.te || '%'
        or lower(unaccent(coalesce(p.display_name, ''))) like '%' || e.te || '%'
      )
      and not exists (
        select 1 from public.bloqueios b
        where (b.bloqueador_id = auth.uid() and b.bloqueado_id = p.id)
           or (b.bloqueador_id = p.id and b.bloqueado_id = auth.uid())
      )
  )
  select id, display_name, username, avatar_url, home_city, spots
  from achados
  order by exato desc, (spots > 0) desc, spots desc, display_name asc
  limit 10;
$$;
revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;

create index if not exists spots_user_id_idx       on public.spots (user_id);
create index if not exists spots_trip_id_idx       on public.spots (trip_id);
create index if not exists trips_user_id_idx       on public.trips (user_id);
create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists follows_follower_id_idx  on public.follows (follower_id);

-- ── CONFERÊNCIA ── as 4 colunas têm que dar true
select
  (select oculta from public.profiles where username = 'oqms_previa') as conta_oculta,
  not has_function_privilege('anon', 'public.search_profiles(text)', 'execute') as anon_barrado,
  has_function_privilege('authenticated', 'public.search_profiles(text)', 'execute') as logado_ok,
  (select count(*) = 5 from pg_indexes where schemaname = 'public' and indexname in
    ('spots_user_id_idx','spots_trip_id_idx','trips_user_id_idx','follows_following_id_idx','follows_follower_id_idx')) as indices_ok;
