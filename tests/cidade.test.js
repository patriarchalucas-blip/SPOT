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

// No Brasil o MUNICIPIO vem em adm2 e o ESTADO em adm1, e a maioria dos
// lugares nem tem locality. Eu tinha posto adm1 na frente do adm2 pra resolver
// Istambul, e com isso Braganca Paulista, Santos e Campos do Jordao viravam
// todos "Sao Paulo" — tres cidades fundidas numa.
const BRASIL = {
  braganca: comp([['Bragança Paulista', 'administrative_area_level_2'], ['São Paulo', 'administrative_area_level_1'], ['Brasil', 'country']]),
  santos:   comp([['Santos', 'administrative_area_level_2'], ['São Paulo', 'administrative_area_level_1'], ['Brasil', 'country']]),
  jordao:   comp([['Campos do Jordão', 'administrative_area_level_2'], ['São Paulo', 'administrative_area_level_1'], ['Brasil', 'country']]),
  sampa:    comp([['São Paulo', 'administrative_area_level_2'], ['São Paulo', 'administrative_area_level_1'], ['Brasil', 'country']]),
  petropolis: comp([['Petrópolis', 'locality'], ['Petrópolis', 'administrative_area_level_2'], ['Rio de Janeiro', 'administrative_area_level_1'], ['Brasil', 'country']])
};

test('cidade do interior nao e engolida pelo estado de mesmo nome', () => {
  assert.strictEqual(A.cityFromComponents(BRASIL.braganca), 'Bragança Paulista');
  assert.strictEqual(A.cityFromComponents(BRASIL.santos), 'Santos');
  assert.strictEqual(A.cityFromComponents(BRASIL.jordao), 'Campos do Jordão');
  assert.strictEqual(A.cityFromComponents(BRASIL.sampa), 'São Paulo');
  assert.strictEqual(A.cityFromComponents(BRASIL.petropolis), 'Petrópolis');
});

test('sem locality NEM subdivisao, a divisao e a unica resposta', () => {
  assert.strictEqual(A.cityFromComponents(LUGARES.gyeongbokgung), 'Seoul');
  assert.strictEqual(A.cityFromComponents(LUGARES.akihabara), 'Tokyo');
});

test('a subdivisao ganha da divisao — troca consciente', () => {
  // Aqui a resposta fica PIOR que antes: "Fatih" e um bairro de Istambul,
  // "Urubamba" e a provincia de Machu Picchu. Foi escolhido assim porque o
  // erro na outra direcao e muito pior: adm1 na frente funde cidades
  // diferentes (Braganca virando Sao Paulo), enquanto isto so e especifico
  // demais dentro do lugar certo. Perder granularidade da pra viver; perder a
  // cidade, nao.
  assert.strictEqual(A.cityFromComponents(LUGARES.hagia_sophia), 'Fatih');
  assert.strictEqual(A.cityFromComponents(LUGARES.machu_picchu), 'Urubamba');
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


test('viagem nao pede mais data', () => {
  // Uma viagem no Spot nao e um evento com comeco e fim: a mesma pessoa pode
  // ter ido a Paris cinco vezes, e escolher UMA data entre elas nao diz nada.
  const { lerIndex } = require('./_ajuda.js');
  const html = lerIndex();
  for (const id of ['tripStart', 'tripEnd', 'editStart', 'editEnd']) {
    assert.ok(!html.includes('id="' + id + '"'), 'o campo de data ' + id + ' voltou');
  }
  assert.ok(!html.includes('openEditDates'), 'o botao de editar datas voltou');
});

// ═══ O CRITERIO, EM UM TESTE SO ═══
// A cidade e o MUNICIPIO: a menor unidade administrativa que o Google
// reconhece. Sem regra especial, sem lista, sem pais privilegiado.
//
// Existia aqui uma regra que juntava os distritos de Toquio comparando a
// divisao do lugar com a cidade da viagem. Ela morreu: nao havia sinal que
// separasse "Shibuya e bairro de Toquio" de "Braganca e cidade vizinha de Sao
// Paulo" (quatro caminhos testados, todos falharam em algum caso), e juntar
// era o lado errado — quem mora em Toquio diz "vou em Shibuya".

test('mesma regra em qualquer pais: a cidade e o municipio', async () => {
  const original = A.canonizarCidade;
  A.canonizarCidade = async (n) => n;
  try {
    const casos = [
      // Brasil: municipios vizinhos nunca se fundem, nem com viagem homonima
      [{ city: 'Bragança Paulista', country: 'Brasil' }, 'São Paulo', 'Bragança Paulista'],
      [{ city: 'Guarulhos', country: 'Brasil' }, 'São Paulo', 'Guarulhos'],
      [{ city: 'Santos', country: 'Brasil' }, 'São Paulo', 'Santos'],
      [{ city: 'Petrópolis', country: 'Brasil' }, 'Rio de Janeiro', 'Petrópolis'],
      [{ city: 'São Paulo', country: 'Brasil' }, 'São Paulo', 'São Paulo'],
      // Japao: os distritos de Toquio seguem a MESMA regra e ficam separados
      [{ city: 'Shibuya', country: 'Japão' }, 'Tóquio', 'Shibuya'],
      [{ city: 'Taito City', country: 'Japão' }, 'Tóquio', 'Taito City'],
      [{ city: 'Hakone', country: 'Japão' }, 'Tóquio', 'Hakone'],
      // e a viagem nao influencia mais nada
      [{ city: 'Kyoto', country: 'Japão' }, 'Tóquio', 'Kyoto']
    ];
    for (const [p, viagem, esperado] of casos) {
      const r = await A.resolverCidadeDoSpot(p, { initial_city: viagem });
      assert.strictEqual(r, esperado,
        p.city + ' numa viagem "' + viagem + '" virou "' + r + '"');
    }
  } finally { A.canonizarCidade = original }
});

test('a cidade da viagem nao influencia mais a cidade do spot', async () => {
  // Trava explicita: se alguem reintroduzir a comparacao com a viagem, isto
  // reprova. O mesmo lugar tem que dar o mesmo nome em qualquer viagem.
  const original = A.canonizarCidade;
  A.canonizarCidade = async (n) => n;
  try {
    const lugar = { city: 'Bragança Paulista', country: 'Brasil' };
    const a = await A.resolverCidadeDoSpot(lugar, { initial_city: 'São Paulo' });
    const b = await A.resolverCidadeDoSpot(lugar, { initial_city: 'Bragança Paulista' });
    const c = await A.resolverCidadeDoSpot(lugar, {});
    assert.strictEqual(a, b);
    assert.strictEqual(b, c);
    assert.strictEqual(a, 'Bragança Paulista');
  } finally { A.canonizarCidade = original }
});
