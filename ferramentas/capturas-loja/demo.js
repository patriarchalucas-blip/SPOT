// ═══ ANDAIME DE CAPTURA DA APP STORE ═══
//
// Roda por cima do index.html servido em http://127.0.0.1:8795 e monta uma
// conta de demonstração. Não toca o Supabase: a camada de dados inteira é
// substituída antes de qualquer chamada.
//
// A REGRA QUE VALE MAIS QUE QUALQUER OUTRA AQUI: todo spot tem que ter foto DO
// LUGAR QUE ELE DIZ SER. Na primeira versão eu peguei o que o acervo livre
// tinha à mão — a ficha da Cervejaria Ramiro saiu com peixe frito de uma casa
// americana embaixo de uma resenha sobre camarão português. Além de feio, é a
// diretriz 2.3.3 da Apple (captura que representa mal o app = recusa).
// Então: ou o Commons tem foto DAQUELE lugar, ou o lugar não entra.

const P = u => '/img?u=' + encodeURIComponent(u);
const T = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
const U = 'https://upload.wikimedia.org/wikipedia/commons/';

// ── Fotos, uma por lugar, todas do lugar nomeado ───────────────────────────
const FOTO = {
  // São Paulo — a cidade onde a Marina mora (seção "Onde você mora", 25/09)
  'Mercado Municipal':   T + 'f/fd/Municipal_Market_of_S%C3%A3o_Paulo_city.jpg/1920px-Municipal_Market_of_S%C3%A3o_Paulo_city.jpg',
  'Pinacoteca':          T + 'c/c4/Pinacoteca_de_S%C3%A3o_Paulo%2C_Brazil.jpg/1920px-Pinacoteca_de_S%C3%A3o_Paulo%2C_Brazil.jpg',
  // Lisboa
  'Cervejaria Ramiro':   T + 'd/d0/Cervejaria_Ramiro_%2842079848325%29.jpg/1920px-Cervejaria_Ramiro_%2842079848325%29.jpg',
  'Time Out Market':     T + '9/98/Time_Out_Market_Lisboa.jpg/1920px-Time_Out_Market_Lisboa.jpg',
  'A Brasileira':        U + '4/44/A_BRASILEIRA_DO_CHIADO_3.jpg',
  'Confeitaria Nacional': U + '5/5b/ConfeitariaNacional.png',
  'Pastéis de Belém':    T + '2/23/Pasteis_de_nata_from_Belem_%2821848817309%29.jpg/1920px-Pasteis_de_nata_from_Belem_%2821848817309%29.jpg',
  'Altis Avenida Hotel': T + 'c/c6/Altis_Avenida_Hotel%2C_Pra%C3%A7a_dos_Restauradores%2C_Lisbon_%2854872658752%29.jpg/1920px-Altis_Avenida_Hotel%2C_Pra%C3%A7a_dos_Restauradores%2C_Lisbon_%2854872658752%29.jpg',
  'Torre de Belém':      T + '6/65/Torre_Bel%C3%A9m_April_2009-4a.jpg/1920px-Torre_Bel%C3%A9m_April_2009-4a.jpg',
  'Elevador de Santa Justa': U + 'a/ad/Elevador_de_Santa_Justa%2C_Lisboa%2C_Portugal%2C_2022-07-24%2C_DD_06.jpg',
  'Miradouro da Senhora do Monte': T + '5/52/Miradouro_Nossa_Senhora_do_Monte_I.jpg/1920px-Miradouro_Nossa_Senhora_do_Monte_I.jpg',
  // Porto
  'Livraria Lello':      T + '6/6e/Exterior_view_of_Livraria_Lello_01.jpg/1920px-Exterior_view_of_Livraria_Lello_01.jpg',
  'Ponte Luís I':        T + 'b/b8/Puente_Don_Luis_I%2C_Oporto%2C_Portugal%2C_2012-05-09%2C_DD_01.JPG/1920px-Puente_Don_Luis_I%2C_Oporto%2C_Portugal%2C_2012-05-09%2C_DD_01.JPG',
  'Mercado do Bolhão':   T + '3/31/Mercado_do_Bolhao_%2826431828935%29.jpg/1920px-Mercado_do_Bolhao_%2826431828935%29.jpg',
  // Dubrovnik
  'Buža Bar':            T + '2/2c/Walls_of_Dubrovnik_Bar_%285967296829%29.jpg/1920px-Walls_of_Dubrovnik_Bar_%285967296829%29.jpg',
  'Muralhas da Cidade':  T + 'b/b4/Casco_viejo_de_Dubrovnik%2C_Croacia%2C_2014-04-14%2C_DD_04.JPG/1920px-Casco_viejo_de_Dubrovnik%2C_Croacia%2C_2014-04-14%2C_DD_04.JPG',
  // Japão
  'Fushimi Inari':       T + '0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/1920px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg',
  'Kinkaku-ji':          T + '0/0e/Kinkaku-ji_the_Golden_Temple_in_Kyoto_overlooking_the_lake_-_high_rez.JPG/1920px-Kinkaku-ji_the_Golden_Temple_in_Kyoto_overlooking_the_lake_-_high_rez.JPG',
  'Sensō-ji':            T + '7/73/Senso-ji_temple_in_Tokyo_%2851864021067%29.jpg/1920px-Senso-ji_temple_in_Tokyo_%2851864021067%29.jpg',
  // Sevilha
  'Real Alcázar':        T + '0/08/Escalier_Castille_Leon_Alcazar_Seville_Spain.jpg/1920px-Escalier_Castille_Leon_Alcazar_Seville_Spain.jpg',
  'La Giralda':          T + '4/44/La_Giralda%2C_Seville%2C_Spain_-_Sep_2009.jpg/1920px-La_Giralda%2C_Seville%2C_Spain_-_Sep_2009.jpg',
  'Plaza de España':     T + 'b/b6/Plaza_de_Espa%C3%B1a_%28Sevilla%29_-_01.jpg/1920px-Plaza_de_Espa%C3%B1a_%28Sevilla%29_-_01.jpg',
  // Florença
  'Ponte Vecchio':       T + '0/08/Ponte_Vecchio_Arno_Florence.jpg/1920px-Ponte_Vecchio_Arno_Florence.jpg',
  'Galeria Uffizi':      T + '5/55/Ceiling_of_Uffizi_Gallery.jpg/1920px-Ceiling_of_Uffizi_Gallery.jpg',
  'Duomo de Florença':   T + '4/43/Florence_Cathedral_%28Duomo%29.jpg/1920px-Florence_Cathedral_%28Duomo%29.jpg'
};

