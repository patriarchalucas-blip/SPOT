-- ═══════════════════════════════════════════════════════════════════════
-- 028 — Próximas viagens: "Só eu vejo" de verdade (05/10/2026)
-- ═══════════════════════════════════════════════════════════════════════
-- Rodar INTEIRO, de uma vez, no SQL Editor do projeto kzidnilsyrvauzgelsqd.
-- Pode rodar de novo sem estragar nada.
--
-- O app funciona com ou sem isto: sem as colunas, toda próxima viagem é
-- visível pros amigos (como era até hoje) e o app avisa isso na tela da
-- viagem em vez de prometer o que o banco não garante.
--
-- O que muda, em português:
--   1. trips.privada  — a pessoa escolheu "Só eu vejo".
--   2. trips.proxima  — foi criada como PRÓXIMA viagem (Perfil > Nova). Sem
--      isto, uma viagem planejada ainda sem spot não se distingue de uma
--      viagem feita criada à mão.
--   3. Quem lê o quê. Amigo NÃO vê:
--        · os spots "Quero ir" de uma viagem privada;
--        · a viagem privada enquanto ela não tem nenhum "Fui".
--      Depois do primeiro Fui a viagem aparece, com os Fui; os Quero ir
--      continuam só seus (a escolha que a pessoa fez vale pra eles).
--
-- As regras de trips e spots consultam uma à outra. Regra que lê tabela com
-- regra própria entra em laço ("infinite recursion detected in policy"), então
-- a consulta cruzada vai por duas funções que leem direto, sem regra.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.trips add column if not exists privada boolean not null default false;
alter table public.trips add column if not exists proxima boolean not null default false;

-- A viagem é privada? (lida por quem confere um spot)
create or replace function public.viagem_privada(tid public.trips.id%type)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select t.privada from public.trips t where t.id = tid), false)
$$;

-- A viagem ainda não tem nenhum Fui? (lida por quem confere a viagem)
-- Spot sem status conta como visitado, igual ao app (viagemConta).
create or replace function public.viagem_sem_fui(tid public.trips.id%type)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.spots s where s.trip_id = tid and s.status is distinct from 'want')
$$;

-- As duas só servem às regras abaixo: ninguém chama de fora.
revoke all on function public.viagem_privada(public.trips.id%type) from public, anon;
revoke all on function public.viagem_sem_fui(public.trips.id%type) from public, anon;
grant execute on function public.viagem_privada(public.trips.id%type) to authenticated;
grant execute on function public.viagem_sem_fui(public.trips.id%type) to authenticated;

drop policy if exists "own or friends can view trips" on public.trips;
create policy "own or friends can view trips" on public.trips
  for select using (
    auth.uid() = user_id
    or (
      exists (
        select 1 from public.follows
        where status = 'accepted'
          and ((follower_id = auth.uid() and following_id = trips.user_id)
            or (following_id = auth.uid() and follower_id = trips.user_id))
      )
      and not (trips.privada and public.viagem_sem_fui(trips.id))
    )
  );

drop policy if exists "own or friends can view spots" on public.spots;
create policy "own or friends can view spots" on public.spots
  for select using (
    auth.uid() = user_id
    or (
      exists (
        select 1 from public.follows
        where status = 'accepted'
          and ((follower_id = auth.uid() and following_id = spots.user_id)
            or (following_id = auth.uid() and follower_id = spots.user_id))
      )
      and not (spots.status = 'want' and spots.trip_id is not null and public.viagem_privada(spots.trip_id))
    )
  );

-- ─── Conferência: tem que voltar 4 linhas "true" ───────────────────────
select 'coluna privada' as item, exists (select 1 from information_schema.columns where table_name='trips' and column_name='privada') as ok
union all
select 'coluna proxima', exists (select 1 from information_schema.columns where table_name='trips' and column_name='proxima')
union all
select 'regra de trips com privada', exists (select 1 from pg_policies where tablename='trips' and policyname='own or friends can view trips' and qual like '%privada%')
union all
select 'regra de spots com privada', exists (select 1 from pg_policies where tablename='spots' and policyname='own or friends can view spots' and qual like '%viagem_privada%');
