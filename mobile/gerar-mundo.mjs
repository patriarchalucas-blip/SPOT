// Gera os contornos do mundo JA PROJETADOS, pra o app nao precisar carregar
// biblioteca de mapa nem baixar geometria em tempo de execucao.
//
// Rodar de novo so se a projecao ou o tamanho mudarem:
//   node gerar-mundo.mjs
import fs from 'fs';
import {geoNaturalEarth1, geoPath} from 'd3-geo';
import {feature} from 'topojson-client';

const FONTE='https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

// Baixa na hora em vez de depender de um arquivo solto: assim rodar de novo
// daqui a um ano produz o mesmo resultado sem procurar onde ficou o json.
const topo=await fetch(FONTE).then(r=>r.json());
const mundo=feature(topo,topo.objects.countries);

// Mesma projecao e mesmo enquadramento do site (MAP_W/MAP_H = 800x420, com
// 6px de margem), pra os dois desenharem o mesmo mapa.
const W=800,H=420;
const proj=geoNaturalEarth1().fitExtent([[6,6],[W-6,H-6]],mundo);
const caminho=geoPath(proj);

// Uma casa decimal: em 800px de largura, o erro maximo e de um decimo de
// pixel — invisivel — e o arquivo fica ~40% menor.
const arredonda=d=>d.replace(/-?\d+\.\d+/g,n=>{
  const v=Math.round(parseFloat(n)*10)/10;
  return String(v);
});

const paises=[];
mundo.features.forEach(f=>{
  const d=caminho(f);
  if(!d)return;
  paises.push({n:f.properties.name,d:arredonda(d)});
});

const saida='// GERADO POR gerar-mundo.mjs — nao editar a mao.\n'+
  '// Contornos do mundo ja projetados (Natural Earth, '+W+'x'+H+'), pra o app\n'+
  '// nao carregar biblioteca de mapa nem baixar geometria. Funciona offline.\n'+
  'export const LARGURA='+W+';\n'+
  'export const ALTURA='+H+';\n'+
  'export const PAISES='+JSON.stringify(paises)+';\n';
fs.writeFileSync('mundo.js',saida);
console.log('paises:',paises.length,'| arquivo:',(saida.length/1024).toFixed(0)+' KB');
