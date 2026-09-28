-- ═══════════════════════════════════════════════════════════════════════
-- Conteúdo pro AMIGO da conta demo (revisão da Apple, 28/09/2026)
-- ═══════════════════════════════════════════════════════════════════════
-- A Apple reprovou a build 11 por "2.1(a): a conta demo precisa ter conteúdo
-- pra verificar todas as funções, como o feed". O feed da aba Amigos mostra
-- viagens, spots marcados como FUI e comentários dos AMIGOS da conta — e o
-- amigo da demo não tinha nada disso.
--
-- Este script dá ao primeiro amigo aceito da demo@meuspot.app:
--   · uma viagem "Portugal" (Lisboa) com 7 lugares reais marcados como Fui,
--     com nota e comentário, espaçados nos últimos dias (o feed fica cheio);
--   · coordenadas em todos (a aba Amigos do Explorar busca por área);
--   · um comentário num spot da própria demo (aparece no feed dela).
--
-- Rodar INTEIRO no SQL Editor do projeto kzidnilsyrvauzgelsqd. Pode rodar de
-- novo: não duplica (confere pelo nome antes de inserir). Só mexe na conta
-- do amigo da demo — nenhuma conta real é tocada.
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  demo   uuid;
  amigo  uuid;
  viagem uuid;
  alvo   uuid;
  l      record;
begin
  select id into demo from auth.users where lower(email) = 'demo@meuspot.app';
  if demo is null then raise exception 'conta demo@meuspot.app não encontrada'; end if;

  select case when f.follower_id = demo then f.following_id else f.follower_id end into amigo
    from public.follows f
   where f.status = 'accepted' and (f.follower_id = demo or f.following_id = demo)
   order by f.created_at
   limit 1;
  if amigo is null then raise exception 'a conta demo não tem nenhum amigo aceito'; end if;

  -- a viagem (reaproveita se já existir uma "Portugal" dele)
  select id into viagem from public.trips
   where user_id = amigo and name = 'Portugal' and coalesce(dates, '') not in ('__casa__', '__quickvisit__')
   limit 1;
  if viagem is null then
    insert into public.trips (user_id, name, destinations, dates, status, initial_city, created_at)
    values (amigo, 'Portugal', array['Portugal'], '', 'done', 'Lisboa', now() - interval '12 days')
    returning id into viagem;
  end if;

  for l in select * from (values
    ('Cervejaria Ramiro',                 'food',       'Av. Almirante Reis 1, 1150-007 Lisboa, Portugal',      38.72060, -9.13570, 4.5, 'Camarão ao alho e o prego no fim. Vale a fila.',             11),
    ('Pastéis de Belém',                  'food',       'R. de Belém 84-92, 1300-085 Lisboa, Portugal',         38.69750, -9.20320, 5.0, 'O melhor pastel de nata. Come ali mesmo, quente.',           9),
    ('Time Out Market Lisboa',            'food',       'Av. 24 de Julho 49, 1200-479 Lisboa, Portugal',        38.70690, -9.14590, 4.0, 'Bom pra grupo: cada um escolhe uma coisa.',                  8),
    ('A Brasileira',                      'food',       'R. Garrett 120, 1200-273 Lisboa, Portugal',            38.71070, -9.14240, 4.0, 'Café clássico do Chiado. Mais pela história que pelo café.', 6),
    ('Altis Avenida Hotel',               'hotel',      'R. 1º de Dezembro 120, 1200-360 Lisboa, Portugal',     38.71470, -9.14060, 4.5, 'Terraço com vista pro Castelo. Localização perfeita.',       5),
    ('Torre de Belém',                    'experience', 'Av. Brasília, 1400-038 Lisboa, Portugal',              38.69160, -9.21600, 4.5, 'Chega cedo, antes das filas. Fim de tarde é lindo.',         4),
    ('Miradouro da Senhora do Monte',     'experience', 'Largo Monte, 1170-107 Lisboa, Portugal',               38.71930, -9.13250, 5.0, 'A vista mais bonita da cidade no pôr do sol.',              2)
  ) as t(nome, cat, endereco, lat, lng, nota, texto, dias) loop
    if not exists (select 1 from public.spots where user_id = amigo and name = l.nome) then
      insert into public.spots (user_id, trip_id, name, category, city, address, place_type, status,
                                my_rating, my_review, my_note, lat, lng, created_at)
      values (amigo, viagem, l.nome, l.cat, 'Lisboa', l.endereco,
              case l.cat when 'food' then 'Comer & Beber' when 'hotel' then 'Onde Ficar' else 'Experiência' end,
              'been', l.nota, l.texto, '', l.lat, l.lng, now() - (l.dias || ' days')::interval);
    end if;
  end loop;

  -- um comentário do amigo num spot da demo (aparece no feed da demo)
  select id into alvo from public.spots where user_id = demo order by created_at limit 1;
  if alvo is not null and not exists (select 1 from public.spot_comments where spot_id = alvo and user_id = amigo) then
    insert into public.spot_comments (spot_id, user_id, body, created_at)
    values (alvo, amigo, 'Fui por indicação sua e amei! Obrigado pela dica.', now() - interval '1 day');
  end if;

  raise notice 'pronto: amigo %, viagem %', amigo, viagem;
end $$;

-- ── CONFERÊNCIA ── o que o feed da demo vai mostrar
select 'spots Fui do amigo' as item, count(*)::text as total
  from public.spots s
 where s.status = 'been' and s.user_id in (
   select case when f.follower_id = u.id then f.following_id else f.follower_id end
     from public.follows f, auth.users u
    where lower(u.email) = 'demo@meuspot.app' and f.status = 'accepted'
      and (f.follower_id = u.id or f.following_id = u.id))
union all
select 'comentários do amigo', count(*)::text
  from public.spot_comments c
 where c.user_id in (
   select case when f.follower_id = u.id then f.following_id else f.follower_id end
     from public.follows f, auth.users u
    where lower(u.email) = 'demo@meuspot.app' and f.status = 'accepted'
      and (f.follower_id = u.id or f.following_id = u.id));
