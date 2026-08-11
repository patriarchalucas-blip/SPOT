-- Instagram tem que vencer SEMPRE que existir, mesmo se o Google já tiver
-- devolvido um site de verdade pro lugar (website_url não separa "site
-- próprio" de "Instagram" — os dois moram no mesmo campo). Sem uma
-- marcação própria, não tinha como saber se um website_url preenchido já
-- passou pela checagem de Instagram ou é só o site que o Google achou
-- primeiro. insta_checked resolve isso: fica true só depois de já ter
-- tentado achar o Instagram (achando ou não), então nunca reprocessa o
-- mesmo spot de novo nem esquece de tentar.

alter table spots add column if not exists insta_checked boolean not null default false;
