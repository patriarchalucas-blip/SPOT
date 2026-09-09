-- ═══════════════════════════════════════════════════════════════════════
-- 014 — Conserta a 013: storage não se apaga por SQL, e ensaio antes de agir
--
-- A 013 apagava as linhas de storage.objects dentro da transação, pra que
-- dados, fotos e conta morressem juntos ou não morressem. **Não funciona.**
-- O Supabase tem um gatilho que proíbe isso:
--
--   42501: Direct deletion from storage tables is not allowed.
--          Use the Storage API instead.
--   CONTEXT: storage.protect_delete()
--
-- Descoberto num ensaio (um bloco `do` que apagava tudo e dava rollback no
-- fim), sem apagar conta nenhuma e sem criar conta de teste.
--
-- Consequência: as fotos SÓ podem ser apagadas pela API de storage, do
-- cliente. E aí volta o dilema de ordem que a 013 tentava eliminar:
--
--   foto primeiro : erro depois deixa a pessoa sem as fotos e com a conta viva
--   conta primeiro: erro depois deixa as fotos públicas SEM DONO pra pedir
--                   remoção — ninguém consegue mais apagá-las, nunca
--
-- Foto primeiro é o menor dos dois: é recuperável tentando de novo, e não
-- deixa dado de ninguém exposto. Fica esse.
--
-- O que esta migração acrescenta pra encolher esse resíduo quase a zero:
-- **modo ensaio**. `delete_my_account(true)` executa TODOS os deletes de
-- verdade e desfaz no fim, devolvendo 'dry_run_ok'. O cliente roda o ensaio
-- ANTES de apagar as fotos: se qualquer coisa no caminho estiver quebrada
-- (permissão, tabela, gatilho novo), ele descobre sem ter tocado em nada.
--
-- O rollback é feito por um bloco interno com `exception` — em PL/pgSQL isso
-- cria um savepoint implícito, então a exceção desfaz só o que rodou dentro
-- dele e a função ainda retorna normalmente.
--
-- Rode este arquivo inteiro no SQL Editor do projeto kzidnilsyrvauzgelsqd.

-- A 013 devolvia void; mudar o tipo de retorno exige derrubar antes.
drop function if exists delete_my_account();
drop function if exists delete_my_account(boolean);

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
    -- Ordem: filhos antes dos pais, sem depender de como as FKs de `trips` e
    -- `spots` foram declaradas (nasceram no painel do Supabase, antes deste
    -- repo ter migrações, e não há registro de `on delete cascade`).

    -- Comentários que EU escrevi, em qualquer spot (inclusive de amigos).
    delete from spot_comments where user_id = uid;
    -- Comentários de OUTRAS pessoas nos MEUS spots.
    delete from spot_comments where spot_id in (select id from spots where user_id = uid);

    delete from follows where follower_id = uid or following_id = uid;
    delete from invites where user_id = uid;
    delete from spots    where user_id = uid;
    delete from trips    where user_id = uid;
    delete from profiles where id = uid;

    -- storage.objects fica FORA: o gatilho storage.protect_delete() proíbe.
    -- As fotos são apagadas pelo cliente, pela API de storage, antes desta
    -- chamada. Ver excluirConta() no index.html.

    delete from auth.users where id = uid;

    if dry_run then
      raise exception 'SPOT_DRY_RUN';
    end if;
  exception when others then
    -- Chegar aqui com esta mensagem significa que TODOS os deletes acima
    -- passaram. O bloco é desfeito e a função responde que o caminho está
    -- livre. Qualquer outro erro é erro de verdade e sobe.
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

-- ── CONFERÊNCIA ────────────────────────────────────────────────────────────
-- 1 linha: a função, security definer, dono postgres.
select p.proname as funcao,
       pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as dono
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'delete_my_account';
