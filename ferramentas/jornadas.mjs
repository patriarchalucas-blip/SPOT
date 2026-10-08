// Jornadas entre DUAS contas (A e B) no mesmo banco falso.
//
// Duas páginas do Chrome, cada uma logada numa conta, falando com UM banco em
// memória neste processo. O banco imita o PostgREST (filtros eq/neq/in/is/cs/
// or/and/not, order, limit, select) e as regras do RLS das migrações 001–032
// que o app depende: dono vê o seu; amigo aceito vê trips/spots menos o Quero
// ir de viagem privada (028); follows só os próprios vínculos; comentário em
// spot visível (012); cidades_visitadas dono + amigo (032); bloqueio desfaz a
// amizade (027) e impede pedido novo (032).
//
// O login é o de verdade do SDK (/auth/v1/token e /auth/v1/signup falsos): o
// app recebe a sessão pelo onAuthStateChange, como no celular.
//
// Rodar:  1) servidor estático na porta 8935 servindo a pasta do repo;
//         2) node jornadas.mjs   → termina com "FALHAS (n)" (saída 1 se n > 0).
//         SO_ATE=3 node jornadas.mjs  → para depois da jornada 3 (mais rápido).
//         VERBOSO=1 → mostra cada asserção ok e as respostas 4xx do banco falso.
// Leva ~2 min. Seis jornadas: 1 cadastro+amizade · 2 spots/privacidade/
// comentário · 3 salvar do amigo/Planejar/Montar/Mandar · 4 cidades visitadas ·
// 5 bloqueio/desbloqueio/desfazer · 6 troca de conta no mesmo aparelho (casca).
// Duas asserções dependem do relógio (memória de 2 min do Planejar): antes do
// conserto falham quase sempre; numa máquina muito lenta podem passar.
// Nada sai pra internet além do que o próprio Chrome pede (fontes, mapa).
import { createRequire } from 'module';
import crypto from 'crypto';
const RAIZ = 'C:/Users/lucas.patriarcha_sol/Downloads/Spot-20260923T193028Z-1-001/Spot/';
const require = createRequire(RAIZ + 'ferramentas/capturas-loja/');
const puppeteer = require('puppeteer-core');
const SITE = process.env.SPOT_SITE || 'http://localhost:8935';
const VERBOSO = !!process.env.VERBOSO;

// ═══ asserções ═══
const FALHAS = [], OKS = [];
let JORNADA = '';
function confere(cond, nome, detalhe) {
  const rot = '[' + JORNADA + '] ' + nome;
  if (cond) { OKS.push(rot); if (VERBOSO) console.log('  ok  ', nome) }
  else { FALHAS.push(rot + (detalhe !== undefined ? '  → ' + (typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe)) : '')); console.log('  FALHOU', nome, detalhe !== undefined ? '→ ' + (typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe)).slice(0, 300) : '') }
}
const espera = ms => new Promise(r => setTimeout(r, ms));
async function ate(fn, ms = 4000, passo = 100) { const fim = Date.now() + ms; let v; while (Date.now() < fim) { try { v = await fn(); if (v) return v } catch (e) {} await espera(passo) } return v }

// ═══ contas ═══
const uuid = () => crypto.randomUUID();
const CONTAS = {};   // email → {id,email,senha,meta}
function novaConta(email, senha, meta) { const c = { id: uuid(), email, senha, meta: meta || {}, criada: new Date().toISOString() }; CONTAS[email] = c; return c }
const A = novaConta('ana.teste@exemplo.test', 'senhaA-teste-1', { full_name: 'Ana Teste', onboarding_done: true });
const B_EMAIL = 'bruno.teste@exemplo.test', B_SENHA = 'senhaB-teste-2';
let B = null;   // nasce no cadastro (jornada 1)

// ═══ banco ═══
const agora = () => new Date().toISOString();
const DB = { profiles: [], trips: [], spots: [], follows: [], spot_comments: [], spot_fotos: [], cidades_visitadas: [], bloqueios: [], invites: [], push_tokens: [], denuncias: [] };
DB.profiles.push({ id: A.id, display_name: 'Ana Teste', username: 'anateste', home_city: 'São Paulo', home_country: 'Brasil', avatar_url: null, bio: '', created_at: '2026-09-01T10:00:00Z' });
DB.trips.push({ id: uuid(), user_id: A.id, name: 'São Paulo', destinations: ['Brasil'], dates: '__casa__', status: 'planning', initial_city: 'São Paulo', privada: false, proxima: false, created_at: '2026-09-01T10:00:00Z' });

// handle_new_user (032): nome do full_name, senão o começo do e-mail; username sem acento
function criarPerfil(c) {
  const nome = (c.meta.full_name || c.meta.name || '').trim() || c.email.split('@')[0];
  let base = (c.meta.full_name || c.email.split('@')[0]).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (base.length < 3) base = 'spot' + base; base = base.slice(0, 15);
  let cand = base; while (DB.profiles.some(p => p.username === cand)) cand = base + (1000 + Math.floor(Math.random() * 9000));
  DB.profiles.push({ id: c.id, display_name: nome, username: cand, home_city: null, home_country: null, avatar_url: null, bio: '', created_at: agora() });
}

const amigos = (x, y) => DB.follows.some(f => f.status === 'accepted' && ((f.follower_id === x && f.following_id === y) || (f.following_id === x && f.follower_id === y)));
const viagemPrivada = tid => !!(DB.trips.find(t => t.id === tid) || {}).privada;
const viagemSemFui = tid => !DB.spots.some(s => s.trip_id === tid && s.status !== 'want');
const haBloqueio = (x, y) => DB.bloqueios.some(b => (b.bloqueador_id === x && b.bloqueado_id === y) || (b.bloqueador_id === y && b.bloqueado_id === x));
const spotVisivel = (uid, s) => !!s && (s.user_id === uid || (amigos(uid, s.user_id) && !(s.status === 'want' && s.trip_id && viagemPrivada(s.trip_id))));

const RLS = {
  profiles: { ver: (u, r) => r.id === u || amigos(u, r.id), por: (u, r) => r.id === u, mudar: (u, r) => r.id === u },
  follows: { ver: (u, r) => r.follower_id === u || r.following_id === u,
    por: (u, r) => r.follower_id === u && r.status === 'pending' && r.follower_id !== r.following_id && !haBloqueio(r.follower_id, r.following_id),
    mudar: (u, r) => r.following_id === u && r.status === 'pending', depois: (u, r) => r.following_id === u && r.status === 'accepted',
    tirar: (u, r) => r.follower_id === u || r.following_id === u },
  trips: { ver: (u, r) => r.user_id === u || (amigos(u, r.user_id) && !(r.privada && viagemSemFui(r.id))), por: (u, r) => r.user_id === u, mudar: (u, r) => r.user_id === u, tirar: (u, r) => r.user_id === u },
  spots: { ver: spotVisivel,
    por: (u, r) => r.user_id === u && (!r.trip_id || DB.trips.some(t => t.id === r.trip_id && t.user_id === u)),
    mudar: (u, r) => r.user_id === u, depois: (u, r) => r.user_id === u && (!r.trip_id || DB.trips.some(t => t.id === r.trip_id && t.user_id === u)), tirar: (u, r) => r.user_id === u },
  spot_comments: { ver: (u, r) => spotVisivel(u, DB.spots.find(s => s.id === r.spot_id)), por: (u, r) => r.user_id === u && spotVisivel(u, DB.spots.find(s => s.id === r.spot_id)),
    tirar: (u, r) => r.user_id === u || (DB.spots.find(s => s.id === r.spot_id) || {}).user_id === u },
  spot_fotos: { ver: (u, r) => spotVisivel(u, DB.spots.find(s => s.id === r.spot_id)), por: (u, r) => r.user_id === u && (DB.spots.find(s => s.id === r.spot_id) || {}).user_id === u, tirar: (u, r) => r.user_id === u },
  cidades_visitadas: { ver: (u, r) => r.user_id === u || amigos(u, r.user_id), por: (u, r) => r.user_id === u, tirar: (u, r) => r.user_id === u },
  bloqueios: { ver: (u, r) => r.bloqueador_id === u, por: (u, r) => r.bloqueador_id === u, tirar: (u, r) => r.bloqueador_id === u },
  invites: { ver: (u, r) => r.user_id === u, por: (u, r) => r.user_id === u, mudar: (u, r) => r.user_id === u, tirar: (u, r) => r.user_id === u },
  push_tokens: { ver: (u, r) => r.user_id === u, por: (u, r) => r.user_id === u, mudar: (u, r) => r.user_id === u, tirar: (u, r) => r.user_id === u },
  denuncias: { ver: (u, r) => r.autor_id === u, por: (u, r) => r.autor_id === u },
};
const UNICOS = { follows: ['follower_id', 'following_id'], bloqueios: ['bloqueador_id', 'bloqueado_id'], cidades_visitadas: ['user_id', 'chave'], profiles: ['id'] };
const PADRAO = {
  spot_fotos: u => ({ user_id: u }),   // default auth.uid() (030)
  trips: () => ({ privada: false, proxima: false, status: 'planning', dates: '', destinations: [] }),
  spots: () => ({ status: 'want', my_rating: null, my_review: null, my_note: null, photo_url: null, from_user_id: null, fui_em: null }),
};

