// Checagem que pega o erro que o `expo export` NAO pega.
//
// POR QUE ISTO EXISTE: em 18/09/2026 a aba Amigos fechava o app no iPhone.
// A causa era uma linha usando a variavel `d`, que naquela tela nunca foi
// declarada — as outras tres telas fazem `const d = dados`, aquela desmonta
// os campos direto. Variavel inexistente NAO e erro de sintaxe: o empacotador
// aceita, e so estoura quando a linha roda. O custo foi um ciclo inteiro de
// build (25 minutos) num computador emprestado.
//
// `no-undef` pega exatamente isso, em dois segundos:
//
//     npm run lint

const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'mundo.js'],
  },
  {
    // Os .cjs desta pasta sao ferramenta de linha de comando, nao codigo do
    // app: rodam no Node, onde `__dirname` e `require` existem.
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly', console: 'readonly' } },
  },
  {
    rules: {
      // O que importa aqui e o que QUEBRA em producao, nao estilo.
      'no-undef': 'error',
      // catch(e) sem usar o `e` e deliberado no projeto inteiro: a falha e
      // engolida de proposito (cache fora do ar, rede caida). Marcar isso
      // como problema so ensinaria a ignorar a checagem.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
