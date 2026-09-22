// Tela de Amigos — NATIVA.
//
// Primeira tela do app que deixa de ser HTML. É a mais visível do Spot e a
// que o revisor da App Store abre pra conferir denúncia e bloqueio, então é
// onde "isso é um aplicativo, não um site" precisa aparecer primeiro.
//
// DE ONDE VÊM OS DADOS
//
// Do próprio site, por mensagem, já prontos pra desenhar (ver
// darDadosDeAmigos no index.html). A divisão é deliberada:
//
//   o site  — as REGRAS: quem está bloqueado, o que entra no feed, em que
//             ordem, o que já está na sua lista.
//   aqui    — só o DESENHO.
//
// Duplicar as regras aqui criaria duas versões do app que discordam uma da
// outra na primeira mudança. Quando a camada de dados for pra nativo, esta
// tela não muda: ela já só sabe desenhar.
//
// Nada que chega daqui é HTML — só texto e números.
//
// A REGRA VISUAL: TEM QUE FICAR IDÊNTICA
// Todo valor veio do CSS do site (.am-topo, .am-abas, .fd-card, .feed-item,
// .friend-row, .req-card), não foi escolhido de novo.

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
import Svg, { Circle, Path } from 'react-native-svg';
import { INK, INK2, INK3, ESCURO, SUPERFICIE, ELEV, BORDA, TERRA, VERDE, AMBAR, FRAUNCES, MONO } from './cores';

// :root do index.html — não inventar aqui.


// ── peças pequenas ────────────────────────────────────────────────────────

function Avatar({ iniciais, tamanho = 38 }) {
  return (
    <View style={[e.avatar, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}>
      <Text style={[e.avatarTxt, { fontSize: tamanho * 0.37 }]}>{iniciais}</Text>
    </View>
  );
}

// Mesma estrela do site: cheia em âmbar, vazia com traço fino.
function Estrelas({ n, tamanho = 14 }) {
  if (!n) return null;
  const d = 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8z';
  return (
    <View style={e.estrelas}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Svg key={i} width={tamanho} height={tamanho} viewBox="0 0 24 24">
          {i <= n ? (
            <Path d={d} fill={AMBAR} />
          ) : (
            <Path d={d} fill="none" stroke="rgba(234,231,224,.3)" strokeWidth={1.6} strokeLinejoin="round" />
          )}
        </Svg>
      ))}
    </View>
  );
}

function IconePessoas({ cor = INK3, tamanho = 30 }) {
  const c = { stroke: cor, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      <Circle cx="9" cy="8.5" r="3" {...c} />
      <Path d="M3.8 19a5.2 5.2 0 0 1 10.4 0" {...c} />
      <Path d="M16 6.2a3 3 0 0 1 0 5.6" {...c} />
      <Path d="M17.2 14.4a5.2 5.2 0 0 1 3 4.6" {...c} />
    </Svg>
  );
}

function BotaoAdicionar({ onPress }) {
  const c = { stroke: INK, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [e.adicionar, pressed && { transform: [{ scale: 0.94 }] }]}
      accessibilityRole="button"
      accessibilityLabel="Adicionar amigo"
      hitSlop={8}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx="10" cy="8" r="3.4" {...c} />
        <Path d="M3.5 20c0-3.6 2.9-6 6.5-6 1.4 0 2.7.36 3.7 1" {...c} />
        <Path d="M18 14v6M15 17h6" {...c} />
      </Svg>
    </Pressable>
  );
}

function Vazio({ titulo, texto }) {
  return (
    <View style={e.vazio}>
      <IconePessoas />
      <Text style={e.vazioTitulo}>{titulo}</Text>
      <Text style={e.vazioTexto}>{texto}</Text>
    </View>
  );
}

// ── card de visita ────────────────────────────────────────────────────────
// O degradê da categoria fica SEMPRE no fundo e a foto entra por cima. Mesma
// razão do site: endereço de foto do Google expira, e quando a imagem falha o
// que aparece é o degradê, não um retângulo chapado.

