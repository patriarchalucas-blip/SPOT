import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestPost, onRequestGet, pontuar, citacoesValidas, cidadeDaLista, ehPubliPeloTexto,
  ehHoraDePublicar, lugarDoGoogle, spotDoHotspot, categoriaPelosTipos, jsonDepoisDe } from '../functions/api/hotspots.js';

// O robô dos Hotspots (26/10/2026). Nada sai pra rede: YouTube, IA, Google,
// Supabase e KV são falsos.

const DONO = '00000000-0000-0000-0000-0000000000d0';
const FONTE = '00000000-0000-0000-0000-0000000000f0';
const TK = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura';
const HOJE = new Date().toISOString().slice(0, 10);
const AGORA = Date.now();

function kvFalso(inicial) {
  const m = new Map(inicial || []);
  return { m, get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v) }, delete: async (k) => { m.delete(k) } };
}
const resp = (o, s) => new Response(JSON.stringify(o), { status: s || 200 });
const feed = (videos) => '<feed>' + videos.map((v) => '<entry><yt:videoId>' + v.id + '</yt:videoId><title>' + v.titulo
  + '</title><published>' + HOJE + 'T10:00:00+00:00</published><media:description>' + v.desc + '</media:description></entry>').join('') + '</feed>';

// O que a "IA" devolve pra cada vídeo, pelo título.
const LEITURA = {
  'Favoritos do chef Ana': { publi: false, lugares: [
    { nome: 'Galeto Sats', endereco: '', bairro: 'Botafogo', cidade: 'Rio de Janeiro', voz: 'Ana', proprio: false, negativo: false },
    { nome: 'Bar da Frente', endereco: '', bairro: '', cidade: 'Rio de Janeiro', voz: 'Ana', proprio: false, negativo: false },
    { nome: 'Restaurante da Ana', endereco: '', bairro: '', cidade: 'Rio de Janeiro', voz: 'Ana', proprio: true, negativo: false }] },
  'Favoritos do chef Bia': { publi: false, lugares: [
    { nome: "Galeto Sat's", endereco: 'R. Real Grandeza, 212', bairro: '', cidade: 'Rio de Janeiro', voz: 'Bia', proprio: false, negativo: false },
    { nome: 'Restaurante da Ana', endereco: '', bairro: '', cidade: 'Rio de Janeiro', voz: 'Bia', proprio: false, negativo: false }] },
  'Rolê pago': { publi: true, lugares: [
    { nome: 'Bar da Frente', endereco: '', bairro: '', cidade: 'Rio de Janeiro', voz: 'Caio', proprio: false, negativo: false }] },
  'Bar em SP': { publi: false, lugares: [
    { nome: 'Bar da Frente', endereco: '', bairro: '', cidade: 'São Paulo', voz: 'Caio', proprio: false, negativo: false }] }
};
const GOOGLE = {
  'galeto sats': { id: 'gSats', displayName: { text: "Galeto Sat's" }, formattedAddress: 'R. Real Grandeza, 212 - Botafogo, Rio de Janeiro - RJ', location: { latitude: -22.95, longitude: -43.18 }, types: ['restaurant'], primaryType: 'brazilian_restaurant', photos: [{ name: 'places/gSats/photos/abc', widthPx: 800, heightPx: 600 }], googleMapsUri: 'https://maps.google.com/?cid=1' },
  'restaurante da ana': { id: 'gAna', displayName: { text: 'Restaurante da Ana' }, formattedAddress: 'Leblon, Rio de Janeiro - RJ', types: ['restaurant'], googleMapsUri: 'https://maps.google.com/?cid=2' },
  'bar da frente': { id: 'gFrente', displayName: { text: 'Bar da Frente' }, formattedAddress: 'Praça da Bandeira, Rio de Janeiro - RJ', types: ['bar'], googleMapsUri: 'https://maps.google.com/?cid=3' }
};

