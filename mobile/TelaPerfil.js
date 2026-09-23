// Tela de Perfil — NATIVA.
//
// Quarta e última aba a deixar de ser HTML. Mesma divisão das outras: o site
// tem as regras (a ordenação da estante, a média por cidade, o que conta como
// visitado), aqui é só o desenho.
//
// O MAPA SAIU DAQUI em 22/09/2026, e com ele a lista de países. Eles eram a
// seção "Onde já estive" — que é exatamente a metade de cima da tela inicial,
// a primeira coisa que a pessoa vê ao abrir o app. Duas telas em quatro
// mostravam o mesmo mapa, e o Perfil virou eco do Início. No lugar entrou "O
// que eu achei": as notas que a pessoa escreveu, que só existem aqui. A
// contagem de países continua acima, e abre a lista inteira num toque.
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
import Svg, { Path } from 'react-native-svg';
import { BASE, SURFACE, INK, INK2, INK3, VERDE, ON_GREEN, PHOTO_EMPTY, FRAUNCES } from './cores';
import { folgaDeRolagem } from './BarraDeAbas';


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

// A estrela cheia pela metade, igual à da aba Amigos: duas empilhadas, e a
// de cima cortada na largura da fatia. É o que dá conta do x,5 da migração 020.
function Estrelas({ n, tamanho = 13 }) {
  if (!n) return null;
  const d = 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8z';
  return (
    <View style={e.estrelas}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fatia = Math.max(0, Math.min(1, n - (i - 1)));
        return (
          <View key={i} style={{ width: tamanho, height: tamanho }}>
            <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24"><Path d={d} fill={INK3} /></Svg>
            {fatia > 0 ? (
              <View style={[e.estrelaCheia, { width: tamanho * fatia }]} pointerEvents="none">
                <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24"><Path d={d} fill={VERDE} /></Svg>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// A ESTANTE — quatro fotos lado a lado, os lugares que você mais gostou.
// É o que o Perfil passa a ser: os três contadores diziam quanto você viajou,
// e nada dizia COMO você viaja. Quatro capas dizem isso num segundo.
//
// A nota fica sobre a foto, no canto de baixo, e o nome embaixo dela — em duas
// linhas, porque nome de restaurante não cabe em 82 de largura.
function Estante({ itens, acao }) {
  return (
    <View style={e.estante}>
      {itens.map((f) => (
        <Pressable
          key={f.id}
          onPress={() => acao('lugar', f.id)}
          style={({ pressed }) => [e.favItem, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={f.nome}
        >
          <View style={e.favFoto}>
            {f.foto ? <Image source={{ uri: f.foto }} style={StyleSheet.absoluteFill} /> : null}
            <View style={e.favVeu} pointerEvents="none" />
            <Text style={e.favNota}>{f.nota}</Text>
          </View>
          <Text style={e.favNome} numberOfLines={2}>{f.nome}</Text>
        </Pressable>
      ))}
      {/* Com menos de quatro, o que falta vira espaço vazio e não estica os
          que existem: três fotos gordas não são uma estante. */}
      {Array.from({ length: Math.max(0, 4 - itens.length) }).map((_, i) => (
        <View key={'v' + i} style={e.favItem} />
      ))}
    </View>
  );
}

// Uma nota sua: foto pequena, nome, cidade, estrelas e o texto que você
// escreveu. O texto é o assunto — por isso ele vem em 15 e em INK, e o resto
// em 13 e cinza. Três linhas no máximo: quem quiser o resto toca e abre a
// ficha do lugar, que é onde a nota vive inteira.
//
// Sem texto a linha fecha na foto e nas estrelas, e não sobra espaço em
// branco: nota com estrela e sem palavra é o caso comum.
function Nota({ n, acao }) {
  const [falhou, setFalhou] = React.useState(false);
  return (
    <Pressable
      onPress={() => acao('lugar', n.id)}
      style={({ pressed }) => [e.nota, !n.texto && e.notaSeca, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={n.nome}
    >
      <View style={e.notaTopo}>
        {n.foto && !falhou ? (
          <Image source={{ uri: n.foto }} style={e.notaFoto} onError={() => setFalhou(true)} />
        ) : (
          <View style={e.notaFoto} />
        )}
        <View style={e.notaCab}>
          <Text style={e.notaNome} numberOfLines={1}>{n.nome}</Text>
          <View style={e.notaMetaLinha}>
            <Estrelas n={n.estrelas} />
            {n.cidade ? <Text style={e.notaCidade} numberOfLines={1}>{n.cidade}</Text> : null}
          </View>
        </View>
      </View>
      {n.texto ? <Text style={e.notaTexto} numberOfLines={3}>{n.texto}</Text> : null}
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

// O MOSAICO de "Meus spots", igual ao da web: a primeira cidade ocupa a
// largura inteira e as outras vêm em pares. Era uma sanfona de cidades — linha
// com seta que abria a lista de lugares dentro da própria tela. A sanfona é
// controle de site, e escondia a única coisa que faz alguém querer olhar essa
// seção: a foto do lugar.
function Mosaico({ itens, acao }) {
  const pares = [];
  for (let i = 1; i < itens.length; i += 2) pares.push(itens.slice(i, i + 2));
  return (
    <View>
      {itens.length ? <Peca item={itens[0]} grande acao={acao} /> : null}
      {pares.map((par, k) => (
        <View key={k} style={e.mosLinha}>
          {par.map((it) => <Peca key={it.i} item={it} acao={acao} />)}
          {par.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function Peca({ item, grande, acao }) {
  const [falhou, setFalhou] = React.useState(false);
  return (
    <Pressable
      onPress={() => acao('cidadeMosaico', item.i)}
      style={({ pressed }) => [e.peca, grande ? e.pecaGrande : { flex: 1 }, pressed && { opacity: 0.9 }]}
    >
      {item.foto && !falhou ? (
        <Image
          source={{ uri: item.foto }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFalhou(true)}
        />
      ) : null}
      {/* O degradê do site em três faixas: existe pro nome da cidade
          sobreviver a foto clara, e nada além disso. */}
      <View style={e.veu1} pointerEvents="none" />
      <View style={e.veu2} pointerEvents="none" />
      <View style={e.veu3} pointerEvents="none" />
      <View style={e.pecaPe}>
        <Text style={[e.pecaNome, grande && e.pecaNomeGrande]} numberOfLines={2}>{item.cidade}</Text>
        <Text style={e.pecaMeta}>{item.meta}</Text>
      </View>
    </Pressable>
  );
}

export default function TelaPerfil({ dados, ocupado, acao }) {
  const margem = useSafeAreaInsets();

  if (!dados) {
    return (
      <View style={[e.fundo, e.centro]}>
        <ActivityIndicator size="large" color={VERDE} />
      </View>
    );
  }

  const d = dados;

  return (
    <ScrollView
      style={e.fundo}
      contentContainerStyle={{ paddingBottom: folgaDeRolagem(margem.bottom) }}
      refreshControl={
        <RefreshControl refreshing={!!ocupado} onRefresh={() => acao('recarregar')} tintColor={INK3} />
      }
    >
      {/* Uma linha só pra "Perfil" e a engrenagem, e o bloco de identidade
          embaixo — avatar EM CIMA, nome embaixo. Ao lado do avatar o nome
          nunca passaria de 20px; sozinho ele sai em 34 e vira o assunto da
          tela, que é o que ele é. */}
      <View style={[e.topoLinha, { paddingTop: 18 + margem.top }]}>
        <Text style={e.marca}>Perfil</Text>
        <Pressable
          onPress={() => acao('config')}
          style={({ pressed }) => [e.config, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
        >
          <Icone nome="gear" cor={INK} tamanho={20} />
        </Pressable>
      </View>

      <View style={e.ident}>
        <Pressable onPress={() => acao('foto')} style={e.avatarWrap}>
          {d.avatar ? (
            <Image source={{ uri: d.avatar }} style={e.avatar} />
          ) : (
            <View style={e.avatar}>
              <Text style={e.avatarTxt}>{d.inicial}</Text>
            </View>
          )}
          <View style={e.selo}>
            <Icone nome="edit" cor={INK} tamanho={13} />
          </View>
        </Pressable>
        <Text style={e.nome} numberOfLines={2}>{d.nome}</Text>
        {/* @usuário e bio na MESMA linha: eram dois blocos de texto cinza
            empilhados, e a bio raramente passa de meia linha. */}
        {d.username || d.bio ? (
          <Text style={e.sub}>
            {d.username ? '@' + d.username : ''}
            {d.username && d.bio ? ' · ' : ''}
            {d.bio || ''}
          </Text>
        ) : null}
      </View>

      {/* A ORDEM MUDOU, e e o miolo do conserto. Antes: identidade, lista de
          lugares, mapa, paises, duas acoes e o email solto no fim — seis
          blocos do mesmo peso, um atras do outro, sem dizer qual era o
          assunto da tela.

          Agora a tela responde uma pergunta por vez, na ordem em que ela e
          feita: QUEM E VOCE (nome, bio, o resumo em numeros) -> ONDE VOCE JA
          FOI (mapa e paises, que e a identidade de quem viaja) -> O QUE VOCE
          GUARDOU (os lugares, que e arquivo e por isso vem depois) -> o que
          da pra FAZER aqui.

          O email saiu: ele ja esta em Configuracoes, e no perfil so ocupava
          a ultima linha sem ninguem nunca precisar dele. */}
      <View style={e.corpo}>
        {/* Os TRÊS números, no mesmo tamanho da web. Eram uma linha de legenda
            em monoespacada miúda — a mesma conta, ilegível. Cada um abre a
            Lista filtrada, igual ao placar da tela inicial. */}
        {d.numeros && d.numeros.length ? (
          <View style={e.numeros}>
            {d.numeros.map((b) => (
              <Pressable
                key={b.modo}
                onPress={() => acao('lista', b.modo)}
                style={({ pressed }) => [e.numItem, pressed && { opacity: 0.6 }]}
              >
                <Text style={e.numN}>{b.n}</Text>
                <Text style={e.numR}>{b.rotulo}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* O QUE VOCÊ ESCREVEU vem primeiro, e é a razão desta aba existir.
            O mapa-múndi ficava aqui e SAIU: ele já é a metade de cima da tela
            inicial, e ver o mesmo mapa duas vezes no mesmo app não acrescenta
            nada. A lista de países foi junto pelo mesmo motivo — o número de
            países continua logo acima, e abre a lista inteira num toque. */}
        {d.favoritos && d.favoritos.length ? (
          <>
            <View style={e.cabecalho}>
              <Text style={e.secao}>Meus favoritos</Text>
              <Text style={e.secaoSub}>o que eu mais gostei</Text>
            </View>
            <Estante itens={d.favoritos} acao={acao} />
          </>
        ) : null}

        {d.notas && d.notas.length ? (
          <>
            <View style={[e.cabecalho, { marginTop: 32 }]}>
              <Text style={e.secao}>{d.notasTitulo || 'Últimas notas'}</Text>
            </View>
            {d.notas.map((n) => <Nota key={n.id} n={n} acao={acao} />)}
            {d.notasTotal > d.notas.length ? (
              <Pressable
                onPress={() => acao('lista', 'spots')}
                style={({ pressed }) => [e.verTodas, pressed && { opacity: 0.6 }]}
              >
                <Text style={e.verTodasTxt}>{'Ver todas as ' + d.notasTotal + ' notas'}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <View style={[e.cabecalho, { marginTop: 32 }]}>
          <Text style={e.secao}>Meus spots</Text>
          {d.resumo ? <Text style={e.secaoSub}>{d.resumo}</Text> : null}
        </View>
        {!(d.mosaico && d.mosaico.length) ? (
          <Text style={e.aviso}>
            Os spots que você salvar aparecem aqui, por cidade.
          </Text>
        ) : (
          <>
            <Mosaico itens={d.mosaico} acao={acao} />
            {d.cidadesTotal > d.mosaico.length ? (
              <Pressable
                onPress={() => acao('lista', 'cities')}
                style={({ pressed }) => [e.verTodas, pressed && { opacity: 0.6 }]}
              >
                <Text style={e.verTodasTxt}>{'Ver todas as ' + d.cidadesTotal + ' cidades'}</Text>
              </Pressable>
            ) : null}
          </>
        )}

        <View style={e.acoes}>
          <Linha icone="globe" texto="Marcar país que já visitei" onPress={() => acao('visitado')} />
          <Linha icone="pin" texto="Marcar país onde moro" onPress={() => acao('moro')} />
        </View>
      </View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: BASE },
  centro: { alignItems: 'center', justifyContent: 'center' },

  topoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  marca: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, color: INK },
  config: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ident: { paddingHorizontal: 20, paddingTop: 20 },
  // Quadrado arredondado de 88, não círculo de 62: o círculo com o lápis
  // pendurado no canto é o avatar de rede social genérico.
  avatarWrap: { width: 88, height: 88, marginBottom: 14 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: VERDE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTxt: { fontSize: 30, color: ON_GREEN, fontWeight: '600' },
  // O selo é superfície com ícone de tinta — era terracota com ícone branco, e
  // a terracota saiu do app. A borda de 3 na cor do fundo não é contorno: é o
  // recorte que descola o selo do avatar.
  selo: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: BASE,
  },
  nome: { fontFamily: FRAUNCES, fontSize: 34, lineHeight: 36, color: INK, letterSpacing: -1.36 },
  sub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: INK2 },

  corpo: { paddingHorizontal: 20, paddingTop: 0 },
  // .prof-numeros — três números grandes, cada um abre a Lista filtrada.
  // Gap 20, não 28: entrou um quarto número (amigos) e a 28 a linha estourava
  // a largura assim que a contagem de spots passa de dois dígitos.
  numeros: { flexDirection: 'row', alignItems: 'flex-end', gap: 20, paddingTop: 24 },
  numItem: { gap: 2, minHeight: 44, justifyContent: 'flex-end' },
  numN: { fontFamily: FRAUNCES, fontSize: 28, lineHeight: 28, letterSpacing: -1.12, color: INK },
  numR: { fontSize: 13, color: INK2 },
  cabecalho: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 32, marginBottom: 14 },
  // .section-title — mesmo título de seção do resto do app. Era monoespacada
  // miúda em caixa alta com tracking, que é o rótulo de "app gerado".
  secao: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, color: INK },
  secaoSub: { fontSize: 14, color: INK2 },
  aviso: { fontSize: 14, color: INK2, lineHeight: 20 },

  // Quatro colunas iguais. O `flex:1` com gap 8 resolve a largura em qualquer
  // aparelho — 82 num iPhone comum — sem número escrito na mão.
  estante: { flexDirection: 'row', gap: 8 },
  favItem: { flex: 1 },
  favFoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: PHOTO_EMPTY,
    justifyContent: 'flex-end',
  },
  // Uma faixa só, não as três de sempre: aqui embaixo fica um número curto,
  // não um nome comprido, e três faixas num quadrado de 82 viram mancha.
  favVeu: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', backgroundColor: 'rgba(0,0,0,0.38)' },
  favNota: { paddingLeft: 8, paddingBottom: 6, fontSize: 13, fontWeight: '700', color: '#fff' },
  favNome: { marginTop: 6, fontSize: 12, lineHeight: 15, color: INK2 },

  // Uma nota sua. Sem card e sem divisor, como o resto do app: o que separa
  // uma da outra é o espaço de 22 embaixo.
  nota: { paddingBottom: 22 },
  // Sem texto, o 22 vira buraco: a linha acaba na foto e o olho lê o vazio
  // como fim da seção.
  notaSeca: { paddingBottom: 14 },
  notaTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Foto de 52, menor que os 64 da linha de lista: aqui ela é referência, e
  // o assunto é o texto embaixo.
  notaFoto: { width: 52, height: 52, borderRadius: 14, backgroundColor: PHOTO_EMPTY },
  notaCab: { flex: 1, minWidth: 0, gap: 3 },
  notaNome: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: INK },
  notaMetaLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notaCidade: { flex: 1, fontSize: 13, color: INK2 },
  notaTexto: { marginTop: 10, fontSize: 15, lineHeight: 21, color: INK },
  estrelas: { flexDirection: 'row', gap: 2 },
  estrelaCheia: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },

  // .est-mosaico — a primeira peça ocupa as duas colunas.
  mosLinha: { flexDirection: 'row', gap: 8, marginTop: 8 },
  peca: { height: 150, borderRadius: 18, overflow: 'hidden', backgroundColor: PHOTO_EMPTY },
  pecaGrande: { height: 180 },
  veu1: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%', backgroundColor: 'rgba(0,0,0,0.42)' },
  veu2: { position: 'absolute', left: 0, right: 0, bottom: '18%', height: '15%', backgroundColor: 'rgba(0,0,0,0.26)' },
  veu3: { position: 'absolute', left: 0, right: 0, bottom: '33%', height: '12%', backgroundColor: 'rgba(0,0,0,0.11)' },
  pecaPe: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  pecaNome: { fontFamily: FRAUNCES, fontSize: 16, lineHeight: 18, letterSpacing: -0.32, color: '#fff' },
  pecaNomeGrande: { fontSize: 22, lineHeight: 25, letterSpacing: -0.66 },
  pecaMeta: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  verTodas: { paddingTop: 14 },
  verTodasTxt: { fontSize: 14, fontWeight: '600', color: VERDE },

  acoes: { marginTop: 32 },
  // .prof-linha — sem divisor.
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 2,
  },
  linhaTxt: { flex: 1, fontSize: 15, color: INK },
  seta: { color: INK3, fontSize: 17 },
});
