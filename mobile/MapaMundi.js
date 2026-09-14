// Mapa-múndi — NATIVO.
//
// Era a última peça do porte que não era tradução direta: no site ele é
// desenhado por uma biblioteca que baixa ~700 KB de geometria e não existe em
// React Native. Aqui os contornos já vêm PROJETADOS (ver mundo.js, gerado por
// gerar-mundo.mjs), então o app não carrega biblioteca de mapa, não baixa
// nada, e o mapa funciona sem internet — que era metade do motivo de portar.
//
// Mesmas cores do CSS (.wm-country e .wm-country.visited).
//
// O QUE É CARO AQUI: são 177 contornos. Desenhar todos a cada frame é o que
// trava um mapa em celular. Por isso a lista de países visitados vira um
// conjunto uma vez só, e o componente inteiro é memoizado — redesenha quando
// os países mudam, não quando o pai redesenha.

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { LARGURA, ALTURA, PAISES } from './mundo';

const TERRA = '#1c2f40';
const TRACO = '#0B1620';
const VISITADO = '#4E9490';

function MapaMundiBase({ visitados, altura = 150, opacidade = 1, fundo = 'transparent' }) {
  // Recebe nomes no padrão do world-atlas (em inglês) — é o mesmo campo que o
  // site usa pra casar país com contorno.
  const marcados = React.useMemo(
    () => new Set(Array.isArray(visitados) ? visitados : []),
    [visitados]
  );

  // A altura manda; a largura acompanha na proporção do mapa. Recortar em
  // cima e embaixo tira a Antártida e o vazio do Ártico, que é o que o site
  // também faz — mapa inteiro deixa o miolo pequeno demais.
  const recorteY = ALTURA * 0.08;
  const alturaVis = ALTURA - recorteY * 2;

  return (
    <View style={{ height: altura, opacity: opacidade, overflow: 'hidden' }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 ${recorteY} ${LARGURA} ${alturaVis}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {fundo !== 'transparent' ? (
          <Rect x={0} y={0} width={LARGURA} height={ALTURA} fill={fundo} />
        ) : null}
        {PAISES.map((p) => (
          <Path
            key={p.n}
            d={p.d}
            fill={marcados.has(p.n) ? VISITADO : TERRA}
            stroke={TRACO}
            strokeWidth={0.4}
          />
        ))}
      </Svg>
    </View>
  );
}

// Comparação explícita: sem ela, qualquer redesenho do pai remonta 177
// caminhos. A lista chega pronta do site e muda pouquíssimo.
export default React.memo(MapaMundiBase, (a, b) =>
  a.altura === b.altura &&
  a.opacidade === b.opacidade &&
  a.fundo === b.fundo &&
  (a.visitados || []).join('|') === (b.visitados || []).join('|')
);