// Capa de país e de cidade. A chave é o NOME DA VIAGEM na tela inicial e o
// NOME DA CIDADE na tela de cidade — as duas passam pelo mesmo fetchCityPhoto.
const CAPA = {
  'São Paulo': T + 'b/b5/Panorama_of_Sao_Paulo_from_Avenida_Santa_Catarina.jpg/1920px-Panorama_of_Sao_Paulo_from_Avenida_Santa_Catarina.jpg',
  'Portugal':  T + '0/0f/Alfama%2C_Lisbon%2C_Portugal_July_2021.jpg/1920px-Alfama%2C_Lisbon%2C_Portugal_July_2021.jpg',
  'Croácia':   FOTO['Muralhas da Cidade'],
  'Japão':     FOTO['Fushimi Inari'],
  'Espanha':   FOTO['Plaza de España'],
  'Itália':    FOTO['Ponte Vecchio'],
  'Lisboa':    T + '9/9a/Tram_28%3B_Lisbon_%285282021178%29.jpg/1920px-Tram_28%3B_Lisbon_%285282021178%29.jpg',
  'Porto':     T + 'c/c5/Oporto%27s_Ribeira_Waterfront_-_Apr_2011.jpg/1920px-Oporto%27s_Ribeira_Waterfront_-_Apr_2011.jpg',
  'Dubrovnik': FOTO['Muralhas da Cidade'],
  'Tóquio':    FOTO['Sensō-ji'],
  'Quioto':    FOTO['Kinkaku-ji'],
  'Sevilha':   FOTO['Plaza de España'],
  'Florença':  FOTO['Ponte Vecchio']
};

