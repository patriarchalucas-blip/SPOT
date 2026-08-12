-- Ao criar uma viagem buscando por CIDADE (ex: "Zagreb"), o app já
-- identificava o país certo, mas a cidade escolhida nunca era salva —
-- só existia de passagem pro toast de "adicione seu primeiro lugar em
-- Zagreb". Card de cidade hoje é 100% derivado dos spots (city_card só
-- nasce quando tem spot dentro), então uma viagem recém-criada sem spot
-- nenhum mostrava só o card do país. initial_city guarda a cidade
-- escolhida na criação, pra existir um card (vazio) esperando o primeiro
-- spot, em vez de a cidade simplesmente desaparecer até alguém adicionar
-- algo lá.

alter table trips add column if not exists initial_city text;
