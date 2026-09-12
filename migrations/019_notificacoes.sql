-- 019 — endereços de notificação
--
-- POR QUE EXISTE
--
-- É a segunda metade da defesa contra a regra 4.2 da App Store. A lista do que
-- tira um app da classificação de "site reempacotado" pede duas coisas que o
-- navegador não faz: conteúdo offline (já feito) e notificação. Sem elas o
-- Spot dentro da casca não entrega nada que o Safari não entregue.
--
-- Vale como produto: hoje um pedido de amizade fica parado até a pessoa abrir
-- o app por acaso. Num app de seis amigos isso já atrasa dias.
--
-- O QUE GUARDA
--
-- Só o endereço de entrega que o Expo devolve ("ExponentPushToken[...]") e de
-- quem ele é. Não guarda conteúdo de notificação, não guarda histórico.
--
-- POR QUE A TABELA É PRIVADA DE VERDADE
--
-- Um endereço desses é o suficiente pra mandar notificação pra pessoa. Se a
-- tabela fosse legível por amigos, qualquer conta comprometida viraria um
-- canal de spam direto na tela de bloqueio de outra pessoa. Então: cada um lê
-- e escreve APENAS os seus, e quem monta a lista de destinatários é a função
-- do servidor (/api/notificar), que roda fora do alcance do navegador.

create table if not exists public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  plataforma text,
  created_at timestamptz not null default now(),
  -- o mesmo aparelho reinstalando devolve o mesmo endereço: atualiza em vez
  -- de acumular linha morta que faz a notificação sair duplicada
  unique (token)
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_leitura_propria"  on public.push_tokens;
drop policy if exists "push_tokens_insere_proprio"   on public.push_tokens;
drop policy if exists "push_tokens_atualiza_proprio" on public.push_tokens;
drop policy if exists "push_tokens_apaga_proprio"    on public.push_tokens;

create policy "push_tokens_leitura_propria" on public.push_tokens
  for select using (user_id = auth.uid());

create policy "push_tokens_insere_proprio" on public.push_tokens
  for insert with check (user_id = auth.uid());

-- with check junto com using: sem ele dava pra pegar a própria linha e
-- reapontá-la para outro user_id, que é como se rouba um canal de entrega.
create policy "push_tokens_atualiza_proprio" on public.push_tokens
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "push_tokens_apaga_proprio" on public.push_tokens
  for delete using (user_id = auth.uid());

-- Sair da conta e apagar a conta levam os endereços junto. O on delete cascade
-- cobre a exclusão de conta; esta linha entra no delete_my_account por
-- clareza, já que a promessa da política de privacidade é "apaga tudo".
create or replace function public.esquecer_meus_aparelhos()
returns void
language sql
security invoker
as $$
  delete from public.push_tokens where user_id = auth.uid();
$$;

grant execute on function public.esquecer_meus_aparelhos() to authenticated;

-- ── QUEM PODE AVISAR QUEM ────────────────────────────────────────────────
--
-- A regra de "esse aviso é legítimo?" mora AQUI, em SQL, e não na função do
-- servidor. Motivo: a função do servidor roda com a chave de serviço, que
-- passa por cima de todo RLS. Se a regra morasse lá, um bug meu viraria
-- "qualquer um notifica qualquer um". Aqui, mesmo com a chave de serviço, o
-- banco só devolve endereço quando o vínculo justifica.
--
-- Tipos aceitos, e o que cada um exige. "Amigo marcou lugar novo" foi
-- deliberadamente deixado DE FORA: um amigo em viagem geraria 5 a 10 avisos
-- num dia, que é o caminho mais curto pra pessoa desligar tudo. Se voltar um
-- dia, volta agrupado (um por amigo por dia), não um por lugar.
--   pedido    — mandei pedido de amizade: exige pedido pendente MEU pra ele
--   aceite    — aceitei o pedido dele: exige amizade aceita
--   comentario— comentei no lugar dele: exige amizade aceita
--
-- Bloqueio derruba tudo, nos dois sentidos.
create or replace function public.enderecos_para_avisar(
  de   uuid,
  para uuid,
  tipo text
)
returns table (token text)
language sql
security definer
set search_path = public
stable
as $$
  select t.token
  from public.push_tokens t
  where t.user_id = para
    and de <> para
    and not exists (
      select 1 from public.bloqueios b
      where (b.bloqueador_id = de   and b.bloqueado_id = para)
         or (b.bloqueador_id = para and b.bloqueado_id = de)
    )
    and (
      case tipo
        when 'pedido' then exists (
          select 1 from public.follows f
          where f.follower_id = de and f.following_id = para and f.status = 'pending'
        )
        else exists (
          select 1 from public.follows f
          where f.status = 'accepted'
            and ((f.follower_id = de and f.following_id = para)
              or (f.follower_id = para and f.following_id = de))
        )
      end
    )
    and tipo in ('pedido', 'aceite', 'comentario');
$$;

-- Ninguém do navegador pode chamar isto: devolveria endereço de entrega de
-- outra pessoa, que é exatamente o que não pode sair do servidor.
revoke all on function public.enderecos_para_avisar(uuid, uuid, text) from public;
revoke all on function public.enderecos_para_avisar(uuid, uuid, text) from anon;
revoke all on function public.enderecos_para_avisar(uuid, uuid, text) from authenticated;
grant execute on function public.enderecos_para_avisar(uuid, uuid, text) to service_role;

-- Conferência: rls ligado, 4 políticas, e a função de endereços fechada pro
-- navegador (as três colunas de "pode" têm que vir false, false, true).
select
  (select relrowsecurity from pg_class where oid = 'public.push_tokens'::regclass) as rls_ligado,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'push_tokens') as politicas,
  has_function_privilege('anon',          p.oid, 'execute') as anon_pode,
  has_function_privilege('authenticated', p.oid, 'execute') as logado_pode,
  has_function_privilege('service_role',  p.oid, 'execute') as servidor_pode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'enderecos_para_avisar';