// ── Os spots. A resenha é escrita pra combinar com a foto daquele lugar. ────
const CRIADO = '2026-09-01T12:00:00Z';
const SPOTS_DEMO = [
  // Os da cidade onde mora vão pra seção de casa, não viram viagem.
  ['Brasil', 'São Paulo', 'Mercado Municipal', 'food', 'been', 4.5, 'O sanduíche de mortadela é exagero, e é por isso que vale. Vai de manhã.', 2],
  ['Brasil', 'São Paulo', 'Pinacoteca', 'experience', 'been', 5, 'O prédio sozinho já vale. Termina no café, olhando o Jardim da Luz.', null],
  ['Portugal', 'Lisboa', 'Cervejaria Ramiro', 'food', 'been', 5, 'O camarão da costa vale a fila inteira. Fui três vezes na mesma semana e não me arrependo de nenhuma.', 2],
  ['Portugal', 'Lisboa', 'Pastéis de Belém', 'food', 'been', 4.5, 'Quente, com canela por cima. A fila anda rápido, não desiste.', 1],
  ['Portugal', 'Lisboa', 'Time Out Market', 'food', 'been', 4, 'Bom pra decidir em grupo quando ninguém concorda. Vai fora do horário de pico.', 2],
  ['Portugal', 'Lisboa', 'A Brasileira', 'food', 'been', 3.5, 'Café caro e cheio de turista, mas o salão vale a parada de dez minutos.', 2],
  ['Portugal', 'Lisboa', 'Confeitaria Nacional', 'food', 'want', null, null, null],
  ['Portugal', 'Lisboa', 'Altis Avenida Hotel', 'hotel', 'been', 4.5, 'Fica em cima do Restauradores: você sai do quarto e já está no centro.', null],
  ['Portugal', 'Lisboa', 'Miradouro da Senhora do Monte', 'experience', 'been', 5, 'Subi no fim da tarde. É o melhor lugar da cidade pra ver o sol descer, e é de graça.', null],
  ['Portugal', 'Lisboa', 'Torre de Belém', 'experience', 'been', 4, 'Bonita por fora, apertada por dentro. Vale a foto e a caminhada até lá.', null],
  ['Portugal', 'Lisboa', 'Elevador de Santa Justa', 'experience', 'want', null, null, null],
  ['Portugal', 'Porto', 'Livraria Lello', 'experience', 'been', 3.5, 'Bonita de doer, mas cheia. Vai na primeira hora ou não vai.', null],
  ['Portugal', 'Porto', 'Ponte Luís I', 'experience', 'been', 5, 'Atravessa a pé pelo tabuleiro de cima no fim do dia. Sem pressa.', null],
  ['Portugal', 'Porto', 'Mercado do Bolhão', 'food', 'want', null, null, null],
  ['Croácia', 'Dubrovnik', 'Buža Bar', 'experience', 'been', 5, 'Bar num buraco na muralha, mesa em cima da pedra, o mar batendo embaixo.', null],
  ['Croácia', 'Dubrovnik', 'Muralhas da Cidade', 'experience', 'been', 4.5, 'Duas horas de volta inteira. Vai cedo, o sol não perdoa.', null],
  ['Japão', 'Quioto', 'Fushimi Inari', 'experience', 'been', 5, 'Sobe além do primeiro portal. A partir dali o caminho esvazia e fica só você.', null],
  ['Japão', 'Quioto', 'Kinkaku-ji', 'experience', 'been', 4.5, 'Chega na abertura. Meia hora depois não dá mais pra ver o reflexo no lago.', null],
  ['Japão', 'Tóquio', 'Sensō-ji', 'experience', 'want', null, null, null],
  ['Espanha', 'Sevilha', 'Real Alcázar', 'experience', 'been', 5, 'Compra a entrada antes. O jardim sozinho vale a manhã inteira.', null],
  ['Espanha', 'Sevilha', 'La Giralda', 'experience', 'been', 4.5, 'A subida é rampa, não escada — dá pra fazer com calma.', null],
  ['Espanha', 'Sevilha', 'Plaza de España', 'experience', 'want', null, null, null],
  ['Itália', 'Florença', 'Ponte Vecchio', 'experience', 'been', 5, 'Passa de manhã cedo, antes das lojas abrirem. É outra ponte.', null],
  ['Itália', 'Florença', 'Galeria Uffizi', 'experience', 'been', 5, 'Reserva horário. Sem reserva são duas horas de fila na rua.', null],
  ['Itália', 'Florença', 'Duomo de Florença', 'experience', 'want', null, null, null]
];

