// Cifra o painel de gastos dos sócios (meuspot.app/gastos).
//
// Entrada (fora do git, em _local/gastos/):
//   dados.json  — { atualizado, gastos: [...], previstos: [...] }
//                 um gasto pode ter recibos: [{ arquivo: "cloudflare-2026-09.pdf", nome: "Fatura Cloudflare" }]
//   recibos/    — os arquivos citados (PDF, PNG, JPG, WEBP)
//   senha.txt   — a senha que os sócios digitam
//   sal.txt     — criado na 1ª execução; fixo, pra os recibos já cifrados continuarem abrindo
// Saída, na raiz do site (pode ir pro git: sem a senha é ilegível):
//   gastos-dados.json           — os dados, AES-GCM 256 com chave por PBKDF2-SHA256 (600 mil voltas)
//   gastos-recibos/<id>.bin     — cada recibo: 12 bytes de IV + o arquivo cifrado com a mesma chave
//
// Lançar um mês: editar _local/gastos/dados.json (e pôr os recibos na pasta),
//   node ferramentas/gastos-cifrar.mjs
// e fazer commit + push de gastos-dados.json e gastos-recibos/.
// Trocou a senha? `node ferramentas/gastos-cifrar.mjs --tudo` recifra os recibos.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { webcrypto as crypto, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ITER = 600000;
const b64 = (u8) => Buffer.from(u8).toString('base64');
const TIPOS = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

export async function chaveDe(senha, salt, iter = ITER) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function cifrarBytes(chave, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, bytes));
  return { iv, c };
}

export async function cifrar(dados, senha, iter = ITER, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const chave = await chaveDe(senha, salt, iter);
  const { iv, c } = await cifrarBytes(chave, new TextEncoder().encode(JSON.stringify(dados)));
  return { v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), dados: b64(c) };
}

// O nome publicado do recibo não diz nada (nem serviço nem mês): é um resumo
// do conteúdo, então o mesmo arquivo dá sempre o mesmo id.
export const idDoRecibo = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 24);

export function conferir(dados) {
  const erros = [];
  const ids = new Set();
  (dados.gastos || []).forEach((g, i) => {
    if (!g.id || ids.has(g.id)) erros.push(`gasto ${i}: id vazio ou repetido`);
    ids.add(g.id);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(g.mes || '')) erros.push(`gasto ${g.id}: mes deve ser AAAA-MM`);
    if (!(Number(g.valor) >= 0)) erros.push(`gasto ${g.id}: valor inválido`);
    if (!(Number(g.cambio) > 0)) erros.push(`gasto ${g.id}: câmbio inválido`);
    if (!['USD', 'BRL'].includes(g.moeda)) erros.push(`gasto ${g.id}: moeda deve ser USD ou BRL`);
    (g.recibos || []).forEach((r) => {
      if (!r.arquivo || !TIPOS[path.extname(r.arquivo).toLowerCase()]) erros.push(`gasto ${g.id}: recibo "${r.arquivo}" precisa ser PDF, PNG, JPG ou WEBP`);
    });
  });
  return erros;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const local = path.join(raiz, '_local/gastos');
  const dados = JSON.parse(readFileSync(path.join(local, 'dados.json'), 'utf8'));
  const senha = readFileSync(path.join(local, 'senha.txt'), 'utf8').trim();
  const erros = conferir(dados);
  if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
  if (senha.length < 8) { console.error('senha curta demais (mínimo 8)'); process.exit(1); }

  const arqSal = path.join(local, 'sal.txt');
  if (!existsSync(arqSal)) writeFileSync(arqSal, b64(crypto.getRandomValues(new Uint8Array(16))) + '\n');
  const salt = Uint8Array.from(Buffer.from(readFileSync(arqSal, 'utf8').trim(), 'base64'));
  const chave = await chaveDe(senha, salt);
  const tudo = process.argv.includes('--tudo');

  // Recibos: cifra o que é novo, apaga do site o que saiu dos dados.
  const pastaSite = path.join(raiz, 'gastos-recibos');
  mkdirSync(pastaSite, { recursive: true });
  const usados = new Set();
  const publico = JSON.parse(JSON.stringify(dados));
  for (const g of publico.gastos) {
    for (const r of g.recibos || []) {
      const origem = path.join(local, 'recibos', r.arquivo);
      if (!existsSync(origem)) { console.error(`recibo não encontrado: _local/gastos/recibos/${r.arquivo}`); process.exit(1); }
      const bytes = readFileSync(origem);
      const id = idDoRecibo(bytes);
      const destino = path.join(pastaSite, id + '.bin');
      if (tudo || !existsSync(destino)) {
        const { iv, c } = await cifrarBytes(chave, bytes);
        writeFileSync(destino, Buffer.concat([Buffer.from(iv), Buffer.from(c)]));
      }
      usados.add(id + '.bin');
      r.id = id; r.tipo = TIPOS[path.extname(r.arquivo).toLowerCase()];
      r.nome = r.nome || r.arquivo; delete r.arquivo;
    }
  }
  for (const f of readdirSync(pastaSite)) if (f.endsWith('.bin') && !usados.has(f)) unlinkSync(path.join(pastaSite, f));

  const { iv, c } = await cifrarBytes(chave, new TextEncoder().encode(JSON.stringify(publico)));
  writeFileSync(path.join(raiz, 'gastos-dados.json'),
    JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), dados: b64(c) }) + '\n');
  console.log(`gastos-dados.json cifrado: ${dados.gastos.length} lançamentos, ${(dados.previstos || []).length} previstos, ${usados.size} recibos`);
}
