-- Confere se a 008 pegou. Roda no SQL Editor do Supabase.
-- Não altera nada — só lê e devolve 8 linhas OK / FALTANDO.

select 'follows: pedido nasce pendente' as verificacao,
       case when exists (select 1 from pg_policies
         where tablename='follows' and cmd='INSERT' and with_check like '%pending%')
       then 'OK' else 'FALTANDO' end as status
union all
select 'follows: só aceita, não reescreve',
       case when exists (select 1 from pg_policies
         where tablename='follows' and cmd='UPDATE' and with_check like '%accepted%')
       then 'OK' else 'FALTANDO' end
union all
select 'profiles: pendente não vê e-mail',
       case when exists (select 1 from pg_policies
         where tablename='profiles' and policyname='profiles viewable by self or accepted friend')
       then 'OK' else 'FALTANDO' end
union all
select 'função pending_request_profiles',
       case when exists (select 1 from pg_proc
         where proname='pending_request_profiles')
       then 'OK' else 'FALTANDO' end
union all
select 'RLS ligado em trips',
       case when (select relrowsecurity from pg_class
         where relname='trips' and relnamespace='public'::regnamespace)
       then 'OK' else 'FALTANDO' end
union all
select 'RLS ligado em spots',
       case when (select relrowsecurity from pg_class
         where relname='spots' and relnamespace='public'::regnamespace)
       then 'OK' else 'FALTANDO' end
union all
select 'trips: dono + amigo leem',
       case when exists (select 1 from pg_policies
         where tablename='trips' and policyname='own or friends can view trips')
       then 'OK' else 'FALTANDO' end
union all
select 'spots: dono + amigo leem',
       case when exists (select 1 from pg_policies
         where tablename='spots' and policyname='own or friends can view spots')
       then 'OK' else 'FALTANDO' end;
