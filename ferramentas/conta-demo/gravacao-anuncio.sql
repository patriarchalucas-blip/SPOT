-- ═══════════════════════════════════════════════════════════════════════
-- Conta demo pronta pra gravar o anúncio (06/10/2026)
-- ═══════════════════════════════════════════════════════════════════════
-- Só mexe nas DUAS CONTAS DE TESTE (demo@ e demo2@meuspot.app), nunca em conta
-- de gente real. Roda depois de povoar-amigo-da-demo.sql (que cria a amizade e
-- a viagem de Lisboa da "Ana Lima"). Pode rodar de novo.
--
-- O que faz:
--   · garante a Ana Lima amiga ACEITA da demo, sem bloqueio;
--   · reescreve as dicas da Ana em Lisboa: específicas (o que pedir, quando ir);
--   · o lugar principal do vídeo é a Cervejaria Ramiro;
--   · as datas ficam recentes (o feed mostra "há 1 dia", "há 2 dias"...);
--   · a viagem dela fica visível pros amigos (não "Só eu vejo").
-- As fotos dos lugares o app busca sozinho no Google.
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  demo   uuid;
  amiga  uuid;
  viagem uuid;
  l      record;
begin
  select id into demo  from auth.users where lower(email) = 'demo@meuspot.app';
  select id into amiga from auth.users where lower(email) = 'demo2@meuspot.app';
  if demo is null or amiga is null then raise exception 'falta a conta demo@ ou demo2@meuspot.app'; end if;

  update public.profiles set display_name = 'Ana Lima' where id = amiga;

  delete from public.bloqueios
   where (bloqueador_id = demo and bloqueado_id = amiga) or (bloqueador_id = amiga and bloqueado_id = demo);
  update public.follows set status = 'accepted'
   where (follower_id = amiga and following_id = demo) or (follower_id = demo and following_id = amiga);
  if not found then
    insert into public.follows (follower_id, following_id, status) values (amiga, demo, 'accepted');
  end if;

  select id into viagem from public.trips
   where user_id = amiga and name = 'Portugal' and coalesce(dates, '') not in ('__casa__', '__quickvisit__')
   limit 1;
  if viagem is null then
    insert into public.trips (user_id, name, destinations, dates, status, initial_city, created_at)
    values (amiga, 'Portugal', array['Portugal'], '', 'done', 'Lisboa', now() - interval '6 days')
    returning id into viagem;
  end if;
  update public.trips set privada = false, proxima = false where id = viagem;

  for l in select * from (values
    ('Cervejaria Ramiro',             'food',       'Av. Almirante Reis 1, 1150-007 Lisboa, Portugal',  38.72060, -9.13570, 5.0, 'Peça o camarão ao alho e feche com o prego no pão. Chegue antes das 19h, depois a fila dobra.', 1),
    ('Pastéis de Belém',              'food',       'R. de Belém 84-92, 1300-085 Lisboa, Portugal',     38.69750, -9.20320, 5.0, 'Pede pra comer lá dentro, sai quente. Canela e açúcar por cima.', 2),
    ('Time Out Market Lisboa',        'food',       'Av. 24 de Julho 49, 1200-479 Lisboa, Portugal',    38.70690, -9.14590, 4.0, 'Bom pra grupo: cada um escolhe uma banca. O polvo da Marlene é o melhor.', 3),
    ('A Brasileira',                  'food',       'R. Garrett 120, 1200-273 Lisboa, Portugal',        38.71070, -9.14240, 4.0, 'Uma bica no balcão, em pé, como os lisboetas.', 4),
    ('Altis Avenida Hotel',           'hotel',      'R. 1º de Dezembro 120, 1200-360 Lisboa, Portugal', 38.71470, -9.14060, 4.5, 'Pede quarto alto: o terraço tem vista pro Castelo.', 5),
    ('Torre de Belém',                'experience', 'Av. Brasília, 1400-038 Lisboa, Portugal',          38.69160, -9.21600, 4.5, 'Chega às 9h, antes das excursões. Fim de tarde é lindo.', 5),
    ('Miradouro da Senhora do Monte', 'experience', 'Largo Monte, 1170-107 Lisboa, Portugal',           38.71930, -9.13250, 5.0, 'Pôr do sol aqui, com um vinho do quiosque de baixo.', 6)
  ) as t(nome, cat, endereco, lat, lng, nota, texto, dias) loop
    update public.spots
       set my_rating = l.nota, my_review = l.texto, status = 'been', trip_id = viagem,
           city = 'Lisboa', address = l.endereco, lat = l.lat, lng = l.lng,
           place_type = case l.cat when 'food' then 'Gastronomia' when 'hotel' then 'Hospedagem' else 'Experiência' end,
           created_at = now() - (l.dias || ' days')::interval
     where user_id = amiga and name = l.nome;
    if not found then
      insert into public.spots (user_id, trip_id, name, category, city, address, place_type, status,
                                my_rating, my_review, my_note, lat, lng, created_at)
      values (amiga, viagem, l.nome, l.cat, 'Lisboa', l.endereco,
              case l.cat when 'food' then 'Gastronomia' when 'hotel' then 'Hospedagem' else 'Experiência' end,
              'been', l.nota, l.texto, '', l.lat, l.lng, now() - (l.dias || ' days')::interval);
    end if;
  end loop;
end $$;

-- ── CONFERÊNCIA ── as duas linhas: amizade = 1 ou mais; spots = 7
select 'amizade aceita' as item, count(*)::text as total
  from public.follows f, auth.users d, auth.users a
 where lower(d.email) = 'demo@meuspot.app' and lower(a.email) = 'demo2@meuspot.app' and f.status = 'accepted'
   and ((f.follower_id = d.id and f.following_id = a.id) or (f.follower_id = a.id and f.following_id = d.id))
union all
select 'spots da Ana em Lisboa', count(*)::text
  from public.spots s, auth.users a
 where lower(a.email) = 'demo2@meuspot.app' and s.user_id = a.id and s.city = 'Lisboa' and s.status = 'been';
