// Gera o "Secret Key" que o Supabase pede no provedor Apple.
//
// A Apple não dá uma senha pronta: ela dá uma CHAVE (.p8) e espera que o
// servidor assine com ela um token que diz "sou o app X do time Y". O Supabase
// guarda esse token assinado. Ele vale no MÁXIMO 6 meses — depois disso o
// login com a Apple para de funcionar sem aviso. Rodar isto de novo e colar o
// resultado no Supabase é tudo que precisa pra renovar.
//
// Uso:
//   node ferramentas/segredo-apple.cjs <arquivo.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>
//
// A chave .p8 NUNCA entra no repositório (o .gitignore barra *.p8). E o que
// este script imprime também é segredo: vai direto pro Supabase, não pra
// arquivo nem pra chat.

const fs = require('fs');
const crypto = require('crypto');

const [arquivo, time, chaveId, servico] = process.argv.slice(2);
if (!arquivo || !time || !chaveId || !servico) {
  console.error('uso: node ferramentas/segredo-apple.cjs <arquivo.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>');
  process.exit(1);
}

const b64 = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const agora = Math.floor(Date.now() / 1000);
const SEIS_MESES = 180 * 24 * 3600 - 3600; // a Apple recusa acima de 6 meses; uma hora de folga

const cabeca = b64({ alg: 'ES256', kid: chaveId, typ: 'JWT' });
const corpo = b64({ iss: time, iat: agora, exp: agora + SEIS_MESES, aud: 'https://appleid.apple.com', sub: servico });
const assinatura = crypto.sign('sha256', Buffer.from(cabeca + '.' + corpo), {
  key: fs.readFileSync(arquivo, 'utf8'),
  dsaEncoding: 'ieee-p1363'
}).toString('base64url');

console.log(cabeca + '.' + corpo + '.' + assinatura);
console.error('\nvence em ' + new Date((agora + SEIS_MESES) * 1000).toLocaleDateString('pt-BR') + ' — anote pra renovar antes.');
