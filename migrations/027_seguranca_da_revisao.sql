-- ═══════════════════════════════════════════════════════════════════════
-- 027 — correções de segurança da revisão de 26/09/2026
-- ═══════════════════════════════════════════════════════════════════════
-- Rodar INTEIRO, de uma vez, no SQL Editor do projeto kzidnilsyrvauzgelsqd.
-- Pode rodar de novo sem estragar nada (tudo é "create or replace", "if not
-- exists" ou "drop ... if exists").
--
-- O código do app e do servidor que depende disto JÁ está no ar e funciona
-- com ou sem esta migração (cai no caminho antigo quando algo não existe).
--
-- O que cada parte corrige, em português:
--   1. CADASTRO QUE FALHAVA: joao@hotmail.com não conseguia criar conta se
--      já existisse joao@gmail.com (o username gerado do e-mail colidia).
--   2. BLOQUEIO DE VERDADE: quem foi bloqueado voltava a ser amigo pelo link
--      de convite antigo. E o bloqueio passa a desfazer a amizade no banco,
--      sem depender do app.
--   3. E-MAIL FORA DO PERFIL: amigos conseguiam ler o e-mail um do outro
--      pelos bastidores do app. O e-mail continua no login (auth.users),
--      que é onde ele é usado; só sai da tabela que os amigos enxergam.
--   4. SPOT NA VIAGEM DOS OUTROS: dava pra gravar um spot dentro da viagem
--      de outra pessoa.
--   5. BUSCA DE PESSOAS: "___" ou "%%%" listavam qualquer um.
--   6. NOTIFICAÇÃO NA CONTA CERTA: o mesmo iPhone com duas contas.
--   7. ENVIO DE FOTO: sem limite de tamanho nem de tipo.
-- ═══════════════════════════════════════════════════════════════════════


-- ─── 1. Cadastro não quebra com username repetido ──────────────────────
-- Antes: username = começo do e-mail, sem tratar colisão com o índice único
-- da 015 → "Database error saving new user". Também tirava as maiúsculas
-- ANTES de minusculizar ("Lucas.P" virava "ucas").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefixo text := split_part(coalesce(new.email, ''), '@', 1);
  base    text := regexp_replace(lower(prefixo), '[^a-z0-9_]', '', 'g');
  cand    text;
  tentativas int := 0;
begin
  if length(base) < 3 then base := 'spot' || base; end if;
  base := left(base, 15);          -- cabe na regra do app: 3 a 20 caracteres
  cand := base;
  loop
    begin
      insert into public.profiles (id, display_name, username)
      values (new.id, nullif(prefixo, ''), cand)
      on conflict (id) do nothing;
      return new;
    exception when unique_violation then
      tentativas := tentativas + 1;
      if tentativas > 20 then
        -- nunca impede o cadastro: sem username, a pessoa escolhe um depois
        insert into public.profiles (id, display_name, username)
        values (new.id, nullif(prefixo, ''), null)
        on conflict (id) do nothing;
        return new;
      end if;
      cand := base || (1000 + floor(random() * 9000))::int::text;
    end;
  end loop;
end;
$$;


-- ─── 2. Bloqueio desfaz a amizade no banco; convite não reabre ─────────
create or replace function public.bloqueio_desfaz_vinculo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
   where (follower_id = new.bloqueador_id and following_id = new.bloqueado_id)
      or (follower_id = new.bloqueado_id  and following_id = new.bloqueador_id);
  return new;
end;
$$;
revoke all on function public.bloqueio_desfaz_vinculo() from public, anon, authenticated;

drop trigger if exists bloqueio_desfaz_vinculo on public.bloqueios;
create trigger bloqueio_desfaz_vinculo
  after insert on public.bloqueios
  for each row execute function public.bloqueio_desfaz_vinculo();

-- amizades que sobraram de bloqueios antigos
delete from public.follows f
 using public.bloqueios b
 where (f.follower_id = b.bloqueador_id and f.following_id = b.bloqueado_id)
    or (f.follower_id = b.bloqueado_id  and f.following_id = b.bloqueador_id);

create or replace function public.redeem_invite(invite_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  dono uuid;
  eu uuid := auth.uid();
begin
  if eu is null then return 'sem_sessao'; end if;

  select user_id into dono from invites
   where code = invite_code and revoked = false;

  if dono is null then return 'invalido'; end if;
  if dono = eu then return 'proprio_convite'; end if;

  -- bloqueio em qualquer direção: responde igual a código ruim, de propósito
  -- (ninguém descobre que foi bloqueado)
  if exists (
    select 1 from bloqueios
     where (bloqueador_id = dono and bloqueado_id = eu)
        or (bloqueador_id = eu and bloqueado_id = dono)
  ) then
    return 'invalido';
  end if;

  if exists (
    select 1 from follows
     where status = 'accepted'
       and ((follower_id = eu and following_id = dono)
         or (following_id = eu and follower_id = dono))
  ) then
    return 'ja_amigos';
  end if;

  update follows set status = 'accepted'
   where (follower_id = eu and following_id = dono)
      or (following_id = eu and follower_id = dono);

  if not found then
    insert into follows (follower_id, following_id, status)
    values (eu, dono, 'accepted');
  end if;

  return 'ok';
end;
$$;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;


-- ─── 3. E-mail sai do perfil; o dono do app vira uma tabela ────────────
-- Quem precisa achar o dono (aviso de denúncia e de cota) passa a ler esta
-- tabela, que só o servidor enxerga. O código já tenta ela primeiro.
create table if not exists public.moderadores (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.moderadores enable row level security;   -- sem política: só o servidor lê
revoke all on public.moderadores from anon, authenticated;
insert into public.moderadores (user_id)
select id from auth.users where lower(email) = 'patriarchalucas@gmail.com'
on conflict do nothing;

alter table public.profiles alter column email drop not null;
update public.profiles set email = null where email is not null;

create or replace function public.profiles_sem_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := null;
  return new;
end;
$$;
drop trigger if exists profiles_sem_email on public.profiles;
create trigger profiles_sem_email
  before insert or update on public.profiles
  for each row execute function public.profiles_sem_email();


-- ─── 4. Spot só entra em viagem do próprio dono ────────────────────────
drop policy if exists "users can insert own spots" on public.spots;
create policy "users can insert own spots" on public.spots
  for insert with check (
    auth.uid() = user_id
    and (trip_id is null or exists (
      select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  );

drop policy if exists "users can update own spots" on public.spots;
create policy "users can update own spots" on public.spots
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (trip_id is null or exists (
      select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  );


-- ─── 5. Busca de pessoas: % e _ contam como letra, não como curinga ────
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
  ), e as (
    select t, replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') as te from q
  )
  select p.id, p.display_name, p.username, p.avatar_url
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
  order by (lower(unaccent(coalesce(p.username, ''))) = e.t) desc,
           length(coalesce(p.username, '')) asc,
           p.display_name asc
  limit 10;
$$;
revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;


-- ─── 6. O aparelho passa pra conta que está logada nele ────────────────
-- A política de UPDATE não deixa uma conta sobrescrever a linha de outra,
-- então o segundo login no mesmo iPhone não conseguia gravar o endereço.
create or replace function public.registrar_aparelho(p_token text, p_plataforma text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  insert into public.push_tokens (user_id, token, plataforma)
  values (auth.uid(), left(p_token, 300), left(coalesce(p_plataforma, ''), 20))
  on conflict (token) do update
     set user_id = excluded.user_id, plataforma = excluded.plataforma;
end;
$$;
revoke all on function public.registrar_aparelho(text, text) from public, anon;
grant execute on function public.registrar_aparelho(text, text) to authenticated;


-- ─── 7. Envio de foto: até 5 MB, só imagem ─────────────────────────────
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'uploads';


-- ═══════════════════════════════════════════════════════════════════════
-- CONFERÊNCIA — só leitura. Os resultados aparecem embaixo.
-- ═══════════════════════════════════════════════════════════════════════
select 'moderador encontrado' as item, (count(*) = 1)::text as ok from public.moderadores
union all
select 'nenhum e-mail sobrou em profiles', (count(*) = 0)::text from public.profiles where email is not null
union all
select 'funções novas fechadas pra anônimo', (count(*) = 0)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('redeem_invite', 'search_profiles', 'registrar_aparelho', 'bloqueio_desfaz_vinculo')
   and has_function_privilege('anon', p.oid, 'execute')
union all
select 'gatilho do bloqueio ligado', (count(*) = 1)::text
  from pg_trigger where tgname = 'bloqueio_desfaz_vinculo'
union all
select 'limite de foto aplicado', (count(*) = 1)::text
  from storage.buckets where id = 'uploads' and file_size_limit = 5242880;
