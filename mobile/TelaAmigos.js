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
import { BASE, SURFACE, INK, INK2, INK3, VERDE, ON_GREEN, PHOTO_EMPTY, FRAUNCES } from './cores';

// :root do index.html — não inventar aqui.


// ── peças pequenas ────────────────────────────────────────────────────────

function Avatar({ iniciais, tamanho = 38 }) {
  return (
    <View style={[e.avatar, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}>
      <Text style={[e.avatarTxt, { fontSize: tamanho * 0.37 }]}>{iniciais}</Text>
    </View>
  );
}

// Mesma estrela do site: DUAS empilhadas, a de baixo cinza e a de cima verde,
// com a de cima cortada na fração — é assim que meia estrela existe desde a
// migração 020. Sem o corte, 4,5 aparecia como 5 aqui e 4,5 no site.
function Estrelas({ n, tamanho = 14 }) {
  if (!n) return null;
  const d = 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8z';
  return (
    <View style={e.estrelas}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fatia = Math.max(0, Math.min(1, n - (i - 1)));
        return (
          <View key={i} style={{ width: tamanho, height: tamanho }}>
            <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
              <Path d={d} fill={INK3} />
            </Svg>
            {fatia > 0 ? (
              <View style={[e.estrelaCheia, { width: tamanho * fatia }]} pointerEvents="none">
                <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
                  <Path d={d} fill={VERDE} />
                </Svg>
              </View>
            ) : null}
          </View>
        );
      })}
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