// ── PostgREST: filtros ──
function partesNoTopo(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = '' } else cur += ch } if (cur) out.push(cur); return out }
const tiraAspas = v => v.replace(/^"(.*)"$/, '$1');
function cond(col, expr, row) {
  let neg = false; if (expr.startsWith('not.')) { neg = true; expr = expr.slice(4) }
  const i = expr.indexOf('.'); const op = expr.slice(0, i), val = expr.slice(i + 1);
  const v = row[col]; let r;
  switch (op) {
    case 'eq': r = v != null && String(v) === val; break;
    case 'neq': r = v != null && String(v) !== val; break;
    case 'in': { const l = partesNoTopo(val.replace(/^\(|\)$/g, '')).map(tiraAspas); r = v != null && l.includes(String(v)); break }
    case 'is': r = val === 'null' ? v == null : val === 'true' ? v === true : val === 'false' ? v === false : false; if (neg) return !r; return r;
    case 'cs': { const l = val.replace(/^\{|\}$/g, '').split(',').map(tiraAspas).filter(Boolean); r = Array.isArray(v) && l.every(x => v.includes(x)); break }
    case 'gt': r = v != null && Number(v) > Number(val); break; case 'gte': r = v != null && Number(v) >= Number(val); break;
    case 'lt': r = v != null && Number(v) < Number(val); break; case 'lte': r = v != null && Number(v) <= Number(val); break;
    case 'like': case 'ilike': { const re = new RegExp('^' + val.split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', op === 'ilike' ? 'i' : ''); r = v != null && re.test(String(v)); break }
    default: throw new Error('operador não imitado: ' + op);
  }
  if (v == null) return false;      // SQL: null em comparação não passa, nem negado
  return neg ? !r : r;
}
function logica(tipo, corpo, row) {   // corpo sem os parênteses externos
  const itens = partesNoTopo(corpo);
  const av = it => { const m = it.match(/^(not\.)?(and|or)\((.*)\)$/); if (m) { const x = logica(m[2], m[3], row); return m[1] ? !x : x }
    const k = it.indexOf('.'); return cond(it.slice(0, k), it.slice(k + 1), row) };
  return tipo === 'and' ? itens.every(av) : itens.some(av);
}
function consulta(qs) {
  const ps = new URLSearchParams(qs); const filtros = []; let order = null, limit = null, offset = 0, select = null;
  for (const [k, v] of ps) {
    if (k === 'select') select = v; else if (k === 'order') order = v; else if (k === 'limit') limit = Number(v); else if (k === 'offset') offset = Number(v);
    else if (k === 'on_conflict' || k === 'columns') {}
    else if (k === 'or' || k === 'and') filtros.push(row => logica(k, v.replace(/^\(|\)$/g, ''), row));
    // Filtro na tabela embutida (select=*,spots!inner(user_id)&spots.user_id=eq.X):
    // a linha relacionada sai da coluna <tabela no singular>_id.
    else if (k.includes('.')) { const [tab, col] = k.split('.'); filtros.push(row => { const rel = (DB[tab] || []).find(x => x.id === row[tab.replace(/s$/, '') + '_id']); return !!rel && cond(col, v, rel) }) }
    else filtros.push(row => cond(k, v, row));
  }
  return { filtra: row => filtros.every(f => f(row)), order, limit, offset, select };
}
function ordena(l, order) {
  if (!order) return l;
  const regras = order.split(',').map(o => { const p = o.split('.'); return { col: p[0], desc: p.includes('desc'), nullsLast: p.includes('nullslast') ? true : p.includes('nullsfirst') ? false : !p.includes('desc') } });
  return l.slice().sort((a, b) => { for (const r of regras) { const x = a[r.col], y = b[r.col]; if (x == y) continue; if (x == null) return r.nullsLast ? 1 : -1; if (y == null) return r.nullsLast ? -1 : 1; const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); if (c) return r.desc ? -c : c } return 0 });
}
function projeta(l, select) {
  if (!select || select === '*' || select.includes('(')) return l;
  const cols = select.split(',').map(s => s.trim()); return l.map(r => Object.fromEntries(cols.map(c => [c, r[c] === undefined ? null : r[c]])));
}

// ── RPCs ──
const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const spotsPublicos = id => DB.spots.filter(s => s.user_id === id && s.status === 'been' && !viagemPrivada(s.trip_id)).length;
const RPC = {
  search_profiles: (u, { termo }) => { const t = semAcento(String(termo || '').trim()); if (t.length < 3) return [];
    return DB.profiles.filter(p => p.id !== u && (semAcento(p.username).startsWith(t) || semAcento(p.display_name).includes(t)) && !haBloqueio(u, p.id))
      .map(p => ({ id: p.id, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url, home_city: p.home_city, spots: spotsPublicos(p.id), exato: semAcento(p.username) === t }))
      .sort((a, b) => (b.exato - a.exato) || (b.spots > 0) - (a.spots > 0) || b.spots - a.spots).slice(0, 10).map(({ exato, ...p }) => p) },
  amigo_em_comum: (u, { ids }) => { const meus = DB.profiles.filter(p => amigos(u, p.id)).map(p => p.id); return (ids || []).map(id => { const c = meus.find(m => amigos(m, id)); return c ? { pessoa: id, amigo: (DB.profiles.find(p => p.id === c) || {}).display_name } : null }).filter(Boolean) },
  pending_request_profiles: u => DB.profiles.filter(p => DB.follows.some(f => f.status === 'pending' && ((f.follower_id === u && f.following_id === p.id) || (f.following_id === u && f.follower_id === p.id))))
    .map(p => ({ id: p.id, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url, home_city: p.home_city, spots: spotsPublicos(p.id) })),
  perfis_da_conversa: (u, { p_spot }) => { const s = DB.spots.find(x => x.id === p_spot); if (!spotVisivel(u, s)) return [];
    const ids = new Set(DB.spot_comments.filter(c => c.spot_id === p_spot).map(c => c.user_id)); return DB.profiles.filter(p => ids.has(p.id)).map(p => ({ id: p.id, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url })) },
  find_profile_by_username: (u, { uname }) => DB.profiles.filter(p => semAcento(p.username) === semAcento(uname)).map(p => ({ id: p.id, display_name: p.display_name, username: p.username })),
  registrar_aparelho: () => null,
  invite_owner: () => [], invite_preview: () => [], redeem_invite: () => null,
};

// ── o que cada conta pediu (pra conferir avisos e erros) ──
const AVISOS = [];        // /api/notificar
const ERROS_APP = [];     // /api/erro (o app reporta os próprios erros)
const RECUSAS = [];       // escrita que o RLS falso recusou
const ESCRITAS = [];      // PATCH em spots (pra depurar)
let FALHA_STORAGE = false;   // true = a foto do armazenamento falha ao abrir

function quemE(headers) {
  const h = headers.authorization || headers.Authorization || ''; const tk = h.replace(/^Bearer\s+/i, '');
  try { const p = JSON.parse(Buffer.from(tk.split('.')[1], 'base64url').toString()); return p.role === 'authenticated' ? p.sub : null } catch (e) { return null }
}
function jwt(c) {
  const b = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  return b({ alg: 'HS256', typ: 'JWT' }) + '.' + b({ sub: c.id, email: c.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 36000 }) + '.assinatura-falsa';
}
const usuario = c => ({ id: c.id, aud: 'authenticated', role: 'authenticated', email: c.email, email_confirmed_at: c.criada, created_at: c.criada, app_metadata: { provider: 'email' }, user_metadata: c.meta, identities: [{ id: c.id, provider: 'email' }] });
const sessao = c => ({ access_token: jwt(c), token_type: 'bearer', expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: 'rt-' + c.id, user: usuario(c) });

function restResponde(metodo, tabela, qs, corpoTxt, headers) {
  const u = quemE(headers);
  const prefer = headers.prefer || headers.Prefer || '';
  const j = (status, body) => ({ status, body: body === undefined ? '' : JSON.stringify(body) });
  if (tabela === 'rpc') {
    const fn = qs.split('?')[0];
    if (!RPC[fn]) return j(404, { code: 'PGRST202', message: 'função não imitada: ' + fn });
    if (!u) return j(401, { code: '42501', message: 'permission denied for function' });
    let corpo = {}; try { corpo = JSON.parse(corpoTxt || '{}') } catch (e) {}
    return j(200, RPC[fn](u, corpo));
  }
  if (!DB[tabela]) return j(404, { code: 'PGRST205', message: 'tabela não existe: ' + tabela });
  const pol = RLS[tabela] || {};
  if (!u) return j(401, { code: '42501', message: 'permission denied' });
  const q = consulta(qs);
  if (metodo === 'GET') {
    let l = DB[tabela].filter(r => pol.ver && pol.ver(u, r) && q.filtra(r));
    l = ordena(l, q.order).slice(q.offset, q.limit != null ? q.offset + q.limit : undefined);
    return j(200, projeta(l, q.select));
  }
  if (metodo === 'POST') {
    let corpo; try { corpo = JSON.parse(corpoTxt || '{}') } catch (e) { return j(400, { message: 'json' }) }
    const linhas = (Array.isArray(corpo) ? corpo : [corpo]).map(b => Object.assign({ id: uuid(), created_at: agora() }, (PADRAO[tabela] || (() => ({})))(u), b));
    const ignora = /resolution=ignore-duplicates/.test(prefer);
    const novas = [];
    for (const r of linhas) {
      if (!pol.por || !pol.por(u, r)) { RECUSAS.push({ u, tabela, r }); return j(403, { code: '42501', message: 'new row violates row-level security policy for table "' + tabela + '"' }) }
      const un = UNICOS[tabela];
      if (un && DB[tabela].concat(novas).some(x => un.every(k => x[k] === r[k]))) { if (ignora) continue; return j(409, { code: '23505', message: 'duplicate key value violates unique constraint' }) }
      if (tabela === 'spots' && r.status === 'been') r.fui_em = agora();
      novas.push(r);
    }
    DB[tabela].push(...novas);
    if (tabela === 'bloqueios') novas.forEach(b => { DB.follows = DB.follows.filter(f => !((f.follower_id === b.bloqueador_id && f.following_id === b.bloqueado_id) || (f.follower_id === b.bloqueado_id && f.following_id === b.bloqueador_id))) });
    return /return=representation/.test(prefer) ? j(201, novas) : j(201);
  }
  if (metodo === 'PATCH') {
    let patch; try { patch = JSON.parse(corpoTxt || '{}') } catch (e) { return j(400, {}) }
    const alvo = DB[tabela].filter(r => pol.ver && pol.ver(u, r) && pol.mudar && pol.mudar(u, r) && q.filtra(r));
    for (const r of alvo) { const novo = Object.assign({}, r, patch); if (pol.depois && !pol.depois(u, novo)) { RECUSAS.push({ u, tabela, patch }); return j(403, { code: '42501', message: 'new row violates row-level security policy (USING expression)' }) } }
    if (tabela === 'spots') ESCRITAS.push({ u, qs, patch });
    alvo.forEach(r => { const antes = r.status; Object.assign(r, patch); if (tabela === 'spots' && 'status' in patch) { if (r.status === 'been' && antes !== 'been') r.fui_em = agora(); else if (r.status !== 'been') r.fui_em = null } });
    return /return=representation/.test(prefer) ? j(200, alvo) : j(204);
  }
  if (metodo === 'DELETE') {
    const alvo = DB[tabela].filter(r => pol.ver && pol.ver(u, r) && pol.tirar && pol.tirar(u, r) && q.filtra(r));
    DB[tabela] = DB[tabela].filter(r => !alvo.includes(r));
    if (tabela === 'trips') DB.spots = DB.spots.filter(s => !alvo.some(t => t.id === s.trip_id));
    if (tabela === 'spots') { DB.spot_comments = DB.spot_comments.filter(c => !alvo.some(s => s.id === c.spot_id)); DB.spot_fotos = DB.spot_fotos.filter(c => !alvo.some(s => s.id === c.spot_id)) }
    return /return=representation/.test(prefer) ? j(200, alvo) : j(204);
  }
  return j(405, {});
}

function authResponde(caminho, metodo, corpoTxt, headers) {
  let corpo = {}; try { corpo = JSON.parse(corpoTxt || '{}') } catch (e) {}
  const j = (status, body) => ({ status, body: body === undefined ? '' : JSON.stringify(body) });
  if (caminho.startsWith('token') && /grant_type=password/.test(caminho)) {
    const c = CONTAS[String(corpo.email || '').toLowerCase()];
    if (!c || c.senha !== corpo.password) return j(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' });
    return j(200, sessao(c));
  }
  if (caminho.startsWith('token') && /grant_type=refresh_token/.test(caminho)) {
    const c = Object.values(CONTAS).find(x => 'rt-' + x.id === corpo.refresh_token); return c ? j(200, sessao(c)) : j(400, { error: 'invalid_grant' });
  }
  if (caminho.startsWith('signup')) {
    const email = String(corpo.email || '').toLowerCase();
    if (CONTAS[email]) return j(200, { user: Object.assign(usuario(CONTAS[email]), { identities: [] }), session: null });
    const c = novaConta(email, corpo.password, Object.assign({}, corpo.data || {}));
    criarPerfil(c);
    if (email === B_EMAIL) B = c;
    return j(200, sessao(c));   // confirmação de e-mail desligada: entra direto
  }
  if (caminho.startsWith('user')) {
    const id = quemE(headers); const c = Object.values(CONTAS).find(x => x.id === id);
    if (!c) return j(401, { msg: 'sem sessão' });
    if (metodo === 'PUT') Object.assign(c.meta, corpo.data || {});
    return j(200, usuario(c));
  }
  if (caminho.startsWith('logout')) return j(204);
  return j(200, {});
}

// ═══ Google, lugares, IA: falsos ═══
const CIDADES = [['São Paulo', 'Brasil', -23.55, -46.63], ['Rio de Janeiro', 'Brasil', -22.9, -43.2], ['Lisboa', 'Portugal', 38.72, -9.14], ['Porto', 'Portugal', 41.15, -8.61], ['Sintra', 'Portugal', 38.8, -9.38],
  ['Madri', 'Espanha', 40.42, -3.7], ['Barcelona', 'Espanha', 41.39, 2.17], ['Sevilha', 'Espanha', 37.39, -5.98], ['Roma', 'Itália', 41.9, 12.5]];
const LUGARES = [['Taberna da Rua das Flores', 'Lisboa'], ['Cervejaria Ramiro', 'Lisboa'], ['Café Santiago', 'Porto'], ['Casa Lucio', 'Madri'], ['Bar Brahma', 'São Paulo'], ['Mocotó', 'São Paulo'], ['Pastéis de Belém', 'Lisboa']];
const slug = s => semAcento(s).replace(/[^a-z0-9]+/g, '_');
function placeCidade([n, p, la, lo]) { return { id: 'ChIJcid_' + slug(n), displayName: { text: n }, formattedAddress: n + ', ' + p, types: ['locality', 'political'], primaryType: 'locality',
  addressComponents: [{ types: ['locality'], longText: n, shortText: n }, { types: ['country'], longText: p, shortText: p.slice(0, 2).toUpperCase() }], location: { latitude: la, longitude: lo } } }
function placeLugar([n, c]) { const cid = CIDADES.find(x => x[0] === c); const p = cid[1];
  return { id: 'ChIJlug_' + slug(n), displayName: { text: n }, formattedAddress: 'Rua Teste 10, ' + c + ', ' + p, types: ['restaurant', 'food', 'establishment'], primaryType: 'restaurant', rating: 4.6, userRatingCount: 900, priceLevel: 'PRICE_LEVEL_MODERATE',
    addressComponents: [{ types: ['locality'], longText: c, shortText: c }, { types: ['country'], longText: p, shortText: p.slice(0, 2).toUpperCase() }], location: { latitude: cid[2] + 0.01, longitude: cid[3] + 0.01 },
    photos: [1, 2].map(k => ({ name: 'places/ChIJlug_' + slug(n) + '/photos/AUc7tXfotoTeste' + 'x'.repeat(380) + k, authorAttributions: [{ displayName: 'Autor ' + k }] })) } }
function placesResponde(corpoTxt) {
  let b = {}; try { b = JSON.parse(corpoTxt || '{}') } catch (e) {}
  const t = semAcento(b.textQuery || '');
  if (b.op === 'searchNearby') return { places: [] };
  if (b.includedType === 'locality' || b.includedType === 'administrative_area_level_2') return { places: CIDADES.filter(c => t.includes(semAcento(c[0]))).map(placeCidade) };
  const l = LUGARES.filter(x => t.includes(semAcento(x[0]).slice(0, 8)));
  if (l.length) return { places: l.map(placeLugar) };
  return { places: CIDADES.filter(c => t.startsWith(semAcento(c[0]))).map(placeCidade) };
}
function lugarResponde(corpoTxt) {
  let b = {}; try { b = JSON.parse(corpoTxt || '{}') } catch (e) {}
  const t = semAcento(b.texto || '');
  if (b.op === 'sugerir') return { sugestoes: CIDADES.filter(c => semAcento(c[0]).startsWith(t)).map(c => ({ id: 'ChIJcid_' + slug(c[0]), titulo: c[0], sub: c[1], tipos: ['locality', 'political'] })),
    spots: LUGARES.filter(x => semAcento(x[0]).startsWith(t)).map(x => ({ id: 'ChIJlug_' + slug(x[0]), titulo: x[0], sub: x[1], tipos: ['restaurant'] })) };
  if (b.op === 'detalhe') { const c = CIDADES.find(x => 'ChIJcid_' + slug(x[0]) === b.id); if (c) return { lugar: placeCidade(c) }; const l = LUGARES.find(x => 'ChIJlug_' + slug(x[0]) === b.id); return l ? { lugar: placeLugar(l) } : {} }
  return {};
}
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

// ═══ o navegador ═══
const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-first-run'] });
const PAGINAS = {};
async function abrirAparelho(nome, { casca }) {
  // Contexto separado = aparelho separado (localStorage próprio).
  const ctx = await br.createBrowserContext();
  const pg = await ctx.newPage();
  await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  pg.__nome = nome; pg.__erros = [];
  pg.on('pageerror', e => pg.__erros.push(e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) pg.__erros.push('console: ' + m.text().slice(0, 300)) });
  pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.evaluateOnNewDocument((casca) => {
    // O seletor de confirmação do app (perguntar) é testado à parte; aqui
    // "Sim" sempre, pra a jornada andar.
    window.__CONFIRMA_SEMPRE = true;
    window.__casca = [];
    if (casca) {
      window.ReactNativeWebView = { postMessage: m => { try { window.__casca.push(JSON.parse(m)) } catch (e) { window.__casca.push({ cru: String(m) }) } } };
      window.enderecoDeVoltaDoLogin = 'spot://x';
    }
    // Compartilhar (convite, mandar pro grupo) não abre folha nenhuma aqui.
    try { navigator.share = async d => { window.__compartilhado = (window.__compartilhado || []).concat([d]) } } catch (e) {}
  }, !!casca);
  await pg.setRequestInterception(true);
  pg.on('request', r => trataPedido(pg, r).catch(e => { console.log('mock quebrou', e.message); try { r.abort() } catch (x) {} }));
  PAGINAS[nome] = pg;
  return pg;
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*' };
async function trataPedido(pg, r) {
  const u = r.url(), metodo = r.method();
  const responde = (status, body, tipo) => r.respond({ status, headers: CORS, contentType: tipo || 'application/json', body: body === undefined ? '' : body });
  if (metodo === 'OPTIONS') return r.respond({ status: 204, headers: CORS });
  const h = r.headers();
  let m = u.match(/supabase\.co\/rest\/v1\/([a-z_]+)(?:\/([^?]*))?\??(.*)$/);
  if (m) {
    const tabela = m[1], qs = m[1] === 'rpc' ? m[2] : m[3];
    const res = restResponde(metodo, tabela, qs, r.postData(), h);
    if (res.status >= 400 && VERBOSO) console.log('   [' + pg.__nome + '] ' + metodo + ' ' + tabela + ' → ' + res.status + ' ' + res.body.slice(0, 120));
    return responde(res.status, res.body);
  }
  m = u.match(/supabase\.co\/auth\/v1\/(.*)$/);
  if (m) { const res = authResponde(m[1], metodo, r.postData(), h); return responde(res.status, res.body) }
  if (/supabase\.co\/storage\/v1\/object\/uploads\//.test(u)) { if (metodo === 'POST') return responde(200, JSON.stringify({ Key: 'uploads/x' })); return responde(200, PNG1, 'image/png') }
  // Bucket público (003): a URL pública abre sem RLS. FALHA_STORAGE simula um soluço.
  if (/supabase\.co\/storage\/v1\/object\/public\/uploads\//.test(u)) return FALHA_STORAGE ? responde(503, 'indisponivel', 'text/plain') : responde(200, PNG1, 'image/png');
  if (/supabase\.co\/storage/.test(u)) return responde(200, '[]');
  if (u.startsWith(SITE + '/api/')) {
    const api = u.slice(SITE.length + 5).split('?')[0];
    if (api === 'notificar') { let b = {}; try { b = JSON.parse(r.postData() || '{}') } catch (e) {} AVISOS.push(Object.assign({ de: quemE(h), aparelho: pg.__nome }, b)); return responde(200, '{"ok":true}') }
    if (api === 'erro') { let b = {}; try { b = JSON.parse(r.postData() || '{}') } catch (e) {} ERROS_APP.push(Object.assign({ aparelho: pg.__nome }, b)); return responde(200, '{}') }
    if (api === 'places') return responde(200, JSON.stringify(placesResponde(r.postData())));
    if (api === 'lugar') return responde(200, JSON.stringify(lugarResponde(r.postData())));
    if (api === 'place-photo' || api === 'city-photo' && metodo === 'GET' && /img=1/.test(u)) return responde(200, PNG1, 'image/png');
    if (api === 'importar') return responde(200, JSON.stringify(metodo === 'GET' ? { ligado: true } : { lugares: [] }));
    if (api === 'lista') return responde(200, JSON.stringify({ codigo: 'abcdefgh1234' }));
    return responde(200, '{}');
  }
  if (/fonts\.(googleapis|gstatic)\.com|unsplash|googleusercontent|maps\.googleapis/.test(u)) return responde(200, '', 'text/plain');
  return r.continue();
}

// ═══ ajudas por aparelho ═══
const ev = (pg, fn, ...a) => pg.evaluate(fn, ...a);
async function ir(pg, codigo, ms = 600) { try { await pg.evaluate(codigo) } catch (e) { pg.__erros.push('[script do teste] ' + e.message.split('\n')[0]) } await espera(ms) }
async function carregar(pg) {
  await pg.goto(SITE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await ate(() => ev(pg, () => typeof S !== 'undefined' && !!document.querySelector('.screen.active') && document.querySelector('.screen.active').id !== 'loading'), 8000);
  await ev(pg, () => { window.confirmar = async () => true });
}
async function entrar(pg, email, senha, cadastro) {
  await ev(pg, ([email, senha, cadastro]) => {
    if (cadastro && authMode !== 'signup') toggleAuthMode();
    if (!cadastro && authMode !== 'signin') toggleAuthMode();
    document.getElementById('authEmail').value = email; document.getElementById('authPassword').value = senha;
    return handleAuth();
  }, [email, senha, cadastro]);
  await ate(() => ev(pg, () => !!(S.user && S.user.id)), 6000);
  await ate(() => ev(pg, () => typeof DADOS_DA_CONTA !== 'undefined' && DADOS_DA_CONTA), 6000);
  await espera(800);
}
const tela = pg => ev(pg, () => { const s = document.querySelector('.screen.active'); return s && s.id });
const janelas = pg => ev(pg, () => [...document.querySelectorAll('.overlay.show')].map(o => o.id));
const texto = (pg, sel) => ev(pg, s => { const e = document.querySelector(s); return e ? e.innerText : null }, sel);
const casca = (pg, tipo) => ev(pg, t => (window.__casca || []).filter(m => !t || m.tipo === t), tipo);
const ultimoPacote = async (pg, tipo) => { const l = await casca(pg, tipo); return l[l.length - 1] || null };
const limpaCasca = pg => ev(pg, () => { window.__casca = [] });
const errosDe = pg => { const e = pg.__erros.slice(); pg.__erros.length = 0; return e };
const nomeDe = id => (DB.profiles.find(p => p.id === id) || {}).display_name;

// Adicionar spot pela busca, como a pessoa faz: + → busca → resultado → nota.
async function adicionarSpot(pg, { busca, status, nota, texto: frase, foto, trip }) {
  await ir(pg, `(()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('dashboard');${trip ? `S.addTrip=S.trips.find(t=>t.id==='${trip}');` : 'S.addTrip=null;'}abrirBuscaDeSpot();${trip ? `S.addTrip=S.trips.find(t=>t.id==='${trip}');` : ''}const i=document.getElementById('placeSearch');i.value=${JSON.stringify(busca)};searchPlaces(i.value)})()`, 300);
  const achou = await ate(() => ev(pg, () => document.querySelectorAll('#searchResults .search-result').length), 4000);
  if (!achou) return { erro: 'busca sem resultado: ' + busca };
  await ir(pg, `document.querySelector('#searchResults .search-result').click()`, 300);
  const abriu = await ate(() => ev(pg, () => document.getElementById('ov-note').classList.contains('show')), 4000);
  if (!abriu) return { erro: 'folha da nota não abriu (janelas: ' + (await janelas(pg)).join(',') + ')' };
  await ev(pg, ([status, nota, frase, foto]) => {
    setSpotStatus(status);
    if (status === 'been') setAddRating(Math.ceil(nota), { clientX: 0, currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 10 }) } });
    if (status === 'been' && nota % 1) { addRating = nota; pintarEstrelas('#addStars', addRating); atualizarBotaoSalvar() }
    document.getElementById('noteField').value = frase || '';
    if (foto) { const c = document.createElement('canvas'); c.width = c.height = 4; return new Promise(ok => c.toBlob(b => { NOTA_FOTO = new File([b], 'prato.jpg', { type: 'image/jpeg' }); ok() }, 'image/jpeg')) }
  }, [status, nota || 0, frase, !!foto]);
  const antes = DB.spots.length;
  await ir(pg, `saveSpot(false)`, 300);
  await ate(() => DB.spots.length > antes || DB.spots.some(s => s.name === busca && s.status === status), 5000);
  await espera(600);
  return { spot: DB.spots.filter(s => s.name === busca).pop() };
}

// ════════════════════════════════════════════════════════════════════════
const pa = await abrirAparelho('A', { casca: false });
const pb = await abrirAparelho('B', { casca: true });

// ═══ JORNADA 1 · cadastro de B, pedido de amizade, aceite, feed ═══
if (Number(process.env.SO_ATE) && Number(process.env.SO_ATE) < 1) await fim();
JORNADA = '1 cadastro+amizade';
console.log('\n── ' + JORNADA);
await carregar(pa);
await entrar(pa, A.email, A.senha, false);
confere(await tela(pa) === 'dashboard', 'A entra e cai em Viagens', await tela(pa));

await carregar(pb);
confere(await tela(pb) === 'login', 'B abre o app sem conta e vê o login', await tela(pb));
await entrar(pb, B_EMAIL, B_SENHA, true);
confere(!!B && (await ev(pb, () => S.user && S.user.id)) === B.id, 'B se cadastra e a sessão entra');
const onbAbriu = await ate(() => ev(pb, () => document.getElementById('ov-onb').classList.contains('show')), 5000);
confere(onbAbriu, 'primeiro acesso abre pra B');
// casca: com o primeiro acesso aberto, a tela nativa não pode ir pra frente
const telaMsg = await ultimoPacote(pb, 'tela');
confere(telaMsg && telaMsg.comAbas === false, 'casca: abas nativas escondidas durante o primeiro acesso', telaMsg);
// passo 1: cidade
await ir(pb, `onbIr(1)`, 300);
await ir(pb, `(()=>{const i=document.getElementById('onbCidade');i.value='Rio';onbBuscarCidade('Rio')})()`, 900);
const cidadesOnb = await ev(pb, () => (ONB.cidades || []).map(c => c.nome + '/' + c.pais));
confere(cidadesOnb.includes('Rio de Janeiro/Brasil'), 'onb: busca acha Rio de Janeiro', cidadesOnb);
await ir(pb, `onbEscolherCidade(ONB.cidades.findIndex(c=>c.nome==='Rio de Janeiro'))`, 200);
await ir(pb, `onbSalvarCidade()`, 900);
const perfB = DB.profiles.find(p => p.id === B.id);
confere(perfB.home_city === 'Rio de Janeiro' && perfB.home_country === 'Brasil', 'onb: cidade de B gravada no perfil', perfB);
confere(await ev(pb, () => ONB.passo) === 2, 'onb: segue pros países', await ev(pb, () => ONB.passo));
// passo 2: países (Brasil já vem marcado) + Portugal
await ir(pb, `onbMarcarPais(COUNTRIES.findIndex(c=>c.name==='Portugal'))`, 200);
await ir(pb, `onbSalvarPaises()`, 1000);
const quickB = DB.trips.filter(t => t.user_id === B.id && t.dates === '__quickvisit__').map(t => t.name).sort();
confere(JSON.stringify(quickB) === '["Brasil","Portugal"]', 'onb: países de B marcados (Brasil + Portugal)', quickB);
confere(await ev(pb, () => ONB.passo) === 6, 'onb: passo das cidades (9f) aparece', await ev(pb, () => ONB.passo));
// passo 6: cidades — busca Porto e marca
await ir(pb, `(()=>{const i=document.getElementById('cvBusca');i.value='Porto';cvBuscar('Porto')})()`, 1200);
await ir(pb, `(()=>{const l=[...document.querySelectorAll('#cvLista .cv-linha:not(.on)')].find(x=>/Porto/.test(x.innerText));if(l)l.click()})()`, 300);
await ir(pb, `cvSalvar()`, 1200);
const cvB = DB.cidades_visitadas.filter(c => c.user_id === B.id).map(c => c.nome);
confere(cvB.includes('Porto'), 'onb: cidade Porto marcada por B', cvB);
confere(await ev(pb, () => ONB.passo) === 3, 'onb: segue pro Colar', await ev(pb, () => ONB.passo));
// passo 3: colar (vazio) → amigos
await ir(pb, `onbIr(4)`, 300);
// passo 4: B procura A pelo nome no primeiro acesso — só olha
await ir(pb, `(()=>{const i=document.getElementById('onbPessoa');i.value='ana te';buscarPessoas('ana te','onbPessoas','onbPessoa')})()`, 1300);
const achouNoOnb = await texto(pb, '#onbPessoas');
confere(/Ana Teste/.test(achouNoOnb || ''), 'onb: busca de pessoas acha a Ana', achouNoOnb);
await ir(pb, `onbIr(5)`, 600);
await ir(pb, `onbTerminar()`, 1500);
confere(!(await janelas(pb)).includes('ov-onb'), 'onb: termina e fecha');
confere(B.meta.onboarding_done === true, 'onb: marca cadastro feito na conta de login', B.meta);
const pushPedido = (await casca(pb, 'pedir-push')).length;
confere(pushPedido >= 1, 'casca: pede permissão de push no fim do primeiro acesso');
const placarB = await ev(pb, () => ({ paises: PLACAR.paises, cidades: PLACAR.cidades }));
confere(placarB.paises === 2, 'placar de B: 2 países depois do primeiro acesso', placarB);
const pacViagensOnb = (await casca(pb, 'viagens')).filter(m => m.pronto).pop();
confere(pacViagensOnb && pacViagensOnb.dados.paises === placarB.paises && pacViagensOnb.dados.cidades === placarB.cidades, 'casca: aba Viagens nativa recebe o placar do primeiro acesso', pacViagensOnb && { paises: pacViagensOnb.dados.paises, cidades: pacViagensOnb.dados.cidades, placarB });
confere(pacViagensOnb && pacViagensOnb.dados.mapa.length === 2, 'casca: mapa nativo com os 2 países marcados', pacViagensOnb && pacViagensOnb.dados.mapa);

// A procura B pelo nome (search_profiles) e manda pedido
const buscarEPedir = async () => {
  await ir(pa, `(async()=>{goTo('friends');await loadFriends(true)})()`, 1000);
  await ir(pa, `(()=>{abrirAddFriend();const i=document.getElementById('friendUsernameInput');i.value='bruno';buscarPessoas('bruno')})()`, 1300);
  const linha = await texto(pa, '#buscaPessoasRes');
  await ir(pa, `pedirAmizade(BUSCA_PESSOAS.findIndex(p=>p.id==='${B.id}'))`, 1200);
  return linha;
};
const linhaB = await buscarEPedir();
confere(/bruno/i.test(linhaB || ''), 'A acha B pela busca', linhaB);
confere(/Mora em Rio de Janeiro/.test(linhaB || ''), 'busca mostra "Mora em Rio de Janeiro" de B', linhaB);
const pedido0 = DB.follows.find(f => f.follower_id === A.id && f.following_id === B.id);
await ir(pa, `closeOv('ov-addfriend')`, 200);
// 1ª vez B RECUSA (pela casca); A pode pedir de novo
await ir(pb, `(async()=>{window.irParaAba('friends')})()`, 1500);
await ir(pb, `window.acaoDeAmigos('recusar','${pedido0 && pedido0.id}')`, 1500);
confere(pedido0 && !DB.follows.some(f => f.id === pedido0.id), 'B recusa pela tela nativa → pedido apagado');
const pacRecusa = await ultimoPacote(pb, 'amigos');
confere(pacRecusa && !(pacRecusa.dados.recebidos || []).length, 'casca de B sem o pedido recusado', pacRecusa && pacRecusa.dados.recebidos);
await buscarEPedir();
const pedido = DB.follows.find(f => f.follower_id === A.id && f.following_id === B.id);
confere(pedido && pedido.status === 'pending', 'pedido A→B gravado como pendente', pedido);
confere(AVISOS.some(a => a.tipo === 'pedido' && a.alvo === B.id && a.de === A.id), 'aviso "pedido" chega pra B', AVISOS);
confere(/pedido enviado/i.test(await texto(pa, '#buscaPessoasRes') || ''), 'busca de A troca o botão por "pedido enviado"');
await ir(pa, `closeOv('ov-addfriend')`, 200);

// B vê o pedido: na web e no pacote da casca. B toca no aviso do pedido —
// a casca faz irParaAba('friends') + switchFriendsTab('pedidos') (App.js aplicarToque).
await limpaCasca(pb);
await ir(pb, `(()=>{irParaAba('friends');switchFriendsTab('pedidos')})()`, 1800);
const recebidosWeb = await ev(pb, () => (FRIENDS_DATA && FRIENDS_DATA.incoming || []).map(r => r.follower_id));
confere(recebidosWeb.includes(A.id), 'B vê o pedido de A (web)', recebidosWeb);
const pacoteAm = await ultimoPacote(pb, 'amigos');
const rec = pacoteAm && pacoteAm.dados && pacoteAm.dados.recebidos || [];
confere(rec.some(x => x.id === A.id && x.nome === 'Ana Teste' && x.pedido === pedido.id), 'B vê o pedido de A no pacote da casca (nome + id do pedido)', rec);
confere(pacoteAm && pacoteAm.dados && pacoteAm.dados.atividadeNova === true, 'casca: ponto de Atividade aceso com pedido recebido', pacoteAm && pacoteAm.dados && pacoteAm.dados.atividadeNova);
confere(rec[0] && /São Paulo/.test(rec[0].detalhe || ''), 'pacote: detalhe do pedido traz a cidade de A', rec[0]);
// a Atividade web lista o pedido
await ir(pb, `abrirAtividade()`, 1200);
confere(/Ana Teste/.test(await texto(pb, '#atCorpo') || ''), 'Atividade de B mostra o pedido da Ana', await texto(pb, '#atCorpo'));
// A, com a tela parada mostrando o pedido enviado (antes de B aceitar)
await ir(pa, `(async()=>{FRIENDS_DATA=null;goTo('friends');await loadFriends()})()`, 1200);
confere((await ev(pa, () => FRIENDS_DATA.outgoing.map(r => r.id))).includes(pedido && pedido.id), 'A vê o pedido enviado (pra poder cancelar)');
// B aceita PELA CASCA (como o toque na aba nativa)
await ir(pb,`window.acaoDeAmigos('aceitar','${pedido.id}')`, 1800);
confere(pedido.status === 'accepted', 'B aceita pela tela nativa → amizade aceita no banco', pedido.status);
confere(AVISOS.some(a => a.tipo === 'aceite' && a.alvo === A.id && a.de === B.id), 'aviso de aceite chega pra A', AVISOS.map(a => a.tipo + '→' + nomeDe(a.alvo)));
const pacAceito = await ultimoPacote(pb, 'amigos');
confere(pacAceito && (pacAceito.dados.amigos || []).some(x => x.id === A.id), 'pacote da casca de B já lista A como amiga', pacAceito && pacAceito.dados && pacAceito.dados.amigos);
confere(pacAceito && !(pacAceito.dados.recebidos || []).length, 'pacote da casca de B sem pedido pendente depois de aceitar', pacAceito && pacAceito.dados.recebidos);
// Logo depois de aceitar: a lista de amigos do Planejar/ficha ("Ana foi")
// tem que já contar com A.
const amigosDoPln = await ev(pb, async () => await plnCarregarAmigos());
confere(amigosDoPln.includes(A.id), 'B logo depois de aceitar: Planejar/ficha já contam A como amiga', { amigosDoPln, cacheDe: 'PLN_AMIGOS (2 min)' });
// A toca "Cancelar" na tela velha, DEPOIS de B aceitar: a amizade fica.
await ir(pa, `cancelRequest('${pedido && pedido.id}')`, 1200);
confere(amigos(A.id, B.id), '"Cancelar" na tela velha não desfaz a amizade recém-aceita');
// A recarrega amigos e vê B
await ir(pa,`(async()=>{FRIENDS_DATA=null;goTo('friends');await loadFriends()})()`, 1500);
confere((await ev(pa, () => FRIENDS_DATA.friendIds)).includes(B.id), 'A vê B como amigo');
confere(!(await ev(pa, () => FRIENDS_DATA.outgoing.length)), 'A sem pedido enviado pendente');
['A', 'B'].forEach(n => { const e = errosDe(PAGINAS[n]); confere(!e.length, 'sem erro de JS no aparelho ' + n, e) });

// ═══ JORNADA 2 · spots de A, privacidade, comentário e resposta ═══
if (Number(process.env.SO_ATE) && Number(process.env.SO_ATE) < 2) await fim();
JORNADA = '2 spots+comentario';
console.log('\n── ' + JORNADA);
let r = await adicionarSpot(pa, { busca: 'Taberna da Rua das Flores', status: 'been', nota: 4.5, texto: 'Petiscos no balcão', foto: true });
confere(!r.erro && r.spot && r.spot.status === 'been' && Number(r.spot.my_rating) === 4.5, 'A salva Taberna como Fui 4,5', r.erro || r.spot);
confere(r.spot && r.spot.my_review === 'Petiscos no balcão', 'frase do Fui vai pra my_review', r.spot && { note: r.spot.my_note, review: r.spot.my_review });
confere(r.spot && /storage\/v1\/object\/public\/uploads\//.test(r.spot.photo_url || ''), 'foto própria vira a foto do spot', { foto: r.spot && String(r.spot.photo_url).slice(0, 80), patches: ESCRITAS.filter(e => 'photo_url' in e.patch).map(e => String(e.patch.photo_url).slice(0, 60)), fotos: DB.spot_fotos.map(f => f.url.slice(-30)), erros: pa.__erros.slice(0, 3) });
confere(r.spot && DB.spot_fotos.some(f => f.spot_id === r.spot.id), 'foto própria entra em spot_fotos');
const spTaberna = r.spot;
const tripPortugal = DB.trips.find(t => t.id === (spTaberna || {}).trip_id);
confere(tripPortugal && tripPortugal.name === 'Portugal' && !tripPortugal.privada, 'spot cria a viagem Portugal (não privada)', tripPortugal);
r = await adicionarSpot(pa, { busca: 'Cervejaria Ramiro', status: 'want', texto: 'ir no almoço' });
const spRamiro = r.spot;
confere(spRamiro && spRamiro.status === 'want' && spRamiro.trip_id === (tripPortugal || {}).id, 'A salva Ramiro como Quero ir na viagem Portugal', r.erro || spRamiro);
// A foto SUA não pode ser trocada pela do Google porque falhou ao carregar uma vez.
FALHA_STORAGE = true;
await ir(pa, `(()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));openPlace('${(spTaberna || {}).id}','profile')})()`, 2500);
FALHA_STORAGE = false;
confere(/\/storage\//.test((spTaberna || {}).photo_url || ''), 'foto sua continua no spot depois de uma falha ao carregar', String((spTaberna || {}).photo_url).slice(0, 90));
await ir(pa, `backFromPlace()`, 300);
// próxima viagem privada: Espanha
await ir(pa, `(()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('profile');abrirNovaViagem();newTripCityResults=[{city:'',country:'Espanha'}];document.getElementById('countryList').innerHTML=newTripCityResults.map(linhaDeDestino).join('');selectNewTripCity(0)})()`, 500);
await ir(pa, `createTrip()`, 1500);
const tripEsp = DB.trips.find(t => t.user_id === A.id && t.name === 'Espanha');
confere(tripEsp && tripEsp.privada === true && tripEsp.proxima === true, 'próxima viagem Espanha criada privada', tripEsp);
r = await adicionarSpot(pa, { busca: 'Casa Lucio', status: 'want', trip: tripEsp && tripEsp.id });
const spLucio = r.spot;
confere(spLucio && spLucio.trip_id === (tripEsp || {}).id && spLucio.status === 'want', 'Casa Lucio (Quero ir) entra na próxima viagem privada', r.erro || spLucio);
// mais dois Fui que B NÃO vai salvar sozinho (pro Montar da jornada 3)
r = await adicionarSpot(pa, { busca: 'Pastéis de Belém', status: 'been', nota: 5 });
confere(r.spot && r.spot.status === 'been' && r.spot.trip_id === (tripPortugal || {}).id, 'A salva Pastéis de Belém (Fui 5) em Portugal', r.erro || r.spot);
r = await adicionarSpot(pa, { busca: 'Bar Brahma', status: 'been', nota: 4 });
const casaA = DB.trips.find(t => t.user_id === A.id && t.dates === '__casa__');
confere(r.spot && r.spot.trip_id === (casaA || {}).id, 'Bar Brahma (São Paulo) vai pra "Onde você mora" de A', r.erro || r.spot);
errosDe(pa);

// B olha o perfil de A
await ir(pb, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));await openFriend('${A.id}')})()`, 1800);
const vistosPorB = await ev(pb, () => (FRIEND.todos || []).map(s => s.name + ':' + s.status));
confere(vistosPorB.includes('Taberna da Rua das Flores:been'), 'B vê o Fui de A', vistosPorB);
confere(vistosPorB.includes('Cervejaria Ramiro:want'), 'B vê o Quero ir de viagem NÃO privada', vistosPorB);
confere(!vistosPorB.some(x => /Casa Lucio/.test(x)), 'B NÃO vê o Quero ir da próxima viagem privada', vistosPorB);
const viagensVistas = await ev(pb, () => (FRIEND.trips || []).map(t => t.name));
confere(!viagensVistas.includes('Espanha'), 'B NÃO vê a viagem privada sem Fui', viagensVistas);
const paginaAmigo = await texto(pb, '#friend');
confere(!/Casa Lucio|Espanha/.test(paginaAmigo || ''), 'tela do perfil de A no aparelho de B sem Casa Lucio/Espanha');
// "Quem vê": A abre a Espanha pros amigos → B passa a ver; fecha de novo → some
await ir(pa, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));openTrip('${tripEsp && tripEsp.id}');await new Promise(r=>setTimeout(r,800));await trocarQuemVe(false)})()`, 1000);
confere(tripEsp && tripEsp.privada === false, 'A troca a Espanha pra "amigos veem"', tripEsp && tripEsp.privada);
await ir(pb, `openFriend('${A.id}')`, 1800);
const comAberta = await ev(pb, () => (FRIEND.todos || []).map(s => s.name));
confere(comAberta.includes('Casa Lucio'), 'com "amigos veem", B vê o Quero ir da Espanha', comAberta);
await ir(pa, `trocarQuemVe(true)`, 1000);
await ir(pb, `openFriend('${A.id}')`, 1800);
confere(!(await ev(pb, () => (FRIEND.todos || []).map(s => s.name))).includes('Casa Lucio'), 'de volta a "só eu", B deixa de ver');
await ir(pa, `goTo('profile')`, 300);
// feed de B: só o Fui
await ir(pb, `(async()=>{FRIENDS_DATA=null;goTo('friends');await loadFriends()})()`, 1800);
const feedB = await ev(pb, () => FRIENDS_DATA.feedItems.map(i => i.tipo + ':' + (i.spot ? i.spot.name : i.html)));
confere(feedB.some(x => /visita:Taberna/.test(x)), 'feed de B mostra a visita da Taberna', feedB);
confere(!feedB.some(x => /Espanha|Casa Lucio/.test(x)), 'feed de B não mostra a próxima viagem privada', feedB);
const pacFeed = await ultimoPacote(pb, 'amigos');
const cardTab = pacFeed && (pacFeed.dados.feed || []).find(f => f.lugar === 'Taberna da Rua das Flores');
confere(cardTab && cardTab.estrelas === 4.5 && cardTab.nota === 'Petiscos no balcão', 'pacote da casca: card da Taberna com 4,5 e a frase', cardTab);
confere(cardTab && /^https?:\/\//.test(cardTab.foto || ''), 'pacote da casca: foto do card com endereço completo', cardTab && cardTab.foto);
// B comenta no spot de A (pela ficha aberta a partir do feed)
const iFeed = await ev(pb, () => FRIENDS_DATA.feedItems.findIndex(i => i.spot && i.spot.name === 'Taberna da Rua das Flores'));
await ir(pb, `window.acaoDeAmigos('abrirVisita',${iFeed})`, 1800);
confere(await tela(pb) === 'place', 'B abre a ficha da Taberna pelo feed (casca)', await tela(pb));
const temCampo = await ate(() => ev(pb, () => !!document.getElementById('campo-placeComentarios')), 4000);
confere(temCampo, 'ficha do spot de A tem campo de comentário pra B');
await ir(pb, `(()=>{const c=document.getElementById('campo-placeComentarios');c.value='Precisa reservar?';const b=document.querySelector('#placeComentarios button[onclick^="enviarComentario"]');if(b)b.click();else throw new Error('sem botão enviar')})()`, 1200);
const coment = DB.spot_comments.find(c => c.spot_id === (spTaberna || {}).id && c.user_id === (B || {}).id);
confere(coment && coment.body === 'Precisa reservar?', 'comentário de B gravado no spot de A', DB.spot_comments);
confere(AVISOS.some(a => a.tipo === 'comentario' && a.alvo === A.id && a.de === B.id && a.spot === (spTaberna || {}).id), 'aviso "comentario" chega pra A com o id do spot', AVISOS.map(a => a.tipo + '→' + nomeDe(a.alvo)));
// A recebe: feed e Atividade
await ir(pa, `(async()=>{FRIENDS_DATA=null;goTo('friends');await loadFriends()})()`, 1800);
const feedA = await ev(pa, () => FRIENDS_DATA.feedItems.map(i => i.tipo + ':' + (i.html || (i.spot && i.spot.name))));
confere(feedA.some(x => /comentou.*Taberna.*Precisa reservar/.test(x)), 'feed de A mostra "comentou em Taberna"', feedA);
await ir(pa, `abrirAtividade()`, 1500);
const ativA = await texto(pa, '#atCorpo');
confere(/Precisa reservar/.test(ativA || ''), 'Atividade de A mostra o comentário de B', ativA);
// A abre o comentário pelo feed e responde
const iCom = await ev(pa, () => FRIENDS_DATA.feedItems.findIndex(i => i.spot_id));
await ir(pa, `(async()=>{goTo('friends');await abrirComentarioDoFeed(${iCom})})()`, 1800);
confere(await tela(pa) === 'place' && await ev(pa, () => S.curPlace && S.curPlace.name) === 'Taberna da Rua das Flores', 'A abre a própria ficha pelo comentário do feed', await tela(pa));
await ate(() => ev(pa, () => !!document.getElementById('campo-placeComentarios')), 4000);
await ate(() => ev(pa, () => /Precisa reservar/.test((document.getElementById('placeComentarios') || {}).innerText || '')), 3000);
const fioA0 = await texto(pa, '#placeComentarios');
confere(/bruno/i.test(fioA0 || ''), 'na ficha de A, o comentário aparece com o nome de B', fioA0);
const avisosAntes = AVISOS.length;
await ir(pa, `(()=>{const c=document.getElementById('campo-placeComentarios');c.value='Balcão sem reserva';document.querySelector('#placeComentarios button[onclick^="enviarComentario"]').click()})()`, 1200);
confere(DB.spot_comments.some(c => c.user_id === A.id && c.body === 'Balcão sem reserva'), 'resposta de A gravada');
const avResp = AVISOS.slice(avisosAntes);
confere(avResp.some(a => a.tipo === 'comentario' && a.alvo === (B || {}).id && a.de === A.id), 'resposta de A avisa B (autor do fio)', avResp);
confere(!avResp.some(a => a.alvo === A.id), 'A não avisa a si mesma', avResp);
// B vê a resposta
await ir(pb, `(async()=>{goTo('friends');FRIENDS_DATA=null;await loadFriends();const i=FRIENDS_DATA.feedItems.findIndex(x=>x.spot&&x.spot.name==='Taberna da Rua das Flores');abrirVisitaDoFeed(i)})()`, 2000);
await ate(() => ev(pb, () => /Balcão sem reserva/.test((document.getElementById('placeComentarios') || {}).innerText || '')), 4000);
const fioB = await texto(pb, '#placeComentarios');
confere(/Balcão sem reserva/.test(fioB || '') && /Ana/.test(fioB || ''), 'B vê a resposta de A com o nome dela', fioB);
// feed de B: a resposta de A no spot de A também aparece como comentário?
const feedB2 = await ev(pb, () => FRIENDS_DATA.feedItems.map(i => i.html || (i.spot && i.spot.name)));
confere(feedB2.some(x => /Ana Teste<\/b> comentou.*Balcão/.test(x || '')), 'feed de B mostra a resposta de A', feedB2);
['A', 'B'].forEach(n => { const e = errosDe(PAGINAS[n]); confere(!e.length, 'sem erro de JS no aparelho ' + n, e) });

// ═══ JORNADA 3 · B salva spot de A, Planejar com A, montar, mandar ═══
if (Number(process.env.SO_ATE) && Number(process.env.SO_ATE) < 3) await fim();
JORNADA = '3 salvar+planejar';
console.log('\n── ' + JORNADA);
// "+ minha lista" no feed (pela casca)
await ir(pb, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('friends');FRIENDS_DATA=null;await loadFriends()})()`, 1800);
const iTab = await ev(pb, () => FRIENDS_DATA.feedItems.findIndex(i => i.spot && i.spot.name === 'Taberna da Rua das Flores'));
await limpaCasca(pb);
await ir(pb, `window.acaoDeAmigos('salvar',${iTab})`, 1500);
const notaAbriu = await ate(() => ev(pb, () => document.getElementById('ov-note').classList.contains('show')), 4000);
confere(notaAbriu, '+ minha lista (casca) abre a folha da nota com o spot de A', await janelas(pb));
const telaNaCasca = await ultimoPacote(pb, 'tela');
confere(telaNaCasca && telaNaCasca.comAbas === false, 'casca: tela nativa sai da frente pra folha da nota aparecer', telaNaCasca);
await ir(pb, `saveSpot(false)`, 2000);
confere(await tela(pb) === 'place', 'depois de salvar do feed abre a ficha do spot salvo', await tela(pb));
await ir(pb, `backFromPlace()`, 800);
confere(await tela(pb) === 'friends', 'voltar da ficha (salva pelo feed) volta pro feed de Amigos', await tela(pb));
const salvoB = DB.spots.find(s => s.user_id === (B || {}).id && s.name === 'Taberna da Rua das Flores');
confere(salvoB && salvoB.status === 'want', 'B salva a Taberna do feed como Quero ir', salvoB);
confere(salvoB && salvoB.from_user_id === A.id, 'spot salvo do feed guarda de quem veio (from_user_id = A)', salvoB && salvoB.from_user_id);
const tripDoSalvo = salvoB && DB.trips.find(t => t.id === salvoB.trip_id);
confere(tripDoSalvo && tripDoSalvo.user_id === B.id && /Portugal/.test(tripDoSalvo.name), 'vai pra viagem Portugal de B', tripDoSalvo);
await ir(pb, `window.irParaAba('friends')`, 1500);   // a pessoa volta pra aba Amigos
const pacSalvo = await ultimoPacote(pb, 'amigos');
const cardSalvo = pacSalvo && (pacSalvo.dados.feed || []).find(f => f.lugar === 'Taberna da Rua das Flores');
confere(cardSalvo && cardSalvo.salvo === true && pacSalvo.dados.salvando === -1, 'pacote: card marcado como salvo e botão destravado', cardSalvo && { salvo: cardSalvo.salvo, salvando: pacSalvo.dados.salvando });
// pela ficha: Ramiro (Quero ir de A) → abrir ficha do amigo e salvar
await ir(pb, `(async()=>{await openFriend('${A.id}');const l=FRIEND.todos.filter(s=>s.name==='Cervejaria Ramiro');FRIEND_CITY_SPOTS=l;abrirSpotDoAmigo(0)})()`, 2000);
confere(await tela(pb) === 'place', 'B abre a ficha do Ramiro de A', await tela(pb));
await ir(pb, `setStatus('want')`, 2000);
const ramiroB = DB.spots.find(s => s.user_id === (B || {}).id && s.name === 'Cervejaria Ramiro');
confere(ramiroB && ramiroB.status === 'want', 'B salva o Ramiro pela ficha', ramiroB);
confere(ramiroB && ramiroB.from_user_id === A.id, 'Ramiro salvo pela ficha guarda from_user_id = A', ramiroB && ramiroB.from_user_id);
// A vê na Atividade que B quer ir no que ela indicou
await ir(pa, `(async()=>{goTo('friends');FRIENDS_DATA=null;await loadFriends();abrirAtividade()})()`, 2200);
const ativA2 = await texto(pa, '#atCorpo');
confere(/Bruno|bruno/.test(ativA2 || '') && /Taberna|Ramiro/.test(ativA2 || ''), 'Atividade de A: B quer ir no que ela indicou', ativA2);
confere(/agora são amigos/.test(ativA2 || ''), 'Atividade de A mostra a amizade nova com B', ativA2);
// Planejar com A, multi-país (Portugal + Espanha)
await ir(pb, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));await openFriend('${A.id}');plnDoAmigo()})()`, 1500);
await ir(pb, `(()=>{PLN.destinos=[{tipo:'pais',nome:'Portugal'},{tipo:'pais',nome:'Espanha'},{tipo:'pais',nome:'Brasil'}];plnPintarEscolha();plnVerLista()})()`, 2000);
let grupos = await ev(pb, () => (PLN.grupos || []).map(g => g.base.name + (g.meu ? '(meu)' : '')));
const donos = await ev(pb, () => [...new Set((PLN.grupos || []).flatMap(g => g.spots.map(s => s.user_id)))]);
const cacheVelho = !donos.includes(A.id);
confere(!cacheVelho, 'Planejar com A (amiga aceita há pouco) traz os spots DELA', { grupos, donos: donos.map(nomeDe) });
if (cacheVelho) {   // contorno pra seguir testando o resto do fluxo: zera a memória de 2 min
  await ir(pb, `(()=>{PLN_AMIGOS.t=0;PLN_DELES.t=0;plnVerLista()})()`, 2000);
  grupos = await ev(pb, () => (PLN.grupos || []).map(g => g.base.name + (g.meu ? '(meu)' : '')));
}
confere(grupos.some(g => /Taberna/.test(g)) && grupos.some(g => /Ramiro/.test(g)), 'Planejar junta os spots de A em Portugal', grupos);
confere(!grupos.some(g => /Casa Lucio/.test(g)), 'Planejar NÃO traz o Quero ir privado de A na Espanha', grupos);
// marca tudo que não é meu e monta
await ir(pb, `(()=>{plnComecarMontagem();PLN.grupos.filter(g=>!g.meu).forEach(g=>PLN.marcados.add(g.chave));plnPintarLista()})()`, 400);
const marcados = await ev(pb, () => PLN.grupos.filter(g => !g.meu && PLN.marcados.has(g.chave)).map(g => g.base.name));
confere(marcados.includes('Pastéis de Belém') && marcados.includes('Bar Brahma'), 'Montar: marca os spots de A que B ainda não tem (Portugal + Brasil)', marcados);
await ir(pb, `plnSalvarMontagem(null)`, 3500);
const montado = await ev(pb, () => PLN.montado ? PLN.montado.salvos.map(x => x.g.base.name) : null);
confere(montado && montado.length === marcados.length, 'Montar minha viagem salva todos os marcados', { montado, marcados });
const dupB = DB.spots.filter(s => s.user_id === (B || {}).id).map(s => s.name);
confere(new Set(dupB).size === dupB.length, 'Montar minha viagem não duplica o que B já salvou', dupB);
const pasB = DB.spots.find(s => s.user_id === (B || {}).id && s.name === 'Pastéis de Belém');
const brB = DB.spots.find(s => s.user_id === (B || {}).id && s.name === 'Bar Brahma');
confere(pasB && pasB.status === 'want' && pasB.from_user_id === A.id, 'Montar: Pastéis vira Quero ir de B com a dica de A', pasB);
confere(pasB && salvoB && pasB.trip_id === salvoB.trip_id, 'Montar: Pastéis cai na MESMA viagem Portugal de B (sem criar outra)', { pas: pasB && pasB.trip_id, taberna: salvoB && salvoB.trip_id, viagensB: DB.trips.filter(t => t.user_id === B.id).map(t => t.name + '/' + t.dates) });
const tripBr = brB && DB.trips.find(t => t.id === brB.trip_id);
confere(tripBr && (tripBr.destinations || []).includes('Brasil'), 'Montar: Bar Brahma cai numa viagem do Brasil de B', tripBr);
const viagensB = DB.trips.filter(t => t.user_id === B.id);
confere(viagensB.filter(t => t.name === 'Portugal' && t.dates !== '__quickvisit__').length <= 1 && viagensB.filter(t => t.name === 'Brasil' && t.dates !== '__quickvisit__').length <= 1, 'B não fica com viagem duplicada de Portugal/Brasil', viagensB.map(t => t.name + '/' + (t.dates || '-') + '/prox=' + t.proxima));
const naAba = await ev(pb, id => { const t = S.trips.find(x => x.id === id); return t ? { nonTrip: isNonTrip(t), planejada: typeof viagemPlanejada === 'function' ? viagemPlanejada(t) : null, abaViagens: typeof naAbaViagens === 'function' ? naAbaViagens(t) : null } : null }, tripBr && tripBr.id);
confere(naAba && (!naAba.nonTrip), 'Bar Brahma montado aparece em alguma lista de viagens de B (não some no "país marcado")', naAba);
// Mandar pro grupo: primeiro o que foi montado, depois a lista inteira
await ir(pb, `(()=>{window.__texto='';window.mandarTextoPraFora=async(t)=>{window.__texto=t};plnMandarProGrupo(true);document.getElementById('plnPreviaMandar').click()})()`, 600);
const txtMont = await ev(pb, () => window.__texto);
confere(/Pastéis de Belém: Ana foi, 5★/.test(txtMont || '') && /Bar Brahma: Ana foi, 4★/.test(txtMont || ''), 'Mandar pro grupo (montados): "Ana foi, 5★" e "Ana foi, 4★"', txtMont);
await ir(pb, `(()=>{window.__texto='';PLN.montado=null;plnMandarProGrupo(false);document.getElementById('plnPreviaMandar').click()})()`, 600);
const txt = await ev(pb, () => window.__texto);
confere(/Planejando Portugal, Espanha e Brasil com Ana/.test(txt || ''), 'Mandar pro grupo: cabeçalho com os 3 destinos e a Ana', txt);
confere(/Taberna da Rua das Flores: Ana foi, 4,5★/.test(txt || ''), 'Mandar pro grupo: "Ana foi, 4,5★"', { txt, grupos: await ev(pb, () => PLN.grupos.map(g => g.base.name + ' foram:' + g.foram.map(s => s.user_id.slice(0, 4)) + ' querem:' + g.querem.map(s => s.user_id.slice(0, 4)))), A: A.id.slice(0, 4) });
confere(!/Casa Lucio/.test(txt || ''), 'Mandar pro grupo sem o spot privado', txt);
['A', 'B'].forEach(n => { const e = errosDe(PAGINAS[n]); confere(!e.length, 'sem erro de JS no aparelho ' + n, e) });

