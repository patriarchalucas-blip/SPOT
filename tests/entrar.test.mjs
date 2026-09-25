import { test } from 'node:test';
import assert from 'node:assert';
import { destinoPermitido, onRequestGet } from '../functions/entrar.js';

// meuspot.app/entrar existe pra o iOS mostrar "meuspot.app" em vez do
// endereço do Supabase. É um redirecionamento: tem que recusar qualquer
// destino que não seja a autorização do NOSSO projeto.

const OK = 'https://kzidnilsyrvauzgelsqd.supabase.co/auth/v1/authorize?provider=google&redirect_to=spot%3A%2F%2Fauth';

test('passa o login do nosso Supabase', () => {
  assert.strictEqual(destinoPermitido(OK), OK);
});

test('recusa qualquer outro destino', () => {
  for (const u of [
    'https://site-falso.com/auth/v1/authorize?x=1',
    'https://kzidnilsyrvauzgelsqd.supabase.co.site-falso.com/auth/v1/authorize?x=1',
    'https://kzidnilsyrvauzgelsqd.supabase.co/auth/v1/admin?x=1',
    'https://outroprojeto.supabase.co/auth/v1/authorize?x=1',
    'javascript:alert(1)', '', null
  ]) assert.strictEqual(destinoPermitido(u), null, String(u));
});

test('responde 302 pro destino certo e 400 pro resto', async () => {
  const bom = onRequestGet({ request: new Request('https://meuspot.app/entrar?u=' + encodeURIComponent(OK)) });
  assert.strictEqual(bom.status, 302);
  assert.strictEqual(bom.headers.get('Location'), OK);
  const ruim = onRequestGet({ request: new Request('https://meuspot.app/entrar?u=' + encodeURIComponent('https://site-falso.com')) });
  assert.strictEqual(ruim.status, 400);
});
