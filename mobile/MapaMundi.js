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
import { Animated, PanResponder, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { LARGURA, ALTURA, PAISES } from './mundo';
import { MAP_LAND, GREEN } from './cores';

// .wm-country e .wm-country.visited do site. As três cores estavam ESCRITAS
// aqui (terra azul-escura, visitado verde-água, contorno mais escuro ainda) e
// por isso escaparam da unificação: o mapa continuou no visual antigo dentro
// de um app claro. O site também não desenha contorno nenhum — o que separa
// país de país é a diferença de preenchimento.
const TERRA = MAP_LAND;
const VISITADO = GREEN;

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

// ── O MAPA DA VOCÊ, NAVEGÁVEL (18/11, V3 "Você · país") ──
// Antes era uma imagem parada: pra mover, a pessoa tinha que tocar e ir pra
// outra tela. Agora: um dedo arrasta, dois dão zoom, um toque num país chama
// `aoTocarPais` com o nome no padrão do mapa (o site abre o resumo dele).
//
// Sem biblioteca nativa nova (vai por atualização pelo ar): PanResponder do
// próprio React Native + Animated. O desenho dos 177 países não redesenha
// durante o gesto: quem se mexe é a camada de fora (translate/scale).
// `aoSegurar(true/false)` avisa a tela pra travar a rolagem enquanto o dedo
// está no mapa — senão o arrasto vertical virava rolagem da página.

const ZOOM_MAX = 6;
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
function distancia(ts) {
  if (!ts || ts.length < 2) return 0;
  const dx = ts[0].pageX - ts[1].pageX, dy = ts[0].pageY - ts[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

const PaisesTocaveis = React.memo(function PaisesTocaveis({ visitados, tocar }) {
  const marcados = React.useMemo(() => new Set(Array.isArray(visitados) ? visitados : []), [visitados]);
  const alturaVis = Math.round(ALTURA * 0.845);
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${LARGURA} ${alturaVis}`} preserveAspectRatio="xMidYMid meet">
      {PAISES.map((p) => (
        <Path key={p.n} d={p.d} fill={marcados.has(p.n) ? VISITADO : TERRA} onPress={() => tocar(p.n)} />
      ))}
    </Svg>
  );
}, (a, b) => (a.visitados || []).join('|') === (b.visitados || []).join('|'));

export function MapaNavegavel({ visitados, aoTocarPais, aoSegurar }) {
  const alturaVis = Math.round(ALTURA * 0.845);
  const tam = React.useRef({ w: 0, h: 0 });
  const pos = React.useRef({ x: 0, y: 0, k: 1 });
  const ini = React.useRef(null);
  const [tx] = React.useState(() => new Animated.Value(0));
  const [ty] = React.useState(() => new Animated.Value(0));
  const [ks] = React.useState(() => new Animated.Value(1));
  // Callbacks mais recentes, sem recriar o PanResponder nem redesenhar o mapa.
  const cb = React.useRef({ aoTocarPais, aoSegurar });
  React.useEffect(() => { cb.current = { aoTocarPais, aoSegurar } });
  const tocar = React.useCallback((n) => { if (cb.current.aoTocarPais) cb.current.aoTocarPais(n) }, []);

  const aplicar = (x, y, k) => {
    // O zoom é em volta do centro: com k, sobra (k-1)/2 da largura pra cada lado.
    const mx = ((k - 1) * tam.current.w) / 2, my = ((k - 1) * tam.current.h) / 2;
    const nx = limitar(x, -mx, mx), ny = limitar(y, -my, my);
    pos.current = { x: nx, y: ny, k };
    tx.setValue(nx); ty.setValue(ny); ks.setValue(k);
  };

  // Criado uma vez; as funções só leem as refs quando o dedo se mexe. A
  // checagem acha que é leitura durante o desenho (falso positivo, como no App.js).
  // eslint-disable-next-line react-hooks/refs
  const [pr] = React.useState(() => PanResponder.create({
    // O toque simples passa pro país; só o movimento (ou dois dedos) é do mapa.
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (e, g) => g.numberActiveTouches > 1 || Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
    onPanResponderGrant: (e, g) => {
      ini.current = { x: pos.current.x, y: pos.current.y, k: pos.current.k, d: distancia(e.nativeEvent.touches), ox: g.dx, oy: g.dy };
    },
    onPanResponderMove: (e, g) => {
      const i = ini.current; if (!i) return;
      const ts = e.nativeEvent.touches;
      let k = i.k;
      if (ts && ts.length >= 2) {
        const d = distancia(ts);
        // Segundo dedo chegou no meio do gesto: a medida começa agora.
        if (!i.d) { i.d = d; i.k = pos.current.k; i.x = pos.current.x; i.y = pos.current.y; i.ox = g.dx; i.oy = g.dy }
        k = limitar((i.k * d) / i.d, 1, ZOOM_MAX);
      } else if (i.d) {
        // Voltou a um dedo: continua arrastando de onde parou.
        i.d = 0; i.k = pos.current.k; i.x = pos.current.x; i.y = pos.current.y; i.ox = g.dx; i.oy = g.dy;
        k = i.k;
      }
      aplicar(i.x + (g.dx - i.ox), i.y + (g.dy - i.oy), k);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: () => { ini.current = null },
    onPanResponderTerminate: () => { ini.current = null },
  }));

  return (
    <View
      style={{ width: '100%', aspectRatio: LARGURA / alturaVis, overflow: 'hidden' }}
      onLayout={(ev) => { tam.current = { w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height } }}
      onTouchStart={() => cb.current.aoSegurar && cb.current.aoSegurar(true)}
      onTouchEnd={() => cb.current.aoSegurar && cb.current.aoSegurar(false)}
      onTouchCancel={() => cb.current.aoSegurar && cb.current.aoSegurar(false)}
      {...pr.panHandlers}
    >
      <Animated.View style={{ width: '100%', height: '100%', transform: [{ translateX: tx }, { translateY: ty }, { scale: ks }] }}>
        <PaisesTocaveis visitados={visitados} tocar={tocar} />
      </Animated.View>
    </View>
  );
}