function CardDeVisita({ item, aoAbrir, aoSalvar, salvando }) {
  const [falhou, setFalhou] = React.useState(false);
  const [c1, c2] = item.cores || [ELEV, ESCURO];
  const temCorpo = item.nota || item.estrelas || !item.salvo;
  // Sem estrelas, a linha ficava com um filho so e o botao encostava na
  // esquerda. A web resolve com um vao vazio; aqui e o mesmo.
  const semEstrelas = !item.estrelas;

  return (
    <View style={e.card}>
      <Pressable onPress={aoAbrir} style={[e.cardImg, { backgroundColor: c1 }]}>
        {/* duas faixas de cor no lugar do degradê do CSS: sem biblioteca de
            gradiente, e a foto cobre isso quase sempre */}
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
        {/* O mesmo escurecimento da web, que nasceu de um caso real de foto
            clara: sem ele o nome do lugar e o do amigo somem. */}
        <View style={e.veu1} pointerEvents="none" />
        <View style={e.veu2} pointerEvents="none" />
        <View style={e.veu3} pointerEvents="none" />

        <View style={e.quem}>
          <View style={e.quemAv}>
            <Text style={e.quemAvTxt}>{item.quem.iniciais}</Text>
          </View>
          <Text style={e.quemTxt} numberOfLines={1}>
            {/* "salvou", nao "foi": o app sabe quando o spot foi registrado,
                nao quando a visita aconteceu — ver o mesmo card no index.html. */}
            <Text style={e.forte}>{item.quem.nome}</Text> salvou
          </Text>
        </View>

        <Text style={e.quando}>{item.quando}</Text>

        <View style={e.cardPe}>
          {item.rotulo ? <Text style={e.cardK}>{item.rotulo}</Text> : null}
          <Text style={e.cardNome} numberOfLines={2}>{item.lugar}</Text>
        </View>
      </Pressable>

      {temCorpo ? (
        <View style={e.cardCorpo}>
          {item.nota ? (
            <Pressable onPress={aoAbrir}>
              <Text style={e.cardNota}>{'“' + item.nota + '”'}</Text>
            </Pressable>
          ) : null}
          <View style={e.cardLinha}>
            {semEstrelas ? <View /> : <Estrelas n={item.estrelas} />}
            {item.salvo ? (
              <Text style={e.jaSalvo}>na sua lista</Text>
            ) : (
              <Pressable
                onPress={salvando ? undefined : aoSalvar}
                style={({ pressed }) => [e.salvar, (pressed || salvando) && { opacity: 0.6 }]}
                accessibilityRole="button"
              >
                {/* Salvar pode ir ate o Google pra descobrir o pais. Sem este
                    aviso o toque parece morto e a pessoa toca de novo. */}
                <Text style={e.salvarTxt}>{salvando ? 'Adicionando...' : '+ minha lista'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── tela ──────────────────────────────────────────────────────────────────

export default function TelaAmigos({ dados, ocupado, acao }) {
  const margem = useSafeAreaInsets();

  if (!dados) {
    return (
      <View style={[e.fundo, e.centro]}>
        <ActivityIndicator size="large" color={TERRA} />
      </View>
    );
  }

  const { aba, abas, feed, recebidos, enviados, amigos } = dados;

  return (
    <View style={e.fundo}>
      <View style={[e.topo, { paddingTop: 26 + margem.top }]}>
        <Text style={e.titulo}>Amigos</Text>
        <BotaoAdicionar onPress={() => acao('adicionar')} />
      </View>

      <View style={e.abas}>
        {abas.map((a) => {
          const on = a.id === aba;
          return (
            <Pressable
              key={a.id}
              onPress={() => acao('aba', a.id)}
              style={[e.abaBotao, on && e.abaBotaoOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[e.abaTxt, on && e.abaTxtOn]}>{a.rotulo}</Text>
              {a.n ? (
                <View style={e.selo}>
                  <Text style={e.seloTxt}>{a.n}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={e.corpo}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={!!ocupado} onRefresh={() => acao('recarregar')} tintColor={INK3} />
        }
      >
        {aba === 'pedidos' ? (
          <>
            {!recebidos.length && !enviados.length ? (
              <Vazio titulo="Nenhum pedido" texto="Pedidos recebidos e enviados aparecem aqui" />
            ) : null}
            {recebidos.length ? <Text style={e.secao}>Recebidos</Text> : null}
            {recebidos.map((p) => (
              <View key={p.pedido} style={e.reqCard}>
                <Avatar iniciais={p.iniciais} />
                <Text style={e.reqNome} numberOfLines={1}>{p.nome}</Text>
                <Pressable onPress={() => acao('recusar', p.pedido)} style={[e.reqBotao, e.reqRecusar]}>
                  <Text style={e.reqRecusarTxt}>Recusar</Text>
                </Pressable>
                <Pressable onPress={() => acao('aceitar', p.pedido)} style={[e.reqBotao, e.reqAceitar]}>
                  <Text style={e.reqAceitarTxt}>Aceitar</Text>
                </Pressable>
              </View>
            ))}
            {enviados.length ? (
              <Text style={[e.secao, recebidos.length ? { marginTop: 24 } : null]}>Enviados</Text>
            ) : null}
            {enviados.map((p) => (
              <View key={p.pedido} style={e.reqCard}>
                <Avatar iniciais={p.iniciais} />
                <Text style={e.reqNome} numberOfLines={1}>{p.nome}</Text>
                <Pressable onPress={() => acao('cancelar', p.pedido)} style={[e.reqBotao, e.reqRecusar]}>
                  <Text style={e.reqRecusarTxt}>Cancelar</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : aba === 'amigos' ? (
          !amigos.length ? (
            <Vazio titulo="Sem amigos ainda" texto="Toca no + pra adicionar um amigo pelo nome" />
          ) : (
            amigos.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => acao('perfil', p.id)}
                style={({ pressed }) => [e.linhaAmigo, pressed && { opacity: 0.7 }]}
              >
                <Avatar iniciais={p.iniciais} />
                <Text style={e.linhaNome} numberOfLines={1}>{p.nome}</Text>
                {p.username ? <Text style={e.linhaUser}>@{p.username}</Text> : null}
                <Text style={e.seta}>{'›'}</Text>
              </Pressable>
            ))
          )
        ) : !amigos.length ? (
          <Vazio titulo="Sem amigos ainda" texto="Adiciona alguém pelo username pra ver a atividade aqui" />
        ) : !feed.length ? (
          <Vazio titulo="Nada por aqui ainda" texto="Seus amigos ainda não marcaram viagens nem lugares" />
        ) : (
          feed.map((it) =>
            it.tipo === 'visita' ? (
              <CardDeVisita
                key={it.i}
                item={it}
                aoAbrir={() => acao('abrirVisita', it.i)}
                aoSalvar={() => acao('salvar', it.i)}
                salvando={dados.salvando === it.i}
              />
            ) : (
              <Pressable
                key={it.i}
                onPress={() => acao('perfil', it.quem.id)}
                style={({ pressed }) => [e.feedItem, pressed && { opacity: 0.7 }]}
              >
                <Avatar iniciais={it.quem.iniciais} />
                <View style={{ flex: 1 }}>
                  <Text style={e.feedTexto}>
                    {(it.partes || []).map((p, k) => (
                      <Text key={k} style={p.forte ? e.forte : null}>{p.t}</Text>
                    ))}
                  </Text>
                  <Text style={e.feedHora}>{it.quando}</Text>
                </View>
              </Pressable>
            )
          )
        )}
      </ScrollView>
    </View>
  );
}

const e = StyleSheet.create({
  // No site esta tela usa a cor de PAINEL (#101C24), nao a de fundo geral.
  // Com o escuro, o contraste entre card e fundo ficava menor que o da web.
  fundo: { flex: 1, backgroundColor: SUPERFICIE },
  centro: { alignItems: 'center', justifyContent: 'center' },

  // .am-topo / .am-titulo / .am-add
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 24,
  },
  titulo: { fontFamily: FRAUNCES, fontWeight: '400', fontSize: 30, color: INK, letterSpacing: -0.3 },
  adicionar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(234,231,224,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // .am-abas
  abas: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(234,231,224,0.06)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginTop: 18,
  },
  abaBotao: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  abaBotaoOn: { backgroundColor: ELEV },
  abaTxt: { fontSize: 13, fontWeight: '500', color: INK3 },
  abaTxtOn: { fontWeight: '600', color: INK },
  selo: { backgroundColor: TERRA, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  seloTxt: { fontFamily: MONO, fontSize: 10, color: '#fff' },

  corpo: { flex: 1, paddingHorizontal: 24 },

  avatar: { backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: ESCURO, fontWeight: '600' },
  forte: { fontWeight: '600', color: INK },

  // .feed-item
  feedItem: {
    flexDirection: 'row',
    gap: 13,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDA,
    alignItems: 'flex-start',
  },
  feedTexto: { fontSize: 14, color: INK2, lineHeight: 20 },
  feedHora: { fontSize: 12, color: INK3, marginTop: 4 },

  // .fd-card
  card: {
    borderRadius: 20,
    backgroundColor: ELEV,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    overflow: 'hidden',
    marginBottom: 14,
  },
  // Degrade da web em tres faixas: rgba(11,22,32,.45) no topo -> .88 no pe.
  veu1: { position: 'absolute', left: 0, right: 0, top: 0, height: '40%', backgroundColor: 'rgba(11,22,32,0.45)' },
  veu2: { position: 'absolute', left: 0, right: 0, top: '40%', height: '32%', backgroundColor: 'rgba(11,22,32,0.66)' },
  veu3: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '28%', backgroundColor: 'rgba(11,22,32,0.86)' },
  cardImg: { height: 186, overflow: 'hidden' },
  metadeDeBaixo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.9 },
  quem: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(11,22,32,0.55)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: '70%',
  },
  quemAv: { width: 24, height: 24, borderRadius: 12, backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' },
  quemAvTxt: { fontFamily: MONO, fontSize: 9, color: '#cfe9e6' },
  quemTxt: { fontSize: 12.5, color: INK, flexShrink: 1 },
  quando: { position: 'absolute', top: 19, right: 14, zIndex: 3, fontFamily: MONO, fontSize: 10, color: INK2 },
  cardPe: { position: 'absolute', left: 16, right: 16, bottom: 14, zIndex: 3 },
  cardK: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: INK2, },
  cardNome: { fontFamily: FRAUNCES, fontWeight: '400', fontSize: 25, color: '#fff', marginTop: 4, lineHeight: 27 },
  cardCorpo: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 15 },
  cardNota: { fontFamily: FRAUNCES, fontStyle: 'italic', fontSize: 16.5, lineHeight: 23, color: INK },
  cardLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 13 },
  estrelas: { flexDirection: 'row', gap: 3 },
  salvar: { minHeight: 36, backgroundColor: TERRA, borderRadius: 999, paddingHorizontal: 15, justifyContent: 'center' },
  salvarTxt: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  // Pastilha verde, como no site: era texto cinza solto e sumia ao lado do
  // botao laranja de salvar.
  jaSalvo: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#8FD3CE',
    backgroundColor: 'rgba(78,148,144,0.24)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(78,148,144,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },

  // .friend-row
  linhaAmigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDA,
  },
  linhaNome: { flex: 1, fontSize: 14.5, fontWeight: '500', color: INK },
  linhaUser: { fontFamily: MONO, fontSize: 11.5, color: INK3 },
  seta: { color: INK3, fontSize: 18 },

  // .req-card
  secao: { fontSize: 13, fontWeight: '600', color: INK2, marginBottom: 10 },
  reqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: ELEV,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDA,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  reqNome: { flex: 1, fontSize: 14.5, fontWeight: '600', color: INK },
  reqBotao: { borderRadius: 9, paddingVertical: 9, paddingHorizontal: 13, minHeight: 36, justifyContent: 'center' },
  reqAceitar: { backgroundColor: TERRA },
  reqAceitarTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  reqRecusar: { backgroundColor: 'rgba(234,231,224,0.07)' },
  reqRecusarTxt: { color: INK3, fontSize: 13, fontWeight: '600' },

  vazio: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  vazioTitulo: { fontFamily: FRAUNCES, fontSize: 19, color: INK, marginTop: 6 },
  vazioTexto: { fontSize: 14, color: INK3, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
});
