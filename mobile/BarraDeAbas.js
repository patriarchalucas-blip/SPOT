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

// Valores lidos do :root do index.html — não inventar aqui.
const INK = '#EAE7E0';
const INK3 = '#879499';
const ESCURO = '#0B1620';
const ATIVO_FUNDO = 'rgba(193,85,47,0.16)';
const BORDA = 'rgba(234,231,224,0.09)';

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

// A ordem é a mesma da barra do site. `tela` é o id que o goTo() do app usa.
export const ABAS = [
  { tela: 'dashboard', icone: 'map', rotulo: 'Viagens' },
  { tela: 'explore', icone: 'search', rotulo: 'Explorar' },
  { tela: 'friends', icone: 'users', rotulo: 'Amigos' },
  { tela: 'profile', icone: 'user', rotulo: 'Perfil' },
];

export default function BarraDeAbas({ ativa, aoTocar, margemDeBaixo }) {
  return (
    <View style={[estilo.ancora, { bottom: 13 + (margemDeBaixo || 0) }]} pointerEvents="box-none">
      <View style={estilo.pilula}>
        {/* O site usa backdrop-filter; aqui o equivalente é o BlurView. No
            Android o blur é caro e irregular, então lá vai fundo sólido —
            mesma decisão do @supports que o CSS já tem. */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={34} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: ESCURO }]} />
        )}
        <View style={estilo.linha}>
          {ABAS.map((a) => {
            const sel = a.tela === ativa;
            return (
              <Pressable
                key={a.tela}
                onPress={() => aoTocar(a.tela)}
                style={({ pressed }) => [
                  estilo.item,
                  sel && estilo.itemAtivo,
                  pressed && estilo.itemPressionado,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={a.rotulo}
                // Alvo de toque de 44pt é o mínimo da Apple; o rótulo sozinho
                // não chega lá.
                hitSlop={4}
              >
                <Icone nome={a.icone} cor={sel ? INK : INK3} />
                <Text style={[estilo.rotulo, sel && estilo.rotuloAtivo]}>{a.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const estilo = StyleSheet.create({
  ancora: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // A folga lateral vem daqui, como padding do ancoradouro. Se fosse margem
    // na pílula, o width:'100%' seria calculado ANTES da margem e a barra
    // estouraria 26px pra fora da tela — no React Native margem não é
    // descontada da largura como no box-sizing do CSS.
    paddingHorizontal: 13,
  },
  pilula: {
    // width: min(430px, 100% - 26px) do CSS
    width: '100%',
    maxWidth: 430,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(11,22,32,0.62)' : ESCURO,
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  linha: { flexDirection: 'row', padding: 6, gap: 2 },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 18,
  },
  itemAtivo: { backgroundColor: ATIVO_FUNDO },
  itemPressionado: { transform: [{ scale: 0.94 }] },
  rotulo: { fontSize: 10.5, fontWeight: '500', color: INK3 },
  rotuloAtivo: { color: INK, fontWeight: '600' },
});
