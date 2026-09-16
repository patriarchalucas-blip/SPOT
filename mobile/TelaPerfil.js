// Tela de Perfil — NATIVA.
//
// Quarta e última aba a deixar de ser HTML. Mesma divisão das outras: o site
// tem as regras (a ordenação da estante, a média por cidade, o que conta como
// visitado), aqui é só o desenho.
//
// O mapa aqui é o principal da seção "Onde já estive": maior que o de
// Viagens e com a lista de países logo abaixo.
//
// É a tela que o revisor da App Store visita pra achar exclusão de conta,
// termos e privacidade. Esses caminhos ficam na ficha de configurações, que
// continua vindo do site — trocá-la por nativa agora só adicionaria risco
// numa coisa que já funciona e que a revisão vai olhar.

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
import Svg, { Circle, Path } from 'react-native-svg';

const INK = '#EAE7E0';
const INK2 = '#B4BCBF';
const INK3 = '#879499';
const ESCURO = '#0B1620';
const ELEV = '#16232A';
const BORDA = 'rgba(234,231,224,0.15)';
const TERRA = '#c1552f';
const VERDE = '#4E9490';
const AMBAR = '#BFA474';
const FRAUNCES = 'Fraunces';
const MONO = 'IBM Plex Mono';

// Mesmos desenhos do sistema de ícones do site.
const DESENHOS = {
  gear: ['M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
         'M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3.6 9h16.8M3.6 15h16.8',
          'M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z'],
  pin: ['M12 21s6.5-5.8 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.2 12 21 12 21Z', 'M12 13a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z'],
  edit: ['M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z'],
  close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
};

function Icone({ nome, cor = INK3, tamanho = 18 }) {
  const c = { stroke: cor, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      {(DESENHOS[nome] || []).map((d, i) => <Path key={i} d={d} {...c} />)}
    </Svg>
  );
}

function CategoriaIcone({ cat }) {
  const c = { stroke: INK3, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      {cat === 'hotel' ? (
        <>
          <Path d="M3 18v-8h12a4 4 0 0 1 4 4v4" {...c} />
          <Path d="M3 18h18M3 10V7" {...c} />
          <Circle cx="7.5" cy="13" r="1.8" {...c} />
        </>
      ) : cat === 'experience' ? (
        <>
          <Path d="M12 21s6.5-5.8 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.2 12 21 12 21Z" {...c} />
          <Circle cx="12" cy="10.6" r="2.4" {...c} />
        </>
      ) : (
        <>
          <Path d="M7 3v8a2.5 2.5 0 0 0 5 0V3" {...c} />
          <Path d="M9.5 11v10M17 3c-1.5 1.5-2 3-2 5s.5 2.5 2 2.5V21" {...c} />
        </>
      )}
    </Svg>
  );
}

