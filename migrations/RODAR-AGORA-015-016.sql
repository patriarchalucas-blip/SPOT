-- ═══════════════════════════════════════════════════════════════════════
-- RODAR AGORA — junta as migrações 015 e 016 num script só.
-- Projeto: kzidnilsyrvauzgelsqd ("Spot"). NÃO é o projeto do trabalho.
-- Cole tudo no SQL Editor e clique em Run. Uma vez só.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Fotos de todo mundo estavam listáveis por qualquer um, sem conta ──
-- A política antiga não tinha dono. Como o bucket é público, a exibição das
-- fotos no app NÃO passa por aqui — só a listagem. Por isso isto não quebra
-- nada visível.
-- SE ALGUMA FOTO SUMIR DO APP, desfaça com:
--   drop policy "uploads: leitura do dono" on storage.objects;
--   create policy "uploads: leitura publica" on storage.objects
--     for select using (bucket_id = 'uploads');
drop policy if exists "uploads: leitura publica" on storage.objects;
create policy "uploads: leitura do dono"
  on storage.objects for select
  using (bucket_id = 'uploads'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 2. Funções que respondiam a quem não tem conta ──────────────────────
-- `revoke from public` não basta no Supabase: há uma concessão explícita a
-- `anon`. invite_owner fica de fora de propósito (quem abre um link de
-- convite ainda não tem conta).
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('find_profile_by_username','pending_request_profiles','redeem_invite')
  loop
    execute format('revoke all on function %s from anon', f.sig);
  end loop;
end $$;

-- ── 3. Perfil podia ser alterado para valores de outra pessoa ───────────
drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 4. Username não era único (alguém podia tomar o seu) ───────────────
do $$
begin
  create unique index profiles_username_unique
    on profiles (lower(username)) where username is not null;
exception
  when duplicate_table then raise notice 'indice ja existia';
  when unique_violation then raise notice 'HA USERNAME DUPLICADO — veja a conferencia 4';
end $$;

-- ── 5. Denúncias (exigência da Apple) ──────────────────────────────────
create table if not exists denuncias (
  id         uuid primary key default gen_random_uuid(),
  autor_id   uuid not null references auth.users(id) on delete cascade,
  tipo       text not null check (tipo in ('comentario','spot','perfil')),
  alvo_id    uuid not null,
  dono_id    uuid,
  motivo     text not null check (char_length(motivo) between 1 and 60),
  detalhe    text check (detalhe is null or char_length(detalhe) <= 1000),
  status     text not null default 'aberta'
             check (status in ('aberta','revisada','removida','arquivada')),
  created_at timestamptz not null default now(),
  unique (autor_id, tipo, alvo_id)
);
create index if not exists denuncias_abertas_idx
  on denuncias (created_at desc) where status = 'aberta';
alter table denuncias enable row level security;
drop policy if exists "denuncia: criar a propria" on denuncias;
create policy "denuncia: criar a propria" on denuncias
  for insert to authenticated with check (auth.uid() = autor_id);
drop policy if exists "denuncia: ver as proprias" on denuncias;
create policy "denuncia: ver as proprias" on denuncias
  for select to authenticated using (auth.uid() = autor_id);
-- Sem UPDATE e sem DELETE de propósito: denúncia enviada não se desfaz.

-- ── 6. Bloqueios (exigência da Apple) ──────────────────────────────────
create table if not exists bloqueios (
  bloqueador_id uuid not null references auth.users(id) on delete cascade,
  bloqueado_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  constraint bloqueio_nao_e_si_mesmo check (bloqueador_id <> bloqueado_id)
);
alter table bloqueios enable row level security;
drop policy if exists "bloqueio: criar o proprio" on bloqueios;
create policy "bloqueio: criar o proprio" on bloqueios
  for insert to authenticated with check (auth.uid() = bloqueador_id);
drop policy if exists "bloqueio: ver os proprios" on bloqueios;
create policy "bloqueio: ver os proprios" on bloqueios
  for select to authenticated using (auth.uid() = bloqueador_id);
drop policy if exists "bloqueio: desfazer o proprio" on bloqueios;
create policy "bloqueio: desfazer o proprio" on bloqueios
  for delete to authenticated using (auth.uid() = bloqueador_id);

-- ── 7. Excluir conta precisa limpar as duas tabelas novas ──────────────
create or replace function delete_my_account(dry_run boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sem sessao'; end if;
  begin
    delete from denuncias where autor_id = uid;
    delete from denuncias where dono_id = uid;
    delete from bloqueios where bloqueador_id = uid or bloqueado_id = uid;
    delete from spot_comments where user_id = uid;
    delete from spot_comments where spot_id in (select id from spots where user_id = uid);
    delete from follows  where follower_id = uid or following_id = uid;
    delete from invites  where user_id = uid;
    delete from spots    where user_id = uid;
    delete from trips    where user_id = uid;
    delete from profiles where id = uid;
    delete from auth.users where id = uid;
    if dry_run then raise exception 'SPOT_DRY_RUN'; end if;
  exception when others then
    if sqlerrm = 'SPOT_DRY_RUN' then return 'dry_run_ok'; end if;
    raise;
  end;
  return 'ok';
end;$$;
revoke all on function delete_my_account(boolean) from public;
revoke all on function delete_my_account(boolean) from anon;
grant execute on function delete_my_account(boolean) to authenticated;


-- ═══════════════════════════════════════════════════════════════════════
-- CONFERÊNCIA — role tudo e olhe os últimos resultados
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Uma linha: a política nova do armazenamento.
select policyname from pg_policies
 where schemaname='storage' and tablename='objects'
   and policyname='uploads: leitura do dono';

-- 2) VAZIO. Qualquer linha = função ainda aberta a quem não tem conta.
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'
   and p.proname in ('find_profile_by_username','pending_request_profiles','redeem_invite')
   and has_function_privilege('anon', p.oid, 'EXECUTE');

-- 3) Uma linha, e with_check NÃO pode estar vazio.
select policyname, with_check from pg_policies
 where tablename='profiles' and cmd='UPDATE';

-- 4) VAZIO. Se vier algo, são usernames repetidos.
select lower(username), count(*) from profiles
 where username is not null group by 1 having count(*)>1;

-- 5) Duas linhas, as duas com rls_ligado = true.
select c.relname as tabela, c.relrowsecurity as rls_ligado
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('denuncias','bloqueios') order by 1;
