// Barra de abas NATIVA.
//
// POR QUE ELA EXISTE
//
// É o item da regra 4.2 que ainda faltava: "navegação nativa em vez do
// cabeçalho do site". Com ela, a primeira coisa que o revisor toca no app já
// não é HTML — é componente do sistema, com o toque respondendo na hora, sem
// esperar o WebView processar evento.
//
// E é a peça que torna possível migrar o resto. Enquanto a navegação morava
// dentro da página, trocar UMA tela por nativa era impossível: ou tudo era
// web, ou tudo era nativo. Com a navegação fora, cada aba pode virar nativa
// no seu tempo, e as outras continuam vindo do site sem ninguém perceber.
//
// A REGRA VISUAL: TEM QUE FICAR IDÊNTICA
//
// Todo valor daqui foi copiado do CSS do site (.bottom-nav, .nav-item,
// .nav-icon, .nav-label), não escolhido de novo. Os desenhos dos ícones são
// os MESMOS caminhos de SVG do sistema de ícones do app. Se um dia alguém
// mexer em um dos dois lados, os dois têm que andar juntos — senão o app
// passa a ter duas barras diferentes dependendo de onde abre.

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path } from 'react-native-svg';
import { BASE, INK, INK3, GREEN } from './cores';

// Valores lidos do :root do index.html — não inventar aqui.

// Mesmos caminhos do ICONS no index.html. Traço 1.8, ponta e junta
// arredondadas, sem preenchimento — igual ao svg.ic do site.
function Icone({ nome, cor }) {
  const comum = { stroke: cor, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {nome === 'map' && (
        <>
          <Path d="M9 4.5 3.5 6.8v12.7l5.5-2.3 6 2.5 5.5-2.3V4.7L15 7 9 4.5Z" {...comum} />
          <Path d="M9 4.5V17" {...comum} />
          <Path d="M15 7v12.7" {...comum} />
        </>
      )}
      {nome === 'search' && (
        <>
          <Circle cx="11" cy="11" r="6.5" {...comum} />
          <Path d="M16 16l4 4" {...comum} />
        </>
      )}
      {nome === 'users' && (
        <>
          <Circle cx="9" cy="8.5" r="3" {...comum} />
          <Path d="M3.8 19a5.2 5.2 0 0 1 10.4 0" {...comum} />
          <Path d="M16 6.2a3 3 0 0 1 0 5.6" {...comum} />
          <Path d="M17.2 14.4a5.2 5.2 0 0 1 3 4.6" {...comum} />
        </>
      )}
      {nome === 'user' && (
        <>
          <Circle cx="12" cy="8" r="3.6" {...comum} />
          <Path d="M5.5 20a6.5 6.5 0 0 1 13 0" {...comum} />
        </>
      )}
    </Svg>
  );
}

// A ALTURA DA BARRA, EM UM LUGAR SÓ. As quatro telas precisam reservar espaço
// embaixo pra última coisa da rolagem não morrer atrás da barra, e cada uma
// tinha um `paddingBottom: 120` escrito na mão. Num iPhone com o risquinho a
// barra mede 78 + 34 = 112, então sobravam 8px — a última linha encostava. E
// o número não acompanhava a barra se ela mudasse de altura.
export const ALTURA_DA_BARRA = 78;
export const folgaDeRolagem = (margemDeBaixo) => ALTURA_DA_BARRA + (margemDeBaixo || 0) + 24;

// A ordem é a mesma da barra do site. `tela` é o id que o goTo() do app usa.
export const ABAS = [
  { tela: 'dashboard', icone: 'map', rotulo: 'Viagens' },
  { tela: 'explore', icone: 'search', rotulo: 'Explorar' },
  { tela: 'friends', icone: 'users', rotulo: 'Amigos' },
  { tela: 'profile', icone: 'user', rotulo: 'Perfil' },
];

export default function BarraDeAbas({ ativa, aoTocar, margemDeBaixo }) {
  const folga = margemDeBaixo || 0;
  return (
    <View style={estilo.ancora} pointerEvents="box-none">
      <View style={[estilo.barra, { height: ALTURA_DA_BARRA + folga, paddingBottom: folga }]}>
        {/* O site usa backdrop-filter; aqui o equivalente é o BlurView. No
            Android o blur é caro e irregular, então lá vai fundo sólido —
            mesma decisão do @supports que o CSS já tem.
            A camada de cor vem DEPOIS do desfoque: o BlurView é um filho que
            pinta por cima do fundo do pai, então um backgroundColor na barra
            ficaria embaixo dele e não teria efeito nenhum. */}
        {Platform.OS === 'ios' ? (
          <>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(245,245,243,0.85)' }]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BASE }]} />
        )}
        <View style={estilo.linha}>
          {ABAS.map((a) => {
            const sel = a.tela === ativa;
            return (
              <Pressable
                key={a.tela}
                onPress={() => aoTocar(a.tela)}
                style={({ pressed }) => [estilo.item, pressed && estilo.itemPressionado]}
                accessibilityRole="tab"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={a.rotulo}
                // Alvo de toque de 44pt é o mínimo da Apple; o rótulo sozinho
                // não chega lá.
                hitSlop={4}
              >
                <Icone nome={a.icone} cor={sel ? GREEN : INK3} />
                <Text style={[estilo.rotulo, sel && estilo.rotuloAtivo]}>{a.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// A CÁPSULA FLUTUANTE SAIU, igual ao site. Ela era pastilha escura descolada
// do rodapé, com borda e sombra — a forma de barra que mais denuncia app
// gerado, e o que sobrou de mais gritante dentro do app claro. Agora a barra é
// o próprio rodapé: mesma cor da base, encostada embaixo, de ponta a ponta,
// sem borda e sem sombra. O que a separa do conteúdo é o desfoque.
const estilo = StyleSheet.create({
  ancora: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  barra: {
    // width: min(430px, 100%) do CSS
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  linha: { flexDirection: 'row' },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  itemPressionado: { opacity: 0.6 },
  rotulo: { fontSize: 11, fontWeight: '500', color: INK3 },
  // O rótulo ativo é tinta, não verde: o acento fica no ÍCONE. É o que o site
  // desenha hoje em todas as telas.
  rotuloAtivo: { color: INK, fontWeight: '600' },
});
