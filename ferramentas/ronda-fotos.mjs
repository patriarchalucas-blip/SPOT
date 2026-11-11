// Ronda das fotos (11/11/2026): abre TODA foto do app (spots, fotos subidas,
// avatares) do jeito que o celular abre, todo dia de madrugada. Abrir já cura:
// o /api/foto troca código e link vencidos pela foto atual do lugar, então
// quando alguém abre o app de manhã a foto já está boa. O que continuar
// quebrado depois de 2 tentativas faz o robô FALHAR — o GitHub manda e-mail.
//
// O repositório é público e o log também: aqui só saem NÚMEROS. Nada de
// endereço, id de spot ou de pessoa.
//
// Uso: SUPABASE_SERVICE_KEY_SP=... node ferramentas/ronda-fotos.mjs
const SB = 'https://hkbynilmpsfamsqochnk.supabase.co';
const SITE = 'https://meuspot.app';
const K = process.env.SUPABASE_SERVICE_KEY_SP;
if (!K) { console.log('sem SUPABASE_SERVICE_KEY_SP'); process.exit(1); }

async function lista(caminho) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(SB + caminho, { headers: { apikey: K, Authorization: 'Bearer ' + K, Range: de + '-' + (de + 999) } });
    if (!r.ok) throw new Error('banco ' + r.status);
    const pag = await r.json();
    out.push(...pag);
    if (pag.length < 1000) return out;
  }
}

// Mesmo endereço que o app exibe (paraExibir no index.html).
function comoOAppAbre(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (s.startsWith('/api/place-photo?')) return SITE + '/api/foto?' + s.slice(17);
  if (s.startsWith('/')) return SITE + s;
  return s;
}

async function abre(u) {
  try {
    const r = await fetch(u, { headers: { Referer: SITE + '/' }, redirect: 'follow' });
    const tipo = r.headers.get('content-type') || '';
    await r.arrayBuffer();
    return r.ok && tipo.startsWith('image/');
  } catch (e) { return false; }
}

const [spots, perfis, fotos] = await Promise.all([
  lista('/rest/v1/spots?select=photo_url&photo_url=not.is.null'),
  lista('/rest/v1/profiles?select=avatar_url&avatar_url=not.is.null'),
  lista('/rest/v1/spot_fotos?select=url'),
]);
const todas = [...new Set([
  ...spots.map((x) => x.photo_url), ...perfis.map((x) => x.avatar_url), ...fotos.map((x) => x.url),
].map(comoOAppAbre).filter(Boolean))];

let ok = 0;
const ruins = [];
const fila = [...todas];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (fila.length) {
    const u = fila.shift();
    if (await abre(u)) ok++; else ruins.push(u);
  }
}));
// 2ª tentativa: a 1ª pode ter acabado de curar (ou o Google estava lento).
let curadas = 0;
const restam = [];
for (const u of ruins) { if (await abre(u)) curadas++; else restam.push(u); }

console.log(`fotos: ${todas.length} · abriram ${ok + curadas} · curadas na 2ª tentativa ${curadas} · quebradas ${restam.length}`);
if (restam.length) process.exit(1);
