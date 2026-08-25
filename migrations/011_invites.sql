-- ═══════════════════════════════════════════════════════════════════════
-- 011 — Convite por link
--
-- Objetivo: mandar um link no WhatsApp, a pessoa abre, cria conta e já entra
-- como sua amiga — sem precisar descobrir seu username.
--
-- POR QUE UMA TABELA, E NÃO O USERNAME NO LINK
-- O caminho óbvio seria /?convite=lucas e criar a amizade a partir daí. Mas
-- aí qualquer pessoa digitaria o username de qualquer um e viraria amiga sem
-- ser aceita — exatamente o furo que a migração 008 fechou. O código aqui é
-- aleatório e só existe porque o dono mandou criar: quem tem o código prova
-- que recebeu o link.
--
-- Seguro rodar de novo.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists invites (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked boolean not null default false
);

create index if not exists invites_user_idx on invites (user_id);

alter table invites enable row level security;

-- Só o dono enxerga e mexe nos próprios convites. Ninguém varre a tabela
-- procurando código de outra pessoa: o resgate NÃO passa por select, passa
-- pela função abaixo.
drop policy if exists "dono ve os proprios convites" on invites;
create policy "dono ve os proprios convites" on invites
  for select using (auth.uid() = user_id);

drop policy if exists "dono cria os proprios convites" on invites;
create policy "dono cria os proprios convites" on invites
  for insert with check (auth.uid() = user_id);

drop policy if exists "dono atualiza os proprios convites" on invites;
create policy "dono atualiza os proprios convites" on invites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dono apaga os proprios convites" on invites;
create policy "dono apaga os proprios convites" on invites
  for delete using (auth.uid() = user_id);

-- ─── Ler o convite antes de entrar na conta ─────────────────────────────
-- A tela de login precisa dizer "Fulano te convidou" ANTES de a pessoa se
-- cadastrar. Devolve só o nome de quem convidou — nunca e-mail, nunca o id.
create or replace function public.invite_owner(invite_code text)
returns table(display_name text, username text)
language sql
security definer
set search_path = public
as $$
  select p.display_name, p.username
  from invites i
  join profiles p on p.id = i.user_id
  where i.code = invite_code and i.revoked = false
  limit 1;
$$;

revoke all on function public.invite_owner(text) from public;
-- anon também: quem abre o link ainda não tem conta
grant execute on function public.invite_owner(text) to anon, authenticated;

-- ─── Resgatar ───────────────────────────────────────────────────────────
-- Cria a amizade JÁ ACEITA. É a única porta que pode fazer isso: a política
-- de INSERT em follows exige status='pending' de propósito, e aqui a exceção
-- é legítima porque quem chama provou ter o código.
--
-- Idempotente: chamar duas vezes não duplica nem rebaixa uma amizade que já
-- existe. Se já houver um pedido pendente entre os dois (em qualquer
-- direção), ele é promovido a aceito, que é o que o convite significa.
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

revoke all on function public.redeem_invite(text) from public;
grant execute on function public.redeem_invite(text) to authenticated;
