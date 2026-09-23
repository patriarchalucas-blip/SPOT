// Simula a seção "notas" do Perfil com spots de mentira, executando o TRECHO
// REAL recortado do index.html. Serve pra ver o que a tela nativa recebe sem
// precisar do banco (o RLS barra quem não está logado) e sem abrir o app.
//
//   node mobile/sim-perfil.cjs

const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const NOTAS_NO_PERFIL = 6;
const cityOf = (x) => x.city || '';
const fmtRating = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '' : (n % 1 === 0 ? String(n) : n.toFixed(1).replace('.', ','));
};
const id = (x) => x;
const fotoPraCasca = id, safeUrl = id, semChaveDoPlaces = id, fotoNaLargura = id;

const spots = [
  { id: 1, name: 'Konoba Matejuska', city: 'Split', status: 'been', my_rating: 5, my_review: 'O melhor peixe da viagem. Fila de 40 min e valeu.', photo_url: 'p1', created_at: '2026-07-01' },
  { id: 2, name: 'Bar do Ze', city: 'Split', status: 'been', my_rating: 5, my_review: '', photo_url: 'p2', created_at: '2026-07-09' },
  { id: 3, name: 'Cevabdzinica Zeljo', city: 'Sarajevo', status: 'been', my_rating: 4.5, my_review: 'Cevapi de verdade.', photo_url: '', created_at: '2026-07-03' },
  { id: 4, name: 'Hotel X', city: 'Kotor', status: 'been', my_rating: 3, my_review: '', photo_url: 'p4', created_at: '2026-07-05' },
  { id: 5, name: 'Sem nota', city: 'Kotor', status: 'been', my_rating: 0, my_review: '', photo_url: '', created_at: '2026-07-06' },
  { id: 6, name: 'Quero ir', city: 'Mostar', status: 'want', my_rating: 0, my_review: '', photo_url: '', created_at: '2026-07-07' },
];

// Recorta do `const notas=` até o `});` que fecha o .map — o trecho executado
// aqui é literalmente o que roda no app, não uma cópia que pode divergir.
const i = s.indexOf('const notas=spots.filter');
const j = s.indexOf('\n  });', i) + '\n  });'.length;
const trecho = s.slice(i, j);

const notas = new Function(
  'spots', 'cityOf', 'fmtRating', 'fotoPraCasca', 'safeUrl', 'fotoNaLargura', 'semChaveDoPlaces',
  trecho + '\n  return notas;'
)(spots, cityOf, fmtRating, fotoPraCasca, safeUrl, fotoNaLargura, semChaveDoPlaces);

console.log('entram:', notas.length, '— esperado 4 (dois 5, um 4,5, um 3)');
console.log('titulo:', notas.some((n) => n.texto) ? 'O que eu achei' : 'Minhas notas');
console.log('');
notas.slice(0, NOTAS_NO_PERFIL).forEach((n, k) => {
  console.log(`${k + 1}. ${n.nome}  [${n.nota}]  ${n.cidade}`);
  console.log(n.texto ? `   "${n.texto}"` : '   (so estrela)');
});
