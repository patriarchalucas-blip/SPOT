-- "País onde moro" mudou de lugar: na primeira versão eu criava uma viagem
-- vazia com marcador __home__, do mesmo jeito que "já visitei" cria uma
-- viagem vazia com __quickvisit__. Isso quebra quando o país de moradia já
-- É uma viagem real com spots (o caso do Lucas: Brasil em andamento, com
-- spots, e ele quer só marcar que mora lá) — a viagem real não pode
-- desaparecer da lista, e o marcador de moradia não deveria depender de
-- não ter spot nenhum. Por isso agora é um campo simples no perfil, sem
-- nenhuma relação com a tabela de viagens.

alter table profiles add column if not exists home_country text;
