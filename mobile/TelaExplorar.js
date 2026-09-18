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
  ActivityIndicator,
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
        {/* O mesmo escurecimento que o site poe sobre a foto. Sem ele o nome
            branco de 25px em cima de foto clara fica ilegivel. Tres faixas
            no lugar do degrade do CSS, porque nao temos biblioteca de
            gradiente e a diferenca nao se ve. */}
        <View style={e.veu1} pointerEvents="none" />
        <View style={e.veu2} pointerEvents="none" />
        <View style={e.veu3} pointerEvents="none" />
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
  // A cidade que o site conhece manda ENQUANTO ninguem digitou nada; a partir
  // do primeiro toque no teclado quem manda e o que foi digitado. Antes isto
  // era um efeito que copiava um estado no outro — copia de estado sempre
  // acaba desencontrada, e aqui desenhava duas vezes a toa.
  const [digitado, setDigitado] = React.useState(null);
  const texto = digitado === null ? ((dados && dados.cidade) || '') : digitado;

  const buscar = () => {
    Keyboard.dismiss();
    // Manda mesmo vazio: quem avisa "Digite uma cidade" e o site, e desde
    // que os avisos atravessam a ponte esse aviso aparece aqui tambem.
    acao('buscar', texto.trim());
  };

  const d = dados || { chips: [], itens: [], amigos: [], categoria: 'food' };

  return (
    <View style={e.fundo}>
      <View style={[e.topo, { paddingTop: 26 + margem.top }]}>
        {/* O site tem esta palavra no HTML mas a esconde por CSS. Aqui ela
            aparecia, e o app ficava com uma linha a mais que o site. */}
        <Text style={e.titulo}>Tendências por lugar</Text>
        <View style={e.busca}>
          <View style={e.campo}>
            <IconeBusca />
            <TextInput
              style={e.input}
              value={texto}
              onChangeText={setDigitado}
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
            {/* "2 amigos ja foram · 1 quer ir · Split". Sem esta linha a lista
                nao dizia nem de que cidade estava falando. */}
            {d.resumoAmigos ? <Text style={e.amgTitulo}>{d.resumoAmigos}</Text> : null}
            {d.amigos.map((g) => {
              const partes = [];
              if (g.foram) partes.push(g.foram + (g.foram === 1 ? ' lugar' : ' lugares'));
              // 'na lista' e nao 'querem ir': o selo do lado ja diz 'quer ir',
              // e junto dava "2 querem ir · quer ir". E a web decidiu evitar
              // 'dele/dela' — o app nao sabe o genero de ninguem.
              if (g.querem) partes.push(g.querem + ' na lista');
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

        {/* Cada fim de busca diz uma coisa diferente. Antes existia UM estado
            vazio: quem buscasse e nao achasse nada via a tela de "ainda nao
            busquei", como se o toque nao tivesse feito nada. */}
        {!d.itens.length ? (
          d.estado === 'buscando' ? (
            <View style={e.vazio}>
              <ActivityIndicator color={INK3} />
              <Text style={e.vazioTexto}>Buscando tendências...</Text>
            </View>
          ) : d.estado === 'semResultado' ? (
            <View style={e.vazio}>
              <IconeBusca cor={INK3} />
              <Text style={e.vazioTitulo}>Nada encontrado</Text>
              <Text style={e.vazioTexto}>Tenta um nome de cidade diferente.</Text>
            </View>
          ) : d.estado === 'erro' ? (
            <View style={e.vazio}>
              <IconeBusca cor={INK3} />
              <Text style={e.vazioTitulo}>Erro ao buscar</Text>
              <Text style={e.vazioTexto}>Tenta de novo em alguns segundos.</Text>
            </View>
          ) : (
            <View style={e.vazio}>
              <IconeBusca cor={INK3} />
              <Text style={e.vazioTitulo}>Descubra o que está bombando</Text>
              <Text style={e.vazioTexto}>
                Digite uma cidade pra ver os lugares mais bem avaliados — o
                começo de “patrocinado” chega depois.
              </Text>
            </View>
          )
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

  corpo: { flex: 1, paddingHorizontal: 20 },

  amgTitulo: { fontFamily: MONO, fontSize: 11, letterSpacing: 0.5, color: INK3, marginBottom: 10 },
  // No site este bloco nao e cartao: e lista corrida, e o que separa uma
  // pessoa da outra e um traco fino.
  blocoAmigos: { paddingTop: 4, paddingBottom: 6, marginBottom: 8 },
  avisoAmigos: { fontSize: 13.5, color: INK3, lineHeight: 19, paddingVertical: 10 },
  amgLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDA,
  },
  amgAv: { width: 44, height: 44, borderRadius: 22, backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' },
  amgAvTxt: { fontFamily: MONO, color: '#fff', fontSize: 14 },
  amgNome: { fontSize: 14.5, fontWeight: '600', color: INK },
  amgOnde: { fontFamily: MONO, fontSize: 11, color: INK3, marginTop: 2 },
  jaFoi: { color: VERDE, fontWeight: '600' },
  querIr: { color: AMBAR, fontWeight: '600' },
  seta: { color: INK3, fontSize: 18 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
  },
  chipOn: { backgroundColor: TERRA, borderColor: TERRA },
  // No site estes chips NAO sao monoespacados nem maiusculos: e DM Sans em
  // caixa normal, 12.5px, cor ink2. O que existe de mono e versalete no app
  // e a linguagem de DADO (numeros, datas, rotulos) — um filtro nao e dado.
  chipTxt: { fontSize: 12.5, color: INK2 },
  chipTxtOn: { color: '#fff' },

  card: {
    borderRadius: 20,
    backgroundColor: ELEV,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardImg: { height: 170, overflow: 'hidden' },
  // O degrade do site vai de rgba(11,22,32,.4) no topo a .9 no pe. Tres
  // faixas empilhadas chegam perto o bastante sem biblioteca de gradiente.
  veu1: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%', backgroundColor: 'rgba(11,22,32,0.40)' },
  veu2: { position: 'absolute', left: 0, right: 0, top: '45%', height: '30%', backgroundColor: 'rgba(11,22,32,0.62)' },
  veu3: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '25%', backgroundColor: 'rgba(11,22,32,0.86)' },
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
