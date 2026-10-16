// Impede que arquivos internos do repositório sejam servidos pelo site.
//
// POR QUE ISTO EXISTE E NÃO É UM `_redirects`:
// o Cloudflare Pages publica TUDO que está versionado, e para um caminho que
// corresponde a um arquivo real o **arquivo estático vence** — as regras do
// `_redirects` só são avaliadas quando não existe arquivo naquele caminho.
// Tentei pelo `_redirects` em 11/09/2026 e não funcionou: `/CLAUDE.md` e
// `/migrations/*.sql` continuaram devolvendo 200 com o conteúdo inteiro.
//
// Functions, por outro lado, rodam ANTES do serviço de arquivo estático.
// Este middleware intercepta toda requisição, recusa os caminhos internos e
// deixa o resto seguir intacto.
//
// O QUE ESTAVA EXPOSTO, e por que importa: as 15 migrações entregam o desenho
// completo do banco e o texto literal de cada política de permissão; o
// CLAUDE.md entrega o endereço do projeto Supabase, a anotação de que as
// chaves no cliente são inaceitáveis para público aberto, e a receita de como
// sondar o schema com a chave pública. Junto, é um mapa pronto para atacar.
// Era tolerável quando o app era de seis amigos. Deixa de ser indo para a
// App Store.

const BLOQUEADOS = [
  /^\/migrations(\/|$)/i,
  /^\/tests(\/|$)/i,
  /^\/\.github(\/|$)/i,
  /^\/pyproject\.toml$/i,
  // O projeto do app nativo. Nada ali é servido ao navegador, e o eas.json
  // vai receber o Apple ID e o Team ID na hora do envio — não pode ficar
  // aberto na web esperando eu lembrar de bloquear depois.
  /^\/mobile(\/|$)/i,
  // Bastidores (capturas, protótipos, scripts de teste). O pen test de 16/10
  // achou uma CÓPIA ANTIGA do app em /ferramentas/instagram/fonte/app-real/app
  // servindo 200: app vencido, sem o portão de "só no app", falando com o
  // Supabase de verdade e dividindo o localStorage (a sessão) com o app real.
  // Também jornadas.mjs, demo.js e as prévias de dev ficavam abertos.
  /^\/ferramentas(\/|$)/i,
  /^\/_dev-previews(\/|$)/i,
  /^\/_local(\/|$)/i,
  /\.(mjs|cjs)$/i,
  // Qualquer .sql, .toml ou .md em qualquer pasta. Lista por extensão em vez
  // de por nome para não depender de eu lembrar a cada arquivo novo: o site
  // não serve nenhum desses formatos, então bloquear todos é seguro.
  /\.(sql|toml|md)$/i,
];

export async function onRequest(context) {
  const caminho = new URL(context.request.url).pathname;

  if (BLOQUEADOS.some((re) => re.test(caminho))) {
    return new Response('Não encontrado', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  const resp = await context.next();
  return comImpressaoDigital(context.request, resp);
}

// "ESTÁ IGUAL" PRA PÁGINA DO APP (11/10/2026). O app baixava o index.html
// inteiro (348 KB comprimido) a cada abertura: a página sai com no-cache, mas
// passando por este middleware ela perdia o ETag, e sem ele o celular não tem
// como perguntar "mudou?". Aqui a página HTML ganha uma impressão digital
// (SHA-256 do conteúdo); se o celular manda a mesma, a resposta é 304 sem
// corpo. Deploy novo muda o conteúdo, a impressão muda, e o celular baixa.
export async function comImpressaoDigital(request, resp) {
  try {
    if (request.method !== 'GET' || !resp || resp.status !== 200) return resp;
    const tipo = resp.headers.get('Content-Type') || '';
    if (!/text\/html/i.test(tipo)) return resp;
    const corpo = await resp.arrayBuffer();
    const h = await crypto.subtle.digest('SHA-256', corpo);
    const etag = '"' + [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('') + '"';
    const cab = new Headers(resp.headers);
    cab.set('ETag', etag);
    const pediu = (request.headers.get('If-None-Match') || '').split(',').map((s) => s.trim().replace(/^W\//, ''));
    if (pediu.includes(etag)) {
      cab.delete('Content-Length');
      return new Response(null, { status: 304, headers: cab });
    }
    return new Response(corpo, { status: 200, statusText: resp.statusText, headers: cab });
  } catch (e) {
    return resp;
  }
}
