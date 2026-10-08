-- Diagnóstico dos pedidos de amizade (08/10/2026). SÓ LEITURA: não muda nada.
-- Rodar no Supabase → SQL Editor e mandar o resultado (print ou copiar).
-- Mostra quem entrou nos últimos 10 dias, como entrou, se o celular está
-- registrado pra notificação, e todo pedido de amizade que envolve essas contas.

with novas as (
  select u.id, u.created_at,
         coalesce(u.raw_app_meta_data->>'provider', '?') as entrou_por,
         (u.email like '%privaterelay.appleid.com') as email_escondido
  from auth.users u
  where u.created_at > now() - interval '10 days'
)
select 'CONTA' as tipo,
       p.display_name as nome, '@' || coalesce(p.username, '') as usuario,
       n.entrou_por, n.email_escondido,
       (select count(*) from public.push_tokens t where t.user_id = n.id) as celulares_p_notificacao,
       null::text as de, null::text as para, null::text as status,
       to_char(n.created_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as quando
from novas n left join public.profiles p on p.id = n.id
union all
select 'PEDIDO',
       null, null, null, null, null,
       coalesce(pa.display_name, '?') || ' @' || coalesce(pa.username, ''),
       coalesce(pb.display_name, '?') || ' @' || coalesce(pb.username, ''),
       f.status,
       to_char(f.created_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
from public.follows f
left join public.profiles pa on pa.id = f.follower_id
left join public.profiles pb on pb.id = f.following_id
where f.follower_id in (select id from novas) or f.following_id in (select id from novas)
order by tipo, quando;
