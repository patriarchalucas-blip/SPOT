const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./_ajuda.js');

const A = app();

// Componentes de endereço copiados de respostas REAIS da API do Places, não
// inventados. Se o Google mudar o formato, é aqui que se descobre.
const comp = (lista) => lista.map(([longText, tipo]) => ({ longText, types: [tipo, 'political'] }));

const LUGARES = {
  senso_ji:      comp([['Taito City', 'locality'], ['Tokyo', 'administrative_area_level_1'], ['Japão', 'country']]),
  shibuya:       comp([['Shibuya', 'locality'], ['Tóquio', 'administrative_area_level_1'], ['Japão', 'country']]),
  akihabara:     comp([['Tokyo', 'administrative_area_level_1'], ['Japão', 'country']]),
  hakone:        comp([['Hakone', 'locality'], ['Kanagawa', 'administrative_area_level_1'], ['Japão', 'country']]),
  fushimi_inari: comp([['Kyoto', 'locality'], ['Kyoto', 'administrative_area_level_1'], ['Japão', 'country']]),
  gyeongbokgung: comp([['Seoul', 'administrative_area_level_1'], ['Coreia do Sul', 'country']]),
  wat_arun:      comp([['Krung Thep Maha Nakhon', 'administrative_area_level_1'], ['Tailândia', 'country']]),
  hagia_sophia:  comp([['Fatih', 'administrative_area_level_2'], ['İstanbul', 'administrative_area_level_1'], ['Turquia', 'country']]),
  machu_picchu:  comp([['Urubamba', 'administrative_area_level_2'], ['Cusco', 'administrative_area_level_1'], ['Peru', 'country']]),
  coliseu:       comp([['Roma', 'locality'], ['Lazio', 'administrative_area_level_1'], ['Itália', 'country']]),
  torre_eiffel:  comp([['Paris', 'locality'], ['Paris', 'administrative_area_level_2'], ['Île-de-France', 'administrative_area_level_1'], ['França', 'country']]),
  riva_split:    comp([['Split', 'locality'], ['Grad Split', 'administrative_area_level_2'], ['Splitsko-dalmatinska županija', 'administrative_area_level_1'], ['Croácia', 'country']]),
  kotor:         comp([['Kotor', 'locality'], ['Kotor', 'administrative_area_level_1'], ['Montenegro', 'country']]),
  sagrada:       comp([['Barcelona', 'locality'], ['Catalunya', 'administrative_area_level_1'], ['Espanha', 'country']])
};

test('locality manda quando existe — e por isso os Balcas nao mudam', () => {
  // Foi um defeito real: sem essa prioridade, o app gravava
  // "Split-Dalmatia County" e contava duas cidades onde havia uma.
  assert.strictEqual(A.cityFromComponents(LUGARES.riva_split), 'Split');
  assert.strictEqual(A.cityFromComponents(LUGARES.kotor), 'Kotor');
  assert.strictEqual(A.cityFromComponents(LUGARES.coliseu), 'Roma');
  assert.strictEqual(A.cityFromComponents(LUGARES.torre_eiffel), 'Paris');
  assert.strictEqual(A.cityFromComponents(LUGARES.sagrada), 'Barcelona');
});

test('sem locality, a divisao responde melhor que a subdivisao', () => {
  // Fatih e Urubamba ficam DENTRO da cidade que a pessoa reconhece.
  assert.strictEqual(A.cityFromComponents(LUGARES.hagia_sophia), 'İstanbul');
  assert.strictEqual(A.cityFromComponents(LUGARES.machu_picchu), 'Cusco');
  assert.strictEqual(A.cityFromComponents(LUGARES.gyeongbokgung), 'Seoul');
  assert.strictEqual(A.cityFromComponents(LUGARES.akihabara), 'Tokyo');
});

test('o pais sai em portugues e casa com a lista que pinta o mapa', () => {
  const COUNTRIES = A.avaliar('COUNTRIES');
  for (const chave of Object.keys(LUGARES)) {
    const pais = A.countryFromComponents(LUGARES[chave]);
    assert.ok(pais, chave + ' ficou sem pais');
    assert.ok(COUNTRIES.some(c => c.name === pais),
      chave + ' devolveu "' + pais + '", que nao existe em COUNTRIES — o mapa nao pinta e a bandeira nao aparece');
  }
});

