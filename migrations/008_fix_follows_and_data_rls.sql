-- ═══════════════════════════════════════════════════════════════════════
-- 008 — Fecha o furo de "amizade sem aceitar"
--
-- O QUE ESTAVA ERRADO
-- A política de INSERT em `follows` só conferia QUEM está pedindo:
--     with check (auth.uid() = follower_id)
-- Ela nunca conferiu o `status`. Como a anon key é pública (está no
-- index.html), qualquer pessoa com conta podia chamar a API REST direto e
-- inserir a própria linha JÁ com status='accepted' — sem passar pelo app,
-- sem você clicar em "Aceitar". Daí em diante ela é sua amiga pro banco:
-- vê suas viagens, seus spots e (pela política de profiles) seu e-mail.
--
-- A política de UPDATE tinha o irmão do mesmo problema: `using` sem
-- `with check`. O `using` diz quais linhas você pode tocar; sem
-- `with check` a linha DEPOIS do update pode ser qualquer coisa — quem
-- recebeu um pedido podia reescrever follower_id/following_id e apontar a
-- amizade pra um terceiro.
--
-- Seguro rodar de novo (tudo é drop-if-exists + create).
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. FOLLOWS: pedido nasce sempre pendente ───────────────────────────
-- status='pending' obrigatório no insert, e ninguém segue a si mesmo.
drop policy if exists "insert own follow request" on follows;
create policy "insert own follow request" on follows
  for insert with check (
    auth.uid() = follower_id
    and status = 'pending'
    and follower_id <> following_id
  );

-- ─── 2. FOLLOWS: só quem recebeu aceita, e só pode aceitar ──────────────
-- `using`: a linha tem que ser um pedido pendente endereçado a mim.
-- `with check`: depois do update, os dois lados continuam os mesmos e o
-- único status possível é 'accepted'. Recusar continua sendo DELETE.
drop policy if exists "update received follow request" on follows;
create policy "update received follow request" on follows
  for update
  using (auth.uid() = following_id and status = 'pending')
  with check (
    auth.uid() = following_id
    and status = 'accepted'
    and follower_id <> following_id
  );

-- ─── 3. PROFILES: pedido pendente não dá acesso ao e-mail ───────────────
-- Antes bastava QUALQUER vínculo (inclusive um pedido pendente que você
-- nunca aceitou) pra ler a linha inteira do profile — e-mail incluído.
-- Agora a leitura direta é só de quem é amigo de verdade.
drop policy if exists "profiles viewable by self or connection" on profiles;
drop policy if exists "profiles are viewable by authenticated users" on profiles;

create policy "profiles viewable by self or accepted friend" on profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from follows
      where status = 'accepted'
        and ((follower_id = auth.uid() and following_id = profiles.id)
          or (following_id = auth.uid() and follower_id = profiles.id))
    )
  );

-- A tela de Amigos precisa mostrar o NOME de quem mandou/recebeu um pedido
-- pendente. Isso passa por uma função security definer que devolve só
-- id/nome/username/avatar — nunca e-mail. Mesma ideia do
-- find_profile_by_username.
create or replace function public.pending_request_profiles()
returns table(id uuid, display_name text, username text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.username, p.avatar_url
  from profiles p
  where exists (
    select 1 from follows f
    where f.status = 'pending'
      and ((f.follower_id = auth.uid()  and f.following_id = p.id)
        or (f.following_id = auth.uid() and f.follower_id  = p.id))
  );
$$;

revoke all on function public.pending_request_profiles() from public;
grant execute on function public.pending_request_profiles() to authenticated;

-- ─── 4. TRIPS e SPOTS: a leitura de amigo passa a existir DE FATO ───────
-- A seção 3 da migração 001 estava comentada, então essas políticas nunca
-- foram criadas. Só existem dois estados possíveis hoje e os dois são
-- ruins:
--   a) RLS desligado em trips/spots  -> qualquer pessoa logada lê e ESCREVE
--      a viagem de qualquer outra. Pior que o furo do follows.
--   b) RLS ligado só com política de dono -> o feed de amigos nunca
--      devolve nada (parte do "tudo vazio" que apareceu nos testes).
-- Este bloco resolve os dois: liga o RLS e cria o conjunto COMPLETO de
-- políticas (dono escreve, dono + amigo aceito leem).
alter table trips enable row level security;
alter table spots enable row level security;

drop policy if exists "own or friends can view trips" on trips;
create policy "own or friends can view trips" on trips
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from follows
      where status = 'accepted'
        and ((follower_id = auth.uid() and following_id = trips.user_id)
          or (following_id = auth.uid() and follower_id = trips.user_id))
    )
  );

drop policy if exists "users can insert own trips" on trips;
create policy "users can insert own trips" on trips
  for insert with check (auth.uid() = user_id);

drop policy if exists "users can update own trips" on trips;
create policy "users can update own trips" on trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can delete own trips" on trips;
create policy "users can delete own trips" on trips
  for delete using (auth.uid() = user_id);

drop policy if exists "own or friends can view spots" on spots;
create policy "own or friends can view spots" on spots
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from follows
      where status = 'accepted'
        and ((follower_id = auth.uid() and following_id = spots.user_id)
          or (following_id = auth.uid() and follower_id = spots.user_id))
    )
  );

drop policy if exists "users can insert own spots" on spots;
create policy "users can insert own spots" on spots
  for insert with check (auth.uid() = user_id);

drop policy if exists "users can update own spots" on spots;
create policy "users can update own spots" on spots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can delete own spots" on spots;
create policy "users can delete own spots" on spots
  for delete using (auth.uid() = user_id);

-- ─── 5. CONFERÊNCIA: quem já pode ter entrado pela porta destrancada ────
-- Não dá pra distinguir no dado uma amizade legítima de uma forçada, então
-- nada é apagado automaticamente. Roda isso e olha a lista: se aparecer
-- alguém que você não aceitou, apaga a linha na mão.
--
--   select f.id, f.status, f.created_at,
--          pf.username as quem_pediu, pg.username as pra_quem
--   from follows f
--   left join profiles pf on pf.id = f.follower_id
--   left join profiles pg on pg.id = f.following_id
--   where f.status = 'accepted'
--   order by f.created_at desc;
--
--   -- apagar uma linha específica:
--   -- delete from follows where id = 'cole-o-id-aqui';
