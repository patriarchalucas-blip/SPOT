-- 026 — Fecha pra quem não está logado as duas funções que a 015 não pegou
--
-- POR QUE ISTO EXISTE
--
-- O Supabase dá EXECUTE a `anon` em toda função nova, por padrão. E
-- `revoke ... from public` NÃO tira isso: `anon` tem a própria concessão. A
-- 015 fechou as funções que existiam na época; duas nasceram depois e ficaram
-- abertas. Conferido em 24/09/2026 chamando cada uma com a chave pública, sem
-- login:
--
--   amigo_em_comum            200  (deveria ser 401)
--   esquecer_meus_aparelhos   204  (deveria ser 401)
--
-- Nenhuma das duas VAZA dado hoje — as duas usam auth.uid(), que é nulo sem
-- login, então devolvem vazio e não apagam nada. Mas ficar aberta é depender
-- de nunca ninguém mexer no corpo delas sem lembrar disso.
--
-- invite_owner e invite_preview continuam abertas DE PROPÓSITO: quem abre um
-- link de convite ainda não tem conta (ver 015 e 022).
--
-- Rode este arquivo INTEIRO no SQL Editor do projeto kzidnilsyrvauzgelsqd
-- ("Spot"). Pode rodar mais de uma vez sem problema.

revoke execute on function public.amigo_em_comum(uuid[]) from anon;
grant  execute on function public.amigo_em_comum(uuid[]) to authenticated;

-- Esta precisa dos DOIS revokes: ela nasceu sem `revoke ... from public`, e
-- o EXECUTE que o Postgres dá a PUBLIC por padrão também chega em `anon`.
-- Só o `from anon` deixou `anon = true` na conferência (rodado em 25/09).
revoke execute on function public.esquecer_meus_aparelhos() from public;
revoke execute on function public.esquecer_meus_aparelhos() from anon;
grant  execute on function public.esquecer_meus_aparelhos() to authenticated;

-- ─── Conferir ───────────────────────────────────────────────────────────
-- Tem que voltar DUAS linhas, as duas com anon = false:
select p.proname as funcao,
       has_function_privilege('anon', p.oid, 'execute') as anon
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('amigo_em_comum', 'esquecer_meus_aparelhos');