// Uma linha por país: bandeira, nome, e à direita quantos lugares tem lá — ou
// o selo de onde a pessoa mora. O X só aparece em país que é só marcação de
// mapa: tirar um país que tem viagem de verdade apagaria a viagem junto.
function Pais({ p, acao }) {
  return (
    <Pressable
      onPress={() => acao('pais', p.nome)}
      style={({ pressed }) => [e.pais, pressed && { opacity: 0.6 }]}
    >
      <Text style={e.paisBandeira}>{p.bandeira}</Text>
      <Text style={e.paisNome} numberOfLines={1}>{p.nome}</Text>
      {p.casa ? (
        <Text style={e.paisCasa}>mora aqui</Text>
      ) : (
        <Text style={e.paisConta}>{p.contagem}</Text>
      )}
      {p.podeTirar ? (
        <Pressable
          onPress={() => acao('tirarPais', p.nome)}
          hitSlop={8}
          style={({ pressed }) => [e.paisX, pressed && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={'Tirar ' + p.nome + ' do mapa'}
        >
          <Icone nome="close" cor={INK3} tamanho={15} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function Linha({ icone, texto, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [e.linha, pressed && { opacity: 0.7 }]}>
      <Icone nome={icone} />
      <Text style={e.linhaTxt}>{texto}</Text>
      <Text style={e.seta}>{'›'}</Text>
    </Pressable>
  );
}

function Cidade({ c, acao }) {
  return (
    <View style={e.cidade}>
      <Pressable
        onPress={() => acao('cidade', c.cidade)}
        style={({ pressed }) => [e.cidadeTopo, pressed && { opacity: 0.7 }]}
      >
        <Text style={e.bandeira}>{c.bandeira}</Text>
        <Text style={e.cidadeNome} numberOfLines={1}>{c.cidade}</Text>
        <Text style={e.cidadeMeta}>{c.meta}</Text>
        <Text style={[e.seta, c.aberta && { transform: [{ rotate: '90deg' }] }]}>{'›'}</Text>
      </Pressable>
      {c.aberta
        ? c.lugares.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => acao('lugar', s.id)}
              style={({ pressed }) => [e.lugar, pressed && { opacity: 0.7 }]}
            >
              <CategoriaIcone cat={s.categoria} />
              <Text style={e.lugarNome} numberOfLines={1}>{s.nome}</Text>
              {s.nota ? (
                <Text style={e.lugarNota}>{s.nota}</Text>
              ) : s.quer ? (
                <Text style={e.lugarQuer}>quero ir</Text>
              ) : null}
            </Pressable>
          ))
        : null}
    </View>
  );
}

export default function TelaPerfil({ dados, ocupado, acao }) {
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
      <View style={[e.ident, { paddingTop: 26 + margem.top }]}>
        <Pressable onPress={() => acao('foto')} style={e.avatarWrap}>
          {d.avatar ? (
            <Image source={{ uri: d.avatar }} style={e.avatar} />
          ) : (
            <View style={e.avatar}>
              <Text style={e.avatarTxt}>{d.inicial}</Text>
            </View>
          )}
          <View style={e.selo}>
            <Icone nome="edit" cor={ESCURO} tamanho={12} />
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={e.nome} numberOfLines={1}>{d.nome}</Text>
          {d.username ? <Text style={e.user}>@{d.username}</Text> : null}
        </View>
        <Pressable
          onPress={() => acao('config')}
          style={({ pressed }) => [e.config, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
        >
          <Icone nome="gear" cor={INK} tamanho={20} />
        </Pressable>
      </View>

      {d.bio ? <Text style={e.bio}>{d.bio}</Text> : null}

      <View style={e.corpo}>
        <View style={e.cabecalho}>
          <Text style={e.secao}>Meus lugares</Text>
          {d.resumo ? <Text style={e.secaoSub}>{d.resumo}</Text> : null}
        </View>

        {!d.estante.length ? (
          <Text style={e.aviso}>
            Os lugares que você salvar aparecem aqui, separados por cidade.
          </Text>
        ) : (
          d.estante.map((c) => <Cidade key={c.cidade} c={c} acao={acao} />)
        )}

        <View style={[e.cabecalho, { marginTop: 26 }]}>
          <Text style={e.secao}>Onde já estive</Text>
        </View>
        <View style={e.mapa}>
          <MapaMundi visitados={d.mapa} altura={190} />
        </View>
        {d.paises && d.paises.length ? (
          <View style={e.paisesLista}>
            {d.paises.map((p) => <Pais key={p.nome} p={p} acao={acao} />)}
            {d.paisesTotal > d.paises.length ? (
              <Pressable
                onPress={() => acao('todosOsPaises')}
                style={({ pressed }) => [e.paisTodos, pressed && { opacity: 0.6 }]}
              >
                <Text style={e.paisTodosTxt}>{'Ver todos os ' + d.paisesTotal + ' ›'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={e.paises}>Crie viagens para pintar o mundo.</Text>
        )}

        <View style={e.acoes}>
          <Linha icone="globe" texto="Marcar país que já visitei" onPress={() => acao('visitado')} />
          <Linha icone="pin" texto="Marcar país onde moro" onPress={() => acao('moro')} />
        </View>

        {d.email ? <Text style={e.email}>{d.email}</Text> : null}
      </View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: ESCURO },
  centro: { alignItems: 'center', justifyContent: 'center' },

  ident: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingBottom: 4 },
  avatarWrap: { width: 62, height: 62 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: VERDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 24, color: ESCURO, fontWeight: '600' },
  selo: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ESCURO,
  },
  nome: { fontFamily: FRAUNCES, fontSize: 27, color: INK, letterSpacing: -0.3 },
  user: { fontFamily: MONO, fontSize: 12.5, color: INK3, marginTop: 2 },
  config: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(234,231,224,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bio: { paddingHorizontal: 24, paddingTop: 12, fontSize: 14.5, color: INK2, lineHeight: 20 },

  corpo: { paddingHorizontal: 24, paddingTop: 20 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  secao: { fontSize: 13, fontWeight: '600', color: INK2 },
  secaoSub: { fontFamily: MONO, fontSize: 11, color: INK3 },
  aviso: { fontSize: 13.5, color: INK3, lineHeight: 19 },
  paises: { fontSize: 13.5, color: INK2, lineHeight: 21 },
  paisesLista: { marginTop: 2 },
  pais: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDA,
  },
  paisBandeira: { fontSize: 17 },
  paisNome: { flex: 1, fontSize: 14.5, color: INK },
  paisConta: { fontFamily: MONO, fontSize: 11, color: INK3 },
  paisCasa: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 0.4,
    color: TERRA,
    backgroundColor: 'rgba(193,85,47,0.14)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  paisX: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  paisTodos: { paddingTop: 12, paddingBottom: 2 },
  paisTodosTxt: { fontSize: 12.5, color: INK3 },
  mapa: { marginHorizontal: -24, marginBottom: 14 },

  cidade: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    borderRadius: 14,
    backgroundColor: ELEV,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cidadeTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  bandeira: { fontSize: 17 },
  cidadeNome: { flex: 1, fontSize: 14.5, fontWeight: '500', color: INK },
  cidadeMeta: { fontFamily: MONO, fontSize: 10.5, color: INK3 },
  seta: { color: INK3, fontSize: 17 },

  lugar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDA,
  },
  lugarNome: { flex: 1, fontSize: 14, color: INK2 },
  lugarNota: { fontFamily: MONO, fontSize: 12, color: AMBAR },
  lugarQuer: { fontFamily: MONO, fontSize: 10, color: INK3, textTransform: 'uppercase', letterSpacing: 0.5 },

  acoes: { marginTop: 22 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDA,
  },
  linhaTxt: { flex: 1, fontSize: 14.5, color: INK },

  email: { fontFamily: MONO, fontSize: 11.5, color: INK3, marginTop: 22 },
});
