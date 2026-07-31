-- ═══ 1. PROFILES (necessário pra buscar amigo por email) ═══
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles are viewable by authenticated users" on profiles;
create policy "profiles are viewable by authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists "users can insert own profile" on profiles;
create policy "users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Preenche profiles pra quem já tem conta (rode uma vez)
insert into profiles (id, email, display_name)
select id, email, split_part(email,'@',1) from auth.users
on conflict (id) do nothing;

-- ═══ 1b. USERNAME (pra buscar amigo sem expor email) ═══
alter table profiles add column if not exists username text;
create index if not exists profiles_username_idx on profiles (lower(username));

-- username inicial = prefixo do email (edite depois em Perfil > Seu username)
update profiles set username = lower(regexp_replace(split_part(email,'@',1),'[^a-z0-9_]','','g'))
where username is null;

-- Trigger: cria profile automaticamente em cada novo cadastro
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, username)
  values (
    new.id, new.email, split_part(new.email,'@',1),
    lower(regexp_replace(split_part(new.email,'@',1),'[^a-z0-9_]','','g'))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══ 2. FOLLOWS (pedido de amizade) ═══
create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique(follower_id, following_id)
);

alter table follows enable row level security;

drop policy if exists "select own follow rows" on follows;
create policy "select own follow rows" on follows
  for select using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "insert own follow request" on follows;
create policy "insert own follow request" on follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "update received follow request" on follows;
create policy "update received follow request" on follows
  for update using (auth.uid() = following_id);

drop policy if exists "delete own follow relation" on follows;
create policy "delete own follow relation" on follows
  for delete using (auth.uid() = follower_id or auth.uid() = following_id);

-- ═══ 3. SÓ RODAR ISSO SE trips/spots JÁ TIVEREM RLS ATIVADO ═══
-- (confira no Supabase: Table Editor > trips/spots > ícone de cadeado)
-- Sem isso, se RLS estiver ligado, o feed de amigos vem vazio.
-- create policy "friends can view trips" on trips
--   for select using (
--     auth.uid() = user_id
--     or exists (
--       select 1 from follows
--       where status = 'accepted'
--         and ((follower_id = auth.uid() and following_id = trips.user_id)
--           or (following_id = auth.uid() and follower_id = trips.user_id))
--     )
--   );
--
-- create policy "friends can view spots" on spots
--   for select using (
--     auth.uid() = user_id
--     or exists (
--       select 1 from follows
--       where status = 'accepted'
--         and ((follower_id = auth.uid() and following_id = spots.user_id)
--           or (following_id = auth.uid() and follower_id = spots.user_id))
--     )
--   );

-- ═══ 4. FECHAR O VAZAMENTO DE EMAIL (rode isso agora) ═══
-- Antes: qualquer usuário logado podia listar o profile (com email) de
-- QUALQUER outra pessoa via chamada direta à API. Agora: só dá pra ver
-- o profile de alguém se você tiver algum vínculo (pedido ou amizade)
-- com ela. Busca por username passa a usar uma função que NUNCA
-- devolve email, só id/nome/username — suficiente pra mandar pedido.

drop policy if exists "profiles are viewable by authenticated users" on profiles;

create policy "profiles viewable by self or connection" on profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from follows
      where (follower_id = auth.uid() and following_id = profiles.id)
         or (following_id = auth.uid() and follower_id = profiles.id)
    )
  );

create or replace function public.find_profile_by_username(uname text)
returns table(id uuid, display_name text, username text)
language sql
security definer
set search_path = public
as $$
  select id, display_name, username
  from profiles
  where lower(username) = lower(uname)
  limit 1;
$$;

revoke all on function public.find_profile_by_username(text) from public;
grant execute on function public.find_profile_by_username(text) to authenticated;
