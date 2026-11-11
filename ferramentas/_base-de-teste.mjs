// O que o pente-fino e as jornadas precisam da MÁQUINA: a raiz do repositório,
// o puppeteer e o Chrome. Até 11/11/2026 os três estavam escritos com o caminho
// do notebook do Patriarcha dentro de cada teste, e por isso os testes só
// rodavam lá — o Jezler entregou a busca com IA em zip sem conseguir rodá-los.
// Aqui tudo sai de onde ESTE arquivo está, então roda em qualquer clone.
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// O puppeteer-core mora em ferramentas/capturas-loja (é lá que está o
// package.json dele): a raiz do repositório fica sem package.json de propósito,
// porque o site não tem dependência nem build.
export const PASTA_DO_PUPPETEER = path.join(RAIZ, 'ferramentas', 'capturas-loja');

export function carregarPuppeteer() {
  try {
    return createRequire(PASTA_DO_PUPPETEER + path.sep)('puppeteer-core');
  } catch (e) {
    console.error('\nFalta instalar o puppeteer-core. Rode uma vez:\n\n  npm install --prefix ferramentas/capturas-loja\n\n(ou use  node ferramentas/antes-de-subir.mjs , que instala sozinho)\n');
    process.exit(1);
  }
}

// O puppeteer-core não baixa navegador: usa o que está instalado. Ordem: a
// variável CHROME (pra quem instalou fora do padrão), depois os lugares padrão
// do Chrome em Windows, Mac e Linux e, por último, o Edge do Windows, que é o
// mesmo motor e vem em toda máquina.
export function acharChrome() {
  const e = process.env;
  const candidatos = [
    e.CHROME,
    e.PROGRAMFILES && path.join(e.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
    e['PROGRAMFILES(X86)'] && path.join(e['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'),
    e.LOCALAPPDATA && path.join(e.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    e['PROGRAMFILES(X86)'] && path.join(e['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'),
    e.PROGRAMFILES && path.join(e.PROGRAMFILES, 'Microsoft/Edge/Application/msedge.exe')
  ].filter(Boolean);
  const achado = candidatos.find((c) => fs.existsSync(c));
  if (!achado) {
    console.error('\nNão achei o Chrome. Instale o Google Chrome ou aponte a variável CHROME pro executável.\n');
    process.exit(1);
  }
  return achado;
}

// Pasta de arquivos temporários (prints do pente-fino). process.env.TEMP só
// existe no Windows.
export const TEMP = os.tmpdir();
