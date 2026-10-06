-- ═══════════════════════════════════════════════════════════════════════
-- 032 — Cidades visitadas + o que a revisão de 06/10 pediu ao banco
-- ═══════════════════════════════════════════════════════════════════════
-- Um script só, seis partes. Pode rodar de novo sem estragar nada.
--   1. cidades_visitadas: marcar cidade onde já esteve, sem spot
--      (handoff do Claude Design, 06/10).
--   2. spots.fui_em: quando o spot virou "Fui". O feed ordenava pela data de
--      CRIAÇÃO — quem marcava Fui num Quero ir antigo nunca aparecia.
--   3. perfis_da_conversa: nome e foto de quem comentou num spot que você
--      vê. Comentário de amigo do amigo aparecia como "Alguém".
--   4. pending_request_profiles devolve cidade e nº de spots, como a busca
--      (031): três contas "Lucas Patriarcha" iguais no pedido recebido.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Cidades visitadas ──────────────────────────────────────────────
-- Leve de propósito: não é viagem nem spot. `chave` identifica a cidade
-- (o place id do Google quando houver; senão nome|país normalizado), e é ela
-- que impede marcar a mesma cidade duas vezes.
create table if not exists public.cidades_visitadas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  chave      text not null check (length(chave) between 2 and 300),
  nome       text not null check (length(nome) between 1 and 120),
  pais       text not null default '' check (length(pais) <= 80),
  place_id   text check (place_id is null or length(place_id) <= 300),
  created_at timestamptz not null default now(),
  unique (user_id, chave)
);
alter table public.cidades_visitadas enable row level security;
revoke all on public.cidades_visitadas from anon;

-- Dono faz tudo; amigo aceito só lê (o perfil do amigo conta as cidades).
drop policy if exists "dono ve e amigo le cidades" on public.cidades_visitadas;
create policy "dono ve e amigo le cidades" on public.cidades_visitadas
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.follows
      where status = 'accepted'
        and ((follower_id = auth.uid() and following_id = cidades_visitadas.user_id)
          or (following_id = auth.uid() and follower_id = cidades_visitadas.user_id))
    )
  );
drop policy if exists "dono marca cidade" on public.cidades_visitadas;
create policy "dono marca cidade" on public.cidades_visitadas
  for insert with check (auth.uid() = user_id);
drop policy if exists "dono desmarca cidade" on public.cidades_visitadas;
create policy "dono desmarca cidade" on public.cidades_visitadas
  for delete using (auth.uid() = user_id);


-- ─── 2. spots.fui_em ───────────────────────────────────────────────────
alter table public.spots add column if not exists fui_em timestamptz;
-- Os que já são Fui ficam com a data de criação (o melhor palpite).
update public.spots set fui_em = created_at where status = 'been' and fui_em is null;

create or replace function public.marcar_fui_em()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'been' and (tg_op = 'INSERT' or old.status is distinct from 'been') then
    new.fui_em := now();
  elsif new.status is distinct from 'been' then
    new.fui_em := null;
  end if;
  return new;
end $$;
drop trigger if exists spots_fui_em on public.spots;
create trigger spots_fui_em before insert or update of status on public.spots
  for each row execute function public.marcar_fui_em();
revoke all on function public.marcar_fui_em() from public, anon;


-- ─── 3. Quem comentou num spot que você vê ─────────────────────────────
-- Só devolve alguém se VOCÊ pode ver o spot (é seu, ou é de amigo aceito e
-- não é Quero ir de viagem privada — a mesma regra da 028). Nada além de
-- nome, @ e foto.
create or replace function public.perfis_da_conversa(p_spot uuid)
returns table (id uuid, display_name text, username text, avatar_url text)
language sql security definer set search_path = public stable
as $$
  select p.id, p.display_name, p.username, p.avatar_url
  from public.profiles p
  where p.id in (select c.user_id from public.spot_comments c where c.spot_id = p_spot)
    and exists (
      select 1 from public.spots s
      where s.id = p_spot
        and (s.user_id = auth.uid()
          or (exists (select 1 from public.follows f
                      where f.status = 'accepted'
                        and ((f.follower_id = auth.uid() and f.following_id = s.user_id)
                          or (f.following_id = auth.uid() and f.follower_id = s.user_id)))
              and not (s.status = 'want' and s.trip_id is not null and public.viagem_privada(s.trip_id))))
    );
$$;
revoke all on function public.perfis_da_conversa(uuid) from public, anon;
grant execute on function public.perfis_da_conversa(uuid) to authenticated;


