-- 022 — A página do convite
--
-- POR QUE ISTO EXISTE
--
-- Quem abre um link de convite hoje cai na tela de login comum: "Spot, entre
-- com o Google". Não diz de quem é o convite, nem o que tem do outro lado.
-- A página nova mostra quem convidou, quantos lugares e três fotos — e só
-- então pede o login.
--
-- O problema: quem abre o link AINDA NÃO TEM CONTA. O RLS da 008 (correto)
-- não deixa anônimo ler `spots` de ninguém. Então os números e as fotos
-- precisam vir por uma função `security definer`, que enxerga o banco e
-- devolve SÓ o que a página mostra.
--
-- O QUE ELA NÃO DEVOLVE, e é de propósito:
--   · nenhum id de spot, de viagem ou de usuário
--   · nenhum nome de lugar, nota, resenha ou endereço
--   · nenhum email
-- Só: nome de exibição, username, avatar, três contagens e até três URLs de
-- foto. É o mesmo que a prévia do link já vai expor pra quem receber a
-- mensagem, e menos do que um amigo aceito vê.
--
-- Quem tem o código já podia virar amigo e ver tudo (redeem_invite). Esta
-- função mostra MENOS que isso, antes de entrar.

create or replace function public.invite_preview(invite_code text)
returns table(
  display_name text,
  username text,
  avatar_url text,
  lugares integer,
  cidades integer,
  fotos text[]
)
language sql
security definer
set search_path = public
as $$
  with dono as (
    select i.user_id as id
      from invites i
     where i.code = invite_code and i.revoked = false
     limit 1
  )
  select
    p.display_name,
    p.username,
    p.avatar_url,
    (select count(*)::integer from spots s
      where s.user_id = d.id and s.status = 'been'),
    (select count(distinct s.city)::integer from spots s
      where s.user_id = d.id and s.status = 'been'
        and s.city is not null and s.city <> ''),
    (select coalesce(array_agg(f.photo_url), '{}')
       from (
         select s.photo_url
           from spots s
          where s.user_id = d.id and s.status = 'been'
            and s.photo_url is not null and s.photo_url <> ''
          order by s.my_rating desc nulls last, s.created_at desc
          limit 3
       ) f)
  from dono d
  join profiles p on p.id = d.id;
$$;

revoke all on function public.invite_preview(text) from public;
-- anon também: quem abre o link ainda não tem conta. É o ponto da função.
grant execute on function public.invite_preview(text) to anon, authenticated;

-- ─── Conferir ───────────────────────────────────────────────────────────
-- Com um código de convite válido, tem que voltar UMA linha:
--
--   select * from public.invite_preview('<codigo>');
--
-- Com código inválido ou revogado, ZERO linhas — e a página cai no texto
-- genérico, sem vazar que o código existe.
