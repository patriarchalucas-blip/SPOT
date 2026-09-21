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
import Svg, { Path } from 'react-native-svg';
import MapaMundi from './MapaMundi';
import { INK, INK2, INK3, ESCURO, ELEV, BORDA, TERRA, VERDE, FRAUNCES, MONO, MONO_MEDIO, MONO_FORTE } from './cores';


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

// "Voce esta no X?" — a faixa que aparece quando o aparelho reconhece um
// lugar por perto. Ela existia so na versao web: quem usa o app pelas abas
// nativas nunca era perguntado.
function FaixaDeCheckin({ nome, acao }) {
  return (
    <View style={e.checkin}>
      <View style={e.checkinIcone}>
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path
            d="M12 21s6.5-5.8 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.2 12 21 12 21Z"
            stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
          <Path
            d="M12 13a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"
            stroke="#fff" strokeWidth={1.8} fill="none"
          />
        </Svg>
      </View>
      <Text style={e.checkinQ} numberOfLines={2}>
        Você está em <Text style={e.checkinNome}>{nome}</Text>?
      </Text>
      <Pressable
        onPress={() => acao('checkinAdd')}
        style={({ pressed }) => [e.checkinAdd, pressed && { opacity: 0.85 }]}
      >
        <Text style={e.checkinAddTxt}>Adicionar</Text>
      </Pressable>
      <Pressable
        onPress={() => acao('checkinIgnorar')}
        hitSlop={6}
        style={({ pressed }) => [e.checkinX, pressed && { opacity: 0.5 }]}
        accessibilityRole="button"
        accessibilityLabel="Ignorar"
      >
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={INK3} strokeWidth={1.8} strokeLinecap="round" fill="none" />
        </Svg>
      </Pressable>
    </View>
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
      <View style={e.veu1} pointerEvents="none" />
      <View style={e.veu2} pointerEvents="none" />
      <View style={e.veu3} pointerEvents="none" />
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
  // A tela era so a lista; o botao + precisa FLUTUAR por cima dela, entao
  // entra uma camada em volta.
  return (
    <View style={{ flex: 1 }}>
      {corpo()}
      <BotaoMais acao={acao} margemDeBaixo={margem.bottom} />
    </View>
  );

  function corpo() {

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
            accessibilityRole="button"
            accessibilityLabel="Abrir seu perfil"
          >
            {/* Mesma regra da tela de perfil: foto quando existe, inicial
                quando não. Aqui só a inicial tinha sido portada. */}
            {d.avatar ? (
              <Image source={{ uri: d.avatar }} style={e.avatar} />
            ) : (
              <View style={e.avatar}>
                <Text style={e.avatarTxt}>{d.inicial}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* No site o mapa abre a tela cheia; na primeira versão nativa ele
            tinha virado só desenho. O desenho em si fica surdo ao toque pra
            não disputar com o botão. */}
        <Pressable
          onPress={() => acao('mapa')}
          style={({ pressed }) => [e.mapa, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Abrir o mapa-múndi"
        >
          <View pointerEvents="none">
            <MapaMundi visitados={d.mapa} opacidade={0.5} />
          </View>
        </Pressable>

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

      {d.checkin ? <FaixaDeCheckin nome={d.checkin.nome} acao={acao} /> : null}

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
}

// Nao existia no nativo, e o texto da tela vazia mandava tocar nele. Faz o
// mesmo que o + do site: escolher categoria e cair no fluxo de adicionar
// lugar, que cria a viagem sozinho quando precisa.
function BotaoMais({ acao, margemDeBaixo }) {
  return (
    <Pressable
      onPress={() => acao('novoLugar')}
      style={({ pressed }) => [e.mais, { bottom: 96 + margemDeBaixo }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel="Adicionar um lugar"
    >
      <Text style={e.maisTxt}>+</Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  // Valores copiados do .checkin-* do site. O degrade de fundo vira uma cor
  // so, no meio do caminho entre as duas pontas dele.
  // Uma linha, nao um bloco: antes ocupava a altura de um card de viagem pra
  // perguntar uma coisa so, e empurrava a tela inteira pra baixo.
  checkin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginHorizontal: 24,
    marginTop: 14,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    backgroundColor: 'rgba(193,85,47,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(193,85,47,0.30)',
    borderRadius: 14,
  },
  checkinIcone: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: TERRA,
    alignItems: 'center', justifyContent: 'center',
  },
  checkinQ: { flex: 1, minWidth: 0, fontSize: 13.5, color: INK, lineHeight: 18 },
  checkinNome: { color: TERRA, fontWeight: '600' },
  checkinAdd: { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: TERRA },
  checkinAddTxt: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  checkinX: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  // 96px acima da barra de abas, como o do site, mais a area segura.
  mais: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TERRA,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TERRA,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  maisTxt: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },

  fundo: { flex: 1, backgroundColor: ESCURO },
  centro: { alignItems: 'center', justifyContent: 'center' },

  topo: { paddingHorizontal: 24 },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  marca: { fontFamily: 'Cinzel', fontSize: 19, color: INK, letterSpacing: 2.7 },
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
  // Peso de monoespacada com nome proprio: ver o comentario de FONTES no App.
  paisesN: { fontFamily: MONO_MEDIO, fontSize: 30, color: INK, letterSpacing: -1 },
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
  caixaN: { fontFamily: MONO_FORTE, fontSize: 21, color: INK },
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
  chipTxt: { fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.2, color: INK2, },
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
  // O site usa degrade: topo limpo, pe quase opaco. Chapado, o topo ficava
  // sujo e o pe claro demais pro nome branco em foto clara.
  veu1: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%', backgroundColor: 'rgba(11,22,32,0.10)' },
  veu2: { position: 'absolute', left: 0, right: 0, top: '45%', height: '30%', backgroundColor: 'rgba(11,22,32,0.50)' },
  veu3: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '25%', backgroundColor: 'rgba(11,22,32,0.86)' },
  bandeira: { position: 'absolute', top: 16, left: 16, zIndex: 2, fontSize: 26 },
  vgPe: { position: 'absolute', left: 18, right: 18, bottom: 18, zIndex: 2 },
  vgNome: { fontFamily: FRAUNCES, fontWeight: '400', fontSize: 31, color: '#fff', lineHeight: 33 },
  vgMeta: { fontFamily: MONO, fontSize: 11, color: INK2, marginTop: 8 },

  vazio: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 56, gap: 10 },
  vazioTitulo: { fontFamily: FRAUNCES, fontSize: 22, color: INK2 },
  vazioTexto: { fontSize: 14, color: INK3, textAlign: 'center', lineHeight: 20 },
  botaoNova: { marginTop: 14, backgroundColor: TERRA, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 24 },
  botaoNovaTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
