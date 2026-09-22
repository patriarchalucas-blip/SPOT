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
import { BASE, SURFACE, INK, INK2, INK3, VERDE, ON_GREEN, PHOTO_EMPTY, FRAUNCES } from './cores';


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
  const [c1, c2] = item.cores || [PHOTO_EMPTY, PHOTO_EMPTY];
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
  fundo: { flex: 1, backgroundColor: BASE },
  // Margem lateral 20, a do app inteiro. Era 24 aqui e só aqui.
  topo: { paddingHorizontal: 20, paddingBottom: 18 },
  titulo: { fontFamily: FRAUNCES, fontSize: 26, lineHeight: 28, color: INK, letterSpacing: -0.39 },

  busca: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 16 },
  // .search-input: superfície, SEM borda. A caixa vazada de 1px era o campo de
  // formulário genérico; aqui o que diz "dá pra digitar" é a superfície.
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: SURFACE,
  },
  input: { flex: 1, color: INK, fontSize: 15, padding: 0 },
  ir: { height: 48, paddingHorizontal: 16, borderRadius: 10, backgroundColor: VERDE, justifyContent: 'center' },
  irTxt: { color: ON_GREEN, fontSize: 14, fontWeight: '600' },

  corpo: { flex: 1, paddingHorizontal: 20 },

  amgTitulo: { fontSize: 13, fontWeight: '600', color: INK2, marginBottom: 10 },
  // Lista corrida, sem cartão e sem divisor: o que separa uma pessoa da outra
  // é o espaço.
  blocoAmigos: { paddingTop: 4, paddingBottom: 6, marginBottom: 8 },
  avisoAmigos: { fontSize: 13.5, color: INK3, lineHeight: 19, paddingVertical: 10 },
  amgLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  amgAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' },
  amgAvTxt: { color: ON_GREEN, fontSize: 14, fontWeight: '600' },
  amgNome: { fontSize: 15, fontWeight: '600', color: INK },
  amgOnde: { fontSize: 13, color: INK2, marginTop: 2 },
  // "já foi" era verde e "quer ir" era âmbar: duas cores pra dizer estado. O
  // acento é um só, então quem carrega a diferença é a palavra.
  jaFoi: { color: VERDE, fontWeight: '600' },
  querIr: { color: INK2, fontWeight: '600' },
  seta: { color: INK3, fontSize: 17 },

  // .filter-chip — ABA DE TEXTO. A pílula preenchida saiu do app inteiro: ela
  // era o acento mais forte da tela só pra dizer como a lista está ordenada.
  chips: { flexDirection: 'row', gap: 18, marginBottom: 16 },
  chip: { paddingTop: 6, paddingBottom: 10 },
  chipOn: { borderBottomWidth: 2, borderBottomColor: INK },
  chipTxt: { fontSize: 15, fontWeight: '600', color: INK3 },
  chipTxtOn: { color: INK },

  // .ex-card — não é mais caixa: sem fundo, sem borda, sem raio próprio. A
  // foto é que tem cantos arredondados.
  card: { marginBottom: 24 },
  cardImg: { height: 200, borderRadius: 18, overflow: 'hidden' },
  // O degradê do site (to top, rgba(0,0,0,.55) → transparente em 55%) em três
  // faixas. Existe pro nome do lugar sobreviver a foto clara, nada mais.
  veu1: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%', backgroundColor: 'rgba(0,0,0,0.42)' },
  veu2: { position: 'absolute', left: 0, right: 0, bottom: '18%', height: '15%', backgroundColor: 'rgba(0,0,0,0.26)' },
  veu3: { position: 'absolute', left: 0, right: 0, bottom: '33%', height: '12%', backgroundColor: 'rgba(0,0,0,0.11)' },
  metadeDeBaixo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.9 },
  selo: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  seloTxt: { fontSize: 13, fontWeight: '600', color: '#fff' },
  seloEstrela: { fontSize: 12, color: '#fff' },
  cardPe: { position: 'absolute', left: 14, right: 14, bottom: 12, zIndex: 3 },
  cardK: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  cardNome: { fontFamily: FRAUNCES, fontSize: 22, lineHeight: 24, letterSpacing: -0.66, color: '#fff', marginTop: 2 },
  cardCorpo: {
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aval: { flex: 1, fontSize: 13, color: INK2, lineHeight: 18 },
  salvar: { minHeight: 36, backgroundColor: VERDE, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  salvarTxt: { color: ON_GREEN, fontSize: 14, fontWeight: '600' },

  credito: { textAlign: 'center', fontSize: 12, color: INK3, paddingVertical: 16 },

  vazio: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  vazioTitulo: { fontFamily: FRAUNCES, fontSize: 19, color: INK, marginTop: 6, textAlign: 'center' },
  vazioTexto: { fontSize: 14, color: INK3, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});
