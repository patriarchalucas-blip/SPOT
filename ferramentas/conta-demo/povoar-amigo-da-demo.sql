-- ═══════════════════════════════════════════════════════════════════════
-- Amiga da conta demo, com conteúdo (revisão da Apple, 28/09/2026)
-- ═══════════════════════════════════════════════════════════════════════
-- A Apple reprovou a build 11 por "2.1(a): a conta demo precisa ter conteúdo
-- pra verificar todas as funções, como o feed". A demo tinha ficado SEM
-- NENHUM AMIGO (um bloqueio durante a gravação do vídeo desfez a amizade, e
-- desbloquear não a traz de volta), então o feed da aba Amigos vinha vazio.
--
-- Este script usa uma SEGUNDA CONTA DE TESTE, criada pelo Lucas só pra isso
-- (e-mail abaixo), e nunca a conta de uma pessoa real:
--   · torna a conta de teste amiga ACEITA da demo;
--   · dá a ela uma viagem "Portugal" (Lisboa) com 7 lugares reais marcados
--     como Fui, com nota, comentário e coordenada, espaçados nos últimos dias;
--   · deixa um comentário dela num spot da demo.
--
-- Rodar INTEIRO no SQL Editor do projeto kzidnilsyrvauzgelsqd. Pode rodar de
-- novo: não duplica nada.
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  EMAIL_DA_AMIGA constant text := 'patriarchalucas+amiga@gmail.com';   -- a conta de teste
  demo   uuid;
  amiga  uuid;
  viagem uuid;
  alvo   uuid;
  l      record;
begin
  select id into demo from auth.users where lower(email) = 'demo@meuspot.app';
  if demo is null then raise exception 'conta demo@meuspot.app não encontrada'; end if;
  select id into amiga from auth.users where lower(email) = lower(EMAIL_DA_AMIGA);
  if amiga is null then raise exception 'a conta de teste % não existe (crie pelo meuspot.app e confirme o e-mail)', EMAIL_DA_AMIGA; end if;
  if amiga = demo then raise exception 'a conta de teste não pode ser a própria demo'; end if;

  -- nome de gente no feed: criada pelo painel do Supabase, a conta nasce com
  -- o começo do e-mail como nome ("patriarchalucas+amiga")
  update public.profiles
     set display_name = 'Ana Lima',
         username = case when exists (select 1 from public.profiles
                                       where lower(username) = 'analima' and id <> amiga)
                         then username else 'analima' end
   where id = amiga;
  if not found then
    insert into public.profiles (id, display_name, username) values (amiga, 'Ana Lima', 'analima');
  end if;

  -- sem bloqueio entre as duas, e amizade aceita (um lado só basta)
  delete from public.bloqueios
   where (bloqueador_id = demo and bloqueado_id = amiga) or (bloqueador_id = amiga and bloqueado_id = demo);
  update public.follows set status = 'accepted'
   where (follower_id = amiga and following_id = demo) or (follower_id = demo and following_id = amiga);
  if not found then
    insert into public.follows (follower_id, following_id, status) values (amiga, demo, 'accepted');
  end if;

  -- a viagem (reaproveita se já existir)
  select id into viagem from public.trips
   where user_id = amiga and name = 'Portugal' and coalesce(dates, '') not in ('__casa__', '__quickvisit__')
   limit 1;
  if viagem is null then
    insert into public.trips (user_id, name, destinations, dates, status, initial_city, created_at)
    values (amiga, 'Portugal', array['Portugal'], '', 'done', 'Lisboa', now() - interval '12 days')
    returning id into viagem;
  end if;

  for l in select * from (values
    ('Cervejaria Ramiro',             'food',       'Av. Almirante Reis 1, 1150-007 Lisboa, Portugal',  38.72060, -9.13570, 4.5, 'Camarão ao alho e o prego no fim. Vale a fila.',             11),
    ('Pastéis de Belém',              'food',       'R. de Belém 84-92, 1300-085 Lisboa, Portugal',     38.69750, -9.20320, 5.0, 'O melhor pastel de nata. Come ali mesmo, quente.',           9),
    ('Time Out Market Lisboa',        'food',       'Av. 24 de Julho 49, 1200-479 Lisboa, Portugal',    38.70690, -9.14590, 4.0, 'Bom pra grupo: cada um escolhe uma coisa.',                  8),
    ('A Brasileira',                  'food',       'R. Garrett 120, 1200-273 Lisboa, Portugal',        38.71070, -9.14240, 4.0, 'Café clássico do Chiado. Mais pela história que pelo café.', 6),
    ('Altis Avenida Hotel',           'hotel',      'R. 1º de Dezembro 120, 1200-360 Lisboa, Portugal', 38.71470, -9.14060, 4.5, 'Terraço com vista pro Castelo. Localização perfeita.',       5),
    ('Torre de Belém',                'experience', 'Av. Brasília, 1400-038 Lisboa, Portugal',          38.69160, -9.21600, 4.5, 'Chega cedo, antes das filas. Fim de tarde é lindo.',         4),
    ('Miradouro da Senhora do Monte', 'experience', 'Largo Monte, 1170-107 Lisboa, Portugal',           38.71930, -9.13250, 5.0, 'A vista mais bonita da cidade no pôr do sol.',              2)
  ) as t(nome, cat, endereco, lat, lng, nota, texto, dias) loop
    if not exists (select 1 from public.spots where user_id = amiga and name = l.nome) then
      insert into public.spots (user_id, trip_id, name, category, city, address, place_type, status,
                                my_rating, my_review, my_note, lat, lng, created_at)
      values (amiga, viagem, l.nome, l.cat, 'Lisboa', l.endereco,
              case l.cat when 'food' then 'Comer & Beber' when 'hotel' then 'Onde Ficar' else 'Experiência' end,
              'been', l.nota, l.texto, '', l.lat, l.lng, now() - (l.dias || ' days')::interval);
    end if;
  end loop;

  -- um comentário dela num spot da demo (aparece no feed da demo)
  select id into alvo from public.spots where user_id = demo order by created_at limit 1;
  if alvo is not null and not exists (select 1 from public.spot_comments where spot_id = alvo and user_id = amiga) then
    insert into public.spot_comments (spot_id, user_id, body, created_at)
    values (alvo, amiga, 'Fui por indicação sua e amei! Obrigada pela dica.', now() - interval '1 day');
  end if;
end $$;

-- ── CONFERÊNCIA ── as três linhas devem vir com número maior que zero
select 'amizade aceita com a demo' as item, count(*)::text as total
  from public.follows f, auth.users d
 where lower(d.email) = 'demo@meuspot.app' and f.status = 'accepted'
   and (f.follower_id = d.id or f.following_id = d.id)
union all
select 'spots Fui da amiga', count(*)::text
  from public.spots s, auth.users a
 where lower(a.email) = lower('patriarchalucas+amiga@gmail.com') and s.user_id = a.id and s.status = 'been'
union all
select 'comentários da amiga', count(*)::text
  from public.spot_comments c, auth.users a
 where lower(a.email) = lower('patriarchalucas+amiga@gmail.com') and c.user_id = a.id;