function mundo(opts) {
  const o = opts || {};
  const chamadas = { ia: 0, google: 0, escritas: [] };
  const fetchFalso = async (u, init) => {
    u = String(u);
    const corpo = init && init.body ? init.body : '';
    if (u.includes('/auth/v1/user')) return o.logado ? resp({ id: o.logado }) : resp({}, 401);
    if (u.includes('/rest/v1/moderadores')) return resp([{ user_id: DONO }]);
    if (u.includes('/rest/v1/profiles') && u.includes('username=eq.oqms_previa')) return resp([{ id: FONTE }]);
    if (u.includes('/rest/v1/trips') && (!init || !init.method || init.method === 'GET')) return resp(o.trip ? [{ id: 'tH' }] : []);
    if (u.includes('/rest/v1/spots') && (!init || !init.method || init.method === 'GET')) return resp(o.spotsAtuais || []);
    if (u.includes('/rest/v1/')) { chamadas.escritas.push({ metodo: init.method, u, corpo: corpo ? JSON.parse(corpo) : null }); return resp(init.method === 'POST' && u.includes('trips') ? [{ id: 'tNova' }] : [{}], 201) }
    if (u.includes('feeds/videos.xml')) {
      if (u.includes('CANAL_RIO')) return new Response(feed([
        { id: 'v1aaaaaaaaa', titulo: 'Favoritos do chef Ana', desc: 'lista' },
        { id: 'v2aaaaaaaaa', titulo: 'Favoritos do chef Bia', desc: 'lista' },
        { id: 'v3aaaaaaaaa', titulo: 'Rolê pago', desc: 'obrigado à marca #publi' }]));
      return new Response(feed([{ id: 'v4aaaaaaaaa', titulo: 'Bar em SP', desc: 'sp' }]));
    }
    if (u.includes('api.anthropic.com')) {
      chamadas.ia++;
      const titulo = (JSON.parse(corpo).messages[0].content.match(/Título: (.*)/) || [])[1];
      return resp({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(LEITURA[titulo] || { publi: false, lugares: [] }) }] });
    }
    if (u.includes('places.googleapis.com/v1/places/')) return resp({});
    if (u.includes('places:searchText')) {
      chamadas.google++;
      const q = JSON.parse(corpo).textQuery.toLowerCase().replace(/'/g, '');
      const k = Object.keys(GOOGLE).find((n) => q.startsWith(n));
      return resp({ places: k ? [GOOGLE[k]] : [] });
    }
    throw new Error('fetch inesperado ' + u);
  };
  const env = {
    SPOT_KV: kvFalso(o.kv), ANTHROPIC_API_KEY: 'a', GOOGLE_PLACES_KEY: 'g', SUPABASE_SERVICE_KEY: 's'
  };
  env.SPOT_KV.m.set('hs_fontes', JSON.stringify([
    { id: 'yt:CANAL_RIO', tipo: 'youtube', canal: 'CANAL_RIO', nome: 'Canal Rio', cidades: [] },
    { id: 'yt:CANAL_SP', tipo: 'youtube', canal: 'CANAL_SP', nome: 'Canal SP', cidades: ['São Paulo'] }]));
  return { env, chamadas, fetchFalso };
}
async function comFetch(f, corpo) {
  const orig = globalThis.fetch;
  globalThis.fetch = f;
  try { return await corpo() } finally { globalThis.fetch = orig }
}
const post = (env, body, comLogin) => onRequestPost({ env, request: new Request('https://x/api/hotspots', {
  method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, comLogin ? { Authorization: 'Bearer ' + TK } : {}), body: JSON.stringify(body) }) });

test('hotspots: a rodada cruza as vozes, tira o próprio e o publi, e não mostra a lista a quem não é dono', async () => {
  const w = mundo();
  const r = await comFetch(w.fetchFalso, async () => (await post(w.env, { op: 'rodar' })).json());
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.listas, undefined, 'pra quem não é dono, só números');
  assert.deepStrictEqual(r.porCidade, [['São Paulo', 0], ['Rio de Janeiro', 3]]);
  const semana = JSON.parse(w.env.SPOT_KV.m.get('hs_semana'));
  const rio = semana.listas.find((l) => l.cidade === 'Rio de Janeiro').lugares;
  // Galeto (Ana + Bia, grafias diferentes, mesmo lugar no Google) entra.
  // Bar da Frente: Ana + Caio só no vídeo publi -> 1 voz, fica de fora.
  // Restaurante da Ana: Ana é a dona -> só Bia conta -> fora.
  // Mira de 5: depois do único de 2 vozes, completa com os de 1 voz, marcados.
  assert.deepStrictEqual(rio.map((x) => [x.nome, x.n, !!x.umaVoz]), [["Galeto Sat's", 2, false], ["Bar da Frente", 1, true], ["Restaurante da Ana", 1, true]]);
  assert.ok(rio[0].novo);
  assert.strictEqual(w.chamadas.ia, 4);

  // Segunda rodada antes de 6 dias, sem ser o dono: não faz nada.
  const r2 = await comFetch(w.fetchFalso, async () => (await post(w.env, { op: 'rodar' })).json());
  assert.strictEqual(r2.pulou, 'cedo');
  assert.strictEqual(w.chamadas.ia, 4);
});

