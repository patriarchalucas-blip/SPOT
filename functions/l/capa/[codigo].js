import { lerKV } from '../../api/_kv.js';
import { fotoDoSpot } from '../[codigo].js';

// Cloudflare Pages Function — a IMAGEM da prévia do WhatsApp: /l/capa/<código>.
//
// POR QUE EXISTE (30/09/2026): a og:image apontava pra /api/place-photo, que
// responde com um REDIRECIONAMENTO pro servidor de imagem do Google. O robô do
// WhatsApp não seguiu o redirecionamento e a prévia saiu sem foto. Aqui o
// servidor busca a imagem ele mesmo e devolve os BYTES, num endereço fixo,
// em JPEG de 800px (a prévia não precisa de mais, e imagem grande o WhatsApp
// também descarta). Fica na cache da borda por um dia.
//
// A foto é a do primeiro spot de Fui que tiver foto que abra (senão Quero ir);
// sem nenhuma, a imagem padrão do site.

const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const codigo = String(params.codigo || '');
  const origem = new URL(request.url).origin;
  const padrao = () => fetch(origem + '/compartilhar.png');
  if (!/^[A-Za-z0-9]{8,24}$/.test(codigo) || !env.SUPABASE_SERVICE_KEY) return padrao();

  const borda = caches.default;
  const etiqueta = new Request(origem + '/_capa/' + codigo);
  try { const ja = await borda.match(etiqueta); if (ja) return ja } catch (e) {}

  let dado = null;
  try { dado = JSON.parse((await lerKV(env, 'lista_' + codigo)) || 'null') } catch (e) {}
  if (!dado || dado.revogado || !Array.isArray(dado.cidades)) return padrao();

  const lista = dado.cidades.map((c) => '"' + String(c).replace(/["\\]/g, '') + '"').join(',');
  const r = await fetch(SB_URL + '/rest/v1/spots?select=photo_url,status,my_rating&user_id=eq.' + dado.uid
    + '&status=in.(been,want)&photo_url=not.is.null&city=in.(' + encodeURIComponent(lista) + ')&limit=40',
    { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } });
  const spots = r.ok ? await r.json() : [];
  spots.sort((a, b) => (b.status === 'been') - (a.status === 'been') || (Number(b.my_rating) || 0) - (Number(a.my_rating) || 0));

  // Tenta até 4 fotos: endereço de foto do Google expira, e a primeira pode ter morrido.
  for (const s of spots.slice(0, 4)) {
    const u = fotoDoSpot(s.photo_url, 800);
    if (!u) continue;
    try {
      const img = await fetch(u.startsWith('http') ? u : origem + u, { redirect: 'follow', headers: { Accept: 'image/jpeg' } });
      const tipo = img.headers.get('Content-Type') || '';
      if (!img.ok || !/^image\//.test(tipo)) continue;
      const bytes = await img.arrayBuffer();
      if (bytes.byteLength < 2000) continue;
      const resp = new Response(bytes, { headers: { 'Content-Type': tipo, 'Cache-Control': 'public, max-age=86400' } });
      try { context.waitUntil(borda.put(etiqueta, resp.clone())) } catch (e) {}
      return resp;
    } catch (e) { /* próxima */ }
  }
  return padrao();
}
