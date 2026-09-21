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
// Uma família só, igual ao site: Inter Tight. Os NOMES aqui continuam os de
// antes (FRAUNCES, MONO...) pra não reescrever os ~40 lugares de uso; o que
// mudou é para onde apontam. FRAUNCES era a serifada de display, então vira o
// peso mais forte; MONO era o peso de dado, então vira o normal.
//
// Cada peso é uma FAMÍLIA registrada em App.js, não um fontWeight: no React
// Native, fontWeight não combina com fontFamily de fonte carregada — no iOS
// ele é simplesmente ignorado.
export const DISPLAY = 'Inter Tight Bold';
export const CORPO = 'Inter Tight';
// MEDIO e FORTE existiam pros dois numeros grandes (contador de paises e
// placar). No site numero e peso 700, entao os dois apontam pro Bold e os
// arquivos de 500 e 600 saem do pacote: eram 618KB sem uso proprio.
export const MEDIO = DISPLAY;
export const FORTE = DISPLAY;

export const FRAUNCES = DISPLAY;
export const MONO = CORPO;
export const MONO_MEDIO = MEDIO;
export const MONO_FORTE = FORTE;
