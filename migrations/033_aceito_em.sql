-- 033 · follows.accepted_at — QUANDO a amizade foi aceita (08/10/2026).
--
-- A Atividade mostra "Você e Fulano agora são amigos" pela data da linha em
-- follows, que é a do PEDIDO. Quem aceita dias depois aparecia lá embaixo,
-- como coisa antiga, e o ponto de novidade nunca acendia pra quem pediu.
--
-- O gatilho grava a hora do aceite sozinho, em qualquer caminho: aceitar o
-- pedido (UPDATE), convite por link (redeem_invite faz UPDATE ou INSERT já
-- aceito). Amizades antigas ficam com a data do pedido, que é o que já se via.

alter table public.follows add column if not exists accepted_at timestamptz;

update public.follows set accepted_at = created_at
 where status = 'accepted' and accepted_at is null;

create or replace function public.marcar_aceito_em()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    new.accepted_at := now();
  elsif new.status <> 'accepted' then
    new.accepted_at := null;
  end if;
  return new;
end $$;
revoke all on function public.marcar_aceito_em() from public, anon;

drop trigger if exists follows_aceito_em on public.follows;
create trigger follows_aceito_em
  before insert or update of status on public.follows
  for each row execute function public.marcar_aceito_em();

-- ── CONFERÊNCIA ── tem que voltar 2 linhas "true"
select 'coluna accepted_at' as item, exists (select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'follows' and column_name = 'accepted_at') as ok
union all
select 'gatilho', exists (select 1 from pg_trigger where tgname = 'follows_aceito_em');
