// Escreve PNG sem canal alfa (color type 2 = RGB) a partir de pixels crus.
//
// POR QUE ISTO EXISTE: o canvas do navegador so sabe exportar RGBA, e a Apple
// RECUSA o icone de 1024 se ele tiver canal alfa ("Invalid Icon - the app icon
// can't be transparent nor contain an alpha channel"). Nao ha sharp nem PIL
// nesta maquina, entao o jeito e receber os pixels crus do canvas e montar o
// arquivo aqui, com o zlib que ja vem no Node.
const zlib = require('zlib');

const TABELA = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TABELA[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(tipo, dados) {
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length, 0);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo), 0);
  return Buffer.concat([tam, corpo, crc]);
}

// rgba: Buffer com w*h*4 bytes. Devolve o PNG RGB, com o fundo aplicado por
// baixo de quem vier semitransparente (a borda suavizada do desenho).
function pngRGB(rgba, w, h, fundo) {
  const bruto = Buffer.alloc(h * (1 + w * 3));
  let o = 0;
  for (let y = 0; y < h; y++) {
    bruto[o++] = 0; // filtro "none": o arquivo e pequeno, nao vale a conta
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = rgba[i + 3] / 255;
      for (let c = 0; c < 3; c++) {
        bruto[o++] = Math.round(rgba[i + c] * a + fundo[c] * (1 - a));
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // 8 bits por canal
  ihdr[9] = 2;   // color type 2 = RGB, SEM alfa
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
module.exports = { pngRGB };
