import { test } from 'node:test';
import assert from 'node:assert';
import { escolherPerfil, handleDe } from '../functions/api/find-instagram.js';

// O DEFEITO QUE VOLTOU DUAS VEZES: um spot salvo como "Dinhos" pegava o
// Instagram de uma loja de jeans. A versao anterior aceitava na hora quando o
// @ era identico ao nome salvo — parecia seguro e nao e: nome curto e comum
// casa com qualquer negocio do pais.

const r = (url, title, description) => ({ url, title, description: description || '' });

test('nao pega o perfil de outro negocio so porque o @ e igual', () => {
  const achado = escolherPerfil([
    r('https://instagram.com/dinhos', "Dinho's Jeans (@dinhos) • Instagram", 'Moda masculina. Compre online.')
  ], 'Dinhos', 'São Paulo');
  assert.strictEqual(achado, null, 'pegou a loja de jeans de novo');
});

test('pega o perfil certo quando a cidade confirma', () => {
  const achado = escolherPerfil([
    r('https://instagram.com/dinhos', "Dinho's Jeans (@dinhos) • Instagram", 'Moda masculina.'),
    r('https://instagram.com/dinhosplace', "Dinho's Place (@dinhosplace) • Instagram", 'Restaurante em São Paulo desde 1978.')
  ], "Dinho's Place", 'São Paulo');
  assert.strictEqual(achado, 'https://instagram.com/dinhosplace');
});

test('o melhor candidato vence, nao o primeiro da lista', () => {
  // O de jeans vem primeiro no resultado da busca; o certo vem depois.
  const achado = escolherPerfil([
    r('https://instagram.com/saiko', 'Saiko Store (@saiko) • Instagram', 'Roupas'),
    r('https://instagram.com/saikosushi', 'Saiko Sushi (@saikosushi) • Instagram', 'Sushi em São Paulo')
  ], 'Saiko', 'São Paulo');
  assert.strictEqual(achado, 'https://instagram.com/saikosushi');
});

test('handle identico + a cidade continua valendo', () => {
  const achado = escolherPerfil([
    r('https://instagram.com/rubaiyat', 'Rubaiyat (@rubaiyat)', 'Restaurante em São Paulo')
  ], 'Rubaiyat', 'São Paulo');
  assert.strictEqual(achado, 'https://instagram.com/rubaiyat');
});

test('handle identico + titulo abrindo com o nome vale sem a cidade', () => {
  // Nem todo perfil legitimo cita a cidade na descricao.
  const achado = escolherPerfil([
    r('https://instagram.com/rubaiyat', 'Rubaiyat (@rubaiyat) • Instagram photos', 'Desde 1957')
  ], 'Rubaiyat', 'São Paulo');
  assert.strictEqual(achado, 'https://instagram.com/rubaiyat');
});

test('nome que nem se parece com o @ nunca entra', () => {
  assert.strictEqual(escolherPerfil([
    r('https://instagram.com/outracoisa', 'Outra Coisa', 'Em São Paulo')
  ], 'Rubaiyat', 'São Paulo'), null);
});

test('post e pagina interna do Instagram nao servem de perfil', () => {
  assert.strictEqual(handleDe('https://instagram.com/p/ABC123/'), '');
  assert.strictEqual(handleDe('https://instagram.com/reel/XYZ/'), '');
  assert.strictEqual(handleDe('https://instagram.com/explore/tags/sushi/'), '');
  assert.strictEqual(handleDe('https://instagram.com/rubaiyat'), 'rubaiyat');
});

test('sem resultado nenhum devolve nulo, sem estourar', () => {
  assert.strictEqual(escolherPerfil([], 'Rubaiyat', 'São Paulo'), null);
  assert.strictEqual(escolherPerfil(null, 'Rubaiyat', 'São Paulo'), null);
  assert.strictEqual(escolherPerfil([r('https://instagram.com/x', 'X')], '', ''), null);
});
