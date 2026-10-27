import { quemEsta } from './_auth.js';
import { acharDono, avisarDono } from './_aviso-dono.js';
import { lerKV, gravarKV } from './_kv.js';
import { idDaFoto } from './place-photo.js';

// Cloudflare Pages Function — O ROBÔ DOS HOTSPOTS: /api/hotspots (26/10/2026).
//
// "Hotspots em [cidade]" = os lugares que VÁRIAS vozes da cena citaram nas
// últimas semanas. Uma voz sozinha não vira Hotspot: seria copiar a lista de
// alguém. O sinal é o cruzamento.
//
// A RODADA (toda semana, quinta à noite — .github/workflows/hotspots.yml):
//   1. lê as fontes: canais do YouTube (o vídeo novo e a descrição, onde
//      esse tipo de criador põe nome e endereço) e páginas de guia;
//   2. a IA (Haiku, como o importar.js) separa os lugares de cada vídeo ou
//      página, e QUEM indicou (num vídeo de "favoritos do chef X", a voz é o
//      chef, não o canal). Cada vídeo é lido UMA vez e guardado;
//   3. cada lugar é achado no Google uma vez e guardado (1 ano) — "Galeto
//      Sat's" escrito de três jeitos vira o mesmo lugar;
//   4. conta as vozes por lugar, com peso pro recente, e monta a lista da
//      semana de cada cidade;
//   5. avisa o dono no celular. Ele abre o app (Ajustes → Hotspots da semana),
//      tira o que não quiser e, se não mexer, sai sozinho sexta às 17h.
//
// PUBLICAR = gravar a lista como spots da conta-fonte (`oqms_previa`), numa
// viagem "Hotspots em <cidade>". Ninguém vê de onde vem; o nome de quem
// indicou nunca sai daqui (a página de aprovar é só do dono).
//
// O QUE NÃO ENTRA: vídeo patrocinado (publi), o restaurante de quem indica, e
// o Instagram (ler em volume pede login e vai contra as regras deles).
//
// QUEM CHAMA: o dono (moderadores), logado, pode tudo. Sem login, só as duas
// operações do agendador, e elas se protegem sozinhas: "rodar" não roda de
// novo antes de 6 dias, "publicar" só faz algo sexta depois das 17h e uma vez
// por semana. Chamar à toa não gasta nada a mais.

const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const MODELO = 'claude-haiku-4-5';
const CONTA_FONTE = 'oqms_previa';
const CIDADES = ['São Paulo', 'Rio de Janeiro'];
const POR_CIDADE = 12;           // lugares por lista
// Mira de 5 (o Lucas, 27/10: "4 é muito pouco"): com menos de 5 lugares de 2+
// vozes, a lista completa com as indicações mais recentes de UMA voz, marcadas
// (umaVoz) pra página de aprovar mostrar e o dono decidir se ficam.
const MINIMO_POR_CIDADE = 5;
const MIN_VOZES = 2;
const JANELA_DIAS = 180;         // o que conta
const ESPERA_RODADA_MS = 6 * 24 * 3600 * 1000;
const MAX_VIDEOS_NOVOS = 80;     // por rodada: freio contra fonte que despeja centenas
const MAX_BUSCAS_GOOGLE = 150;   // por rodada
const ANO = 60 * 60 * 24 * 365;

// As fontes aprovadas pelo Lucas (26/10). A página de aprovar põe e tira;
// isto é só o ponto de partida quando o KV ainda não tem nada.
//   cidades: em que listas a fonte conta (vazio = todas).
//   busca:   termo pra puxar vídeos ANTIGOS do canal na 1ª vez (o feed só
//            traz os 15 últimos).
//   soComACidade: só lê o vídeo que cita a cidade (canal que mistura
//            receita e viagem, como o do Mohamad).
export const FONTES_INICIAIS = [
  { id: 'yt:UCP_vl0ReyC4nKz2LvuI8KXw', tipo: 'youtube', canal: 'UCP_vl0ReyC4nKz2LvuI8KXw', nome: 'Onde o Bruno Come', cidades: ['São Paulo'] },
  { id: 'yt:UCTTKtO5pU4OC7dqxG2bZflw', tipo: 'youtube', canal: 'UCTTKtO5pU4OC7dqxG2bZflw', nome: 'Gaba', cidades: ['São Paulo'] },
  { id: 'yt:UCKPNGvNmpWwlYF58egvP5Rg', tipo: 'youtube', canal: 'UCKPNGvNmpWwlYF58egvP5Rg', nome: 'Caio Pra Dentro', cidades: [] },
  // A série "Favoritos da cidade" do Mohamad Hindi: cada episódio é um chef
  // dizendo onde come (cada chef = uma voz). Pela PLAYLIST, não pelo canal: o
  // canal é quase todo receita, e a busca de vídeos antigos não responde a
  // pedido vindo do servidor; o feed da playlist responde.
  { id: 'yt:pl:PLpUs89aC5iYRU79N54mFHNZG_HAZU4Y5Q', tipo: 'youtube', playlist: 'PLpUs89aC5iYRU79N54mFHNZG_HAZU4Y5Q', nome: 'Favoritos da cidade (Rio)', cidades: ['Rio de Janeiro'] },
  { id: 'pg:thesummerhunter-rio', tipo: 'pagina', url: 'https://thesummerhunter.com/rio-de-janeiro-miniguia-novidades-2026/', nome: 'The Summer Hunter', cidades: ['Rio de Janeiro'] },
  { id: 'pg:timeout-rio', tipo: 'pagina', url: 'https://www.timeout.com/pt/rio-de-janeiro/restaurantes', nome: 'Time Out Rio', cidades: ['Rio de Janeiro'] }
];

