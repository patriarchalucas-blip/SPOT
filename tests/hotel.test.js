const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Os chips de reserva (Booking e Hoteis.com) sairam da ficha de hotel no
// redesign de 23/09/2026, por decisao do Lucas. Os testes que cobravam os dois
// sairam junto; o que sobra aqui e o que continua valendo.

// O ambiente simulado devolve sempre o mesmo elemento pro getElementById,
// entao basta renderizar e ler o innerHTML dele. Tentei trocar o `document`
// inteiro e o guarda do trocar() barrou, com razao: document nao e funcao.
function linksDe(spot) {
  A.avaliar("document.getElementById('placeReserveWrap').innerHTML=''");
  A.renderPlaceLinks(spot);
  return A.avaliar("document.getElementById('placeReserveWrap').innerHTML");
}

test('comida e experiencia NAO ganham botao de hotel', () => {
  for (const cat of ['food', 'experience']) {
    const h = linksDe({ id: 'x', name: 'Lugar', category: cat, city: 'Lisboa', maps_url: 'https://maps.google.com/x' });
    assert.ok(!h.includes('booking.com'), cat + ' ganhou botao de reserva de hotel');
  }
});

test('o Google Maps continua quando existe', () => {
  const h = linksDe({ id: 'h', name: 'Hotel X', category: 'hotel', city: 'Lisboa', maps_url: 'https://maps.google.com/?cid=1' });
  assert.ok(h.includes('maps.google.com'), 'sumiu o link do Maps');
});
