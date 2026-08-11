-- Uma migração só, cobrindo três pedidos juntos pra não te fazer voltar
-- no SQL Editor mais de uma vez: foto de perfil, bio, site do spot
-- (usado no botão "Ver cardápio") e o bucket de Storage que a foto de
-- perfil e a foto própria do spot vão usar.

alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text;
alter table spots add column if not exists website_url text;

-- Bucket público (as fotos precisam ser vistas por quem não é o dono,
-- ex: amigo olhando seu perfil ou seus spots).
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Convenção de path: uploads/{user_id}/{arquivo}. storage.foldername(name)
-- devolve o path partido em array; [1] é a primeira pasta, ou seja o
-- user_id — é isso que garante que cada um só escreve na própria pasta.
drop policy if exists "uploads: leitura publica" on storage.objects;
create policy "uploads: leitura publica" on storage.objects
  for select using (bucket_id = 'uploads');

drop policy if exists "uploads: usuario escreve na propria pasta" on storage.objects;
create policy "uploads: usuario escreve na propria pasta" on storage.objects
  for insert with check (
    bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "uploads: usuario atualiza a propria pasta" on storage.objects;
create policy "uploads: usuario atualiza a propria pasta" on storage.objects
  for update using (
    bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "uploads: usuario deleta da propria pasta" on storage.objects;
create policy "uploads: usuario deleta da propria pasta" on storage.objects
  for delete using (
    bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]
  );
