-- 038 — Listas compartilhadas, curtidas e resposta a comentário (redesenho)
--
-- O redesenho de 06/11/2026 (canvas aprovado, ferramentas/design/
-- voce-decisoes-06-11.md) pede quatro coisas que o banco não tem:
--   1. LISTAS: "Uma viagem" ou "Uma lista" (tema), com quem vai junto.
--      Toda lista pode ser compartilhada; quem está nela adiciona spots.
--   2. CURTIR um spot (coração no Hotspots · Amigos, na ficha, na lista).
--   3. CURTIR um comentário.
--   4. RESPONDER um comentário.
--
-- Rode este arquivo inteiro de uma vez no SQL Editor do Supabase. É
-- idempotente: rodar duas vezes não quebra nada. A conferência no fim tem que
-- devolver tudo true.
--
-- Pegadinha da 026: função nova precisa de revoke em PUBLIC E em anon, senão
-- anon continua executando pelo EXECUTE padrão de PUBLIC.

-- ═══ 1. LISTAS ═════════════════════════════════════════════════════════════

create table if not exists public.listas (
  id         uuid primary key default gen_random_uuid(),
  dono_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null check (char_length(trim(nome)) between 1 and 80),
  tipo       text not null default 'tema' check (tipo in ('viagem', 'tema')),
  destino    text check (destino is null or char_length(destino) <= 120),
  quando     text check (quando is null or char_length(quando) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists listas_dono_idx on public.listas (dono_id);

-- Quem está na lista. O dono também entra aqui (papel 'dono'), pra que
-- "quem é da lista" seja UMA consulta só.
create table if not exists public.lista_membros (
  lista_id   uuid not null references public.listas(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  papel      text not null default 'membro' check (papel in ('dono', 'membro')),
  created_at timestamptz not null default now(),
  primary key (lista_id, user_id)
);
create index if not exists lista_membros_user_idx on public.lista_membros (user_id);

-- Os spots da lista. Cada um aponta pro spot de QUEM PÔS ("Nati pôs") e
-- guarda uma cópia do nome/cidade/foto: quem está na lista nem sempre enxerga
-- o spot original (viagem privada, amizade desfeita), e a linha não pode
-- virar um buraco sem nome.
create table if not exists public.lista_spots (
  id         uuid primary key default gen_random_uuid(),
  lista_id   uuid not null references public.listas(id) on delete cascade,
  spot_id    uuid references public.spots(id) on delete set null,
  posto_por  uuid not null references auth.users(id) on delete cascade,
  nome       text not null check (char_length(trim(nome)) between 1 and 200),
  cidade     text check (cidade is null or char_length(cidade) <= 120),
  foto       text check (foto is null or char_length(foto) <= 2000),
  categoria  text check (categoria is null or categoria in ('food', 'hotel', 'experience')),
  created_at timestamptz not null default now()
);
create index if not exists lista_spots_lista_idx on public.lista_spots (lista_id, created_at desc);
create unique index if not exists lista_spots_sem_repetir on public.lista_spots (lista_id, spot_id) where spot_id is not null;

-- "Sou dessa lista?" — security definer pra a política de lista_membros não
-- se consultar a si mesma (recursão infinita no RLS).
create or replace function public.sou_da_lista(l uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lista_membros m where m.lista_id = l and m.user_id = auth.uid())
$$;
revoke all on function public.sou_da_lista(uuid) from public, anon;
grant execute on function public.sou_da_lista(uuid) to authenticated;

create or replace function public.dono_da_lista(l uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.listas x where x.id = l and x.dono_id = auth.uid())
$$;
revoke all on function public.dono_da_lista(uuid) from public, anon;
grant execute on function public.dono_da_lista(uuid) to authenticated;

-- Criar a lista já põe o dono como membro.
create or replace function public.lista_poe_dono()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lista_membros (lista_id, user_id, papel)
  values (new.id, new.dono_id, 'dono') on conflict do nothing;
  return new;
end $$;
drop trigger if exists lista_poe_dono on public.listas;
create trigger lista_poe_dono after insert on public.listas
  for each row execute function public.lista_poe_dono();

alter table public.listas        enable row level security;
alter table public.lista_membros enable row level security;
alter table public.lista_spots   enable row level security;

-- listas: vê quem é da lista; cria em nome próprio; muda/apaga só o dono.
drop policy if exists "ver lista que sou" on public.listas;
create policy "ver lista que sou" on public.listas
  for select using (dono_id = auth.uid() or public.sou_da_lista(id));
drop policy if exists "criar lista minha" on public.listas;
create policy "criar lista minha" on public.listas
  for insert with check (dono_id = auth.uid());
drop policy if exists "mudar lista minha" on public.listas;
create policy "mudar lista minha" on public.listas
  for update using (dono_id = auth.uid()) with check (dono_id = auth.uid());
drop policy if exists "apagar lista minha" on public.listas;
create policy "apagar lista minha" on public.listas
  for delete using (dono_id = auth.uid());

-- lista_membros: quem é da lista vê os outros; o DONO chama só AMIGO ACEITO
-- e sem bloqueio; sai quem quiser (a própria linha) e o dono tira qualquer um.
drop policy if exists "ver membros da minha lista" on public.lista_membros;
create policy "ver membros da minha lista" on public.lista_membros
  for select using (public.sou_da_lista(lista_id));
drop policy if exists "dono chama amigo" on public.lista_membros;
create policy "dono chama amigo" on public.lista_membros
  for insert with check (
    papel = 'membro'
    and public.dono_da_lista(lista_id)
    and exists (select 1 from public.follows f where f.status = 'accepted'
                and ((f.follower_id = auth.uid() and f.following_id = lista_membros.user_id)
                  or (f.following_id = auth.uid() and f.follower_id = lista_membros.user_id)))
    and not public.ha_bloqueio(auth.uid(), lista_membros.user_id)
  );
-- A linha do próprio dono (o gatilho lista_poe_dono põe; esta política é a
-- garantia caso o gatilho rode sem passar por cima do RLS).
drop policy if exists "dono entra na propria lista" on public.lista_membros;
create policy "dono entra na propria lista" on public.lista_membros
  for insert with check (papel = 'dono' and user_id = auth.uid() and public.dono_da_lista(lista_id));
drop policy if exists "sair ou tirar da lista" on public.lista_membros;
create policy "sair ou tirar da lista" on public.lista_membros
  for delete using (
    (user_id = auth.uid() and papel = 'membro') or (public.dono_da_lista(lista_id) and papel = 'membro')
  );

-- lista_spots: quem é da lista vê e põe; o spot posto tem que ser SEU (ou
-- nenhum, só a cópia); tira quem pôs ou o dono.
drop policy if exists "ver spots da minha lista" on public.lista_spots;
create policy "ver spots da minha lista" on public.lista_spots
  for select using (public.sou_da_lista(lista_id));
drop policy if exists "por spot na minha lista" on public.lista_spots;
create policy "por spot na minha lista" on public.lista_spots
  for insert with check (
    posto_por = auth.uid()
    and public.sou_da_lista(lista_id)
    and (spot_id is null or exists (select 1 from public.spots s where s.id = lista_spots.spot_id and s.user_id = auth.uid()))
  );
drop policy if exists "tirar spot da lista" on public.lista_spots;
create policy "tirar spot da lista" on public.lista_spots
  for delete using (posto_por = auth.uid() or public.dono_da_lista(lista_id));

-- ═══ 2. CURTIR SPOT ════════════════════════════════════════════════════════
-- Mesma regra dos comentários (012): curte e vê curtida quem enxerga o spot.
create table if not exists public.spot_curtidas (
  spot_id    uuid not null references public.spots(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);
create index if not exists spot_curtidas_user_idx on public.spot_curtidas (user_id, created_at desc);
alter table public.spot_curtidas enable row level security;

drop policy if exists "ver curtidas de spot visivel" on public.spot_curtidas;
create policy "ver curtidas de spot visivel" on public.spot_curtidas
  for select using (exists (select 1 from public.spots s where s.id = spot_curtidas.spot_id));
drop policy if exists "curtir spot visivel" on public.spot_curtidas;
create policy "curtir spot visivel" on public.spot_curtidas
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.spots s where s.id = spot_curtidas.spot_id)
  );
drop policy if exists "descurtir" on public.spot_curtidas;
create policy "descurtir" on public.spot_curtidas
  for delete using (user_id = auth.uid());

-- ═══ 3. CURTIR COMENTÁRIO ══════════════════════════════════════════════════
create table if not exists public.comentario_curtidas (
  comentario_id uuid not null references public.spot_comments(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (comentario_id, user_id)
);
alter table public.comentario_curtidas enable row level security;

drop policy if exists "ver curtidas de comentario visivel" on public.comentario_curtidas;
create policy "ver curtidas de comentario visivel" on public.comentario_curtidas
  for select using (exists (select 1 from public.spot_comments c where c.id = comentario_curtidas.comentario_id));
drop policy if exists "curtir comentario visivel" on public.comentario_curtidas;
create policy "curtir comentario visivel" on public.comentario_curtidas
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.spot_comments c where c.id = comentario_curtidas.comentario_id)
  );
drop policy if exists "descurtir comentario" on public.comentario_curtidas;
create policy "descurtir comentario" on public.comentario_curtidas
  for delete using (user_id = auth.uid());

-- ═══ 4. RESPONDER COMENTÁRIO ═══════════════════════════════════════════════
-- Um nível só (resposta de resposta vira resposta ao mesmo comentário, no
-- app). Apagar o comentário apaga as respostas.
alter table public.spot_comments
  add column if not exists responde_a uuid references public.spot_comments(id) on delete cascade;
create index if not exists spot_comments_responde_idx on public.spot_comments (responde_a) where responde_a is not null;

-- ═══ CONFERÊNCIA — tudo true ═══════════════════════════════════════════════
select
  (select count(*) = 5 from information_schema.tables where table_schema = 'public'
     and table_name in ('listas','lista_membros','lista_spots','spot_curtidas','comentario_curtidas')) as tabelas_ok,
  (select bool_and(rowsecurity) from pg_tables where schemaname = 'public'
     and tablename in ('listas','lista_membros','lista_spots','spot_curtidas','comentario_curtidas')) as rls_ligado,
  exists (select 1 from information_schema.columns where table_schema = 'public'
     and table_name = 'spot_comments' and column_name = 'responde_a') as resposta_ok,
  not has_function_privilege('anon', 'public.sou_da_lista(uuid)', 'execute') as anon_barrado,
  has_function_privilege('authenticated', 'public.sou_da_lista(uuid)', 'execute') as logado_ok;