const SISTEMA = `Você lê a descrição de um vídeo (ou o texto de uma página) de quem indica restaurantes, bares e cafés. Separe cada LUGAR concreto indicado.

Para cada lugar:
- nome: o nome do lugar, com a grafia certa.
- endereco: rua e número se o texto der; senão vazio.
- bairro: se o texto der; senão vazio.
- cidade: o nome completo da cidade ("São Paulo", "Rio de Janeiro", "Nova York"). Use o contexto (hashtags, título). Vazio se não der pra saber.
- voz: QUEM está indicando o lugar. Se o vídeo é "os favoritos do chef X" ou "onde a Y gosta de comer", a voz é X ou Y. Se é o próprio criador indo ao lugar, a voz é o nome do canal.
- proprio: true se o lugar é de quem indica (dono, chef, sócio, trabalha lá — ex.: "prato favorito no meu restaurante", "garçom do lugar"). Senão false.
- negativo: true se a indicação é negativa ou duvidosa ("o pior", "não vale", "decepcionou"). Senão false.

E no fim:
- publi: true se o conteúdo é patrocinado ou publicidade (#publi, "publicidade", "parceria", marca agradecida como patrocinadora).

Não entram: cidades ou bairros sozinhos, marcas de produto, pratos sem restaurante, delivery de aplicativo genérico. Lugar repetido entra uma vez.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    publi: { type: 'boolean' },
    lugares: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' }, endereco: { type: 'string' }, bairro: { type: 'string' },
          cidade: { type: 'string' }, voz: { type: 'string' },
          proprio: { type: 'boolean' }, negativo: { type: 'boolean' }
        },
        required: ['nome', 'endereco', 'bairro', 'cidade', 'voz', 'proprio', 'negativo'],
        additionalProperties: false
      }
    }
  },
  required: ['publi', 'lugares'],
  additionalProperties: false
};

// ─────────────────────────── rotas ───────────────────────────

export async function onRequestGet(context) {
  const { request, env } = context;
  const dono = await ehDono(request, env);
  if (!dono) return json({ error: 'so_o_dono' }, 403);
  return json(await estado(env));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const op = String(body.op || '');
  const dono = await ehDono(request, env);

  if (op === 'rodar') {
    if (!dono) {
      const ultima = parseInt((await lerKV(env, 'hs_ultima_rodada')) || '0', 10);
      // Rodada que saiu VAZIA (fonte fora do ar, YouTube recusando) pode
      // tentar de novo depois de 1 hora, sem esperar a semana.
      const sem = await lerJSON(env, 'hs_semana');
      const vazia = sem && sem.listas && sem.listas.every((l) => !l.lugares.length);
      const espera = vazia ? 3600 * 1000 : ESPERA_RODADA_MS;
      if (Date.now() - ultima < espera) return json({ ok: true, pulou: 'cedo' });
    }
    const r = await rodar(env);
    if (dono || !r.ok) return json(r);
    const n = (r.listas || []).reduce((a, l) => a + l.lugares.length, 0);
    await avisarDono(env, 'Hotspots da semana prontos', n + ' lugares pra olhar. Se não mexer, sai sexta às 17h.', 'hotspots');
    // Pra quem não é o dono, só números: a lista (e quem indicou) não sai daqui.
    return json({ ok: true, lugares: n, porCidade: r.listas.map((l) => [l.cidade, l.lugares.length]), novosVideos: r.novosVideos, buscas: r.buscas,
      log: r.log.length, porFonte: r.porFonte, citacoes: r.citacoes, validas: r.validas });
  }
  if (op === 'previa') return json(await previa(env));
  if (op === 'publicar') {
    if (!dono && !ehHoraDePublicar(new Date())) return json({ ok: true, pulou: 'fora_da_hora' });
    return json(await publicar(env, !!dono));
  }
  if (!dono) return json({ error: 'so_o_dono' }, 403);

  if (op === 'tirar' || op === 'voltar') {
    const semana = await lerJSON(env, 'hs_semana');
    if (!semana) return json({ error: 'sem_lista' }, 404);
    const chave = String(body.chave || '');
    const t = new Set(semana.tirados || []);
    if (op === 'tirar') t.add(chave); else t.delete(chave);
    semana.tirados = [...t];
    await gravarKV(env, 'hs_semana', JSON.stringify(semana), ANO);
    return json(await estado(env));
  }
  if (op === 'fonte_por' || op === 'fonte_tirar') {
    const fontes = await lerFontes(env);
    if (op === 'fonte_tirar') {
      const id = String(body.id || '');
      await gravarKV(env, 'hs_fontes', JSON.stringify(fontes.filter((f) => f.id !== id)), ANO * 10);
      return json(await estado(env));
    }
    const nova = await fonteDoEndereco(String(body.endereco || ''), body.cidades);
    if (!nova) return json({ error: 'fonte_invalida' }, 400);
    if (!fontes.some((f) => f.id === nova.id)) fontes.push(nova);
    await gravarKV(env, 'hs_fontes', JSON.stringify(fontes), ANO * 10);
    return json(await estado(env));
  }
  return json({ error: 'op' }, 400);
}

async function ehDono(request, env) {
  if (!env.SUPABASE_SERVICE_KEY) return false;
  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return false;
  const dono = await acharDono(sbGet(env), env);
  return !!(dono && dono.id === quem.uid);
}

// Sexta, 17h em Brasília (UTC-3, sem horário de verão desde 2019) = 20h UTC.
export function ehHoraDePublicar(agora) {
  return agora.getUTCDay() === 5 && agora.getUTCHours() >= 20;
}

async function estado(env) {
  return {
    fontes: await lerFontes(env),
    semana: await lerJSON(env, 'hs_semana'),
    publicada: await lerJSON(env, 'hs_publicada'),
    ultima_rodada: parseInt((await lerKV(env, 'hs_ultima_rodada')) || '0', 10) || null,
    ligado: !!(env.ANTHROPIC_API_KEY && env.GOOGLE_PLACES_KEY && env.SUPABASE_SERVICE_KEY)
  };
}

// ─────────────────────────── a rodada ───────────────────────────

async function rodar(env) {
  if (!env.ANTHROPIC_API_KEY || !env.GOOGLE_PLACES_KEY) return { ok: false, error: 'sem_chave' };
  await gravarKV(env, 'hs_ultima_rodada', String(Date.now()), ANO);
  const fontes = await lerFontes(env);
  const log = [];
  let novosVideos = 0;

  // 1+2. cada fonte: os itens (vídeo ou página) que ainda não foram lidos
  const faltam = [];  // [{f, it}] ainda não lidos pela IA
  const porFonte = [];  // [itens vistos agora, já lidos antes] — só números
  const vistos = new Map();  // fonte -> [{chave, data}] que o feed mostrou hoje
  for (const f of fontes) {
    let itens = [];
    try { itens = await itensDaFonte(env, f) } catch (e) { log.push(f.nome + ': falhou ao ler'); porFonte.push([0, 0]); continue }
    let jaLidos = 0;
    vistos.set(f.id, itens.map((it) => ({ chave: it.chave, data: it.data })));
    for (const it of itens) {
      if (await lerKV(env, 'hs_item_' + it.chave)) jaLidos++;
      else if (faltam.length < MAX_VIDEOS_NOVOS && valeLer(it, f, Date.now())) faltam.push({ f, it });
    }
    porFonte.push([itens.length, jaLidos]);
  }
  // A IA lê de 6 em 6 ao mesmo tempo: 60 vídeos em ~1 min em vez de 5.
  const novosPorFonte = new Map();
  await emLotes(faltam, 6, async ({ f, it }) => {
    novosVideos++;
    const ext = await extrair(env, it, f);
    if (!ext) { log.push(f.nome + ': a IA não leu "' + it.titulo.slice(0, 40) + '"'); return }
    const lido = { data: it.data, publi: ext.publi || ehPubliPeloTexto(it.texto), lugares: ext.lugares, titulo: it.titulo.slice(0, 120) };
    await gravarKV(env, 'hs_item_' + it.chave, JSON.stringify(lido), ANO * 2);
    if (!novosPorFonte.has(f.id)) novosPorFonte.set(f.id, []);
    novosPorFonte.get(f.id).push({ chave: it.chave, data: it.data });
  });
  // O ÍNDICE de cada fonte: tudo que já foi lido dela. A conta é sobre o
  // índice, não sobre o que o feed mostra hoje — o feed só traz os 15 últimos,
  // e um vídeo de 2 meses atrás continua valendo dentro da janela.
  const citacoes = [];
  const limite = new Date(Date.now() - JANELA_DIAS * 86400000).toISOString().slice(0, 10);
  for (const f of fontes) {
    const antes = (await lerJSON(env, 'hs_idx_' + f.id)) || [];
    const cand = antes.concat(vistos.get(f.id) || [], novosPorFonte.get(f.id) || [])
      .filter((x, i, a) => a.findIndex((y) => y.chave === x.chave) === i);
    const idx = [];
    for (const x of cand) {
      const lido = await lerJSON(env, 'hs_item_' + x.chave);
      if (!lido) continue;
      const data = lido.data || x.data;
      if (data && data < limite) continue;
      idx.push({ chave: x.chave, data });
      if (lido.publi) continue;
      for (const l of lido.lugares || []) citacoes.push(Object.assign({}, l, { data, fonte: f.id, cidadesDaFonte: f.cidades || [] }));
    }
    if (idx.length !== antes.length) await gravarKV(env, 'hs_idx_' + f.id, JSON.stringify(idx), ANO * 2);
  }

  // 3. achar no Google o que ainda não foi achado (só o que pode contar)
  const validas = citacoesValidas(citacoes, Date.now());
  let buscas = 0;
  const porLugar = new Map();
  for (const c of validas) {
    const k = 'hs_g_' + await resumo(normalizar(c.nome) + '|' + normalizar(c.cidade));
    if (!porLugar.has(k)) porLugar.set(k, []);
    porLugar.get(k).push(c);
  }
  await emLotes([...porLugar.entries()], 10, async ([k, cs]) => {
    let g = await lerJSON(env, k);
    if (!g && buscas < MAX_BUSCAS_GOOGLE) {
      buscas++;
      g = (await acharNoGoogle(env, cs.find((c) => c.endereco) || cs[0])) || { nao: true };
      await gravarKV(env, k, JSON.stringify(g), g.nao ? 60 * 60 * 24 * 30 : ANO);
    }
    for (const c of cs) c.g = g && !g.nao ? g : null;
  });

  // 4. contar e montar
  const anterior = await lerJSON(env, 'hs_semana');
  const listas = CIDADES.map((cidade) => ({ cidade, lugares: montarLista(validas, cidade, Date.now()) }));
  const semana = { criada: Date.now(), listas, tirados: [], log };
  // Lugar tirado na semana passada continua tirado se voltar (o Lucas já disse não).
  if (anterior && anterior.tirados) {
    const chaves = new Set(listas.flatMap((l) => l.lugares.map((x) => x.chave)));
    semana.tirados = anterior.tirados.filter((t) => chaves.has(t));
  }
  await gravarKV(env, 'hs_semana', JSON.stringify(semana), ANO);
  return { ok: true, listas, log, novosVideos, buscas, porFonte, citacoes: citacoes.length, validas: validas.length };
}

// Itens de uma fonte: [{chave, titulo, texto, data}]
async function itensDaFonte(env, f) {
  if (f.tipo === 'youtube') return videosDoCanal(env, f);
  if (f.tipo === 'pagina') {
    const r = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR' } });
    if (!r.ok) throw new Error('pagina ' + r.status);
    const texto = textoDaPagina(await r.text()).slice(0, 20000);
    // A página muda; a chave é o conteúdo, então só relê quando muda.
    return [{ chave: f.id + '_' + await resumo(texto), titulo: f.nome, texto, data: new Date().toISOString().slice(0, 10) }];
  }
  return [];
}

async function videosDoCanal(env, f) {
  const itens = [];
  // O feed traz os 15 últimos COM a descrição. Às vezes o YouTube devolve 500:
  // uma 2ª tentativa resolve quase sempre.
  let xml = '';
  for (let i = 0; i < 3 && !xml.includes('<entry>'); i++) {
    try { const r = await fetch('https://www.youtube.com/feeds/videos.xml?' + (f.playlist ? 'playlist_id=' + f.playlist : 'channel_id=' + f.canal)); xml = r.ok ? await r.text() : '' } catch (e) {}
  }
  // Feed fora: a página de vídeos do canal dá os ids, e a de cada vídeo a
  // descrição (só dos que ainda não foram lidos).
  if (!xml.includes('<entry>') && f.canal) {
    try {
      const h = await (await fetch('https://www.youtube.com/channel/' + f.canal + '/videos', { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR' } })).text();
      const ids = [...new Set([...h.matchAll(/"(?:contentId|videoId)":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]))].slice(0, 15);
      for (const id of ids) {
        if (await lerKV(env, 'hs_item_yt_' + id)) { itens.push({ chave: 'yt_' + id, titulo: '', texto: '', data: '' }); continue }
        const v = await videoPelaPagina(id);
        if (v) itens.push(v);
      }
    } catch (e) {}
  }
  for (const e of xml.split('<entry>').slice(1)) {
    const id = (e.match(/<yt:videoId>([^<]+)/) || [])[1];
    if (!id) continue;
    itens.push({
      chave: 'yt_' + id,
      titulo: desescapar((e.match(/<title>([^<]*)/) || [])[1] || ''),
      texto: desescapar((e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || ''),
      data: ((e.match(/<published>([^<]+)/) || [])[1] || '').slice(0, 10)
    });
  }
  // 1ª vez com "busca": vídeos antigos do canal sobre a cidade. Uma vez só.
  if (f.busca && f.canal && !(await lerKV(env, 'hs_busca_feita_' + f.id))) {
    try {
      const h = await (await fetch('https://www.youtube.com/channel/' + f.canal + '/search?query=' + encodeURIComponent(f.busca),
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR' } })).text();
      const ids = [...new Set([...h.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]))].slice(0, 30);
      let achou = 0;
      for (const id of ids) {
        if (itens.some((x) => x.chave === 'yt_' + id) || await lerKV(env, 'hs_item_yt_' + id)) { achou++; continue }
        const v = await videoPelaPagina(id);
        if (v) { itens.push(v); achou++ }
      }
      // Só dá a busca por feita se ela trouxe algo: YouTube recusando (página
      // de consentimento, erro) tenta de novo na próxima rodada.
      if (achou) await gravarKV(env, 'hs_busca_feita_' + f.id, '1', ANO * 10);
    } catch (e) {}
  }
  return itens;
}

async function videoPelaPagina(id) {
  try {
    const h = await (await fetch('https://www.youtube.com/watch?v=' + id, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR' } })).text();
    const p = jsonDepoisDe(h, 'ytInitialPlayerResponse = ');
    if (!p) return null;
    const d = p.videoDetails || {}, mf = (p.microformat || {}).playerMicroformatRenderer || {};
    return { chave: 'yt_' + id, titulo: d.title || '', texto: d.shortDescription || '', data: String(mf.uploadDate || '').slice(0, 10) };
  } catch (e) { return null }
}

async function extrair(env, it, f) {
  const conteudo = 'Fonte: ' + f.nome + '\nData: ' + it.data + '\nTítulo: ' + it.titulo + '\n\n' + it.texto.slice(0, 12000);
  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODELO, max_tokens: 4000, system: SISTEMA,
        messages: [{ role: 'user', content: conteudo }],
        output_config: { format: { type: 'json_schema', schema: ESQUEMA } }
      })
    });
  } catch (e) { return null }
  if (!r.ok) return null;
  let d;
  try { d = await r.json() } catch (e) { return null }
  if (d.stop_reason === 'refusal' || d.stop_reason === 'max_tokens') return null;
  const bloco = (d.content || []).find((c) => c.type === 'text');
  try { return limparExtracao(JSON.parse(bloco ? bloco.text : '{}'), f.nome) } catch (e) { return null }
}

export function limparExtracao(x, nomeDaFonte) {
  const l = Array.isArray(x && x.lugares) ? x.lugares : [];
  return {
    publi: !!(x && x.publi),
    lugares: l.map((p) => ({
      nome: limpa(p.nome, 100), endereco: limpa(p.endereco, 140), bairro: limpa(p.bairro, 60),
      cidade: limpa(p.cidade, 60), voz: limpa(p.voz, 60) || nomeDaFonte,
      proprio: !!p.proprio, negativo: !!p.negativo
    })).filter((p) => p.nome).slice(0, 60)
  };
}

// Antes de pagar a IA: vídeo velho demais não contaria, e no canal que mistura
// receita e viagem (soComACidade), vídeo que nem cita a cidade é receita de bolo.
export function valeLer(it, f, agora) {
  const t = Date.parse(it.data || '');
  if (t && t < agora - JANELA_DIAS * 86400000) return false;
  const cid = f.cidades || [];
  if (!f.soComACidade || !cid.length) return true;
  const txt = ' ' + normalizar(it.titulo + ' ' + it.texto) + ' ';
  return cid.some((c) => txt.includes(' ' + normalizar(c) + ' ') || (c === 'São Paulo' && /\ssp\s/.test(txt)) || (c === 'Rio de Janeiro' && /\s(rj|rio)\s/.test(txt)));
}

export function ehPubliPeloTexto(t) {
  return /#publi|\bpubli\b|publicidade|parceria paga|conte[uú]do patrocinado/i.test(String(t || ''));
}

// Só o que pode contar: dentro da janela, nem do próprio, nem negativo, numa
// cidade que a fonte cobre e que tem lista.
export function citacoesValidas(citacoes, agora) {
  const limite = agora - JANELA_DIAS * 86400000;
  return citacoes.filter((c) => {
    if (c.proprio || c.negativo || !c.nome) return false;
    const cid = cidadeDaLista(c.cidade);
    if (!cid) return false;
    if (c.cidadesDaFonte && c.cidadesDaFonte.length && !c.cidadesDaFonte.includes(cid)) return false;
    const t = Date.parse(c.data || '');
    return !t || t >= limite;
  }).map((c) => Object.assign({}, c, { cidade: cidadeDaLista(c.cidade) }));
}

export function cidadeDaLista(c) {
  const n = normalizar(c);
  if (!n) return '';
  if (n === 'sp' || n === 'sao paulo' || n.startsWith('sao paulo ')) return 'São Paulo';
  if (n === 'rj' || n === 'rio' || n === 'rio de janeiro' || n.startsWith('rio de janeiro ')) return 'Rio de Janeiro';
  return CIDADES.find((x) => normalizar(x) === n) || '';
}

// O coração: agrupa por lugar (o id do Google; sem ele, o nome), conta vozes
// DIFERENTES e dá peso ao recente — a lista de sexta tem que ter novidade,
// não só os consagrados.
export function montarLista(validas, cidade, agora) {
  const lugares = pontuar(validas, cidade, agora).slice(0, POR_CIDADE);
  if (lugares.length >= MINIMO_POR_CIDADE) return lugares;
  const ja = new Set(lugares.map((x) => x.chave));
  const extra = pontuar(validas, cidade, agora, 1)
    .filter((x) => x.n === 1 && x.g && !ja.has(x.chave))
    .slice(0, MINIMO_POR_CIDADE - lugares.length)
    .map((x) => Object.assign({}, x, { umaVoz: true }));
  return lugares.concat(extra);
}

export function pontuar(citacoes, cidade, agora, minVozes) {
  const grupos = new Map();
  for (const c of citacoes) {
    if (c.cidade !== cidade) continue;
    const chave = c.g && c.g.id ? 'g:' + c.g.id : 'n:' + normalizar(c.nome);
    let gr = grupos.get(chave);
    if (!gr) { gr = { chave, nome: (c.g && c.g.nome) || c.nome, g: c.g || null, bairro: c.bairro, endereco: c.endereco, vozes: new Map(), primeira: c.data }; grupos.set(chave, gr) }
    // A mesma voz citando o lugar duas vezes conta uma — vale a mais recente.
    const voz = normalizar(c.voz) || c.fonte;
    const peso = pesoDaData(c.data, agora);
    const atual = gr.vozes.get(voz);
    if (!atual || peso > atual.peso) gr.vozes.set(voz, { nome: c.voz, peso });
    if (!gr.endereco && c.endereco) gr.endereco = c.endereco;
    if (!gr.bairro && c.bairro) gr.bairro = c.bairro;
    if (c.data && (!gr.primeira || c.data < gr.primeira)) gr.primeira = c.data;
  }
  return [...grupos.values()]
    .filter((g) => g.vozes.size >= (minVozes || MIN_VOZES))
    .map((g) => {
      const vozes = [...g.vozes.values()];
      return {
        chave: g.chave, nome: g.nome, bairro: g.bairro || '', endereco: (g.g && g.g.endereco) || g.endereco || '',
        g: g.g, vozes: vozes.map((v) => v.nome), n: vozes.length,
        pontos: Math.round(vozes.reduce((a, v) => a + v.peso, 0) * 100) / 100,
        novo: !!(g.primeira && agora - Date.parse(g.primeira) < 45 * 86400000)
      };
    })
    .sort((a, b) => b.pontos - a.pontos || b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function pesoDaData(data, agora) {
  const t = Date.parse(data || '');
  if (!t) return 0.5;
  const dias = (agora - t) / 86400000;
  return dias < 45 ? 1 : dias < 120 ? 0.6 : 0.3;
}

async function acharNoGoogle(env, c) {
  const q = [c.nome, c.endereco || c.bairro, c.cidade].filter(Boolean).join(', ');
  let r;
  try {
    r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.photos,places.googleMapsUri'
      },
      body: JSON.stringify({ textQuery: q, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 1 })
    });
  } catch (e) { return null }
  if (!r.ok) return null;
  let d;
  try { d = await r.json() } catch (e) { return null }
  return lugarDoGoogle((d.places || [])[0], c.cidade);
}

// Só aceita o resultado se ele é mesmo na cidade: "Bar da Frente, Rio" não
// pode virar um Bar da Frente de outro estado.
export function lugarDoGoogle(p, cidade) {
  if (!p || !p.id) return null;
  const end = String(p.formattedAddress || '');
  if (cidade && !normalizar(end).includes(normalizar(cidade))) return null;
  const ph = (p.photos || [])[0];
  return {
    id: p.id, nome: (p.displayName && p.displayName.text) || '', endereco: end,
    lat: p.location ? p.location.latitude : null, lng: p.location ? p.location.longitude : null,
    tipo: p.primaryType || '', categoria: categoriaPelosTipos(p.types, p.primaryType),
    foto: ph && ph.name ? { ref: ph.name, s: idDaFoto(ph) } : null,
    maps: p.googleMapsUri || ''
  };
}

const COMIDA = new Set(['restaurant', 'food', 'bar', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery', 'night_club', 'coffee_shop', 'ice_cream_shop', 'pub', 'wine_bar', 'food_court', 'dessert_shop', 'confectionery']);
const HOSPEDAGEM = new Set(['lodging', 'hotel', 'hostel', 'motel', 'resort_hotel', 'bed_and_breakfast', 'guest_house', 'inn']);
export function categoriaPelosTipos(types, primario) {
  const t = [primario, ...(types || [])].filter(Boolean);
  if (t.some((x) => HOSPEDAGEM.has(x))) return 'hotel';
  if (t.some((x) => COMIDA.has(x) || /_restaurant$|_bar$|_shop$/.test(x))) return 'food';
  return 'experience';
}

// ─────────────────────────── prévia da newsletter ───────────────────────────

// O que a newsletter mostra de cada lugar da lista da semana: foto, faixa de
// preço, site e mapa, do Google. Nunca quem indicou (isso é só da página do
// dono). Aberta sem login: a lista vira pública na sexta de qualquer jeito, e o
// detalhe de cada lugar é buscado no Google UMA vez e guardado 30 dias — chamar
// de novo não gasta nada. Os tirados pelo dono não aparecem.
async function previa(env) {
  const semana = await lerJSON(env, 'hs_semana');
  if (!semana) return { listas: [] };
  const tirados = new Set(semana.tirados || []);
  const listas = [];
  for (const l of semana.listas) {
    const lugares = l.lugares.filter((x) => !tirados.has(x.chave) && x.g && x.g.id);
    await emLotes(lugares, 6, async (x) => { x.det = await detalheDoLugar(env, x.g.id) });
    listas.push({
      cidade: l.cidade,
      lugares: lugares.map((x) => ({
        nome: x.g.nome || x.nome, endereco: x.g.endereco || '', bairro: x.bairro || '', tipo: x.g.tipo || '',
        foto: x.g.foto ? '/api/place-photo?ref=' + encodeURIComponent(x.g.foto.ref) + (x.g.foto.s ? '&s=' + x.g.foto.s : '') + '&w=800' : '',
        maps: x.g.maps || '', site: (x.det && x.det.site) || '', preco: (x.det && x.det.preco) || null,
        precoDe: (x.det && x.det.precoDe) || null, precoAte: (x.det && x.det.precoAte) || null, novo: !!x.novo
      }))
    });
  }
  return { criada: semana.criada, listas };
}

const NIVEL = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
async function detalheDoLugar(env, id) {
  if (!/^[A-Za-z0-9_-]{3,300}$/.test(id) || !env.GOOGLE_PLACES_KEY) return null;
  const k = 'hs_det_' + id;
  const guardado = await lerJSON(env, k);
  if (guardado) return guardado;
  let d = null;
  try {
    const r = await fetch('https://places.googleapis.com/v1/places/' + id + '?languageCode=pt-BR', {
      headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY, 'X-Goog-FieldMask': 'priceLevel,priceRange,websiteUri' }
    });
    if (r.ok) d = await r.json();
  } catch (e) {}
  if (!d) return null;
  const pr = d.priceRange || {};
  const det = {
    preco: NIVEL[d.priceLevel] || null,
    precoDe: pr.startPrice ? Number(pr.startPrice.units) || null : null,
    precoAte: pr.endPrice ? Number(pr.endPrice.units) || null : null,
    site: /^https:\/\//.test(d.websiteUri || '') ? d.websiteUri : ''
  };
  await gravarKV(env, k, JSON.stringify(det), 60 * 60 * 24 * 30);
  return det;
}

// ─────────────────────────── publicar ───────────────────────────

// Grava a lista da semana na conta-fonte: uma viagem "Hotspots em <cidade>"
// por cidade, com exatamente os lugares da semana (o que saiu da lista é
// apagado, o que continua fica — não perde a data de quando entrou).
async function publicar(env, forcar) {
  const semana = await lerJSON(env, 'hs_semana');
  if (!semana) return { ok: false, error: 'sem_lista' };
  const pub = await lerJSON(env, 'hs_publicada');
  if (!forcar && pub && pub.semana === semana.criada) return { ok: true, pulou: 'ja_publicada' };
  if (!env.SUPABASE_SERVICE_KEY) return { ok: false, error: 'sem_chave' };
  const [conta] = await sbGet(env)('/rest/v1/profiles?select=id&username=eq.' + CONTA_FONTE);
  if (!conta) return { ok: false, error: 'sem_conta_fonte' };
  const tirados = new Set(semana.tirados || []);
  const resultado = [];
  for (const lista of semana.listas) {
    const lugares = lista.lugares.filter((l) => !tirados.has(l.chave) && l.g);
    const trip = await viagemDaCidade(env, conta.id, lista.cidade);
    if (!trip) { resultado.push({ cidade: lista.cidade, error: 'viagem' }); continue }
    const atuais = await sbGet(env)('/rest/v1/spots?select=id,name,maps_url&trip_id=eq.' + trip.id);
    const chaveDe = (s) => s.maps_url || normalizar(s.name);
    const ficam = new Set(lugares.map((l) => l.g.maps || normalizar(l.g.nome || l.nome)));
    const sair = atuais.filter((s) => !ficam.has(chaveDe(s)));
    const ja = new Set(atuais.map(chaveDe));
    const entrar = lugares.filter((l) => !ja.has(l.g.maps || normalizar(l.g.nome || l.nome)));
    if (sair.length) await sbEscrever(env, 'DELETE', '/rest/v1/spots?id=in.(' + sair.map((s) => s.id).join(',') + ')');
    if (entrar.length) await sbEscrever(env, 'POST', '/rest/v1/spots', entrar.map((l) => spotDoHotspot(l, conta.id, trip.id, lista.cidade)));
    resultado.push({ cidade: lista.cidade, entraram: entrar.length, sairam: sair.length, total: lugares.length });
  }
  await gravarKV(env, 'hs_publicada', JSON.stringify({ semana: semana.criada, em: Date.now(), resultado }), ANO);
  return { ok: true, resultado };
}

export function spotDoHotspot(l, uid, tripId, cidade) {
  const g = l.g;
  const cat = ['food', 'hotel', 'experience'].includes(g.categoria) ? g.categoria : 'food';
  const rec = {
    user_id: uid, trip_id: tripId, name: g.nome || l.nome, category: cat,
    // Texto nosso, curto e neutro: nada copiado de quem indicou, e nenhum nome.
    my_note: 'Citado por ' + l.n + ' vozes da cena nas últimas semanas.',
    city: cidade, address: g.endereco || l.endereco || '', status: 'want',
    place_type: { food: 'Gastronomia', hotel: 'Hospedagem', experience: 'Experiência' }[cat],
    maps_url: g.maps || '', tipo: g.tipo || null,
    photo_url: g.foto ? '/api/place-photo?ref=' + encodeURIComponent(g.foto.ref) + (g.foto.s ? '&s=' + g.foto.s : '') + '&w=400' : ''
  };
  if (g.lat != null && g.lng != null) { rec.lat = g.lat; rec.lng = g.lng }
  return rec;
}

async function viagemDaCidade(env, uid, cidade) {
  const nome = 'Hotspots em ' + cidade;
  const [t] = await sbGet(env)('/rest/v1/trips?select=id&user_id=eq.' + uid + '&name=eq.' + encodeURIComponent(nome));
  if (t) return t;
  const r = await sbEscrever(env, 'POST', '/rest/v1/trips', { user_id: uid, name: nome, destinations: ['Brasil'], dates: '', status: 'planning', initial_city: cidade, privada: false });
  return Array.isArray(r) ? r[0] : null;
}

// ─────────────────────────── fontes ───────────────────────────

async function lerFontes(env) {
  return (await lerJSON(env, 'hs_fontes')) || FONTES_INICIAIS;
}

// Um link colado na página de aprovar vira fonte: canal do YouTube (por
// /channel/UC..., /@nome ou um vídeo dele) ou uma página de guia.
async function fonteDoEndereco(endereco, cidades) {
  let u;
  try { u = new URL(endereco.trim()) } catch (e) { return null }
  if (u.protocol !== 'https:') return null;
  const cid = (Array.isArray(cidades) ? cidades : []).map(cidadeDaLista).filter(Boolean);
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) {
    // Link de playlist (…/playlist?list=PL… ou um vídeo dentro dela): a fonte é a playlist.
    const lista = (u.searchParams.get('list') || '').match(/^PL[A-Za-z0-9_-]{10,40}$/);
    if (lista) {
      let nome = '';
      try { nome = desescapar(((await (await fetch('https://www.youtube.com/feeds/videos.xml?playlist_id=' + lista[0])).text()).match(/<title>([^<]{1,80})/) || [])[1] || '') } catch (e) {}
      return { id: 'yt:pl:' + lista[0], tipo: 'youtube', playlist: lista[0], nome: nome || 'Playlist do YouTube', cidades: cid };
    }
    let canal = (u.pathname.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/) || [])[1];
    let nome = '';
    if (!canal) {
      try {
        const h = await (await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR' } })).text();
        canal = (h.match(/"(?:externalId|channelId)":"(UC[A-Za-z0-9_-]{22})"/) || [])[1];
        nome = desescapar((h.match(/"(?:ownerChannelName|title)":"([^"]{1,80})"/) || [])[1] || '');
      } catch (e) {}
    }
    if (!canal) return null;
    return { id: 'yt:' + canal, tipo: 'youtube', canal, nome: nome || canal, cidades: cid };
  }
  return { id: 'pg:' + (await resumo(u.toString())).slice(0, 12), tipo: 'pagina', url: u.toString(), nome: u.hostname.replace(/^www\./, ''), cidades: cid };
}

// ─────────────────────────── miúdos ───────────────────────────

function sbGet(env) {
  return (caminho) => fetch(SB_URL + caminho, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }
  }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
}
async function sbEscrever(env, metodo, caminho, corpo) {
  try {
    const r = await fetch(SB_URL + caminho, {
      method: metodo,
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch (e) { return null }
}
// O objeto JSON que começa logo depois de `marca`, contando chaves (o fim da
// atribuição muda de página pra página: `;var`, `;</script>`, `;window`...).
export function jsonDepoisDe(h, marca) {
  const i = h.indexOf(marca);
  if (i < 0) return null;
  const ini = h.indexOf('{', i);
  if (ini < 0) return null;
  let prof = 0, emTexto = false, escapa = false;
  for (let j = ini; j < h.length; j++) {
    const c = h[j];
    if (emTexto) { if (escapa) escapa = false; else if (c === '\\') escapa = true; else if (c === '"') emTexto = false; continue }
    if (c === '"') emTexto = true;
    else if (c === '{') prof++;
    else if (c === '}' && --prof === 0) { try { return JSON.parse(h.slice(ini, j + 1)) } catch (e) { return null } }
  }
  return null;
}
async function emLotes(itens, n, fn) {
  for (let i = 0; i < itens.length; i += n) await Promise.all(itens.slice(i, i + n).map(fn));
}
async function lerJSON(env, k) {
  const v = await lerKV(env, k);
  if (!v) return null;
  try { return JSON.parse(v) } catch (e) { return null }
}
export function normalizar(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'`´]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
export function textoDaPagina(h) {
  return String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ').trim();
}
function desescapar(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function limpa(v, max) { return String(v || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) }
async function resumo(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
