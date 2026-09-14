// Tela de Explorar — NATIVA.
//
// Segunda tela que deixa de ser HTML. Mesma divisão da de Amigos: o site tem
// as regras (o que o Google devolveu, quais amigos já foram, o que já está na
// sua lista), aqui é só o desenho. Ver TelaAmigos.js pro raciocínio inteiro.
//
// O campo de cidade é o único lugar do app onde o nativo guarda estado que o
// site não conhece: o texto sendo digitado. Ele só atravessa a ponte quando a
// pessoa busca — digitar não pode disparar uma consulta paga a cada letra.
//
// Valores copiados do CSS (.ex-card, .ex-img, .ex-pe, .amg-linha, .chip),
// não escolhidos de novo.

import React from 'react';
import {
  Image,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

function IconeBusca({ cor = INK3 }) {
  const c = { stroke: cor, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="6.5" {...c} />
      <Path d="M16 16l4 4" {...c} />
    </Svg>
  );
}

function CardDeLugar({ item, aoSalvar }) {
  const [falhou, setFalhou] = React.useState(false);
  const [c1, c2] = item.cores || [ELEV, ESCURO];
  return (
    <View style={e.card}>
      <Pressable onPress={aoSalvar} style={e.cardImg}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />
        <View style={[e.metadeDeBaixo, { backgroundColor: c2 }]} />
        {item.foto && !falhou ? (
          <Image
            source={{ uri: item.foto }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setFalhou(true)}
          />
        ) : null}
        {item.nota ? (
          <View style={e.selo}>
            <Text style={e.seloTxt}>{item.nota} </Text>
            <Text style={e.seloEstrela}>★</Text>
          </View>
        ) : null}
        <View style={e.cardPe}>
          {item.local ? <Text style={e.cardK}>{item.local}</Text> : null}
          <Text style={e.cardNome} numberOfLines={2}>{item.lugar}</Text>
        </View>
      </Pressable>
      <View style={e.cardCorpo}>
        <Text style={e.aval} numberOfLines={2}>
          {item.avaliacoes} avaliações no Google
          {item.autor && item.foto && !falhou ? ' · foto de ' + item.autor : ''}
        </Text>
        <Pressable onPress={aoSalvar} style={({ pressed }) => [e.salvar, pressed && { opacity: 0.85 }]}>
          <Text style={e.salvarTxt}>+ minha lista</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function TelaExplorar({ dados, ocupado, acao }) {
  const margem = useSafeAreaInsets();
  const [texto, setTexto] = React.useState('');

  // A cidade que o site conhece manda enquanto ninguém está digitando: assim
  // voltar pra aba não apaga o que já estava buscado.
  React.useEffect(() => {
    if (dados && dados.cidade && !texto) setTexto(dados.cidade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados && dados.cidade]);

  const buscar = () => {
    Keyboard.dismiss();
    if (texto.trim()) acao('buscar', texto.trim());
  };

  const d = dados || { chips: [], itens: [], amigos: [], categoria: 'food' };

  return (
    <View style={e.fundo}>
      <View style={[e.topo, { paddingTop: 26 + margem.top }]}>
        <Text style={e.olho}>Explorar</Text>
        <Text style={e.titulo}>Tendências por lugar</Text>
        <View style={e.busca}>
          <View style={e.campo}>
            <IconeBusca />
            <TextInput
              style={e.input}
              value={texto}
              onChangeText={setTexto}
              placeholder="Buscar cidade..."
              placeholderTextColor={INK3}
              returnKeyType="search"
              onSubmitEditing={buscar}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          <Pressable onPress={buscar} style={({ pressed }) => [e.ir, pressed && { opacity: 0.85 }]}>
            <Text style={e.irTxt}>Ir</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={e.corpo}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={!!ocupado} onRefresh={buscar} tintColor={INK3} />
        }
      >
        {/* Quem dos seus amigos já foi pra cá — vem antes da lista do Google
            de propósito: é a resposta que só o Spot dá. */}
        {d.avisoAmigos ? (
          <View style={e.blocoAmigos}>
            <Text style={e.avisoAmigos}>{d.avisoAmigos}</Text>
          </View>
        ) : null}
        {d.amigos && d.amigos.length ? (
          <View style={e.blocoAmigos}>
            {d.amigos.map((g) => {
              const partes = [];
              if (g.foram) partes.push(g.foram + (g.foram === 1 ? ' lugar' : ' lugares'));
              if (g.querem) partes.push(g.querem + (g.querem === 1 ? ' quer ir' : ' querem ir'));
              return (
                <Pressable
                  key={g.i}
                  onPress={() => acao('amigo', g.i)}
                  style={({ pressed }) => [e.amgLinha, pressed && { opacity: 0.7 }]}
                >
                  <View style={e.amgAv}>
                    <Text style={e.amgAvTxt}>{g.iniciais}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={e.amgNome} numberOfLines={1}>{g.nome}</Text>
                    <Text style={e.amgOnde}>
                      {partes.join(' · ')}
                      {partes.length ? ' · ' : ''}
                      <Text style={g.foram ? e.jaFoi : e.querIr}>{g.foram ? 'já foi' : 'quer ir'}</Text>
                    </Text>
                  </View>
                  <Text style={e.seta}>{'›'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={e.chips}>
          {(d.chips || []).map((c) => {
            const on = c.id === d.categoria;
            return (
              <Pressable
                key={c.id}
                onPress={() => acao('categoria', c.id)}
                style={[e.chip, on && e.chipOn]}
              >
                <Text style={[e.chipTxt, on && e.chipTxtOn]}>{c.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>

        {!d.itens.length ? (
          <View style={e.vazio}>
            <IconeBusca cor={INK3} />
            <Text style={e.vazioTitulo}>Descubra o que está bombando</Text>
            <Text style={e.vazioTexto}>
              Digite uma cidade pra ver os lugares mais bem avaliados.
            </Text>
          </View>
        ) : (
          <>
            {d.itens.map((it) => (
              <CardDeLugar key={it.i} item={it} aoSalvar={() => acao('salvar', it.i)} />
            ))}
            {d.creditoGoogle ? (
              <Text style={e.credito}>Lugares e fotos via Google</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const e = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: ESCURO },
  topo: { paddingHorizontal: 24, paddingBottom: 18 },
  olho: { fontSize: 14, color: INK3, marginBottom: 5 },
  titulo: { fontFamily: FRAUNCES, fontWeight: '400', fontSize: 26, color: INK, letterSpacing: -0.3 },

  busca: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 16 },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(234,231,224,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
  },
  input: { flex: 1, color: INK, fontSize: 15, padding: 0 },
  ir: { height: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: TERRA, justifyContent: 'center' },
  irTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },

  corpo: { flex: 1, paddingHorizontal: 24 },

  blocoAmigos: {
    backgroundColor: ELEV,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
  },
  avisoAmigos: { fontSize: 13.5, color: INK3, lineHeight: 19, paddingVertical: 10 },
  amgLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
  },
  amgAv: { width: 34, height: 34, borderRadius: 17, backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' },
  amgAvTxt: { color: ESCURO, fontWeight: '600', fontSize: 12 },
  amgNome: { fontSize: 14.5, fontWeight: '500', color: INK },
  amgOnde: { fontSize: 12, color: INK3, marginTop: 2 },
  jaFoi: { color: VERDE, fontWeight: '600' },
  querIr: { color: AMBAR, fontWeight: '600' },
  seta: { color: INK3, fontSize: 18 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
  },
  chipOn: { backgroundColor: TERRA, borderColor: TERRA },
  chipTxt: { fontFamily: MONO, fontSize: 11.5, color: INK3, letterSpacing: 0.5, textTransform: 'uppercase' },
  chipTxtOn: { color: '#fff' },

  card: {
    borderRadius: 20,
    backgroundColor: ELEV,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardImg: { height: 186, overflow: 'hidden' },
  metadeDeBaixo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.9 },
  selo: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,22,32,0.55)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  seloTxt: { fontFamily: MONO, fontSize: 11.5, color: INK },
  seloEstrela: { fontSize: 11, color: AMBAR },
  cardPe: { position: 'absolute', left: 16, right: 16, bottom: 14, zIndex: 3 },
  cardK: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: INK2, textTransform: 'uppercase' },
  cardNome: { fontFamily: FRAUNCES, fontWeight: '400', fontSize: 25, color: '#fff', marginTop: 4, lineHeight: 27 },
  cardCorpo: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aval: { flex: 1, fontSize: 12, color: INK3, lineHeight: 17 },
  salvar: { minHeight: 36, backgroundColor: TERRA, borderRadius: 999, paddingHorizontal: 15, justifyContent: 'center' },
  salvarTxt: { color: '#fff', fontSize: 12.5, fontWeight: '600' },

  credito: { textAlign: 'center', fontSize: 11.5, color: INK3, paddingVertical: 16 },

  vazio: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  vazioTitulo: { fontFamily: FRAUNCES, fontSize: 19, color: INK, marginTop: 6, textAlign: 'center' },
  vazioTexto: { fontSize: 14, color: INK3, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});