const PAISES_SO_VISITADOS = ['México', 'Marrocos', 'Grécia', 'Islândia', 'Tailândia',
  'Peru', 'Argentina', 'Chile', 'França', 'Holanda', 'Turquia', 'Vietnã'];

// ── Montagem ───────────────────────────────────────────────────────────────
window.prepararDemo = function () {
  const nop = async () => ({});
  ['dbInsert', 'dbUpdate', 'dbDelete', 'dbRpc', 'sbFetch', 'ensureToken', 'fetchOwnProfile',
    'healSpotPhoto', 'autoBackfillPlaceLinks', 'carregarBloqueios', 'revalidarInstagramsAntigos',
    'corrigirCidadesAntigas', 'buscarFotosQueFaltam', 'corrigirPaisesDesconhecidos',
    'maybeShowCheckin', 'guardarDadosLocais', 'usarDadosLocais', 'refreshAvatars', 'avisarTelaAtual'
  ].forEach(n => { window[n] = nop; });

  window.fetchCityPhoto = async c => (CAPA[c] ? P(CAPA[c]) : null);
  // O perfil vem do próprio S.profile: desligado, a linha '@usuário · cidade'
  // do Perfil saía vazia na captura.
  window.fetchOwnProfile = async () => S.profile;

  S.user = { id: 'demo-0000', email: 'marina@exemplo.com' };
  S.token = 'falso';
  S.profile = { id: 'demo-0000', display_name: 'Marina Duarte', username: 'marinaduarte', home_city: 'São Paulo', home_country: 'Brasil' };

  let n = 0; const id = () => 'd' + (++n);
  const viagem = (nome, cidade, datas) => ({
    id: id(), user_id: 'demo-0000', name: nome, destinations: [nome], dates: datas || '',
    date_start: null, date_end: null, status: 'done', initial_city: cidade || '', created_at: CRIADO
  });

  const porPais = {};
  ['Portugal', 'Croácia', 'Japão', 'Espanha', 'Itália'].forEach((p, i) => {
    porPais[p] = viagem(p, ['Lisboa', 'Dubrovnik', 'Tóquio', 'Sevilha', 'Florença'][i]);
  });

  // A seção "Onde você mora" (ver ehCasa no index.html).
  const casa = Object.assign(viagem('Brasil', 'São Paulo', '__casa__'), { name: 'São Paulo', status: 'planning' });
  porPais.Brasil = casa;

  window.__TRIPS = [...Object.values(porPais),
    ...PAISES_SO_VISITADOS.map(p => viagem(p, '', '__quickvisit__'))];

  window.__SPOTS = SPOTS_DEMO.map(([pais, cidade, nome, cat, status, nota, resenha, preco]) => ({
    id: id(), user_id: 'demo-0000', trip_id: porPais[pais].id, name: nome, category: cat,
    city: cidade, address: cidade, status, my_rating: nota, my_review: resenha, my_note: null,
    photo_url: FOTO[nome] ? P(FOTO[nome]) : null,
    place_type: null, rating_google: null, subcategory: null, phone: null, lat: null, lng: null,
    from_user_id: null, price_level: preco, opening_hours: null, created_at: CRIADO
  }));

  window.dbGet = async t => t === 'trips' ? window.__TRIPS : t === 'spots' ? window.__SPOTS : [];

  return {
    viagens: window.__TRIPS.length,
    spots: window.__SPOTS.length,
    semFoto: window.__SPOTS.filter(s => !s.photo_url).map(s => s.name)
  };
};