test('hotspots: o dono roda de novo sem gastar a IA nem o Google com o que já leu', async () => {
  const w = mundo({ logado: DONO });
  await comFetch(w.fetchFalso, () => post(w.env, { op: 'rodar' }, true));
  const ia = w.chamadas.ia, g = w.chamadas.google;
  const r = await comFetch(w.fetchFalso, async () => (await post(w.env, { op: 'rodar' }, true)).json());
  assert.ok(r.listas, 'o dono vê a lista');
  assert.strictEqual(w.chamadas.ia, ia);
  assert.strictEqual(w.chamadas.google, g);
});

test('hotspots: vídeo lido semanas atrás continua contando quando sai do feed', async () => {
  const w = mundo({ logado: DONO });
  await comFetch(w.fetchFalso, () => post(w.env, { op: 'rodar' }, true));
  // Agora o feed do Rio só mostra o vídeo da Bia (o da Ana "saiu").
  const f2 = async (u, init) => String(u).includes('CANAL_RIO') && String(u).includes('feeds')
    ? new Response(feed([{ id: 'v2aaaaaaaaa', titulo: 'Favoritos do chef Bia', desc: 'lista' }])) : w.fetchFalso(u, init);
  const r = await comFetch(f2, async () => (await post(w.env, { op: 'rodar' }, true)).json());
  const rio = r.listas.find((l) => l.cidade === 'Rio de Janeiro').lugares;
  assert.deepStrictEqual([rio[0].nome, rio[0].n], ["Galeto Sat's", 2]);
});

test('hotspots: a prévia da newsletter abre sem login, traz foto/preço/site e nunca quem indicou', async () => {
  const w = mundo({ logado: DONO });
  await comFetch(w.fetchFalso, () => post(w.env, { op: 'rodar' }, true));
  let detalhes = 0;
  const f2 = async (u, init) => {
    if (String(u).includes('places.googleapis.com/v1/places/gSats')) { detalhes++; return resp({ priceLevel: 'PRICE_LEVEL_MODERATE', priceRange: { startPrice: { units: '60' }, endPrice: { units: '100' } }, websiteUri: 'https://galetosats.com.br' }) }
    return w.fetchFalso(u, init);
  };
  const r = await comFetch(f2, async () => (await post(w.env, { op: 'previa' })).json());
  const rio = r.listas.find((l) => l.cidade === 'Rio de Janeiro').lugares;
  assert.strictEqual(rio[0].nome, "Galeto Sat's");
  assert.strictEqual(rio[0].preco, 2);
  assert.deepStrictEqual([rio[0].precoDe, rio[0].precoAte], [60, 100]);
  assert.strictEqual(rio[0].site, 'https://galetosats.com.br');
  assert.ok(rio[0].foto.startsWith('/api/place-photo?ref='));
  assert.ok(!JSON.stringify(r).includes('"vozes"') && !JSON.stringify(r).includes('Bia'), 'quem indicou não sai');
  await comFetch(f2, () => post(w.env, { op: 'previa' }));
  assert.strictEqual(detalhes, 1, 'o detalhe do Google é buscado uma vez só');
});

test('hotspots: GET e tirar são só do dono', async () => {
  const w = mundo({ logado: '00000000-0000-0000-0000-000000000099' });
  const g = await comFetch(w.fetchFalso, () => onRequestGet({ env: w.env, request: new Request('https://x/api/hotspots', { headers: { Authorization: 'Bearer ' + TK } }) }));
  assert.strictEqual(g.status, 403);
  const t = await comFetch(w.fetchFalso, () => post(w.env, { op: 'tirar', chave: 'x' }, true));
  assert.strictEqual(t.status, 403);
});