// ═══ JORNADA 4 · cidades visitadas de A, contagem vista por B ═══
if (Number(process.env.SO_ATE) && Number(process.env.SO_ATE) < 4) await fim();
JORNADA = '4 cidades visitadas';
console.log('\n── ' + JORNADA);
await ir(pa, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('dashboard');await loadDashboard();abrirMarcarCidades('Portugal')})()`, 1200);
await ir(pa, `(()=>{const i=document.getElementById('cvBusca');i.value='Sintra';cvBuscar('Sintra')})()`, 1200);
await ir(pa, `(()=>{const l=[...document.querySelectorAll('#cvLista .cv-linha:not(.on)')].find(x=>/Sintra/.test(x.innerText));if(l)l.click()})()`, 300);
await ir(pa, `(()=>{const i=document.getElementById('cvBusca');i.value='Roma';cvBuscar('Roma')})()`, 1200);
await ir(pa, `(()=>{const l=[...document.querySelectorAll('#cvLista .cv-linha:not(.on)')].find(x=>/Roma/.test(x.innerText));if(l)l.click()})()`, 300);
await ir(pa, `cvSalvar()`, 1500);
const cvA = DB.cidades_visitadas.filter(c => c.user_id === A.id).map(c => c.nome + '/' + c.pais);
confere(cvA.includes('Sintra/Portugal') && cvA.includes('Roma/Itália'), 'A marca Sintra e Roma', cvA);
// Um Quero ir numa cidade nova (Porto) não conta como cidade onde A FOI.
r = await adicionarSpot(pa, { busca: 'Café Santiago', status: 'want' });
confere(r.spot && r.spot.city === 'Porto' && r.spot.status === 'want', 'A salva Café Santiago (Porto) como Quero ir', r.erro || r.spot);
await ir(pa, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('dashboard');await loadDashboard()})()`, 1500);
const placarA =await ev(pa, () => ({ paises: PLACAR.paises, cidades: PLACAR.cidades, spots: PLACAR.spots, mapa: visitedCountryNames() }));
console.log('  placar de A no aparelho dela:', JSON.stringify(placarA));
await ir(pb, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));await openFriend('${A.id}')})()`, 2000);
const topoAmigo = await texto(pb, '#friendUser');
console.log('  topo do perfil de A no aparelho de B:', topoAmigo);
const nCid = Number(((topoAmigo || '').match(/(\d+) cidades?/) || [])[1] || 0), nPai = Number(((topoAmigo || '').match(/(\d+) países?|(\d+) país/) || [])[1] || ((topoAmigo || '').match(/(\d+) país/) || [])[1] || 0);
confere(/Sintra/.test(JSON.stringify(await ev(pb, () => FRIEND.cidadesMarcadas.map(c => c.nome)))), 'B carrega as cidades marcadas de A');
confere(nCid === placarA.cidades, 'B vê o MESMO nº de cidades que A vê no próprio placar', { b: nCid, a: placarA.cidades, topo: topoAmigo });
confere(nPai === placarA.paises, 'B vê o MESMO nº de países que A vê no próprio placar', { b: nPai, a: placarA.paises, topo: topoAmigo });
['A', 'B'].forEach(n => { const e = errosDe(PAGINAS[n]); confere(!e.length, 'sem erro de JS no aparelho ' + n, e) });

// ═══ JORNADA 5 · bloqueio, desbloqueio, desfazer amizade ═══
if (Number(process.env.SO_ATE) && Number(process.env.SO_ATE) < 5) await fim();
JORNADA = '5 bloqueio';
console.log('\n── ' + JORNADA);
await ir(pa, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));await openFriend('${B.id}');await bloquearUsuario('${B.id}','Bruno')})()`, 2000);
confere(DB.bloqueios.some(b => b.bloqueador_id === A.id && b.bloqueado_id === B.id), 'bloqueio gravado');
confere(!amigos(A.id, B.id), 'bloqueio desfaz a amizade no banco');
await ir(pa, `(async()=>{goTo('friends');FRIENDS_DATA=null;await loadFriends()})()`, 1800);
const telaAmA = await texto(pa, '#friendsContainer');
confere(!/bruno/i.test(telaAmA || ''), 'nada de B na aba Amigos de A', telaAmA && telaAmA.slice(0, 300));
const feedAposBloq = await ev(pa, () => FRIENDS_DATA.feedItems.map(i => i.user_id));
confere(!feedAposBloq.includes(B.id), 'feed de A sem itens de B');
const delesA = await ev(pa, async b => { const l = await plnSpotsDeles(); const ids = await plnCarregarAmigos(); return { spots: l.filter(s => s.user_id === b).map(s => s.name), amigo: ids.includes(b) } }, B.id);
confere(!delesA.spots.length && !delesA.amigo, 'Planejar/ficha de A esquecem B na hora do bloqueio', delesA);
// o comentário de B na ficha de A some
await ir(pa, `openPlace('${(spTaberna || {}).id}','profile')`, 1800);
const fioA = await texto(pa, '#placeComentarios');
confere(!/Precisa reservar/.test(fioA || ''), 'comentário de B some da ficha de A', fioA);
await ir(pa, `abrirAtividade()`, 1500);
const ativBloq = await texto(pa, '#atCorpo');
confere(!/bruno|Precisa reservar/i.test(ativBloq || ''), 'Atividade de A sem nada de B', ativBloq);
// B não acha mais A e não consegue pedir
await ir(pb, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('friends');FRIENDS_DATA=null;await loadFriends();abrirAddFriend();const i=document.getElementById('friendUsernameInput');i.value='ana te';buscarPessoas('ana te')})()`, 1800);
const buscaB = await texto(pb, '#buscaPessoasRes');
confere(!/Ana Teste/.test(buscaB || ''), 'B não acha A na busca depois do bloqueio', buscaB);
const pedidoBloq = await ev(pb, async (a) => { const r = await dbInsert('follows', { follower_id: S.user.id, following_id: a, status: 'pending' }); return !!r.error }, A.id);
errosDe(pb); // o console.error do insert recusado é esperado
confere(pedidoBloq && !DB.follows.some(f => f.follower_id === B.id && f.following_id === A.id), 'pedido direto de B pra A é recusado pelo banco');
const pacBloq = await ultimoPacote(pb, 'amigos');
confere(pacBloq && !(pacBloq.dados.amigos || []).some(x => x.id === A.id), 'casca de B sem A nos amigos depois do bloqueio', pacBloq && pacBloq.dados.amigos);
confere(pacBloq && !(pacBloq.dados.feed || []).some(f => f.quem && f.quem.nome === 'Ana Teste'), 'casca de B sem itens de A no feed', pacBloq && (pacBloq.dados.feed || []).map(f => f.quem && f.quem.nome));
await ir(pb, `closeOv('ov-addfriend')`, 200);
// spot de A some pra B (sem amizade)
const spotsDeAparaB = restResponde('GET', 'spots', 'user_id=eq.' + A.id, '', { authorization: 'Bearer ' + jwt(B) });
confere(JSON.parse(spotsDeAparaB.body).length === 0, 'RLS: B não lê mais spots de A');
// desbloquear: A desbloqueia; amizade NÃO volta sozinha; pedido de novo funciona
await ir(pa, `(async()=>{await desbloquearUsuario('${B.id}')})()`, 1000);
confere(!DB.bloqueios.length, 'desbloquear apaga o bloqueio');
confere(!(await ev(pa, b => estaBloqueado(b), B.id)), 'app de A esquece o bloqueio');
await ir(pb, `(()=>{abrirAddFriend();const i=document.getElementById('friendUsernameInput');i.value='ana te';buscarPessoas('ana te')})()`, 1500);
confere(/Ana Teste/.test(await texto(pb, '#buscaPessoasRes') || ''), 'depois de desbloquear, B volta a achar A');
await ir(pb, `pedirAmizade(BUSCA_PESSOAS.findIndex(p=>p.id==='${A.id}'))`, 1200);
const ped2 = DB.follows.find(f => f.follower_id === B.id && f.following_id === A.id);
confere(ped2 && ped2.status === 'pending', 'B pede amizade de novo', ped2);
await ir(pb, `closeOv('ov-addfriend')`, 200);
// A aceita pela Atividade/aba Pedidos
await ir(pa, `(async()=>{goTo('friends');FRIENDS_DATA=null;await loadFriends();await respondRequest('${ped2 && ped2.id}',true)})()`, 1500);
confere(amigos(A.id, B.id), 'A aceita de novo');
// desfazer amizade (por B)
await ir(pb, `(async()=>{await openFriend('${A.id}');await desfazerAmizade('${A.id}','Ana')})()`, 2000);
confere(!amigos(A.id, B.id) && !DB.follows.some(f => (f.follower_id === A.id && f.following_id === B.id) || (f.follower_id === B.id && f.following_id === A.id)), 'desfazer amizade apaga os vínculos');
confere(await tela(pb) === 'friends', 'B volta pra Amigos depois de desfazer');
const delesB = await ev(pb, async a => { const l = await plnSpotsDeles(); const ids = await plnCarregarAmigos(); return { spots: l.filter(s => s.user_id === a).map(s => s.name), amigo: ids.includes(a) } }, A.id);
confere(!delesB.spots.length && !delesB.amigo, 'depois de desfazer, Planejar/ficha de B não mostram mais os spots de A', delesB);
const pacDesf = await ate(async () => { const p = await ultimoPacote(pb, 'amigos'); return p && p.pronto && !(p.dados.amigos || []).length ? p : null }, 3000);
confere(!!pacDesf, 'casca de B sem amigos depois de desfazer');
// spot de A salvo por B continua de B (a dica não some da lista dele)
confere(DB.spots.some(s => s.user_id === B.id && s.name === 'Taberna da Rua das Flores'), 'o spot que B salvou de A continua na lista de B');
['A', 'B'].forEach(n => { const e = errosDe(PAGINAS[n]); confere(!e.length, 'sem erro de JS no aparelho ' + n, e) });

// ═══ JORNADA 6 · troca de conta no mesmo aparelho (casca) ═══
if (Number(process.env.SO_ATE) && Number(process.env.SO_ATE) < 6) await fim();
JORNADA = '6 troca de conta';
console.log('\n── ' + JORNADA);
// A e B amigos de novo, pra ter o que vazar
DB.follows.push({ id: uuid(), follower_id: A.id, following_id: B.id, status: 'accepted', created_at: agora() });
const pc = await abrirAparelho('C', { casca: true });
await carregar(pc);
await entrar(pc, A.email, A.senha, false);
await ir(pc, `window.irParaAba('friends')`, 1800);
await ir(pc, `window.irParaAba('profile')`, 1500);
await ir(pc, `(()=>{goTo('explore');loadExplore();const c=document.getElementById('exploreCitySearch');if(c){c.value='Lisboa';sugerirLugar('Lisboa')}})()`, 1500);
await ir(pc, `(async()=>{try{await escolherSugestao&&escolherSugestao(0)}catch(e){}})()`, 1500);
await ir(pc, `window.irParaAba('dashboard')`, 1500);
const lsA = await ev(pc, () => Object.keys(localStorage));
console.log('  chaves no aparelho com A logada:', lsA.join(', '));
// sair de A (Ajustes → Sair), como a pessoa faz
await limpaCasca(pc);
const navegou = pc.waitForNavigation({ timeout: 8000 }).catch(() => null);
await ev(pc, () => { signOut() });
await navegou;
await ate(() => ev(pc, () => typeof S !== 'undefined' && document.querySelector('.screen.active') && document.querySelector('.screen.active').id === 'login'), 8000);
await ev(pc, () => { window.confirmar = async () => true });
confere(await tela(pc) === 'login', 'sair de A volta pro login', await tela(pc));
const lsDepois = await ev(pc, () => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
const rastrosA = [A.id, 'Ana Teste', 'anateste', 'Taberna da Rua das Flores', 'Cervejaria Ramiro', 'Casa Lucio', 'Sintra', 'ana.teste@'];
const sobras = Object.entries(lsDepois).filter(([k, v]) => rastrosA.some(x => (k + v).includes(x))).map(([k, v]) => k + ' = ' + v.slice(0, 120));
confere(!sobras.length, 'localStorage sem nada de A depois de sair', sobras);
const pacotesPosSaida = await casca(pc);
confere(pacotesPosSaida.some(m => m.tipo === 'viagens' && m.pronto === false) && pacotesPosSaida.some(m => m.tipo === 'explorar' && m.pronto === false), 'casca recebe "sem dados" de Viagens e Explorar ao reabrir', pacotesPosSaida.map(m => m.tipo + ':' + m.pronto));
confere(pacotesPosSaida.some(m => m.tipo === 'amigos' && m.pronto === false) || !pacotesPosSaida.some(m => m.tipo === 'amigos'), 'casca recebe "sem dados" de Amigos ao reabrir (PROVÁVEL)', pacotesPosSaida.filter(m => m.tipo === 'amigos').map(m => m.pronto));
confere(pacotesPosSaida.some(m => m.tipo === 'perfil' && m.pronto === false) || !pacotesPosSaida.some(m => m.tipo === 'perfil'), 'casca recebe "sem dados" do Perfil ao reabrir (PROVÁVEL)', pacotesPosSaida.filter(m => m.tipo === 'perfil'));
// entra B no mesmo aparelho
await entrar(pc, B_EMAIL, B_SENHA, false);
confere(await ev(pc, () => S.user && S.user.id) === B.id, 'B entra no aparelho onde A estava');
await ir(pc, `window.irParaAba('friends')`, 1800);
await ir(pc, `window.irParaAba('profile')`, 1500);
await ir(pc, `window.irParaAba('explore')`, 1500);
await ir(pc, `window.irParaAba('dashboard')`, 1500);
const pacotesB = await casca(pc);
// tudo que foi pra casca depois do login de B não pode carregar dado PRIVADO de A
const vazouPrivado = pacotesB.filter(m => /Casa Lucio|Espanha|ana\.teste@/.test(JSON.stringify(m))).map(m => m.tipo);
confere(!vazouPrivado.length, 'pacotes da casca com B não carregam o privado de A', vazouPrivado);
const pacViagensB = pacotesB.filter(m => m.tipo === 'viagens' && m.pronto).pop();
confere(pacViagensB && !/Casa Lucio|"Espanha"|São Paulo/.test(JSON.stringify(pacViagensB)), 'pacote Viagens com B não traz viagens de A', pacViagensB && JSON.stringify(pacViagensB).slice(0, 300));
const pacPerfilB = pacotesB.filter(m => m.tipo === 'perfil').pop();
confere(!pacPerfilB || !/Ana Teste|anateste/.test(JSON.stringify(pacPerfilB)), 'pacote Perfil com B não traz o perfil de A', pacPerfilB && JSON.stringify(pacPerfilB).slice(0, 300));
const telaWeb = await ev(pc, () => ['dashboard', 'profile', 'explore'].map(id => (document.getElementById(id) || {}).innerText || '').join('\n'));
confere(!/Casa Lucio|Ana Teste|anateste/.test(telaWeb), 'telas web com B sem nome/spot privado de A', (telaWeb.match(/.{0,40}(Casa Lucio|Ana Teste|anateste).{0,40}/) || [])[0]);
const recentes = await ev(pc, () => localStorage.getItem('spot_explorar_recentes_v1'));
confere(!recentes || !/Lisboa/.test(recentes), 'buscas recentes do Explorar de A não aparecem pra B', recentes);
['C'].forEach(n => { const e = errosDe(PAGINAS[n]); confere(!e.length, 'sem erro de JS no aparelho ' + n, e) });

// ═══ JORNADA 7 · Apple com e-mail escondido (08/10, família do sócio) ═══
// O perfil nasce com o começo do e-mail de retransmissão como nome
// ("V66gc4kfmt" no Perfil, mesmo depois de trocar o @), e as cidades marcadas
// num país só marcado não apareciam em lugar nenhum.
if (Number(process.env.SO_ATE) && Number(process.env.SO_ATE) < 7) await fim();
JORNADA = '7 apple sem nome';
console.log('\n── ' + JORNADA);
const D = novaConta('x7k2p9ab@privaterelay.appleid.com', 'senhaD-teste-4', { onboarding_done: true });
DB.profiles.push({ id: D.id, display_name: 'x7k2p9ab', username: 'gjezler', home_city: 'Salvador', home_country: 'Brasil', avatar_url: null, bio: '', created_at: agora() });
DB.trips.push({ id: uuid(), user_id: D.id, name: 'Portugal', destinations: ['Portugal'], dates: '__quickvisit__', status: 'done', privada: false, proxima: false, created_at: agora() });
const pd = await abrirAparelho('D', { casca: true });
await carregar(pd);
await entrar(pd, D.email, D.senha, false);
const perguntou = await ate(async () => (await janelas(pd)).includes('ov-seunome'), 5000);
confere(perguntou, 'conta com nome automático recebe a pergunta do nome', await janelas(pd));
const nomeAntes = await ev(pd, () => nomeDeExibicao());
confere(nomeAntes === 'gjezler', 'antes de ter nome, o Perfil mostra o @ trocado, não o e-mail', nomeAntes);
await ir(pd, `(async()=>{document.getElementById('seuNomeInput').value='Gabriel Jezler';await salvarSeuNome()})()`, 1200);
confere(nomeDe(D.id) === 'Gabriel Jezler', 'o nome vai pro banco (é o que amigo vê e a busca acha)', nomeDe(D.id));
const pacPerfilD = await ultimoPacote(pd, 'perfil');
confere(pacPerfilD && pacPerfilD.dados && pacPerfilD.dados.nome === 'Gabriel', 'o Perfil do app mostra o nome novo', pacPerfilD && pacPerfilD.dados && pacPerfilD.dados.nome);
// Ajustes também troca o nome
await ir(pd, `(async()=>{abrirConfig();document.getElementById('displayNameInput').value='Gabi Jezler';await salvarPerfil()})()`, 1500);
confere(nomeDe(D.id) === 'Gabi Jezler', 'Ajustes troca o nome', nomeDe(D.id));
// Cidade num país só marcado
await ir(pd, `(async()=>{document.querySelectorAll('.overlay.show').forEach(o=>closeOv(o.id));goTo('dashboard');abrirMarcarCidades('Portugal')})()`, 1200);
await ir(pd, `(()=>{const i=document.getElementById('cvBusca');i.value='Sintra';cvBuscar('Sintra')})()`, 1200);
await ir(pd, `(()=>{const l=[...document.querySelectorAll('#cvLista .cv-linha:not(.on)')].find(x=>/Sintra/.test(x.innerText));if(l)l.click()})()`, 300);
await ir(pd, `cvSalvar()`, 1500);
confere(DB.cidades_visitadas.some(c => c.user_id === D.id && c.nome === 'Sintra'), 'D marca Sintra', DB.cidades_visitadas.filter(c => c.user_id === D.id));
await ir(pd, `(async()=>{await loadDashboard()})()`, 1500);
const pacViagensD = await ultimoPacote(pd, 'viagens');
const vd = (pacViagensD && pacViagensD.dados) || {};
const portugal = (vd.viagensDaRegiao || []).find(t => t.nome === 'Portugal');
confere(!!portugal, 'Portugal (só marcado) aparece na lista de Viagens do app com a cidade', (vd.viagensDaRegiao || []).map(t => t.nome));
confere(portugal && /1 cidade/.test(portugal.meta), 'o card diz "1 cidade"', portugal && portugal.meta);
confere(!vd.primeiro, 'com cidade marcada, a aba não fica no "Seu primeiro spot"', vd.primeiro);
confere(vd.cidades >= 1, 'placar conta a cidade', vd.cidades);
['D'].forEach(n => { const e = errosDe(PAGINAS[n]); confere(!e.length, 'sem erro de JS no aparelho ' + n, e) });

// ═══ fim ═══
await fim();
async function fim() {
JORNADA = 'geral';
confere(!ERROS_APP.length, 'o app não reportou erro pra /api/erro', ERROS_APP.slice(0, 5));
if (VERBOSO) console.log('recusas do RLS:', JSON.stringify(RECUSAS).slice(0, 2000));
console.log('\nASSERÇÕES: ' + (OKS.length + FALHAS.length) + ' · ok ' + OKS.length);
console.log('FALHAS (' + FALHAS.length + '):'); FALHAS.forEach(f => console.log(' -', f));
await br.close();
process.exit(FALHAS.length ? 1 : 0);
}
