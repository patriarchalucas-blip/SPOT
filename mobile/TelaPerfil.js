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
import Svg, { Path } from 'react-native-svg';
import { BASE, SURFACE, INK, INK2, INK3, VERDE, ON_GREEN, PHOTO_EMPTY, FRAUNCES } from './cores';


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
      contentContainerStyle={{ paddingBottom: 120 }}
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

        <View style={e.cabecalho}>
          <Text style={e.secao}>Onde já estive</Text>
        </View>
        <Pressable
          onPress={() => acao('mapa')}
          style={({ pressed }) => [e.mapa, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Abrir o mapa-múndi"
        >
          <View pointerEvents="none">
            <MapaMundi visitados={d.mapa} />
          </View>
        </Pressable>
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
  numeros: { flexDirection: 'row', alignItems: 'flex-end', gap: 28, paddingTop: 24 },
  numItem: { gap: 2, minHeight: 44, justifyContent: 'flex-end' },
  numN: { fontFamily: FRAUNCES, fontSize: 28, lineHeight: 28, letterSpacing: -1.12, color: INK },
  numR: { fontSize: 13, color: INK2 },
  cabecalho: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 32, marginBottom: 14 },
  // .section-title — mesmo título de seção do resto do app. Era monoespacada
  // miúda em caixa alta com tracking, que é o rótulo de "app gerado".
  secao: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, color: INK },
  secaoSub: { fontSize: 14, color: INK2 },
  aviso: { fontSize: 14, color: INK2, lineHeight: 20 },
  paises: { fontSize: 14, color: INK2, lineHeight: 21 },
  paisesLista: { marginTop: 2 },
  // .country-row: linha sem divisor. O que separa é o espaço.
  pais: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  paisBandeira: { fontSize: 20 },
  paisNome: { flex: 1, fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: INK },
  paisConta: { fontSize: 13, color: INK2 },
  // "mora aqui" perdeu a pílula colorida e virou o próprio verde do sistema.
  // A pílula terracota era o que mais saltava da paleta velha nesta tela.
  paisCasa: { fontSize: 13, fontWeight: '600', color: VERDE },
  paisX: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  paisTodos: { paddingTop: 14, paddingBottom: 2 },
  paisTodosTxt: { fontSize: 14, fontWeight: '600', color: VERDE },
  mapa: { marginHorizontal: -20, marginBottom: 14 },

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
