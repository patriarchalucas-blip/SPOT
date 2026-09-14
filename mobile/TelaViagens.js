// Tela de Viagens — NATIVA.
//
// Terceira tela que deixa de ser HTML, e a primeira que a pessoa vê ao abrir
// o app. Mesma divisão das outras: o site tem as regras, aqui é só o desenho.
//
// O mapa-múndi aqui é DECORAÇÃO: sem toque, sem zoom, atrás do placar. Quem
// quiser o mapa de verdade toca no número de países. Mesma divisão do site.
//
// Valores copiados do CSS (.vg-card, .cont-chip, .stat-block, .dash-paises).

import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapaMundi from './MapaMundi';

const INK = '#EAE7E0';
const INK2 = '#B4BCBF';
const INK3 = '#879499';
const ESCURO = '#0B1620';
const ELEV = '#16232A';
const BORDA = 'rgba(234,231,224,0.15)';
const TERRA = '#c1552f';
const VERDE = '#4E9490';
const FRAUNCES = 'Fraunces';
const MONO = 'IBM Plex Mono';

function Caixa({ n, rotulo, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [e.caixa, pressed && { transform: [{ scale: 0.96 }] }]}
      accessibilityRole="button"
      accessibilityLabel={n + ' ' + rotulo}
    >
      <Text style={e.caixaN}>{n}</Text>
      <Text style={e.caixaL}>{rotulo}</Text>
    </Pressable>
  );
}

function CardDeViagem({ t, aoAbrir }) {
  const [falhou, setFalhou] = React.useState(false);
  const [c1, c2] = t.cores || [ELEV, ESCURO];
  return (
    <Pressable
      onPress={aoAbrir}
      style={({ pressed }) => [e.vgCard, pressed && { transform: [{ scale: 0.98 }] }]}
      accessibilityRole="button"
      accessibilityLabel={t.nome}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />
      <View style={[e.metadeDeBaixo, { backgroundColor: c2 }]} />
      {t.foto && !falhou ? (
        <Image
          source={{ uri: t.foto }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFalhou(true)}
        />
      ) : null}
      {/* o véu escuro que faz o nome ficar legível sobre qualquer foto */}
      <View style={e.veu} />
      <Text style={e.bandeira}>{t.bandeira}</Text>
      <View style={e.vgPe}>
        <Text style={e.vgNome} numberOfLines={2}>{t.nome}</Text>
        <Text style={e.vgMeta}>{t.meta}</Text>
      </View>
    </Pressable>
  );
}

