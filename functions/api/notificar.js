import { quemEsta } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';

// Cloudflare Pages Function — manda a notificação pro celular de alguém.
//
// POR QUE ELA EXISTE E NÃO É O NAVEGADOR QUE MANDA
//
// Mandar notificação exige ler o endereço de entrega da OUTRA pessoa. Se o
// navegador pudesse ler isso, qualquer conta comprometida viraria um canal de
// spam direto na tela de bloqueio de quem não tem nada com isso. Então o
// endereço nunca sai do servidor.
//
// AS TRÊS TRAVAS, NESTA ORDEM
//
// 1. Quem chama tem que estar logado — o uid vem do token, não do corpo do
//    pedido. Dizer "sou fulano" no JSON não adianta.
// 2. O banco decide se o aviso é legítimo: enderecos_para_avisar() só devolve
//    endereço quando existe o vínculo certo, e devolve vazio se houver
//    bloqueio. A regra mora em SQL de propósito — esta função roda com a
//    chave de serviço, que passa por cima de RLS, então um bug meu aqui não
//    pode virar "qualquer um notifica qualquer um".
// 3. O TEXTO é montado aqui, a partir de uma lista fechada. Quem chama escolhe
//    o TIPO, nunca as palavras. Sem isso, notificação vira caixa de texto
//    livre entregue na tela de bloqueio de outra pessoa.
//
// Teto por remetente pra um laço não virar metralhadora.
const TETO_POR_PESSOA = 60;   // avisos por hora, por quem envia
const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';
const EXPO = 'https://exp.host/--/api/v2/push/send';

// Lista fechada. `nome` é o display_name de quem enviou, já escapado de nada
// porque notificação é texto puro — não há HTML no caminho.
const TEXTOS = {
  pedido:     (nome) => ({ title: 'Pedido de amizade', body: `${nome} quer ser seu amigo no Spot` }),
  aceite:     (nome) => ({ title: 'Vocês são amigos',  body: `${nome} aceitou seu pedido. Já dá pra ver as viagens.` }),
  comentario: (nome, extra) => ({ title: 'Comentário', body: extra ? `${nome} comentou em ${extra}` : `${nome} comentou no seu lugar` })
};

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }

  const tipo = String(body.tipo || '');
  const alvo = String(body.alvo || '');
  // O nome do lugar NÃO vem mais do app (26/09): vinha, e qualquer um
  // escrevia o texto que quisesse na tela de bloqueio de um amigo ("...comentou
  // em PIX GRÁTIS em golpe.co"). Agora o app manda só o id do spot, e o nome
  // sai do banco, depois de conferir que o comentário existe.
  const spotId = String(body.spot || '');

  if (!TEXTOS[tipo]) return json({ error: 'tipo_invalido' }, 400);
  if (!/^[0-9a-f-]{36}$/i.test(alvo)) return json({ error: 'alvo_invalido' }, 400);

  // 1. quem está chamando
  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ enviados: 0, unauthorized: true }, 401);
  if (quem.uid === alvo) return json({ enviados: 0, motivo: 'voce_mesmo' });

  if (!env.SUPABASE_SERVICE_KEY) return json({ enviados: 0, configured: false });

  // teto por remetente
  if (env.SPOT_KV) {
    try {
      const hora = new Date().toISOString().slice(0, 13);
      const k = 'push_' + hora + '_' + quem.uid;
      const usado = parseInt((await env.SPOT_KV.get(k)) || '0', 10);
      if (usado >= TETO_POR_PESSOA) return json({ enviados: 0, capped: true });
      await env.SPOT_KV.put(k, String(usado + 1), { expirationTtl: 3600 });
    } catch (e) { /* KV fora do ar não pode derrubar a notificação */ }
  }

  // Um aviso por par e por tipo: pedido e aceite, um por dia; comentário, um a
  // cada 2 minutos no mesmo spot. Sem isto, um pedido de amizade (que só pede
  // vínculo pendente) permitia 60 avisos por hora na tela de um estranho.
  // A marca só é GRAVADA depois que o aviso sai de fato (06/10): gravada antes,
  // um pedido feito antes do vínculo existir no banco (ou com o Expo fora)
  // calava o aviso de verdade pelo resto do dia.
  const par = 'push_par_' + tipo + '_' + quem.uid + '_' + alvo + (tipo === 'comentario' ? '_' + spotId : '');
  if (await lerKV(env, par)) return json({ enviados: 0, motivo: 'repetido' });

  let extra = '';
  if (tipo === 'comentario' && /^[0-9a-f-]{36}$/i.test(spotId)) {
    extra = await nomeDoSpotComentado(env, spotId, quem.uid, alvo);
  }

  // 2. o banco decide se o vínculo justifica, e devolve os endereços
  let enderecos = [];
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/enderecos_para_avisar', {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ de: quem.uid, para: alvo, tipo })
    });
    if (!r.ok) return json({ enviados: 0, erro: 'consulta' }, 200);
    const d = await r.json();
    enderecos = (Array.isArray(d) ? d : []).map((x) => x && x.token).filter(Boolean);
  } catch (e) {
    return json({ enviados: 0, erro: 'rede' });
  }
  // Vazio é o caminho normal: sem vínculo, bloqueado, ou a pessoa não instalou
  // o app no celular. Nenhum desses é erro nem merece contar nada a quem chamou.
  if (!enderecos.length) return json({ enviados: 0 });

  // 3. o texto sai daqui, nunca de quem chamou
  const nome = await nomeDe(env, quem.uid);
  const { title, body: corpo } = TEXTOS[tipo](nome, extra);

  const mensagens = enderecos.slice(0, 20).map((to) => ({
    to, title, body: corpo, sound: 'default', priority: 'high',
    // o app usa isso pra abrir na tela certa quando a pessoa toca
    data: { tipo, de: quem.uid }
  }));

  try {
    const r = await fetch(EXPO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'accept-encoding': 'gzip, deflate' },
      body: JSON.stringify(mensagens)
    });
    if (!r.ok) return json({ enviados: 0, erro: 'expo_' + r.status });
    const d = await r.json().catch(() => null);
    // Endereço morto (app desinstalado) volta como DeviceNotRegistered. Limpar
    // agora evita a tabela virar cemitério e a conta gastar envio à toa.
    const mortos = [];
    const lista = (d && d.data) || [];
    lista.forEach((res, i) => {
      if (res && res.status === 'error' && res.details && res.details.error === 'DeviceNotRegistered') {
        mortos.push(mensagens[i].to);
      }
    });
    if (mortos.length) context.waitUntil(apagarEnderecos(env, mortos));
    const enviados = lista.filter((x) => x && x.status === 'ok').length;
    if (enviados) await gravarKV(env, par, '1', tipo === 'comentario' ? 120 : 60 * 60 * 24);
    return json({ enviados });
  } catch (e) {
    return json({ enviados: 0, erro: 'envio' });
  }
}

