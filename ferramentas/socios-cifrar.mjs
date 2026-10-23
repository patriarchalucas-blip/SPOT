// Cifra a Central dos sócios (meuspot.app/socios). Mesmo esquema do gastos:
// AES-GCM 256, chave por PBKDF2-SHA256 (600 mil voltas). O repositório é
// público; sem a senha, socios-dados.json é ilegível.
//
// Entrada (fora do git, em _local/socios/):
//   dados.json  — { atualizado, grupos: [ { nome, itens:[{nome,desc,url}] } ] }
//   senha.txt   — a senha que os sócios digitam (a mesma do gastos)
//   sal.txt     — criado na 1ª execução; fixo
// Saída, na raiz do site (pode ir pro git):
//   socios-dados.json
//
// Atualizar a central: editar _local/socios/dados.json,
//   node ferramentas/socios-cifrar.mjs
// e commit + push de socios-dados.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cifrar } from './gastos-cifrar.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = path.join(raiz, '_local/socios');
const b64 = (u8) => Buffer.from(u8).toString('base64');

const dados = JSON.parse(readFileSync(path.join(local, 'dados.json'), 'utf8'));
const senha = readFileSync(path.join(local, 'senha.txt'), 'utf8').trim();
if (senha.length < 8) { console.error('senha curta demais (mínimo 8)'); process.exit(1); }

const arqSal = path.join(local, 'sal.txt');
if (!existsSync(arqSal)) writeFileSync(arqSal, b64(crypto.getRandomValues(new Uint8Array(16))) + '\n');
const salt = Uint8Array.from(Buffer.from(readFileSync(arqSal, 'utf8').trim(), 'base64'));

const out = await cifrar(dados, senha, 600000, salt);
writeFileSync(path.join(raiz, 'socios-dados.json'), JSON.stringify(out) + '\n');
console.log('socios-dados.json cifrado:', (dados.grupos || []).reduce((n, g) => n + (g.itens || []).length, 0), 'itens em', (dados.grupos || []).length, 'grupos');