export default function TelaViagens({ dados, ocupado, acao }) {
  const margem = useSafeAreaInsets();

  if (!dados) {
    return (
      <View style={[e.fundo, e.centro]}>
        <ActivityIndicator size="large" color={TERRA} />
      </View>
    );
  }

  const d = dados;

  return (
    <ScrollView
      style={e.fundo}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={!!ocupado} onRefresh={() => acao('recarregar')} tintColor={INK3} />
      }
    >
      <View style={[e.topo, { paddingTop: 26 + margem.top }]}>
        <View style={e.linhaTopo}>
          <Text style={e.marca}>Spot</Text>
          <Pressable
            onPress={() => acao('perfil')}
            style={e.avatar}
            accessibilityRole="button"
            accessibilityLabel="Abrir seu perfil"
          >
            <Text style={e.avatarTxt}>{d.inicial}</Text>
          </Pressable>
        </View>

        <View style={e.mapa} pointerEvents="none">
          <MapaMundi visitados={d.mapa} altura={150} opacidade={0.5} />
        </View>

        {d.convite ? (
          <Text style={e.convite}>Crie uma viagem para pintar o primeiro país.</Text>
        ) : null}

        <Pressable onPress={() => acao('lista', 'countries')} style={e.paises}>
          <Text style={e.paisesN}>{d.paises}</Text>
          <Text style={e.paisesT}>de 195 países</Text>
        </Pressable>

        <View style={e.caixas}>
          <Caixa n={d.spots} rotulo="spots" onPress={() => acao('lista', 'spots')} />
          <Caixa n={d.cidades} rotulo="cidades" onPress={() => acao('lista', 'cities')} />
          <Caixa n={d.viagens} rotulo="viagens" onPress={() => acao('lista', 'trips')} />
        </View>
      </View>

      {d.vazio ? (
        <View style={e.vazio}>
          <Text style={e.vazioTitulo}>Nenhuma viagem ainda</Text>
          <Text style={e.vazioTexto}>Toca no + para criar sua primeira viagem</Text>
          <Pressable onPress={() => acao('nova')} style={e.botaoNova}>
            <Text style={e.botaoNovaTxt}>Criar viagem</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={e.trilho}
          >
            {(d.regioes || []).map((r) => {
              const on = r.nome === d.regiao;
              return (
                <Pressable
                  key={r.nome}
                  onPress={() => acao('regiao', r.nome)}
                  style={[e.chip, on && e.chipOn]}
                >
                  <Text style={[e.chipTxt, on && e.chipTxtOn]}>
                    {r.nome} · {r.n}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={262 /* largura do card + espaço */}
            snapToAlignment="start"
            contentContainerStyle={e.filme}
          >
            {(d.viagensDaRegiao || []).map((t) => (
              <CardDeViagem key={t.id} t={t} aoAbrir={() => acao('abrir', t.id)} />
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: ESCURO },
  centro: { alignItems: 'center', justifyContent: 'center' },

  topo: { paddingHorizontal: 24 },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  marca: { fontFamily: 'Cinzel', fontSize: 21, color: INK, letterSpacing: 3 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: VERDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 16, color: ESCURO, fontWeight: '600' },

  // Sangra pra fora da margem lateral, como o do site: mapa com margem
  // parece figura, e este é fundo.
  mapa: { marginHorizontal: -24, marginTop: 4, marginBottom: 10 },

  convite: { fontSize: 12.5, color: INK3, maxWidth: 230, lineHeight: 18, marginBottom: 14 },

  paises: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  paisesN: { fontFamily: MONO, fontWeight: '500', fontSize: 30, color: INK, letterSpacing: -1 },
  paisesT: { fontFamily: MONO, fontSize: 13, color: INK3 },

  caixas: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  caixa: {
    flex: 1,
    backgroundColor: '#1D272F',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  caixaN: { fontFamily: MONO, fontWeight: '600', fontSize: 21, color: INK },
  caixaL: { fontFamily: MONO, fontSize: 10.5, color: INK3, marginTop: 4, letterSpacing: 0.5 },

  trilho: { gap: 8, paddingHorizontal: 24, paddingTop: 2 },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(234,231,224,0.2)',
  },
  chipOn: { backgroundColor: TERRA, borderColor: TERRA },
  chipTxt: { fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.2, color: INK3, textTransform: 'uppercase' },
  chipTxtOn: { color: '#fff' },

  filme: { gap: 12, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 10 },
  vgCard: {
    width: 250,
    height: 330,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: ELEV,
  },
  metadeDeBaixo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.9 },
  veu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,22,32,0.35)' },
  bandeira: { position: 'absolute', top: 16, left: 16, zIndex: 2, fontSize: 26 },
  vgPe: { position: 'absolute', left: 18, right: 18, bottom: 18, zIndex: 2 },
  vgNome: { fontFamily: FRAUNCES, fontWeight: '400', fontSize: 31, color: '#fff', lineHeight: 33 },
  vgMeta: { fontFamily: MONO, fontSize: 11, color: INK2, marginTop: 8 },

  vazio: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 56, gap: 10 },
  vazioTitulo: { fontFamily: FRAUNCES, fontSize: 20, color: INK },
  vazioTexto: { fontSize: 14, color: INK3, textAlign: 'center', lineHeight: 20 },
  botaoNova: { marginTop: 14, backgroundColor: TERRA, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 24 },
  botaoNovaTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
