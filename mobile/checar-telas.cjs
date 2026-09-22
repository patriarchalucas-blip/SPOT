// Confere as duas coisas que viram TELA BRANCA no celular e que o eslint não
// pega: um nome importado de ./cores que não existe lá, e um `e.<estilo>` que
// não tem entrada no StyleSheet. Não há como abrir o app nativo na máquina
// onde ele é escrito, então esta é a verificação que sobra antes do build.
//
// De brinde avisa import que sobrou sem uso — foi assim que a migração de
// cores deixou rastro nas telas que ficaram pela metade.
//
//   node mobile/checar-telas.cjs

const fs = require('fs');
const path = require('path');

const pasta = __dirname;
const cores = fs.readFileSync(path.join(pasta, 'cores.js'), 'utf8');
const exportados = new Set([...cores.matchAll(/export const (\w+)/g)].map((m) => m[1]));

let problemas = 0;
let avisos = 0;

for (const arquivo of fs.readdirSync(pasta).filter((f) => f.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(pasta, arquivo), 'utf8');

  const imp = s.match(/import \{([^}]+)\} from '\.\/cores'/);
  if (imp) {
    const nomes = imp[1].split(',').map((x) => x.trim()).filter(Boolean);
    const semImport = s.replace(imp[0], '');
    for (const n of nomes) {
      if (!exportados.has(n)) {
        console.log(`ERRO  ${arquivo}: importa ${n}, que cores.js não exporta`);
        problemas++;
      } else if (!new RegExp(`\\b${n}\\b`).test(semImport)) {
        console.log(`aviso ${arquivo}: importa ${n} e não usa`);
        avisos++;
      }
    }
  }

  // O nome da variável muda de arquivo pra arquivo (`e` nas telas, `estilo`
  // na barra e no App) — ler do próprio código em vez de supor.
  const bloco = s.match(/const (\w+) = StyleSheet\.create\(\{([\s\S]*?)\n\}\);/);
  if (bloco) {
    const v = bloco[1];
    const chaves = new Set([...bloco[2].matchAll(/^ {2}(\w+):/gm)].map((x) => x[1]));
    const usados = new Set([...s.matchAll(new RegExp(`\\b${v}\\.(\\w+)\\b`, 'g'))].map((x) => x[1]));
    for (const u of usados) {
      if (!chaves.has(u)) {
        console.log(`ERRO  ${arquivo}: usa ${v}.${u}, que não existe no StyleSheet`);
        problemas++;
      }
    }
    for (const k of chaves) {
      if (!usados.has(k)) {
        console.log(`aviso ${arquivo}: estilo ${k} não é usado`);
        avisos++;
      }
    }
  }
}

console.log(problemas ? `\n${problemas} erro(s), ${avisos} aviso(s)` : `\nok — nenhum erro, ${avisos} aviso(s)`);
process.exit(problemas ? 1 : 0);