// ── Captura ────────────────────────────────────────────────────────────────
//
// Quatro remendos, cada um por um defeito do html2canvas que já apareceu:
//  1. animação — o clone reinicia screenIn{from{opacity:0}} e o PNG sai preto.
//  2. barra de baixo (.bottom-nav) — fundo transparente sobre o conteúdo; ela
//     conta com o desfoque, que esta ferramenta não desenha, e o texto
//     atravessava. CUIDADO com o seletor: .cont-abas é a fileira de
//     continentes no meio da tela, NÃO a barra de baixo. Pintar ela deixou
//     uma faixa clara atrás de "Europa · 4".
//  3. sublinhado da aba ativa — o app usa box-shadow:inset 0 -2px 0, e o
//     html2canvas desenha sombra "inset" como CAIXA em volta do elemento.
//     Era o "Europa · 4" emoldurado. Vira border-bottom, que ele sabe fazer.
//  4. <textarea> — ele desenha só a primeira linha, e a resenha saía cortada.
const CSS_DA_CAPTURA =
  '*{animation:none!important;transition:none!important}'
  + '.bottom-nav{background:#F5F5F3!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'
  + '.cont-aba,.filter-chip,.cat-tab,.subcat-chip,.am-abas button,.ml-aba'
  + '{box-shadow:none!important;border-bottom:2px solid transparent!important}'
  + '.cont-aba.on,.filter-chip.on,.cat-tab.active,.subcat-chip.on,.am-abas button.on,.ml-aba.on'
  + '{border-bottom-color:#111111!important}'
  // 5. fileiras que rolam de lado (overflow-x:auto) viram camada separada no
  //    html2canvas, e ele pinta o fundo do canvas DENTRO do recorte — saía uma
  //    faixa clara atrás de "Europa · 4", que na tela não existe. Sem rolagem
  //    no clone o elemento volta a ser conteúdo comum. Cabe: são dois ou três
  //    rótulos curtos.
  + '.cont-abas,.am-abas,.cat-tabs,.filter-row,.ml-abas{overflow:visible!important}';

window.capturar = async function (nome) {
  const c = await html2canvas(document.body, {
    scale: 3, width: 440, height: 956, windowWidth: 440, windowHeight: 956,
    backgroundColor: '#F5F5F3', useCORS: true, logging: false,
    onclone: d => {
      const e = d.createElement('style'); e.textContent = CSS_DA_CAPTURA; d.head.appendChild(e);
      d.querySelectorAll('textarea').forEach(ta => {
        const orig = document.getElementById(ta.id) || ta;
        const cs = getComputedStyle(orig);
        const div = d.createElement('div');
        div.textContent = ta.value || ta.placeholder || '';
        ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'color', 'padding', 'margin',
          'background', 'border', 'borderRadius', 'width', 'minHeight', 'letterSpacing']
          .forEach(p => { div.style[p] = cs[p]; });
        div.style.whiteSpace = 'pre-wrap';
        div.style.boxSizing = cs.boxSizing;
        ta.parentNode.replaceChild(div, ta);
      });
    }
  });
  const r = await fetch('/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, dados: c.toDataURL('image/png') })
  });
  return nome + ' ' + c.width + 'x' + c.height + ' ' + (await r.text());
};

// Amigos do feed e dos comentários — usados pelas telas 03 e 02.
window.AMIGOS = {
  'am-1': { id: 'am-1', display_name: 'Rafael Bastos', username: 'rafabastos' },
  'am-2': { id: 'am-2', display_name: 'Clara Menezes', username: 'clarinha' },
  'am-3': { id: 'am-3', display_name: 'Téo Nakamura', username: 'teonk' }
};
window.FOTO_DEMO = FOTO;
window.P_DEMO = P;

'demo.js carregado';