-- ─── 4. Pedido pendente com cidade e spots ─────────────────────────────
drop function if exists public.pending_request_profiles();
create function public.pending_request_profiles()
returns table (id uuid, display_name text, username text, avatar_url text, home_city text, spots integer)
language sql security definer set search_path = public stable
as $$
  select p.id, p.display_name, p.username, p.avatar_url, p.home_city,
         (select count(*)::int from public.spots s
           where s.user_id = p.id and s.status = 'been'
             and not public.viagem_privada(s.trip_id))
  from public.profiles p
  where exists (
    select 1 from public.follows f
    where f.status = 'pending'
      and ((f.follower_id = auth.uid()  and f.following_id = p.id)
        or (f.following_id = auth.uid() and f.follower_id  = p.id))
  );
$$;
revoke all on function public.pending_request_profiles() from public, anon;
grant execute on function public.pending_request_profiles() to authenticated;


-- ─── 5. Nome de quem entra pelo Google/Apple, não o começo do e-mail ───
-- A busca de pessoas mostrava "joao.silva83" — o começo do e-mail de todo
-- mundo, pra qualquer logado. Agora o nome vem do cadastro (full_name/name);
-- o e-mail só sobra pra quem não tem nome nenhum (cadastro por e-mail).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  nome    text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
                           nullif(trim(new.raw_user_meta_data->>'name'), ''));
  prefixo text := split_part(coalesce(new.email, ''), '@', 1);
  base    text := regexp_replace(lower(unaccent(coalesce(nome, prefixo))), '[^a-z0-9_]', '', 'g');
  cand    text;
  tentativas int := 0;
begin
  if length(base) < 3 then base := 'spot' || base; end if;
  base := left(base, 15);
  cand := base;
  loop
    begin
      insert into public.profiles (id, display_name, username)
      values (new.id, coalesce(nome, nullif(prefixo, '')), cand)
      on conflict (id) do nothing;
      return new;
    exception when unique_violation then
      tentativas := tentativas + 1;
      if tentativas > 20 then
        insert into public.profiles (id, display_name, username)
        values (new.id, coalesce(nome, nullif(prefixo, '')), null)
        on conflict (id) do nothing;
        return new;
      end if;
      cand := base || (1000 + floor(random() * 9000))::int::text;
    end;
  end loop;
end;
$$;

-- Quem já entrou: troca SÓ o nome que ainda é o começo do e-mail (nunca um
-- nome que a pessoa escolheu). O @ não muda — pode estar em link e convite.
update public.profiles p
   set display_name = coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), ''))
  from auth.users u
 where u.id = p.id
   and p.display_name = split_part(coalesce(u.email, ''), '@', 1)
   and coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), '')) is not null;


-- ─── 6. Quem está bloqueado não manda pedido de amizade ────────────────
-- O app escondia, mas a linha entrava no banco e voltava ao desbloquear.
create or replace function public.ha_bloqueio(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bloqueios
                 where (bloqueador_id = a and bloqueado_id = b) or (bloqueador_id = b and bloqueado_id = a))
$$;
revoke all on function public.ha_bloqueio(uuid, uuid) from public, anon;
grant execute on function public.ha_bloqueio(uuid, uuid) to authenticated;

drop policy if exists "insert own follow request" on public.follows;
create policy "insert own follow request" on public.follows
  for insert with check (
    auth.uid() = follower_id
    and status = 'pending'
    and follower_id <> following_id
    and not public.ha_bloqueio(follower_id, following_id)
  );


-- ── CONFERÊNCIA ── tem que voltar 8 linhas, todas "true"
select 'tabela cidades_visitadas' as item, exists (select 1 from information_schema.tables where table_schema='public' and table_name='cidades_visitadas') as ok
union all
select 'cidades com RLS', (select relrowsecurity from pg_class where oid = 'public.cidades_visitadas'::regclass)
union all
select 'coluna fui_em', exists (select 1 from information_schema.columns where table_name='spots' and column_name='fui_em')
union all
select 'gatilho fui_em', exists (select 1 from pg_trigger where tgname='spots_fui_em')
union all
select 'conversa fechada pra anon', not has_function_privilege('anon','public.perfis_da_conversa(uuid)','execute')
union all
select 'pedidos fechado pra anon', not has_function_privilege('anon','public.pending_request_profiles()','execute')
union all
select 'cadastro usa o nome', exists (select 1 from pg_proc where proname='handle_new_user' and prosrc like '%full_name%')
union all
select 'pedido checa bloqueio', exists (select 1 from pg_policies where tablename='follows' and policyname='insert own follow request' and with_check like '%ha_bloqueio%');
