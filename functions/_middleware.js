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

  return context.next();
}
