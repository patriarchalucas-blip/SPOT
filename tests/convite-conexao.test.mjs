// Convite aberto no Safari antes de instalar o app (08/10/2026): a página
// /c/<código> anota a conexão; a conta nova que entra por ela é perguntada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaveDaConexao, ehRobo } from '../functions/api/_convite-conexao.js';
import { onRequestGet as pagina } from '../functions/c/[codigo].js';

const pedido = (ip, ua) => new Request('https://meuspot.app/c/abcd1234', {
  headers: Object.assign({}, ip ? { 'CF-Connecting-IP': ip } : {}, ua ? { 'User-Agent': ua } : {})
});
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

test('a mesma conexão dá a mesma chave, outra conexão dá outra, e o endereço não aparece nela', async () => {
  const a = await chaveDaConexao(pedido('189.1.2.3'));
  const b = await chaveDaConexao(pedido('189.1.2.3'));
  const c = await chaveDaConexao(pedido('189.1.2.4'));
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(!a.includes('189'));
  assert.equal(await chaveDaConexao(pedido('')), null);
});

test('o robô da prévia do WhatsApp não conta como quem abriu o convite', () => {
  assert.equal(ehRobo(pedido('1.1.1.1', 'WhatsApp/2.23.20.0 A')), true);
  assert.equal(ehRobo(pedido('1.1.1.1', 'facebookexternalhit/1.1')), true);
  assert.equal(ehRobo(pedido('1.1.1.1', '')), true);
  assert.equal(ehRobo(pedido('1.1.1.1', IPHONE)), false);
});

test('a página do convite anota a conexão só quando o convite existe e quem abre é gente', async () => {
  const fetchAntes = globalThis.fetch;
  const gravados = [];
  const env = { SPOT_KV: { put: async (k, v, o) => { gravados.push({ k, v, ttl: o && o.expirationTtl }) }, get: async () => null } };
  const rodar = async (existe, ua) => {
    globalThis.fetch = async () => new Response(JSON.stringify(existe ? [{ display_name: 'Elton Moledo', lugares: 3, cidades: 1, fotos: [] }] : []), { status: 200 });
    const esperas = [];
    const r = await pagina({ params: { codigo: 'abcd1234' }, request: pedido('189.1.2.3', ua), env, waitUntil: (p) => esperas.push(p) });
    await Promise.all(esperas);
    return r;
  };
  try {
    await rodar(true, IPHONE);
    assert.equal(gravados.length, 1);
    assert.equal(gravados[0].v, 'abcd1234');
    assert.equal(gravados[0].ttl, 2 * 60 * 60);
    await rodar(true, 'WhatsApp/2.23.20.0 A');
    await rodar(false, IPHONE);
    assert.equal(gravados.length, 1, 'robô e convite inexistente não anotam');
  } finally { globalThis.fetch = fetchAntes; }
});
