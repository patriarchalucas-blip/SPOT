-- ═══════════════════════════════════════════════════════════════════════
-- 016 — Denunciar conteúdo e bloquear usuário
--
-- EXIGÊNCIA DA APPLE, não melhoria opcional. A diretriz 1.2 de revisão pede,
-- para qualquer app com conteúdo escrito por usuário, três coisas:
--   1. um jeito de denunciar conteúdo ofensivo
--   2. um jeito de bloquear quem abusa
--   3. prazo de resposta à denúncia
-- O Spot tem comentário em spot de amigo, então se enquadra. Hoje não existe
-- nada disso, e é a reprovação mais provável da primeira submissão.
--
-- Rode este arquivo INTEIRO no SQL Editor do projeto kzidnilsyrvauzgelsqd
-- ("Spot"). Se ainda não rodou a 015, rode a 015 antes.
-- ═══════════════════════════════════════════════════════════════════════


-- ══ DENÚNCIAS ═══════════════════════════════════════════════════════════
-- Registro, não conversa: quem denuncia cria e consulta a própria denúncia;
-- ninguém edita nem apaga pelo app. A moderação é feita por você no painel
-- do Supabase, que é o honesto pro tamanho de hoje.

create table if not exists denuncias (
  id          uuid primary key default gen_random_uuid(),
  autor_id    uuid not null references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('comentario','spot','perfil')),
  alvo_id     uuid not null,
  dono_id     uuid,
  motivo      text not null check (char_length(motivo) between 1 and 60),
  detalhe     text check (detalhe is null or char_length(detalhe) <= 1000),
  status      text not null default 'aberta'
              check (status in ('aberta','revisada','removida','arquivada')),
  created_at  timestamptz not null default now(),
  -- A mesma pessoa não denuncia a mesma coisa duas vezes.
  unique (autor_id, tipo, alvo_id)
);

create index if not exists denuncias_abertas_idx
  on denuncias (created_at desc) where status = 'aberta';

alter table denuncias enable row level security;

drop policy if exists "denuncia: criar a propria" on denuncias;
create policy "denuncia: criar a propria"
  on denuncias for insert to authenticated
  with check (auth.uid() = autor_id);

drop policy if exists "denuncia: ver as proprias" on denuncias;
create policy "denuncia: ver as proprias"
  on denuncias for select to authenticated
  using (auth.uid() = autor_id);

-- Sem política de UPDATE e sem política de DELETE, de propósito: denúncia
-- enviada não se desfaz pelo app.


-- ══ BLOQUEIOS ═══════════════════════════════════════════════════════════

create table if not exists bloqueios (
  bloqueador_id uuid not null references auth.users(id) on delete cascade,
  bloqueado_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  constraint bloqueio_nao_e_si_mesmo check (bloqueador_id <> bloqueado_id)
);

alter table bloqueios enable row level security;

drop policy if exists "bloqueio: criar o proprio" on bloqueios;
create policy "bloqueio: criar o proprio"
  on bloqueios for insert to authenticated
  with check (auth.uid() = bloqueador_id);

-- Cada um enxerga só a PRÓPRIA lista. Ninguém descobre que foi bloqueado,
-- que é como as redes sérias fazem: saber disso vira retaliação.
drop policy if exists "bloqueio: ver os proprios" on bloqueios;
create policy "bloqueio: ver os proprios"
  on bloqueios for select to authenticated
  using (auth.uid() = bloqueador_id);

drop policy if exists "bloqueio: desfazer o proprio" on bloqueios;
create policy "bloqueio: desfazer o proprio"
  on bloqueios for delete to authenticated
  using (auth.uid() = bloqueador_id);


-- ══ EXCLUIR CONTA PRECISA LIMPAR AS DUAS TABELAS NOVAS ══════════════════
-- Sem isto, apagar a conta deixaria linhas apontando para um usuário que não
-- existe mais. A função é a mesma da 014, com dois deletes a mais; o resto do
-- corpo e o modo de ensaio ficam idênticos.

create or replace function delete_my_account(dry_run boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sem sessao';
  end if;

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

    -- storage.objects continua FORA: o gatilho storage.protect_delete() proíbe
    -- apagar por SQL. As fotos são apagadas pelo cliente antes desta chamada.

    delete from auth.users where id = uid;

    if dry_run then
      raise exception 'SPOT_DRY_RUN';
    end if;
  exception when others then
    if sqlerrm = 'SPOT_DRY_RUN' then
      return 'dry_run_ok';
    end if;
    raise;
  end;

  return 'ok';
end;
$$;

revoke all on function delete_my_account(boolean) from public;
revoke all on function delete_my_account(boolean) from anon;
grant execute on function delete_my_account(boolean) to authenticated;


-- ═══════════════════════════════════════════════════════════════════════
-- CONFERÊNCIA — o que cada consulta deve devolver
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Duas linhas: denuncias e bloqueios, as duas com RLS ligado.
select c.relname as tabela, c.relrowsecurity as rls_ligado
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in ('denuncias','bloqueios')
 order by 1;

-- 2) Cinco linhas. denuncias: INSERT e SELECT (sem UPDATE, sem DELETE).
--    bloqueios: INSERT, SELECT e DELETE.
select tablename, cmd, policyname
  from pg_policies
 where tablename in ('denuncias','bloqueios')
 order by tablename, cmd;

-- 3) Uma linha: a função de exclusão continua de pé e é security definer.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'delete_my_account';

-- 4) Deve vir VAZIO: as tabelas novas não podem ser acessíveis por anônimo.
select table_name, privilege_type
  from information_schema.role_table_grants
 where grantee = 'anon' and table_name in ('denuncias','bloqueios');
