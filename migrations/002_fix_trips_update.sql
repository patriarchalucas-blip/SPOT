-- "Erro ao salvar" ao editar datas da viagem quase certamente é isso:
-- a tabela trips nunca teve política de UPDATE (só INSERT/DELETE foram
-- testados até hoje). Se RLS estiver ativado nela, qualquer UPDATE
-- (incluindo esse) é bloqueado silenciosamente pelo banco.

-- Roda isso (seguro rodar de novo se precisar):
drop policy if exists "users can update own trips" on trips;

create policy "users can update own trips" on trips
  for update using (auth.uid() = user_id);

-- Se ainda der erro depois disso, o motivo é outro — nesse caso,
-- olha em Supabase Dashboard > Logs > API Logs pra ver a mensagem exata.
