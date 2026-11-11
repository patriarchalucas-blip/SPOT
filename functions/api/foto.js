// O mesmo /api/place-photo, com outro endereço (11/11/2026). O app EXIBE as
// fotos por aqui pra que nenhum celular reaproveite o redirecionamento que
// guardou antes da cura no servidor (ver paraExibir no index.html). O banco
// segue gravando /api/place-photo.
export { onRequestGet } from './place-photo.js';
