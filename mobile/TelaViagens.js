// Tela de Viagens — NATIVA.
//
// Terceira tela que deixa de ser HTML, e a primeira que a pessoa vê ao abrir
// o app. Mesma divisão das outras: o site tem as regras, aqui é só o desenho.
//
// POR QUE ELA FOI REDESENHADA EM 22/09/2026
//
// O site trocou a composição do Início e esta tela ficou pra trás — invisível,
// porque não há como abrir o app nativo na máquina onde ele é escrito. Ela
// ainda tinha o painel de três retângulos escuros, as pílulas coloridas de
// continente e o carrossel de cards, todos aposentados no site. Além disso as
// cores escuras estavam ESCRITAS aqui dentro, então a unificação de `cores.js`
// passou por cima delas sem tocar em nada.
//
// Agora é a composição do site: o mapa como metade de cima da tela, o placar
// num card com o anel, continente como aba de texto, e as viagens em mosaico
// com a primeira ocupando o dobro.
//
// Valores copiados do CSS (.dash-mapa-area, .placar-card, .cont-aba,
// .mosaico, .vg-card, .checkin-banner). Não inventar aqui.

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
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import MapaMundi from './MapaMundi';
import { BASE, SURFACE, INK, INK2, INK3, GREEN, ON_GREEN, MAP_BG, PHOTO_EMPTY } from './cores';
import { folgaDeRolagem } from './BarraDeAbas';

// Mesmo denominador do site. Ver a nota de PAISES_NO_MUNDO no index.html:
// não é o tamanho de COUNTRIES (243), que inclui território não soberano.
const PAISES_NO_MUNDO = 195;

