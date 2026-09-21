// AS FICHAS DO APP, NUM LUGAR SÓ.
//
// Antes cada tela nativa declarava a própria lista de cores no topo do
// arquivo. Cinco listas iguais, que já tinham começado a divergir — e quando o
// visual do site mudou, as quatro abas nativas ficaram para trás, escuras,
// dentro de um app claro.
//
// Os NOMES continuam os mesmos de antes de propósito (INK, ESCURO, ELEV,
// TERRA…), pra que nenhum lugar de uso precisasse ser reescrito. O que mudou
// foi para onde eles apontam. Alguns nomes ficaram mentindo — ESCURO agora é
// a cor mais CLARA da tela — e isso está anotado em cada linha; trocar os
// nomes é uma edição mecânica pra quando alguém estiver com o app rodando na
// frente, não às cegas.
//
// A referência é o `:root` do index.html. Não invente cor aqui: se faltar
// alguma, vá lá ver.

// ── as do sistema novo ────────────────────────────────────────────────────
export const BASE = '#F5F5F3';        // fundo da página e da barra de abas
export const SURFACE = '#E9E9E6';     // blocos secundários: ações, campos
export const INK = '#111111';
export const INK2 = '#6B6B67';
export const INK3 = '#9A9A96';
export const GREEN = '#0B3D2E';       // ÚNICO acento
export const ON_GREEN = '#F5F5F3';
export const PHOTO_EMPTY = '#6E7F73'; // fundo de quando não há foto
export const MAP_BG = '#E4E8E4';
export const MAP_LAND = '#CBD3CD';

// ── as pontes: nome velho, cor nova ───────────────────────────────────────
export const ESCURO = BASE;           // era o fundo escuro; hoje é o claro
export const SUPERFICIE = SURFACE;
export const ELEV = SURFACE;
export const TERRA = GREEN;           // o terracota saiu do app
export const VERDE = GREEN;
export const AMBAR = INK3;            // aviso perde a cor própria
export const VERMELHO = INK3;         // erro e destrutivo também
export const BORDA = 'transparent';   // nenhuma borda de 1px, em lugar nenhum
export const ATIVO_FUNDO = 'transparent'; // a aba ativa é cor, não pastilha

// ── tipografia ────────────────────────────────────────────────────────────
// `undefined` = fonte do sistema (San Francisco no iOS). Fraunces e IBM Plex
// Mono saíram do site inteiro; aqui elas sairiam junto, mas trocar pela Inter
// Tight exige uma dependência nova (`@expo-google-fonts/inter-tight`) e um
// build — e o registro do npm não respondia na noite em que isto foi escrito.
// A do sistema é da mesma família de formas que a Inter Tight e não custa
// pacote nenhum; quando houver build, é só apontar estes três pra ela.
export const FRAUNCES = undefined;
export const MONO = undefined;
export const MONO_MEDIO = undefined;
export const MONO_FORTE = undefined;
