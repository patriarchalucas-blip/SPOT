import { quemEsta, podeGastar } from './_auth.js';
import { lerKV, gravarKV } from './_kv.js';
import { avisarDono } from './_aviso-dono.js';

// Cloudflare Pages Function — IMPORTAR NOTAS: /api/importar.
// Desenho: handoff "crescimento", fluxo 2 (2a–2e), 30/09/2026.
//
// A pessoa cola um texto bagunçado (bloco de notas, conversa de WhatsApp:
// "lisboa: taberna da rua das flores, pasteis de belem (amei)") e a IA separa
// em lugares {nome, cidade, país, status}. Só isso: achar o lugar de verdade
// (endereço, foto, posição) é o Google, no app, pela mesma busca do Adicionar
// spot — a IA nunca inventa endereço.
//
// A CHAVE DA ANTHROPIC mora aqui (env ANTHROPIC_API_KEY, secret no
// Cloudflare), nunca no navegador. Sem ela, GET responde {ligado:false} e o
// app esconde a entrada — o botão aparece sozinho quando a chave entra.
//
// MODELO: Claude Haiku 4.5 — extrair nomes de lugar de um texto é tarefa
// simples, e é o mais barato (US$ 1 / 5 por milhão de tokens em 30/09/2026).
// Uma nota de 30 lugares sai por menos de 1 centavo de dólar. O Lucas
// escolheu gastar se precisar (30/09): os tetos abaixo são rede contra BUG
// (um laço que chame sem parar), não pedágio — e avisam no celular dele.
//
// PRIVACIDADE: o texto vai pra Anthropic só pra ser lido nesta chamada; aqui
// não se guarda nada dele (nem no KV). Está na política de privacidade.

const MODELO = 'claude-haiku-4-5';
const MAX_CARACTERES = 15000;   // o mesmo IMP_MAX do app
// 100, não 150 (06/10): a saída cabe em max_tokens 8000 (era 16000, e
// resposta longa é cobrada e demora). Cada lugar no JSON sai por ~50 tokens
// (o trecho do texto, até 80 caracteres, é a maior parte): 150 dava ~7.500,
// colado no teto — e corte por tamanho perde a importação inteira
// (ia_max_tokens). 100 dá ~5.000, com folga.
const MAX_LUGARES = 100;
const TETO_PESSOA = 40;         // importações por mês, por conta
const TETO_MES = 3000;          // importações por mês, no app inteiro
const AVISOS = [50, 80, 100];