test('hotspots: publicar fora de sexta 17h não faz nada; o dono publica e o tirado não entra', async () => {
  const w = mundo({ logado: DONO, trip: true, spotsAtuais: [{ id: '11111111-1111-1111-1111-111111111111', name: 'Velho', maps_url: 'https://maps.google.com/?cid=9' }] });
  await comFetch(w.fetchFalso, () => post(w.env, { op: 'rodar' }, true));
  const semana = JSON.parse(w.env.SPOT_KV.m.get('hs_semana'));
  // Põe um segundo lugar na lista e tira ele.
  semana.listas[1].lugares.push({ chave: 'g:gFrente', nome: 'Bar da Frente', n: 2, g: lugarDoGoogle(GOOGLE['bar da frente'], 'Rio de Janeiro') });
  await w.env.SPOT_KV.put('hs_semana', JSON.stringify(semana));
  await comFetch(w.fetchFalso, () => post(w.env, { op: 'tirar', chave: 'g:gFrente' }, true));

  if (!ehHoraDePublicar(new Date())) {
    const anon = await comFetch(w.fetchFalso, async () => (await post(w.env, { op: 'publicar' })).json());
    assert.strictEqual(anon.pulou, 'fora_da_hora');
    assert.strictEqual(w.chamadas.escritas.length, 0);
  }
  const r = await comFetch(w.fetchFalso, async () => (await post(w.env, { op: 'publicar' }, true)).json());
  assert.strictEqual(r.ok, true);
  const ins = w.chamadas.escritas.find((e) => e.metodo === 'POST' && e.u.includes('/spots'));
  assert.deepStrictEqual(ins.corpo.map((s) => s.name), ["Galeto Sat's", "Restaurante da Ana"], 'o tirado (Bar da Frente) não entra');
  assert.strictEqual(ins.corpo[0].user_id, FONTE);
  assert.strictEqual(ins.corpo[0].status, 'want');
  assert.ok(!/Ana|Bia|Canal/.test(ins.corpo[0].my_note), 'nenhum nome de quem indicou');
  assert.ok(ins.corpo[0].photo_url.startsWith('/api/place-photo?ref=places%2FgSats'));
  const del = w.chamadas.escritas.find((e) => e.metodo === 'DELETE');
  assert.ok(del.u.includes('11111111-1111-1111-1111-111111111111'), 'o que saiu da lista sai da conta');
});

test('hotspots: peças', () => {
  assert.deepStrictEqual(jsonDepoisDe('x var ytInitialPlayerResponse = {"a":{"b":"}{"}};window.y=1', 'ytInitialPlayerResponse = '), { a: { b: '}{' } });
  assert.strictEqual(cidadeDaLista('rio'), 'Rio de Janeiro');
  assert.strictEqual(cidadeDaLista('SAO PAULO'), 'São Paulo');
  assert.strictEqual(cidadeDaLista('Lisboa'), '');
  assert.ok(ehPubliPeloTexto('valeu @marca #publidomoha'));
  assert.ok(!ehPubliPeloTexto('publicamos toda semana'));
  assert.strictEqual(ehHoraDePublicar(new Date('2026-10-30T20:05:00Z')), true);
  assert.strictEqual(ehHoraDePublicar(new Date('2026-10-30T19:59:00Z')), false);
  assert.strictEqual(ehHoraDePublicar(new Date('2026-10-29T21:00:00Z')), false);
  assert.strictEqual(lugarDoGoogle({ id: 'x', formattedAddress: 'Curitiba - PR' }, 'Rio de Janeiro'), null, 'homônimo em outra cidade');
  assert.strictEqual(categoriaPelosTipos(['point_of_interest'], 'japanese_restaurant'), 'food');
  assert.strictEqual(categoriaPelosTipos(['hotel']), 'hotel');
  // Fonte que só cobre SP não conta no Rio; citação velha demais não conta.
  const v = citacoesValidas([
    { nome: 'A', cidade: 'Rio', voz: 'x', cidadesDaFonte: ['São Paulo'], data: HOJE },
    { nome: 'B', cidade: 'Rio', voz: 'x', cidadesDaFonte: [], data: '2020-01-01' },
    { nome: 'C', cidade: 'Rio', voz: 'x', cidadesDaFonte: [], data: HOJE }], AGORA);
  assert.deepStrictEqual(v.map((c) => c.nome), ['C']);
  // Recente pesa mais: dois lugares com 2 vozes, o mais novo vem antes.
  const velho = new Date(AGORA - 150 * 86400000).toISOString().slice(0, 10);
  const p = pontuar([
    { nome: 'Velho', cidade: 'Rio de Janeiro', voz: 'a', data: velho }, { nome: 'Velho', cidade: 'Rio de Janeiro', voz: 'b', data: velho },
    { nome: 'Novo', cidade: 'Rio de Janeiro', voz: 'a', data: HOJE }, { nome: 'Novo', cidade: 'Rio de Janeiro', voz: 'b', data: HOJE },
    { nome: 'Novo', cidade: 'Rio de Janeiro', voz: 'A', data: HOJE }], 'Rio de Janeiro', AGORA);
  assert.deepStrictEqual(p.map((x) => [x.nome, x.n]), [['Novo', 2], ['Velho', 2]], 'a mesma voz com outra caixa conta uma vez');
  const s = spotDoHotspot({ n: 3, nome: 'X', g: { nome: 'X', categoria: 'food', endereco: 'Rua', maps: 'm' } }, 'u', 't', 'Rio de Janeiro');
  assert.strictEqual(s.category, 'food');
  assert.strictEqual(s.my_note, 'Citado por 3 vozes da cena nas últimas semanas.');
});
