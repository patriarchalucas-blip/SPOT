const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// ═══ A TRAVA DA DIREÇÃO F ═══
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Duas vezes o mesmo erro. As quatro abas nativas ficaram uma geração inteira
// atrás do site sem ninguém ver, porque não havia como abrir o app nativo na
// máquina onde ele é escrito. E `termos.html` e `privacidade.html` ficaram
// MESES no visual antigo — fundo escuro, Fraunces, IBM Plex Mono, terracota —
// porque são linkadas do rodapé do login e quase ninguém abre.
//
// O que os dois casos têm em comum não é descuido: é que NINGUÉM OLHA. Tela
// que não está no caminho de todo dia não recebe revisão, e o desenho velho
// sobrevive ali em silêncio.
//
// Então a revisão vira teste. Se um token aposentado voltar a qualquer HTML
// servido ao navegador, isto quebra e diz onde.
//
//   node tests/design.test.js
//
// QUANDO ESTE TESTE RECLAMAR DE ALGO LEGÍTIMO: não afrouxe a regra em
// silêncio. Ou a direção mudou (e aí o lugar de mudar é aqui, de propósito),
// ou é exceção que merece estar em EXCECOES abaixo, com o motivo escrito.

const RAIZ = path.join(__dirname, '..');

// Os arquivos que o navegador realmente recebe. Não entram: as prévias de
// desenvolvimento (_dev-previews), que são justamente o histórico do que foi
// aposentado, e o que nunca é servido.
function htmlsServidos() {
  return fs.readdirSync(RAIZ)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => !f.startsWith('landing (')) // rascunho fora do ar
    .map((f) => path.join(RAIZ, f));
}

// Cada regra diz O QUE saiu e POR QUÊ — a mensagem do erro é o que alguém vai
// ler daqui a seis meses sem contexto nenhum.
const APOSENTADOS = [
  { re: /Fraunces/i, nome: 'a fonte Fraunces', porque: 'a direção F usa Inter Tight e só ela' },
  { re: /IBM\+?\s?Plex\s?Mono/i, nome: 'a fonte IBM Plex Mono', porque: 'rótulo em monoespacada saiu do app inteiro' },
  { re: /DM\+?\s?Sans/i, nome: 'a fonte DM Sans', porque: 'a direção F usa Inter Tight e só ela' },
  { re: /#0b1620/i, nome: 'o fundo escuro #0b1620', porque: 'o app é claro: --base é #F5F5F3' },
  { re: /#c1552f/i, nome: 'a terracota #c1552f', porque: 'o único acento é --green #0B3D2E' },
  { re: /#f4ede1/i, nome: 'o creme #f4ede1', porque: 'era o fundo da primeira versão, de antes do redesenho' },
  { re: /text-transform\s*:\s*uppercase/i, nome: 'text-transform:uppercase', porque: 'a direção F não usa caixa alta em lugar nenhum' },
];

// LÊ O ARQUIVO CRU, sem tentar tirar comentário.
//
// A primeira versão retirava tudo entre /* e */ pra poder citar os nomes
// aposentados na própria documentação. Deu FALSO POSITIVO no index.html: ali
// existe `/*` dentro de string e de expressão regular no JavaScript, então o
// recorte comia pedaços grandes do arquivo e emendava textos distantes, o que
// fabricava sequências que nunca existiram.
//
// A saída é mais simples e mais honesta: as páginas não citam os nomes
// aposentados nem em comentário. Quem quiser saber o que saiu, lê aqui.
test('nenhum HTML servido usa fonte, cor ou regra aposentada', () => {
  const erros = [];
  for (const arquivo of htmlsServidos()) {
    const texto = fs.readFileSync(arquivo, 'utf8');
    for (const r of APOSENTADOS) {
      if (r.re.test(texto)) {
        erros.push(`${path.basename(arquivo)}: usa ${r.nome} — ${r.porque}`);
      }
    }
  }
  assert.deepStrictEqual(erros, [], '\n  ' + erros.join('\n  ') + '\n');
});

// A página de suporte é obrigatória: a ficha da App Store aponta pra ela, e
// link quebrado ali é reprovação na revisão.
test('a página de suporte existe e aponta pros termos e pra privacidade', () => {
  const p = path.join(RAIZ, 'suporte.html');
  assert.ok(fs.existsSync(p), 'suporte.html sumiu — a App Store exige essa URL');
  const s = fs.readFileSync(p, 'utf8');
  assert.ok(/\/termos/.test(s), 'suporte.html não linka os termos');
  assert.ok(/\/privacidade/.test(s), 'suporte.html não linka a privacidade');
  assert.ok(/suporte@meuspot\.app/.test(s), 'suporte.html não tem email de contato');
});

// As três páginas legais têm que falar a mesma língua visual. Se uma for
// redesenhada e as outras não, volta exatamente o problema que gerou isto.
test('as tres paginas fora do app usam a mesma familia', () => {
  for (const f of ['suporte.html', 'termos.html', 'privacidade.html']) {
    const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    assert.ok(/Inter\+?\s?Tight/i.test(s), `${f} não carrega a Inter Tight`);
    assert.ok(/--base\s*:\s*#F5F5F3/i.test(s), `${f} não define --base da direção F`);
  }
});
