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
// Redesenho 06/11 (a noite verde, igual ao site): fundo verde-noite, texto
// quase branco, UM destaque, o branco quente. GREEN continua sendo o NOME do
// destaque (por isso mente: hoje é claro), pra nenhum lugar de uso mudar.
export const BASE = '#072019';        // fundo da página e da barra de abas
export const SURFACE = '#1A312A';     // blocos secundários (branco a 8% sobre o fundo)
export const INK = '#F5F5F3';
export const INK2 = '#9BA4A0';
export const INK3 = '#61716C';
export const GREEN = '#F2EDE3';       // ÚNICO destaque: o branco quente
export const ON_GREEN = '#0C1714';
export const PHOTO_EMPTY = '#2F5C4C'; // fundo de quando não há foto
export const MAP_BG = '#0B2A21';
export const MAP_LAND = '#2C4A41';

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
// 06/11: Archivo. DISPLAY (títulos e números) é a condensada, como no site.
export const DISPLAY = 'Archivo Condensada';
export const CORPO = 'Archivo';
export const NEGRITO = 'Archivo Bold';   // nome e rótulo em negrito, largura normal
// MEDIO e FORTE existiam pros dois numeros grandes (contador de paises e
// placar). No site numero e peso 700, entao os dois apontam pro Bold e os
// arquivos de 500 e 600 saem do pacote: eram 618KB sem uso proprio.
export const MEDIO = DISPLAY;
export const FORTE = DISPLAY;

export const FRAUNCES = DISPLAY;
export const MONO = CORPO;
export const MONO_MEDIO = MEDIO;
export const MONO_FORTE = FORTE;