// Nome do spot, só se: o spot é de quem vai receber E quem chamou comentou
// nele nos últimos 10 minutos. Fora disso: sem nome, e a notificação sai
// genérica ("comentou no seu lugar").
async function nomeDoSpotComentado(env, spotId, de, para) {
  try {
    const h = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY };
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [c] = await (await fetch(SB_URL + '/rest/v1/spot_comments?select=id&spot_id=eq.' + spotId
      + '&user_id=eq.' + de + '&created_at=gte.' + encodeURIComponent(desde) + '&limit=1', { headers: h })).json();
    if (!c) return '';
    const [sp] = await (await fetch(SB_URL + '/rest/v1/spots?select=name&id=eq.' + spotId + '&user_id=eq.' + para, { headers: h })).json();
    return sp && sp.name ? String(sp.name).replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  } catch (e) { return '' }
}

async function nomeDe(env, uid) {
  try {
    const r = await fetch(SB_URL + '/rest/v1/profiles?select=display_name,username&id=eq.' + uid, {
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }
    });
    const d = await r.json();
    const p = (Array.isArray(d) && d[0]) || {};
    const n = p.display_name || (p.username ? '@' + p.username : '');
    // Nome também é texto de usuário: corta pra não empurrar o resto da frase
    // pra fora da notificação.
    return (n || 'Alguém').replace(/\s+/g, ' ').trim().slice(0, 40);
  } catch (e) { return 'Alguém' }
}

async function apagarEnderecos(env, tokens) {
  try {
    const lista = tokens.map((t) => '"' + t.replace(/"/g, '') + '"').join(',');
    await fetch(SB_URL + '/rest/v1/push_tokens?token=in.(' + encodeURIComponent(lista) + ')', {
      method: 'DELETE',
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }
    });
  } catch (e) { /* limpeza é higiene, não pode falhar a chamada */ }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
