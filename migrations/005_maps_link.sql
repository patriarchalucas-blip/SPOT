-- Hotéis e experiências não tinham nenhum link de ação (comida tem "Reservar
-- mesa" + Instagram/site). googleMapsUri é um campo real da Places API (New)
-- — a página de Maps do lugar específico, com fotos/reviews/horário — e dá
-- pra guardar de graça na mesma busca que já rola pra foto/site, sem
-- chamada de API extra.

alter table spots add column if not exists maps_url text;
