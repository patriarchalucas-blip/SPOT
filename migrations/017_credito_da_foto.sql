-- 017 — crédito do autor da foto do lugar
--
-- Por que existe: os Termos da Google Maps Platform exigem que, sempre que o
-- app exibe uma foto vinda do Places, ele mostre o crédito do autor que vem
-- junto com ela (authorAttributions). O app já recebia esse dado do Google e
-- jogava fora — a foto era exibida sem crédito nenhum, o que coloca o uso da
-- API fora dos termos.
--
-- Guardar junto com o spot, em vez de reconsultar na hora de exibir: a
-- consulta custa cota do Places e o crédito é sempre o mesmo da foto que já
-- está gravada. Duas colunas em vez de uma porque o crédito tem nome E link
-- pro perfil do autor, e os dois entram na exibição.
--
-- Spots antigos ficam com as colunas nulas: a foto deles aparece sem crédito
-- até o auto-conserto (healSpotPhoto) rebuscar aquele lugar, que é quando o
-- app volta a ter o nome do autor em mãos. O código trata nulo como "sem
-- crédito" e não quebra.

alter table public.spots add column if not exists photo_author     text;
alter table public.spots add column if not exists photo_author_url text;

-- Conferência: devolve as duas linhas se deu certo.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'spots'
  and column_name in ('photo_author', 'photo_author_url')
order by column_name;
