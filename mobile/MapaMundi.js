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

function MapaMundiBase({ opacidade = 1, fundo = 'transparent', visitados }) {
  // Recebe nomes no padrão do world-atlas (em inglês) — é o mesmo campo que o
  // site usa pra casar país com contorno.
  const marcados = React.useMemo(
    () => new Set(Array.isArray(visitados) ? visitados : []),
    [visitados]
  );

  // MESMO enquadramento do site: corta SÓ embaixo, a faixa da Antártida, e
  // deixa o topo inteiro. A versão anterior cortava 8% em cima também (o site
  // nunca corta o topo) e, pior, usava 'slice', que enche o espaço cortando
  // as LATERAIS: num iPhone sumiam a Nova Zelândia de um lado e o extremo
  // oeste do outro. Com 'meet' o mundo inteiro cabe; o que sobra de espaço
  // fica transparente, e por cima de fundo escuro ninguém vê.
  const alturaVis = Math.round(ALTURA * 0.845);

  return (
    // A ALTURA sai da largura, na proporção do mapa — igual ao site, que usa
    // aspect-ratio. Com altura fixa, num aparelho mais largo sobrava tarja
    // vazia dos dois lados e o mapa deixava de sangrar de ponta a ponta.
    <View style={{ width: '100%', aspectRatio: LARGURA / alturaVis, opacity: opacidade, overflow: 'hidden' }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${LARGURA} ${alturaVis}`}
        preserveAspectRatio="xMidYMid meet"
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
  a.opacidade === b.opacidade &&
  a.fundo === b.fundo &&
  (a.visitados || []).join('|') === (b.visitados || []).join('|')
);