function CardDeVisita({ item, aoAbrir, aoPerfil, aoSalvar, salvando }) {
  const [falhou, setFalhou] = React.useState(false);
  const [c1, c2] = item.cores || [PHOTO_EMPTY, PHOTO_EMPTY];
  const temCorpo = item.nota || item.estrelas || !item.salvo;
  // Sem estrelas, a linha ficava com um filho so e o botao encostava na
  // esquerda. A web resolve com um vao vazio; aqui e o mesmo.
  const semEstrelas = !item.estrelas;

  return (
    <View style={e.card}>
      {/* O CARD DEIXOU DE SER UMA CAIXA. Quem postou saiu de cima da foto —
          onde era uma pastilha de vidro escuro, o enfeite mais evidente que
          sobrou — e virou linha de texto normal acima dela. O toque aqui abre
          o PERFIL; o da foto e o da nota abrem o SPOT. Dois destinos no mesmo
          card, igual ao site. */}
      <Pressable onPress={aoPerfil} style={({ pressed }) => [e.quem, pressed && { opacity: 0.6 }]}>
        <View style={e.quemAv}>
          <Text style={e.quemAvTxt}>{item.quem.iniciais}</Text>
        </View>
        <Text style={e.quemTxt} numberOfLines={2}>
          {/* "salvou", nao "foi": o app sabe quando o spot foi registrado,
              nao quando a visita aconteceu — ver o mesmo card no index.html. */}
          <Text style={e.forte}>{item.quem.nome}</Text> salvou{' '}
          <Text style={e.forte}>{item.lugar}</Text>
        </Text>
        <Text style={e.quando}>{item.quando}</Text>
      </Pressable>

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
            clara: sem ele o nome do lugar some. */}
        <View style={e.veu1} pointerEvents="none" />
        <View style={e.veu2} pointerEvents="none" />
        <View style={e.veu3} pointerEvents="none" />

        <View style={e.cardPe}>
          {item.rotulo ? <Text style={e.cardK}>{item.rotulo}</Text> : null}
          <Text style={e.cardNome} numberOfLines={2}>{item.lugar}</Text>
        </View>
      </Pressable>

      {temCorpo ? (
        <View style={e.cardCorpo}>
          {item.nota ? (
            <Pressable onPress={aoAbrir}>
              <Text style={e.cardNota}>{item.nota}</Text>
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
        <ActivityIndicator size="large" color={VERDE} />
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
                aoPerfil={() => acao('perfil', it.quem.id)}
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
  // Fundo da PÁGINA, não uma cor de painel à parte: o sistema novo tem uma cor
  // de fundo só, e o que separa bloco de bloco é espaço, não superfície.
  fundo: { flex: 1, backgroundColor: BASE },
  centro: { alignItems: 'center', justifyContent: 'center' },

  // .am-topo / .am-titulo / .am-add
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 20,
  },
  titulo: { fontFamily: FRAUNCES, fontSize: 34, lineHeight: 36, color: INK, letterSpacing: -1.36 },
  adicionar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // .am-abas — ABA DE TEXTO, não segmentado. O trilho com a pastilha
  // deslizante era o segmentado do iOS, e ele saiu do app inteiro: aqui a
  // escolha não é de estado (quero ir / fui), é de assunto.
  abas: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  abaBotao: {
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  abaBotaoOn: { borderBottomWidth: 2, borderBottomColor: INK },
  abaTxt: { fontSize: 15, fontWeight: '600', color: INK3 },
  abaTxtOn: { color: INK },
  selo: { backgroundColor: VERDE, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  seloTxt: { fontSize: 11, fontWeight: '600', color: ON_GREEN },

  // Margem lateral 20 — a do app inteiro. Era 24 aqui e só aqui.
  corpo: { flex: 1, paddingHorizontal: 20 },

  avatar: { backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: ON_GREEN, fontWeight: '600' },
  forte: { fontWeight: '600', color: INK },

  // .feed-item — sem divisor. O que separa uma linha da outra é o espaço.
  feedItem: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  feedTexto: { fontSize: 15, color: INK2, lineHeight: 20 },
  feedHora: { fontSize: 12, color: INK3, marginTop: 4 },

  // .fd-card — NÃO É MAIS UMA CAIXA: sem fundo, sem borda, sem raio próprio.
  // A foto é que tem cantos arredondados; o resto é texto solto na página.
  card: { marginBottom: 28 },
  // O degradê do site (to top, rgba(0,0,0,.55) → transparente em 55%) em três
  // faixas, que é o que dá sem biblioteca de gradiente. Ele existe pro nome do
  // lugar sobreviver a foto clara — nada mais.
  veu1: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%', backgroundColor: 'rgba(0,0,0,0.42)' },
  veu2: { position: 'absolute', left: 0, right: 0, bottom: '18%', height: '15%', backgroundColor: 'rgba(0,0,0,0.26)' },
  veu3: { position: 'absolute', left: 0, right: 0, bottom: '33%', height: '12%', backgroundColor: 'rgba(0,0,0,0.11)' },
  cardImg: { height: 220, marginTop: 10, borderRadius: 18, overflow: 'hidden' },
  metadeDeBaixo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.9 },
  // .fd-quem — linha de texto ACIMA da foto, com 44 de altura mínima porque é
  // alvo de toque (abre o perfil de quem postou).
  quem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  quemAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: VERDE, alignItems: 'center', justifyContent: 'center' },
  quemAvTxt: { fontSize: 12, fontWeight: '600', color: ON_GREEN },
  quemTxt: { flex: 1, fontSize: 15, lineHeight: 20, color: INK2 },
  quando: { fontSize: 12, color: INK3 },
  cardPe: { position: 'absolute', left: 14, right: 14, bottom: 12, zIndex: 3 },
  cardK: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  cardNome: { fontFamily: FRAUNCES, fontSize: 22, lineHeight: 24, letterSpacing: -0.66, color: '#fff', marginTop: 2 },
  cardCorpo: { paddingTop: 12 },
  // A nota do amigo saiu do itálico entre aspas: é o que ele escreveu, não uma
  // citação de livro.
  cardNota: { fontSize: 17, fontWeight: '500', letterSpacing: -0.17, lineHeight: 23, color: INK },
  cardLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  estrelas: { flexDirection: 'row', gap: 3 },
  estrelaCheia: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  salvar: { minHeight: 36, backgroundColor: VERDE, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  salvarTxt: { color: ON_GREEN, fontSize: 14, fontWeight: '600' },
  // Sem pastilha: "na sua lista" não é um botão, é um estado. Texto e ponto.
  jaSalvo: { fontSize: 14, fontWeight: '500', color: INK2 },

  // .friend-row — sem divisor, igual ao resto.
  linhaAmigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  linhaNome: { flex: 1, fontSize: 15, fontWeight: '600', color: INK },
  linhaUser: { fontSize: 13, color: INK2 },
  seta: { color: INK3, fontSize: 17 },

  // .req-card — também deixou de ser caixa.
  secao: { fontSize: 13, fontWeight: '600', color: INK2, marginBottom: 10 },
  reqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  reqNome: { flex: 1, fontSize: 15, fontWeight: '600', color: INK },
  reqBotao: { borderRadius: 10, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  reqAceitar: { backgroundColor: VERDE },
  reqAceitarTxt: { color: ON_GREEN, fontSize: 14, fontWeight: '600' },
  reqRecusar: { backgroundColor: SURFACE },
  reqRecusarTxt: { color: INK, fontSize: 14, fontWeight: '600' },

  vazio: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  vazioTitulo: { fontFamily: FRAUNCES, fontSize: 19, color: INK, marginTop: 6 },
  vazioTexto: { fontSize: 14, color: INK3, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
});
