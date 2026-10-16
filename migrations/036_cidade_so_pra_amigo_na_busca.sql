-- 036 · a busca de pessoas não mostra a cidade de quem NÃO é seu amigo
-- (pen test de 16/10/2026).
--
-- A search_profiles (031) devolvia home_city de qualquer um. Variando as 3
-- letras do prefixo dava pra coletar nome + @ + CIDADE de todo mundo — e
-- "onde a pessoa mora" é dado sensível pra sair pra um estranho. A cidade
-- continua aparecendo pra quem JÁ é amigo aceito (o desempate que a 031
-- resolvia segue com @, foto e nº de spots pra quem não é).
--
-- Só muda a coluna home_city: o resto da função é igual à 031.
-- Rodar INTEIRO no SQL Editor do projeto. Pode rodar de novo.

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
           -- cidade só pra amigo aceito; pra estranho vai nulo
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

-- ── CONFERÊNCIA ── anon false, logado true
select has_function_privilege('anon', 'public.search_profiles(text)', 'execute') as anon,
       has_function_privilege('authenticated', 'public.search_profiles(text)', 'execute') as logado;
