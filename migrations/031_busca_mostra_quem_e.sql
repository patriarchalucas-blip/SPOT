-- ═══════════════════════════════════════════════════════════════════════
-- 031 — A busca de pessoas mostra QUEM a pessoa é (06/10/2026)
-- ═══════════════════════════════════════════════════════════════════════
-- A Isabella buscou "Lucas Patriarcha", viu três contas iguais (nome e @,
-- sem mais nada) e mandou o pedido pra conta que ele não usa. A busca agora
-- devolve também a cidade onde a pessoa mora e quantos spots ela tem, e põe
-- conta com uso antes de conta abandonada com o mesmo nome.
--
-- Spots contados: só os "Fui" fora de viagem privada — o mesmo que um amigo
-- veria. Continua sem e-mail, com 3 letras mínimo e teto de 10.
-- O tipo de retorno muda, então a função é recriada (drop + create), e as
-- permissões vão de novo, com o revoke de PUBLIC (pegadinha da 026).
-- ═══════════════════════════════════════════════════════════════════════

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
    select p.id, p.display_name, p.username, p.avatar_url, p.home_city,
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

-- ── CONFERÊNCIA ── tem que voltar 1 linha: anon = false, logado = true
select has_function_privilege('anon', 'public.search_profiles(text)', 'execute') as anon,
       has_function_privilege('authenticated', 'public.search_profiles(text)', 'execute') as logado;
