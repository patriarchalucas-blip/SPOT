-- 025 — "amigo da Isabella" na busca de pessoas
--
-- POR QUE PRECISA DE FUNÇÃO
--
-- O handoff de Amigos pede que a busca mostre "@brunosalles · amigo da
-- Isabella". Pra saber isso, o app teria que ler a lista de amigos de um
-- DESCONHECIDO — e o RLS da 008 bloqueia, de propósito: `follows` só devolve
-- vínculo de quem tem vínculo com você. Está certo em bloquear.
--
-- Esta função é a exceção estreita: `security definer`, ela enxerga a tabela,
-- mas devolve SÓ o nome de UM amigo em comum. Nunca a lista de amigos do
-- outro, nunca contagem, nunca email, nunca id.
--
-- O QUE ISTO REVELA, e é escolha consciente: dizer "Bruno é amigo da
-- Isabella" conta pra você uma amizade da Isabella que você não conhecia.
-- É o mesmo que qualquer rede social faz com "amigos em comum", e o limite
-- é: só aparece amigo SEU, e só pra quem você mesmo procurou pelo username.
-- Quem não tem nenhum amigo em comum não recebe nada — nem "zero".
--
-- Um nome só, não a lista: a tela mostra um, e devolver cinco seria entregar
-- mais do que a tela usa. Menos dado atravessando, menos a explicar depois.

create or replace function public.amigo_em_comum(ids uuid[])
returns table(pessoa uuid, amigo text)
language sql
security definer
set search_path = public
as $$
  with eu as (select auth.uid() as id),
  -- Meus amigos ACEITOS, nos dois sentidos do vínculo.
  meus as (
    select case when f.follower_id = e.id then f.following_id else f.follower_id end as id
      from follows f, eu e
     where f.status = 'accepted'
       and (f.follower_id = e.id or f.following_id = e.id)
  ),
  -- Os candidatos que a busca trouxe. Teto de 20: a tela mostra poucos, e
  -- sem limite alguém mandaria mil ids por chamada.
  alvos as (
    select distinct a.id
      from unnest(ids) as a(id), eu e
     where a.id <> e.id
     limit 20
  ),
  -- Amigos aceitos de cada candidato.
  deles as (
    select t.id as pessoa,
           case when f.follower_id = t.id then f.following_id else f.follower_id end as amigo_id
      from alvos t
      join follows f
        on f.status = 'accepted'
       and (f.follower_id = t.id or f.following_id = t.id)
  )
  select distinct on (d.pessoa)
         d.pessoa,
         coalesce(p.display_name, '@' || p.username) as amigo
    from deles d
    join meus m on m.id = d.amigo_id          -- só quem TAMBÉM é meu amigo
    join profiles p on p.id = d.amigo_id
   where coalesce(p.display_name, p.username) is not null
   order by d.pessoa, p.display_name nulls last;
$$;

revoke all on function public.amigo_em_comum(uuid[]) from public;
-- Só quem está logado: é sobre a SUA rede, e sem sessão auth.uid() é nulo,
-- o que já devolveria vazio — o grant restrito é a segunda tranca.
grant execute on function public.amigo_em_comum(uuid[]) to authenticated;

-- ─── Conferir ───────────────────────────────────────────────────────────
-- Logado, com o id de alguém que tem amigo em comum com você:
--
--   select * from public.amigo_em_comum(array['<uuid>']::uuid[]);
--
-- Uma linha com o nome do amigo em comum. Sem amigo em comum, ZERO linhas.
