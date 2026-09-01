-- 012 — Comentários em spot
--
-- Comentar no spot de um amigo é a primeira coisa em muito tempo que precisa
-- de tabela nova: é conteúdo de UMA pessoa dentro do registro de OUTRA, e não
-- há onde guardar isso hoje.
--
-- Rode este arquivo inteiro de uma vez no SQL Editor do Supabase. Ele é
-- idempotente — rodar duas vezes não quebra nada.

create table if not exists spot_comments (
  id         uuid primary key default gen_random_uuid(),
  spot_id    uuid not null references spots(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Abrir um spot lê os comentários dele: sem este índice, cada abertura
-- varreria a tabela inteira.
create index if not exists spot_comments_spot_idx on spot_comments(spot_id, created_at);
-- O feed pergunta "o que foi comentado recentemente por estas pessoas".
create index if not exists spot_comments_user_idx on spot_comments(user_id, created_at desc);

alter table spot_comments enable row level security;

-- ── QUEM PODE LER ──────────────────────────────────────────────────────────
-- Exatamente quem já podia ver o spot. Nada mais: reaproveitar a regra do
-- spot em vez de escrever uma nova evita que as duas discordem depois — se um
-- dia a visibilidade de spot mudar, esta acompanha sozinha.
drop policy if exists "ver comentarios de spot visivel" on spot_comments;
create policy "ver comentarios de spot visivel" on spot_comments
  for select using (
    exists (select 1 from spots s where s.id = spot_comments.spot_id)
  );

-- ── QUEM PODE ESCREVER ─────────────────────────────────────────────────────
-- Só em nome próprio (user_id = quem está logado) e só em spot que a pessoa
-- enxerga. O `with check` é o que impede alguém de gravar um comentário
-- assinado por outra pessoa — a política de select sozinha não protege
-- escrita, foi o buraco que a migração 008 fechou em `follows`.
drop policy if exists "comentar em spot visivel" on spot_comments;
create policy "comentar em spot visivel" on spot_comments
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from spots s where s.id = spot_comments.spot_id)
  );

-- ── APAGAR ─────────────────────────────────────────────────────────────────
-- O autor apaga o que escreveu. O DONO DO SPOT também: é o registro dele, e
-- quem recebe comentário indesejado precisa poder tirar sem depender de quem
-- escreveu.
drop policy if exists "apagar comentario proprio ou do meu spot" on spot_comments;
create policy "apagar comentario proprio ou do meu spot" on spot_comments
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from spots s where s.id = spot_comments.spot_id and s.user_id = auth.uid())
  );

-- Editar comentário fica DE FORA de propósito: comentário editado depois de
-- respondido reescreve a conversa. Apagar e escrever de novo resolve, e deixa
-- claro pra quem leu que mudou.

-- ── CONFERÊNCIA ────────────────────────────────────────────────────────────
-- Deve devolver 4 linhas: a tabela e as três políticas.
select 'tabela' as objeto, table_name as nome
  from information_schema.tables
 where table_schema = 'public' and table_name = 'spot_comments'
union all
select 'policy', policyname from pg_policies
 where schemaname = 'public' and tablename = 'spot_comments'
 order by 1, 2;
