-- ═══════════════════════════════════════════════════════════════════════
-- 015 — Fecha o que hoje está aberto para qualquer pessoa, sem conta
--
-- Rode este arquivo INTEIRO no SQL Editor do projeto kzidnilsyrvauzgelsqd
-- ("Spot"). NÃO é o projeto do trabalho.
--
-- Os dois primeiros blocos foram confirmados com requisição real contra o
-- banco em 11/09/2026, usando só a chave pública que está no index.html —
-- sem conta, sem login, sem convite.
-- ═══════════════════════════════════════════════════════════════════════


-- ══ 1. O armazenamento de fotos era LISTÁVEL por anônimo ═══════════════
--
-- A política de leitura criada na migração 003 não tinha dono:
--     using (bucket_id = 'uploads')
--
-- No Supabase, a política de SELECT em storage.objects governa também a
-- LISTAGEM. Resultado medido: um POST em /storage/v1/object/list/uploads
-- com a chave pública devolvia a lista de TODOS os user_id do app, e
-- descendo por prefixo, o inventário completo de fotos de cada pessoa.
-- Cada arquivo é baixável pela URL pública.
--
-- Isso entrega: quantos usuários existem, o identificador de cada um, e
-- todas as fotos de perfil e de lugares de todo mundo.
--
-- POR QUE NÃO QUEBRA AS FOTOS DO APP: o bucket é público (migração 003), e
-- em bucket público a URL /storage/v1/object/public/... NÃO passa por RLS.
-- A política abaixo fecha a listagem sem tocar na exibição.
--
-- SE MESMO ASSIM ALGUMA FOTO SUMIR, desfaça com estas duas linhas:
--     drop policy "uploads: leitura do dono" on storage.objects;
--     create policy "uploads: leitura publica" on storage.objects
--       for select using (bucket_id = 'uploads');

drop policy if exists "uploads: leitura publica" on storage.objects;

create policy "uploads: leitura do dono"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ══ 2. Funções chamáveis por ANÔNIMO ═══════════════════════════════════
--
-- A migração 001 fez `revoke all ... from public`, o que NÃO basta no
-- Supabase: o projeto tem um default privilege que concede EXECUTE a `anon`
-- explicitamente em toda função nova, e revogar de `public` não remove uma
-- concessão explícita a `anon`.
--
-- Medido: find_profile_by_username respondeu 200 com id, nome e username
-- para quem só tinha a chave pública. Como o cadastro por e-mail gera
-- username a partir do endereço, isso também entrega a parte local do
-- e-mail de quem nunca editou o perfil.
--
-- A prova de que é isto: delete_my_account (migração 014) revoga de `anon`
-- explicitamente e é a única que de fato barra anônimo.
--
-- invite_owner FICA acessível a anônimo DE PROPÓSITO: quem abre um link de
-- convite ainda não tem conta, e ela só devolve nome e username.
--
-- O laço evita depender da assinatura exata de cada função.

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'find_profile_by_username',
         'pending_request_profiles',
         'redeem_invite'
       )
  loop
    execute format('revoke all on function %s from anon', f.sig);
    raise notice 'revogado de anon: %', f.sig;
  end loop;
end $$;


-- ══ 3. Perfil podia ser alterado para valores de outra pessoa ══════════
--
-- A política de UPDATE da migração 001 tem `using` e não tem `with check`.
-- `using` decide QUAIS LINHAS você pode alterar; `with check` decide COMO
-- elas podem ficar depois. Sem o segundo, a validação do estado final não
-- acontece.
--
-- É exatamente o defeito que a migração 008 encontrou e consertou na tabela
-- `follows`, e que ficou de pé na tabela ao lado.

drop policy if exists "users can update own profile" on profiles;

create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ══ 4. Username não era único ══════════════════════════════════════════
--
-- A migração 001 criou um índice NÃO único em lower(username). A única
-- checagem de duplicidade vivia no navegador, e o navegador é do atacante.
-- Duas contas podiam ter o mesmo username, e find_profile_by_username usa
-- `limit 1` sem ordenação — ou seja, qual das duas aparece é sorteio.
--
-- Risco concreto quando o app for divulgado por influenciador: alguém
-- registra o username do influenciador antes dele e recebe os pedidos de
-- amizade do público.
--
-- O bloco não deixa o script inteiro falhar se já existir duplicata: ele
-- avisa e seguen. Se avisar, resolva as duplicatas e rode só esta parte de
-- novo. A consulta de conferência no fim mostra quais são.

do $$
begin
  create unique index profiles_username_unique
    on profiles (lower(username))
    where username is not null;
  raise notice 'indice unico de username criado';
exception
  when duplicate_table then
    raise notice 'indice unico de username ja existia';
  when unique_violation then
    raise notice 'HA USERNAME DUPLICADO — indice NAO criado. Veja a conferencia 4.';
end $$;


-- ═══════════════════════════════════════════════════════════════════════
-- CONFERÊNCIA — o que cada consulta deve devolver
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Uma linha, com a política nova de leitura do armazenamento.
select policyname, cmd
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname = 'uploads: leitura do dono';

-- 2) Deve vir VAZIO. Qualquer linha aqui é função ainda aberta a anônimo
--    (invite_owner não entra na lista, é exceção proposital).
select p.proname, p.oid::regprocedure as assinatura
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('find_profile_by_username','pending_request_profiles','redeem_invite')
   and has_function_privilege('anon', p.oid, 'EXECUTE');

-- 3) Uma linha, e a coluna with_check NÃO pode estar vazia.
select policyname, qual as usando, with_check
  from pg_policies
 where tablename = 'profiles' and cmd = 'UPDATE';

-- 4) Deve vir VAZIO. Se vier algo, são os usernames repetidos que impedem
--    o índice único — resolva e rode o bloco 4 de novo.
select lower(username) as username, count(*) as contas
  from profiles
 where username is not null
 group by 1 having count(*) > 1;

-- 5) Uma linha: o índice único existe.
select indexname from pg_indexes
 where tablename = 'profiles' and indexname = 'profiles_username_unique';
