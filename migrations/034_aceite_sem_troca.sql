-- 034 · aceitar pedido de amizade não pode trocar QUEM pediu (09/10/2026).
--
-- Achado da auditoria de 09/10: a política de UPDATE em follows (008) confere
-- que quem aceita é o destinatário (following_id) e que o status vira
-- 'accepted', mas não prende o follower_id. Um PATCH direto na API
-- (`{"status":"accepted","follower_id":"<qualquer pessoa>"}`) num pedido que a
-- própria pessoa recebeu (de uma segunda conta dela) criava amizade ACEITA com
-- qualquer um — sem o outro aceitar, e passando por cima de bloqueio. Com isso
-- dava pra ler viagens, spots e cidades da vítima. O app nunca faz isso; é
-- abuso da API pública.
--
-- Conserto: um gatilho que recusa mudar follower_id/following_id em qualquer
-- UPDATE, e a política de aceite passa a checar bloqueio também.

create or replace function public.follows_sem_troca()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.follower_id is distinct from old.follower_id
     or new.following_id is distinct from old.following_id then
    raise exception 'não é permitido trocar os lados de um pedido de amizade';
  end if;
  return new;
end $$;
revoke all on function public.follows_sem_troca() from public, anon;

drop trigger if exists follows_sem_troca on public.follows;
create trigger follows_sem_troca
  before update on public.follows
  for each row execute function public.follows_sem_troca();

drop policy if exists "update received follow request" on public.follows;
create policy "update received follow request" on public.follows
  for update
  using (auth.uid() = following_id and status = 'pending')
  with check (
    auth.uid() = following_id
    and status = 'accepted'
    and follower_id <> following_id
    and not public.ha_bloqueio(follower_id, following_id)
  );

-- ── CONFERÊNCIA ── tem que voltar 2 linhas "true"
select 'gatilho que prende os lados' as item, exists (select 1 from pg_trigger where tgname = 'follows_sem_troca') as ok
union all
select 'aceite checa bloqueio', exists (select 1 from pg_policies where tablename = 'follows'
  and policyname = 'update received follow request' and with_check like '%ha_bloqueio%');