test('normalizeCountry traduz o que vem em ingles', () => {
  assert.strictEqual(A.normalizeCountry('Japan'), 'Japão');
  assert.strictEqual(A.normalizeCountry('France'), 'França');
  assert.strictEqual(A.normalizeCountry('Bosnia and Herzegovina'), 'Bósnia e Herzegovina');
  assert.strictEqual(A.normalizeCountry('Japão'), 'Japão', 'ja em portugues deve passar intacto');
});

test('todo pais de COUNTRIES tem nome geografico pro mapa e bandeira', () => {
  const COUNTRIES = A.avaliar('COUNTRIES');
  assert.ok(COUNTRIES.length > 200, 'a lista encolheu: ' + COUNTRIES.length);
  // Comparado por nome, não com deepStrictEqual: o array vem de dentro do
  // contexto simulado e tem outro prototype de Array, então uma lista vazia de
  // lá nunca é "estritamente igual" a uma lista vazia daqui — o teste
  // reprovava um código correto.
  const quebrados = COUNTRIES.filter(c => !c.name || !c.geo || !c.flag || !c.region).map(c => c.name || '(sem nome)');
  assert.strictEqual(quebrados.length, 0, 'paises sem bandeira, regiao ou nome geografico: ' + quebrados.join(', '));
});

// ── metropole fatiada em distritos ───────────────────────────────────────────

test('distrito de metropole vira a cidade da viagem', async () => {
  // Tóquio nao e uma cidade no Google, sao 23. Sem isso o app contava
  // Shibuya, Shinjuku e Taito como tres cidades — o mesmo que contar Tatuape
  // e Pinheiros no lugar de Sao Paulo.
  const viagem = { initial_city: 'Tóquio' };
  for (const lugar of ['Shibuya', 'Taito City', 'Shinjuku City']) {
    const r = await A.resolverCidadeDoSpot({ city: lugar, region: 'Tóquio', country: 'Japão' }, viagem);
    assert.strictEqual(r, 'Tóquio', lugar + ' deveria virar Tóquio');
  }
});

test('cidade de verdade na mesma prefeitura NAO e engolida', () => {
  // A trava do teste acima: Hakone fica em Kanagawa, nao em Tóquio.
  return A.resolverCidadeDoSpot({ city: 'Hakone', region: 'Kanagawa', country: 'Japão' }, { initial_city: 'Tóquio' })
    .then(r => assert.strictEqual(r, 'Hakone'));
});

test('viagem sem cidade nao altera nada', async () => {
  const r = await A.resolverCidadeDoSpot({ city: 'Shibuya', region: 'Tóquio', country: 'Japão' }, {});
  assert.strictEqual(r, 'Shibuya');
});

// ── fusao de nomes ───────────────────────────────────────────────────────────

test('cidade e condado com o mesmo nome contam como uma so', () => {
  const canon = A.buildCityCanon(['Split', 'Split-Dalmatia County', 'Dubrovnik']);
  assert.strictEqual(canon['Split-Dalmatia County'], 'Split');
  assert.strictEqual(canon['Split'], 'Split');
  assert.strictEqual(canon['Dubrovnik'], 'Dubrovnik');
});

test('acento nao separa a mesma cidade em duas', () => {
  const canon = A.buildCityCanon(['São Paulo', 'Sao Paulo']);
  assert.strictEqual(canon['São Paulo'], canon['Sao Paulo']);
  assert.strictEqual(canon['Sao Paulo'], 'São Paulo', 'o nome com acento e o que aparece');
});

test('cidade com hifen no nome proprio nao e cortada', () => {
  // "Baden-Baden" nao pode virar "Baden" — o corte no hifen so vale quando ha
  // palavra administrativa junto.
  assert.strictEqual(A.cityCore('Baden-Baden'), 'baden-baden');
  assert.strictEqual(A.cityCore('Split-Dalmatia County'), 'split');
});
