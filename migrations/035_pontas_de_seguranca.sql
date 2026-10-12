-- 035 · pontas de segurança da auditoria de 09/10 (escrita em 11/10/2026).
-- Nenhuma muda o que o app faz; fecham o que dava pra fazer chamando a API
-- pública direto (a anon key está no app, por desenho).

-- ─── 1. ha_bloqueio só responde sobre QUEM PERGUNTA ────────────────────
-- Era security definer, liberada pra qualquer logado e com dois ids livres:
-- dava pra descobrir se Fulano bloqueou você (o redeem_invite esconde isso de
-- propósito) e até se dois estranhos se bloquearam. As políticas que usam a
-- função sempre têm auth.uid() de um dos lados, então nada muda pra elas.
create or replace function public.ha_bloqueio(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case when auth.uid() is not null and auth.uid() in (a, b) then
    exists (select 1 from public.bloqueios
             where (bloqueador_id = a and bloqueado_id = b) or (bloqueador_id = b and bloqueado_id = a))
  else false end
$$;
revoke all on function public.ha_bloqueio(uuid, uuid) from public, anon;
grant execute on function public.ha_bloqueio(uuid, uuid) to authenticated;

-- ─── 2. fui_em e created_at não são escritos pelo app ──────────────────
-- O gatilho só rodava quando o status mudava: um PATCH com fui_em='2099-01-01'
-- prendia o spot no topo do feed dos amigos pra sempre. Agora o banco decide
-- as duas datas em qualquer escrita.
create or replace function public.marcar_fui_em()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.fui_em := case when new.status = 'been' then now() else null end;
    return new;
  end if;
  new.created_at := old.created_at;
  if new.status is distinct from old.status then
    new.fui_em := case when new.status = 'been' then now() else null end;
  else
    new.fui_em := old.fui_em;
  end if;
  return new;
end $$;
drop trigger if exists spots_fui_em on public.spots;
create trigger spots_fui_em before insert or update on public.spots
  for each row execute function public.marcar_fui_em();
revoke all on function public.marcar_fui_em() from public, anon;

-- ─── 3. Perfil com limites no banco, não só no app ─────────────────────
-- Tamanho do nome e formato do @ só eram conferidos na tela de Ajustes.
-- Gatilho em vez de CHECK: um CHECK (mesmo NOT VALID) vale em TODA edição da
-- linha, e um perfil antigo com @ fora do padrão não conseguiria mais nem
-- trocar a foto; e um nome do Google com mais de 60 letras quebraria o
-- cadastro (handle_new_user). Aqui nome e bio são CORTADOS no limite, e o @
-- só é conferido quando muda.
alter table public.profiles drop constraint if exists profiles_nome_tamanho;
alter table public.profiles drop constraint if exists profiles_username_formato;
alter table public.profiles drop constraint if exists profiles_bio_tamanho;
create or replace function public.perfil_nos_limites()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.display_name is not null then new.display_name := left(new.display_name, 60); end if;
  if new.bio is not null then new.bio := left(new.bio, 300); end if;
  if new.username is not null
     and (tg_op = 'INSERT' or new.username is distinct from old.username)
     and new.username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'username fora do formato' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists profiles_nos_limites on public.profiles;
create trigger profiles_nos_limites before insert or update on public.profiles
  for each row execute function public.perfil_nos_limites();
revoke all on function public.perfil_nos_limites() from public, anon;

-- ── CONFERÊNCIA ── tem que voltar 3 linhas "true"
select 'ha_bloqueio só sobre quem pergunta' as item,
       (select prosrc like '%auth.uid()%' from pg_proc where proname = 'ha_bloqueio') as ok
union all
select 'fui_em e created_at pelo banco',
       (select prosrc like '%old.created_at%' from pg_proc where proname = 'marcar_fui_em')
union all
select 'limites no perfil',
       exists (select 1 from pg_trigger where tgname = 'profiles_nos_limites');
