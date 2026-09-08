-- ═══════════════════════════════════════════════════════════════════════
-- 013 — Excluir a própria conta
--
-- Motivo: a Apple exige (diretriz 5.1.1 v) que todo app que permite criar
-- conta permita APAGÁ-LA dentro do app, sem falar com suporte. Sem isso o
-- Spot é reprovado na App Store. Vale também pra LGPD, independente de loja.
--
-- Por que uma função no banco e não um DELETE do cliente:
--
--   1. Apagar a conta de verdade significa apagar de `auth.users`, e o cliente
--      não tem permissão pra isso — só a service_role tem, e essa chave não
--      pode existir no navegador nem em variável de ambiente por causa de um
--      recurso só (ela ignora TODO o RLS do projeto).
--
--   2. Apagar em várias etapas do cliente pode morrer no meio e deixar uma
--      conta meio apagada — spots de um usuário que não existe mais. Aqui é
--      uma transação: ou apaga tudo, ou não apaga nada.
--
-- `security definer` roda com o privilégio do dono da função, mas só pode
-- apagar o que é do CHAMADOR: o uid vem de auth.uid(), nunca de parâmetro.
-- Não existe jeito de pedir pra apagar a conta de outra pessoa.
--
-- Rode este arquivo inteiro de uma vez no SQL Editor do Supabase, no projeto
-- kzidnilsyrvauzgelsqd (o "Spot" — NÃO o do trabalho). É idempotente.

create or replace function delete_my_account()
returns void
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

  -- Ordem: filhos antes dos pais, pra não depender de como as FKs de `trips`
  -- e `spots` foram declaradas. Elas nasceram no painel do Supabase, antes
  -- deste repo ter migrações, e não há registro de terem `on delete cascade`.
  -- Ser explícito custa quatro linhas e remove a suposição.

  -- Comentários que EU escrevi, em qualquer spot (inclusive de amigos).
  delete from spot_comments where user_id = uid;
  -- Comentários de OUTRAS pessoas nos MEUS spots: somem com o spot.
  delete from spot_comments where spot_id in (select id from spots where user_id = uid);

  -- Vínculos de amizade nas duas direções.
  delete from follows where follower_id = uid or following_id = uid;

  -- Links de convite que eu gerei param de funcionar.
  delete from invites where user_id = uid;

  delete from spots    where user_id = uid;
  delete from trips    where user_id = uid;
  delete from profiles where id = uid;

  -- As fotos. Cada upload vive em uploads/<user_id>/..., então a pasta é a
  -- identidade do dono (ver uploadToStorage no index.html e a policy da 003).
  --
  -- Apagar a LINHA de storage.objects já revoga o acesso: a URL pública passa
  -- pela API de storage, que consulta esta tabela — sem a linha, devolve 404.
  -- Isso é o que precisa ser atômico com o resto, e é por isso que está aqui
  -- dentro e não no cliente: o cliente não consegue ser transacional com o
  -- banco, e qualquer ordem que eu escolhesse lá deixava um estado ruim
  -- possível (conta apagada com foto no ar, ou foto apagada com conta viva).
  delete from storage.objects
   where bucket_id = 'uploads'
     and (storage.foldername(name))[1] = uid::text;

  -- Por último a conta. A partir daqui o token da sessão não vale mais nada.
  delete from auth.users where id = uid;
end;
$$;

-- Quem pode chamar: só quem está logado. `anon` não — sem sessão, auth.uid()
-- é nulo e a função já falharia, mas negar o EXECUTE deixa isso explícito em
-- vez de depender do corpo da função.
revoke all on function delete_my_account() from public;
revoke all on function delete_my_account() from anon;
grant execute on function delete_my_account() to authenticated;

-- ── RESÍDUO ASSUMIDO ───────────────────────────────────────────────────────
-- Apagar a linha de storage.objects revoga o acesso, mas não remove os BYTES
-- do armazenamento por trás — ficam órfãos, invisíveis e inalcançáveis por
-- URL. Trocar isso por uma limpeza pelo cliente (que apagaria os bytes de
-- verdade) custaria a atomicidade, porque o cliente não participa desta
-- transação: sempre sobraria uma ordem em que ou a conta morre com a foto no
-- ar, ou a foto morre com a conta viva. Bytes órfãos de um punhado de fotos
-- é o menor dos três problemas, e é o único que não afeta ninguém.

-- ── CONFERÊNCIA ────────────────────────────────────────────────────────────
-- Deve devolver 1 linha: a função, com security definer = true.
select p.proname as funcao,
       p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as dono
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'delete_my_account';
