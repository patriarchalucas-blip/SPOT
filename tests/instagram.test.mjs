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

// ═══ MEMÓRIA POR RESTAURANTE E AVISO DE COTA (26/09) ═══
import { onRequestPost } from '../functions/api/find-instagram.js';

function ambiente(kvInicial) {
  const kv = new Map(Object.entries(kvInicial || {}));
  const env = {
    BRAVE_API_KEY: 'x', SUPABASE_SERVICE_KEY: 's',
    SPOT_KV: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v) } }
  };
  return { env, kv };
}
function pedido(corpo) {
  return new Request('https://meuspot.app/api/find-instagram', {
    method: 'POST', headers: { Authorization: 'Bearer a.b.c', 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
}

test('o mesmo restaurante nao gasta duas buscas, nem pra outra pessoa', async () => {
  const { env } = ambiente({ auth_: null });
  const antigo = globalThis.fetch;
  let brave = 0;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1' }), { status: 200 });
    if (u.includes('api.search.brave.com')) {
      brave++;
      return new Response(JSON.stringify({ web: { results: [
        { url: 'https://instagram.com/mocoto', title: 'Mocotó (@mocoto) • Instagram', description: 'Restaurante em São Paulo' }] } }), { status: 200 });
    }
    return new Response('[]', { status: 200 });
  };
  try {
    const c = { query: 'Mocotó São Paulo', name: 'Mocotó', city: 'São Paulo', site: '' };
    const r1 = await (await onRequestPost({ request: pedido(c), env })).json();
    const r2 = await (await onRequestPost({ request: pedido({ ...c, name: 'mocoto', city: 'sao paulo' }), env })).json();
    assert.strictEqual(r1.instagram_url, 'https://instagram.com/mocoto');
    assert.strictEqual(r2.instagram_url, 'https://instagram.com/mocoto');
    assert.strictEqual(r2.fonte, 'memoria');
    assert.strictEqual(brave, 1, 'buscou duas vezes o mesmo lugar');
    // toque manual passa por cima da memória
    await onRequestPost({ request: pedido({ ...c, forcar: true }), env });
    assert.strictEqual(brave, 2);
  } finally { globalThis.fetch = antigo }
});

test('avisa o dono ao cruzar 80% da cota, uma vez so', async () => {
  const mes = new Date().toISOString().slice(0, 7);
  const { env, kv } = ambiente({ ['brave_count_' + mes]: String(Math.ceil(20000 * 0.8) - 1) });
  const antigo = globalThis.fetch;
  let pushes = 0;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1' }), { status: 200 });
    if (u.includes('api.search.brave.com')) return new Response(JSON.stringify({ web: { results: [] } }), { status: 200 });
    if (u.includes('/rest/v1/profiles')) return new Response(JSON.stringify([{ id: 'dono' }]), { status: 200 });
    if (u.includes('/rest/v1/push_tokens')) return new Response(JSON.stringify([{ token: 'ExponentPushToken[x]' }]), { status: 200 });
    if (u.includes('exp.host')) { pushes++; return new Response('{"data":[]}', { status: 200 }) }
    return new Response('[]', { status: 200 });
  };
  try {
    await onRequestPost({ request: pedido({ query: 'A X', name: 'Lugar A', city: 'X' }), env });
    await onRequestPost({ request: pedido({ query: 'B X', name: 'Lugar B', city: 'X' }), env });
    assert.strictEqual(pushes, 1, 'avisou ' + pushes + ' vezes');
    assert.ok(kv.get('brave_aviso_' + mes + '_80'));
  } finally { globalThis.fetch = antigo }
});

// Confeitaria Vera Cruz (01/10): o Instagram abria "não encontrado". O site
// dela aponta pro @ certo, mas o nome salvo ("Confeitaria e Restaurante Vera
// Cruz") e o domínio ("veracruzconfeitaria") tinham as palavras em outra ordem.
test('Vera Cruz: o @ do site vale com as palavras em outra ordem', async () => {
  const { instagramDoSite, escolherPerfil, cobrePalavras } = await import('../functions/api/find-instagram.js');
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response('<a href="https://www.instagram.com/confeitariaveracruz/">ig</a>', { status: 200, headers: { 'Content-Type': 'text/html' } });
  try {
    for (const nome of ['Confeitaria Vera Cruz', 'Confeitaria e Restaurante Vera Cruz', 'Vera Cruz Confeitaria']) {
      assert.strictEqual(await instagramDoSite('https://www.veracruzconfeitaria.com.br/', nome), 'https://www.instagram.com/confeitariaveracruz/', nome);
    }
  } finally { globalThis.fetch = orig }
  assert.ok(escolherPerfil([{ url: 'https://www.instagram.com/confeitariaveracruz/', title: 'Vera Cruz Confeitaria (@confeitariaveracruz)', description: 'Tatuapé, São Paulo' }], 'Confeitaria e Restaurante Vera Cruz', 'São Paulo'));
  assert.strictEqual(escolherPerfil([{ url: 'https://www.instagram.com/veracruzpadaria/', title: 'Vera Cruz Padaria de Santos', description: 'Santos' }], 'Confeitaria e Restaurante Vera Cruz', 'São Paulo'), null, 'outra cidade nao entra');
  assert.strictEqual(cobrePalavras('dinhosjeans', 'Dinhos'), false, 'nome de uma palavra so nao usa a regra de palavras');
});
