const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Reservar hotel: dois sites, nao um. Quem reserva hotel costuma ter o seu, e
// escolher por quem usa seria escolher errado pra metade das pessoas.

// O ambiente simulado devolve sempre o mesmo elemento pro getElementById,
// entao basta renderizar e ler o innerHTML dele. Tentei trocar o `document`
// inteiro e o guarda do trocar() barrou, com razao: document nao e funcao.
function linksDe(spot) {
  A.avaliar("document.getElementById('placeReserveWrap').innerHTML=''");
  A.renderPlaceLinks(spot);
  return A.avaliar("document.getElementById('placeReserveWrap').innerHTML");
}

test('hotel ganha Booking e Hoteis.com, com o nome e a cidade na busca', () => {
  const h = linksDe({ id: 'h1', name: 'Hotel Fasano', category: 'hotel', city: 'São Paulo', maps_url: '' });
  assert.ok(h.includes('booking.com/searchresults'), 'faltou o Booking');
  assert.ok(h.includes('hoteis.com/Hotel-Search'), 'faltou o Hotéis.com');
  assert.ok(h.includes(encodeURIComponent('Hotel Fasano São Paulo')), 'a busca nao leva nome + cidade');
});

test('os dois links saem do app com seguranca', () => {
  const h = linksDe({ id: 'h1', name: 'Hotel X', category: 'hotel', city: 'Lisboa' });
  const chips = h.match(/<a class="reserva-chip"[^>]*>/g) || [];
  assert.strictEqual(chips.length, 2);
  for (const c of chips) {
    assert.ok(c.includes('target="_blank"'), 'abre por cima do app');
    assert.ok(c.includes('rel="noopener noreferrer"'), 'sem noopener a pagina destino ganha acesso a esta');
  }
});

test('comida e experiencia NAO ganham botao de hotel', () => {
  for (const cat of ['food', 'experience']) {
    const h = linksDe({ id: 'x', name: 'Lugar', category: cat, city: 'Lisboa', maps_url: 'https://maps.google.com/x' });
    assert.ok(!h.includes('booking.com'), cat + ' ganhou botao de reserva de hotel');
  }
});

test('hotel sem cidade ainda oferece os dois', () => {
  const h = linksDe({ id: 'h', name: 'Pousada Sem Cidade', category: 'hotel', city: '' });
  assert.ok(h.includes('booking.com') && h.includes('hoteis.com'));
});

test('o Google Maps continua embaixo quando existe', () => {
  const h = linksDe({ id: 'h', name: 'Hotel X', category: 'hotel', city: 'Lisboa', maps_url: 'https://maps.google.com/?cid=1' });
  assert.ok(h.includes('maps.google.com'), 'sumiu o link do Maps');
  assert.ok(h.indexOf('booking.com') < h.indexOf('maps.google.com'), 'reserva deveria vir antes do Maps');
});
