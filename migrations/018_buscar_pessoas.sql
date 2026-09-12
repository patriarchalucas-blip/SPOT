-- 018 — buscar pessoa por nome, não só por username exato
--
-- POR QUE MUDA
--
-- Até aqui achar alguém no Spot exigia o username EXATO. Quem não sabia o
-- username não tinha o que fazer: digitava o nome, não achava nada, e a tela
-- não oferecia saída. Era a porta de entrada do app e ela estava trancada.
--
-- Vale também para a revisão da App Store: o revisor não tem como adivinhar
-- um username, então ele abre a aba Amigos, tenta adicionar alguém e bate
-- numa parede — o tipo de coisa que vira reprovação por funcionalidade.
--
-- O QUE MUDA NA PRIVACIDADE, DE PROPÓSITO
--
-- find_profile_by_username (migração 001) existe para impedir que qualquer
-- pessoa logada varra a tabela de perfis com a chave pública, que é pública
-- por definição. Ela continua existindo e continua sendo usada na checagem de
-- username duplicado.
--
-- Esta função afrouxa aquilo de forma deliberada e limitada: passa a ser
-- possível procurar gente pelo nome, como no Instagram. As travas que
-- impedem virar um diretório aberto:
--
--   1. mínimo de 3 caracteres — sem isso, "a" devolveria meio banco
--   2. no máximo 10 resultados por chamada, sem paginação
--   3. devolve só id, nome, username e foto — NUNCA o email
--   4. só para quem está logado (authenticated), nunca para anon
--   5. quem bloqueou você, ou quem você bloqueou, não aparece
--   6. você mesmo não aparece na sua própria busca
--
-- O casamento é por prefixo no username e por trecho no nome, sem acento e
-- sem caixa: procurar "marina" acha "@marina" e "Marina Alves"; procurar
-- "alves" acha "Marina Alves". Prefixo no username porque username é
-- identificador e a pessoa digita do começo; trecho no nome porque sobrenome
-- é o que se lembra.

create extension if not exists unaccent;

create or replace function public.search_profiles(termo text)
returns table (
  id uuid,
  display_name text,
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  with q as (
    select lower(unaccent(trim(coalesce(termo, '')))) as t
  )
  select p.id, p.display_name, p.username, p.avatar_url
  from public.profiles p, q
  where length(q.t) >= 3
    and p.id <> auth.uid()
    and (
      lower(unaccent(coalesce(p.username, '')))     like q.t || '%'
      or lower(unaccent(coalesce(p.display_name, ''))) like '%' || q.t || '%'
    )
    and not exists (
      select 1 from public.bloqueios b
      where (b.bloqueador_id = auth.uid() and b.bloqueado_id = p.id)
         or (b.bloqueador_id = p.id and b.bloqueado_id = auth.uid())
    )
  -- username exato primeiro: quem digitou o username inteiro quer aquela
  -- pessoa, não a lista de quem tem nome parecido.
  order by (lower(unaccent(coalesce(p.username, ''))) = q.t) desc,
           length(coalesce(p.username, '')) asc,
           p.display_name asc
  limit 10;
$$;

revoke all on function public.search_profiles(text) from public;
revoke all on function public.search_profiles(text) from anon;
grant execute on function public.search_profiles(text) to authenticated;

-- Conferência: deve devolver 1 linha, com anon SEM permissão.
select
  p.proname,
  p.prosecdef                                          as security_definer,
  has_function_privilege('anon',          p.oid, 'execute') as anon_pode,
  has_function_privilege('authenticated', p.oid, 'execute') as logado_pode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'search_profiles';