const SISTEMA = `Você recebe um texto colado por alguém que viaja: anotações soltas, uma conversa de WhatsApp, uma lista de dicas. Separe cada LUGAR concreto que dá pra visitar (restaurante, bar, café, hotel, museu, praia, parque, loja, mirante, passeio).

Para cada lugar, na ordem em que aparece no texto:
- texto: o trecho original do texto que fala dele, curto (até 80 caracteres).
- nome: o nome do lugar como ele se chama de verdade, com a grafia correta ("pasteis de belem" vira "Pastéis de Belém"). Não invente nome: se o texto só descreve ("aquele bar do lado do hotel"), não entra.
- cidade: a cidade do lugar. Use o contexto: um título ("Lisboa:"), uma frase anterior ("em Porto a gente foi..."). Vazio se não der pra saber.
- pais: o país em português do Brasil ("Portugal", "Itália", "Japão", "Estados Unidos"). Vazio se não der pra saber nem pela cidade.
- status: "been" se o texto diz que a pessoa já foi (fui, fomos, amei, comi, jantei, adorei, voltaria, ficamos lá); senão "want".

Não entram: cidades ou países sozinhos, bairros, pessoas, datas, voos, empresas de transporte, pratos soltos sem restaurante. Lugar repetido entra uma vez só. No máximo ${MAX_LUGARES} lugares.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    lugares: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string' },
          nome: { type: 'string' },
          cidade: { type: 'string' },
          pais: { type: 'string' },
          status: { type: 'string', enum: ['want', 'been'] }
        },
        required: ['texto', 'nome', 'cidade', 'pais', 'status'],
        additionalProperties: false
      }
    }
  },
  required: ['lugares'],
  additionalProperties: false
};

export async function onRequestGet(context) {
  return json({ ligado: !!context.env.ANTHROPIC_API_KEY });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY) return json({ ligado: false }, 503);
  let body;
  try { body = await request.json() } catch (e) { return json({ error: 'bad_request' }, 400) }
  const texto = String(body.texto || '').replace(/\u0000/g, '').trim();
  if (!texto) return json({ lugares: [] });
  if (texto.length > MAX_CARACTERES) return json({ error: 'longo', max: MAX_CARACTERES }, 413);

  const quem = await quemEsta(request, env);
  if (!quem.permitir || !quem.uid) return json({ unauthorized: true }, 401);
  if (!await podeGastar(env, 'importar', quem.uid, 1, TETO_PESSOA)) return json({ capped: 'pessoa' });

  // Teto do app inteiro, contado a cada chamada (é pouco volume: gravar uma
  // vez por importação cabe folgado nas mil gravações diárias do KV).
  const mes = new Date().toISOString().slice(0, 7);
  const kMes = 'importar_mes_' + mes;
  const usado = parseInt((await lerKV(env, kMes)) || '0', 10);
  if (usado >= TETO_MES) return json({ capped: 'mes' });
  const depois = usado + 1;
  await gravarKV(env, kMes, String(depois), 60 * 60 * 24 * 40);
  for (const pct of AVISOS) {
    const marca = Math.ceil(TETO_MES * pct / 100);
    if (usado < marca && depois >= marca) {
      const k = 'importar_aviso_' + mes + '_' + pct;
      if (await lerKV(env, k)) continue;
      await gravarKV(env, k, '1', 60 * 60 * 24 * 40);
      await avisarDono(env, 'Importar notas: ' + pct + '% do teto do mês',
        depois + ' de ' + TETO_MES + ' importações em ' + mes + '. '
        + (pct >= 100 ? 'A importação parou — suba TETO_MES em functions/api/importar.js.' : 'Se for uso de verdade, suba o teto antes de acabar.'),
        'cota');
    }
  }

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 8000,
        system: SISTEMA,
        messages: [{ role: 'user', content: texto }],
        output_config: { format: { type: 'json_schema', schema: ESQUEMA } }
      })
    });
  } catch (e) { return json({ error: 'ia_rede' }, 502) }
  if (!r.ok) {
    // 400/401 é configuração (chave errada, crédito acabou): avisa o dono uma
    // vez por dia, porque o sintoma no app é só "não deu pra ler".
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      const k = 'importar_erro_' + new Date().toISOString().slice(0, 10);
      if (!await lerKV(env, k)) {
        await gravarKV(env, k, '1', 60 * 60 * 26);
        let detalhe = '';
        try { detalhe = ((await r.json()).error || {}).message || '' } catch (e) {}
        await avisarDono(env, 'Importar notas falhou (' + r.status + ')', (detalhe || 'Confira a chave e o crédito da Anthropic.').slice(0, 160), 'cota');
      }
    }
    return json({ error: 'ia', status: r.status }, 502);
  }
  let d;
  try { d = await r.json() } catch (e) { return json({ error: 'ia' }, 502) }
  // Recusa ou corte por tamanho: a saída pode não bater com o esquema.
  if (d.stop_reason === 'refusal' || d.stop_reason === 'max_tokens') return json({ error: 'ia_' + d.stop_reason }, 502);
  const bloco = (d.content || []).find((c) => c.type === 'text');
  let lugares = [];
  try { lugares = (JSON.parse(bloco ? bloco.text : '{}').lugares) || [] } catch (e) { return json({ error: 'ia' }, 502) }
  return json({ lugares: limparLugares(lugares) });
}

export function limparLugares(l) {
  const vistos = new Set();
  return (Array.isArray(l) ? l : []).map((x) => ({
    texto: limpa(x && x.texto, 80),
    nome: limpa(x && x.nome, 100),
    cidade: limpa(x && x.cidade, 80),
    pais: limpa(x && x.pais, 60),
    status: x && x.status === 'been' ? 'been' : 'want'
  })).filter((x) => {
    if (!x.nome) return false;
    const k = (x.nome + '|' + x.cidade).toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).slice(0, MAX_LUGARES);
}
function limpa(v, max) { return String(v || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) }

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