// O anel: um arco sobre um trilho, sem gradiente e sem sombra. O trilho é a
// cor da PÁGINA, então o vazio do anel é o fundo aparecendo por baixo do card.
function Anel({ paises }) {
  const r = 33;
  const volta = 2 * Math.PI * r;
  const fatia = Math.min(1, (Number(paises) || 0) / PAISES_NO_MUNDO);
  const pc = Math.min(100, ((Number(paises) || 0) / PAISES_NO_MUNDO) * 100);
  return (
    <View style={e.anel}>
      <Svg width={76} height={76} viewBox="0 0 76 76">
        {/* girado -90° pra fatia começar no topo, e não às 3 horas */}
        <Circle cx="38" cy="38" r={r} fill="none" stroke={BASE} strokeWidth={7} />
        <Circle
          cx="38" cy="38" r={r} fill="none" stroke={GREEN} strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${volta * fatia} ${volta}`}
          transform="rotate(-90 38 38)"
        />
        {/* O NÚMERO É DESENHO, NÃO TEXTO POR CIMA. Ele era um View absoluto
            sobre o SVG e no iPhone apareceu FORA do círculo, escrito em cima
            do rótulo de baixo. Dentro do próprio desenho não há layout que
            possa errar: x=38 y=38 é o centro, e ponto.
            Sempre inteiro, sem casa decimal: abrir espaço pra vírgula faz o
            número balançar de largura conforme a pessoa viaja. */}
        <SvgText
          x={38} y={38} fill={INK} fontSize={19} fontWeight="700"
          textAnchor="middle" alignmentBaseline="middle"
          // alignmentBaseline não é honrado no Android: o dy de 0,35em é o
          // truque que centra vertical em qualquer um dos dois.
          dy="0.35em"
        >
          {pc ? Math.round(pc) + '%' : '0%'}
        </SvgText>
      </Svg>
    </View>
  );
}

function LinhaDoPlacar({ n, rotulo, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [e.pcItem, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={n + ' ' + rotulo}
    >
      <Text style={e.pcN}>{n}</Text>
      <Text style={e.pcR}>{rotulo}</Text>
      <Text style={e.pcSeta}>›</Text>
    </Pressable>
  );
}

// "Você está no X?" — a faixa que aparece quando o aparelho reconhece um
// lugar por perto. No site ela virou um bloco verde inteiro, e o ícone saiu:
// dentro de um bloco verde ele só repetia que ali tem algo acontecendo.
function FaixaDeCheckin({ nome, acao }) {
  return (
    <View style={e.checkin}>
      <Text style={e.checkinQ} numberOfLines={2}>
        Você está em <Text style={e.checkinNome}>{nome}</Text>?
      </Text>
      <Pressable
        onPress={() => acao('checkinAdd')}
        style={({ pressed }) => [e.checkinAdd, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <Text style={e.checkinAddTxt}>Adicionar</Text>
      </Pressable>
      <Pressable
        onPress={() => acao('checkinIgnorar')}
        hitSlop={6}
        style={({ pressed }) => [e.checkinX, pressed && { opacity: 0.4 }]}
        accessibilityRole="button"
        accessibilityLabel="Ignorar"
      >
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={ON_GREEN} strokeWidth={1.8} strokeLinecap="round" fill="none" />
        </Svg>
      </Pressable>
    </View>
  );
}

function CardDeViagem({ t, grande, altura, aoAbrir }) {
  const [falhou, setFalhou] = React.useState(false);
  return (
    <Pressable
      onPress={aoAbrir}
      style={({ pressed }) => [e.vgCard, { height: altura }, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={t.nome}
    >
      {t.foto && !falhou ? (
        <Image
          source={{ uri: t.foto }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFalhou(true)}
        />
      ) : null}
      {/* O site usa um degradê só (preto .55 embaixo, transparente aos 55%).
          Aqui são três faixas: é a única forma sem arrastar biblioteca de
          gradiente pra dentro do aplicativo por causa de um véu. */}
      <View style={e.veu1} pointerEvents="none" />
      <View style={e.veu2} pointerEvents="none" />
      <View style={e.veu3} pointerEvents="none" />
      <View style={e.vgPe}>
        <Text style={grande ? e.vgNomeG : e.vgNome} numberOfLines={2}>{t.nome}</Text>
        <Text style={grande ? e.vgMetaG : e.vgMeta} numberOfLines={1}>
          {(grande ? t.meta : t.metaCurta || t.meta) || ''}
        </Text>
      </View>
    </Pressable>
  );
}

// O mosaico do site é uma grade 2fr/1fr em que o primeiro card ocupa duas
// linhas. Não existe grade em React Native, então a mesma disposição é montada
// à mão — e o resultado é o mesmo que o navegador produz por posicionamento
// automático: o destaque na coluna larga, os dois seguintes empilhados na
// estreita, e daí em diante uma linha larga + uma estreita por vez.
const LINHA = 118;
const FOLGA = 8;

function Mosaico({ viagens, acao }) {
  const abrir = (t) => () => acao('abrir', t.id);
  const [destaque, ...resto] = viagens;
  const coluna = resto.slice(0, 2);
  const pares = [];
  for (let i = 2; i < resto.length; i += 2) pares.push(resto.slice(i, i + 2));

  return (
    <View style={e.mosaico}>
      <View style={e.mosaicoLinha}>
        <View style={e.colLarga}>
          <CardDeViagem t={destaque} grande altura={LINHA * 2 + FOLGA} aoAbrir={abrir(destaque)} />
        </View>
        <View style={e.colEstreita}>
          {coluna.map((t) => (
            <CardDeViagem key={t.id} t={t} altura={LINHA} aoAbrir={abrir(t)} />
          ))}
          {/* Com uma viagem só na coluna, o vazio embaixo é o próprio fundo:
              nada de card fantasma pra fechar a grade. */}
        </View>
      </View>
      {pares.map((par) => (
        <View key={par[0].id} style={e.mosaicoLinha}>
          <View style={e.colLarga}>
            <CardDeViagem t={par[0]} altura={LINHA} aoAbrir={abrir(par[0])} />
          </View>
          <View style={e.colEstreita}>
            {par[1] ? (
              <CardDeViagem t={par[1]} altura={LINHA} aoAbrir={abrir(par[1])} />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TelaViagens({ dados, ocupado, acao }) {
  const margem = useSafeAreaInsets();

  if (!dados) {
    return (
      <View style={[e.fundo, e.centro]}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  const d = dados;
  const viagens = d.viagensDaRegiao || [];

  return (
    <ScrollView
      style={e.fundo}
      contentContainerStyle={{ paddingBottom: folgaDeRolagem(margem.bottom) }}
      refreshControl={
        <RefreshControl refreshing={!!ocupado} onRefresh={() => acao('recarregar')} tintColor={INK3} />
      }
    >
      {/* A faixa da marca fica ACIMA do mapa, não em cima dele: o logotipo
          caía sobre o Canadá e o avatar sobre o Japão. */}
      <View style={[e.mapaArea, { paddingTop: 18 + margem.top }]}>
        <View style={e.topoLinha}>
          <Text style={e.marca}>SPOT</Text>
          <Pressable
            onPress={() => acao('perfil')}
            accessibilityRole="button"
            accessibilityLabel="Abrir seu perfil"
          >
            {d.avatar ? (
              <Image source={{ uri: d.avatar }} style={e.avatar} />
            ) : (
              <View style={e.avatar}>
                <Text style={e.avatarTxt}>{d.inicial}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Pressable
          onPress={() => acao('mapa')}
          style={({ pressed }) => [e.mapa, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Abrir o mapa-múndi"
        >
          <View pointerEvents="none">
            <MapaMundi visitados={d.mapa} />
          </View>
        </Pressable>
      </View>

      {/* A SOMBRA AQUI É EXCEÇÃO, e é a única do app: o --surface está a 12
          pontos de luminosidade do --base e sem ela o olho não acha a borda do
          bloco. Escolha do Lucas entre três saídas testadas. */}
      <View style={e.placar}>
        <Pressable
          onPress={() => acao('mapa')}
          style={({ pressed }) => [e.anelBloco, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Ver o mapa-múndi"
        >
          <Anel paises={d.paises} />
          <Text style={e.anelRot}>de {PAISES_NO_MUNDO} países</Text>
        </Pressable>
        <View style={e.placarCol}>
          <LinhaDoPlacar n={d.paises} rotulo="países" onPress={() => acao('mapa')} />
          <LinhaDoPlacar n={d.cidades} rotulo="cidades" onPress={() => acao('lista', 'cities')} />
          <LinhaDoPlacar n={d.spots} rotulo="spots" onPress={() => acao('lista', 'spots')} />
        </View>
      </View>

      {d.convite ? (
        <Text style={e.convite}>Crie uma viagem para pintar o primeiro país.</Text>
      ) : null}

      {d.checkin ? <FaixaDeCheckin nome={d.checkin.nome} acao={acao} /> : null}

      {d.vazio ? (
        <View style={e.vazio}>
          <Text style={e.vazioTitulo}>Nenhuma viagem ainda</Text>
          <Text style={e.vazioTexto}>Salve o primeiro spot e a viagem nasce sozinha</Text>
          <Pressable
            onPress={() => acao('novoLugar')}
            style={({ pressed }) => [e.adicionar, e.adicionarSolto, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={e.adicionarTxt}>Adicionar spot</Text>
          </Pressable>
        </View>
      ) : (
        <View style={e.corpo}>
          <Text style={e.secaoTitulo}>Minhas viagens</Text>

          {/* Continente: aba de texto, não pílula colorida. A ativa é tinta
              com um traço embaixo — pastilha preenchida saiu do app inteiro. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={e.abas}
          >
            {(d.regioes || []).map((r) => {
              const on = r.nome === d.regiao;
              return (
                <Pressable
                  key={r.nome}
                  onPress={() => acao('regiao', r.nome)}
                  style={({ pressed }) => [e.aba, on && e.abaOn, pressed && { opacity: 0.6 }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[e.abaTxt, on && e.abaTxtOn]}>{r.nome} · {r.n}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {viagens.length ? <Mosaico viagens={viagens} acao={acao} /> : null}

          <Pressable
            onPress={() => acao('novoLugar')}
            style={({ pressed }) => [e.adicionar, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Adicionar um spot"
          >
            <Text style={e.adicionarTxt}>Adicionar spot</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: BASE },
  centro: { alignItems: 'center', justifyContent: 'center' },

  // .dash-mapa-area — a altura nasce do mapa, não de um número escolhido.
  mapaArea: { backgroundColor: MAP_BG, overflow: 'hidden' },
  topoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  // O wordmark do site é desenho: Cinzel 100 com espaçamento 6, num quadro de
  // 76 de altura reduzido a 20px na tela. 100×20/76 = 26, e 6×20/76 = 1,6.
  marca: { fontFamily: 'Cinzel', fontSize: 26, lineHeight: 30, color: GREEN, letterSpacing: 1.6 },
  mapa: { marginTop: 24 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 16, color: ON_GREEN, fontWeight: '600' },

  // .placar-card
  placar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#111111',
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  anelBloco: { alignItems: 'center', gap: 6 },
  anel: { width: 76, height: 76 },
  // Diz PAÍSES, não "do mundo": o anel fica ao lado de três números
  // diferentes, e sem isto nada amarra a porcentagem a um deles.
  anelRot: { fontSize: 10, color: INK2 },
  placarCol: { flex: 1, minWidth: 0 },
  pcItem: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 3 },
  pcN: { fontSize: 23, fontWeight: '700', letterSpacing: -0.9, color: INK, minWidth: 36 },
  pcR: { flex: 1, fontSize: 14, color: INK2 },
  pcSeta: { fontSize: 14, color: INK3 },

  convite: { fontSize: 12.5, color: INK3, maxWidth: 230, lineHeight: 18, marginTop: 14, marginHorizontal: 20 },

  // .checkin-banner — bloco verde inteiro, sem borda e sem ícone.
  checkin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    backgroundColor: GREEN,
    borderRadius: 14,
  },
  checkinQ: { flex: 1, minWidth: 0, fontSize: 15, color: ON_GREEN, lineHeight: 20 },
  checkinNome: { color: ON_GREEN, fontWeight: '600' },
  checkinAdd: {
    borderRadius: 10, minHeight: 36, paddingHorizontal: 14,
    backgroundColor: BASE, alignItems: 'center', justifyContent: 'center',
  },
  checkinAddTxt: { color: GREEN, fontSize: 14, fontWeight: '600' },
  checkinX: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },

  // .dash-body
  corpo: { paddingHorizontal: 20, paddingTop: 32 },
  secaoTitulo: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, color: INK, marginBottom: 10 },

  // .cont-aba
  abas: { gap: 18, paddingRight: 20 },
  aba: { paddingVertical: 6 },
  abaOn: { borderBottomWidth: 2, borderBottomColor: INK },
  abaTxt: { fontSize: 15, fontWeight: '600', color: INK3 },
  abaTxtOn: { color: INK },

  // .mosaico
  mosaico: { marginTop: 14, gap: FOLGA },
  mosaicoLinha: { flexDirection: 'row', gap: FOLGA },
  colLarga: { flex: 2 },
  colEstreita: { flex: 1, gap: FOLGA },

  // .vg-card
  vgCard: { borderRadius: 18, overflow: 'hidden', backgroundColor: PHOTO_EMPTY },
  veu1: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%', backgroundColor: 'rgba(0,0,0,0.42)' },
  veu2: { position: 'absolute', left: 0, right: 0, bottom: '22%', height: '16%', backgroundColor: 'rgba(0,0,0,0.26)' },
  veu3: { position: 'absolute', left: 0, right: 0, bottom: '38%', height: '17%', backgroundColor: 'rgba(0,0,0,0.11)' },
  vgPe: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  vgNome: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, color: '#fff' },
  vgNomeG: { fontSize: 22, fontWeight: '700', letterSpacing: -0.7, color: '#fff' },
  vgMeta: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  vgMetaG: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  vazio: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 56, gap: 10 },
  vazioTitulo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: INK2 },
  vazioTexto: { fontSize: 14, color: INK3, textAlign: 'center', lineHeight: 20 },

  // .btn-primario .btn-largo — a ação saiu do botão flutuante e virou palavra
  // escrita no fim da lista.
  adicionar: {
    height: 48, marginTop: 20, borderRadius: 14, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch',
  },
  adicionarSolto: { paddingHorizontal: 24, alignSelf: 'center' },
  adicionarTxt: { color: ON_GREEN, fontSize: 14, fontWeight: '600' },
});
