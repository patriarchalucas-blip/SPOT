// Cifra o painel de gastos dos sócios (meuspot.app/gastos).
//
// Entrada (fora do git, em _local/gastos/):
//   dados.json  — { atualizado, gastos: [...], previstos: [...] }
//   senha.txt   — a senha que os sócios digitam
// Saída: gastos-dados.json na raiz do site, cifrado (AES-GCM 256, chave por
// PBKDF2-SHA256 com 600 mil voltas e sal novo a cada execução). O repositório
// é público: o arquivo cifrado pode ir pro git, a senha e os dados não.
//
// Lançar um mês: editar _local/gastos/dados.json, rodar
//   node ferramentas/gastos-cifrar.mjs
// e fazer commit + push de gastos-dados.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ITER = 600000;
const b64 = (u8) => Buffer.from(u8).toString('base64');

export async function cifrar(dados, senha, iter = ITER) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  const chave = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const claro = new TextEncoder().encode(JSON.stringify(dados));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, claro));
  return { v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), dados: b64(cifrado) };
}

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
  });
  return erros;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dados = JSON.parse(readFileSync(path.join(raiz, '_local/gastos/dados.json'), 'utf8'));
  const senha = readFileSync(path.join(raiz, '_local/gastos/senha.txt'), 'utf8').trim();
  const erros = conferir(dados);
  if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
  if (senha.length < 12) { console.error('senha curta demais'); process.exit(1); }
  writeFileSync(path.join(raiz, 'gastos-dados.json'), JSON.stringify(await cifrar(dados, senha)) + '\n');
  console.log(`gastos-dados.json cifrado: ${dados.gastos.length} lançamentos, ${(dados.previstos || []).length} previstos`);
}
