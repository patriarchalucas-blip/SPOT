// Casca nativa do Spot.
//
// O app continua sendo o mesmo index.html publicado no Cloudflare. Esta casca
// existe pra ele poder morar na App Store — e pra fazer as coisas que um site
// dentro de uma janela não faz bem.
//
// ATENÇÃO À REGRA 4.2 DA APPLE ("funcionalidade mínima"): app que é só um site
// embrulhado é reprovado. O que está aqui não é enfeite, é o que diferencia:
//
//   1. Link externo abre no app certo. Instagram, Google Maps e telefone saem
//      pro aplicativo nativo em vez de navegar por cima do Spot e prender o
//      usuário numa página sem botão de voltar. Isso também conserta um
//      problema real que existiria no site dentro da casca.
//   2. Tela de sem-conexão de verdade, com botão de tentar de novo, no lugar
//      da página de erro do navegador.
//   3. Compartilhar pela folha nativa do sistema.
//   4. Permissão de localização e de câmera pedidas pelo aparelho, com texto
//      em português explicando pra quê.
//   5. Área segura, barra de status e splash tratados nativamente.
//   6. Barra de abas NATIVA. A primeira coisa que o revisor toca já não é
//      HTML: o toque responde na hora, sem esperar o WebView. É também a
//      peça que permite migrar o resto tela por tela — com a navegação fora
//      da página, cada aba pode virar nativa no seu tempo.
//   7. Notificação no celular — pedido de amizade, lugar novo de um amigo,
//      comentário. É a coisa da lista da 4.2 que o navegador mais claramente
//      não faz, e a que resolve um problema real: hoje um pedido de amizade
//      fica parado até a pessoa abrir o app por acaso.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BarraDeAbas from './BarraDeAbas';
import TelaAmigos from './TelaAmigos';
import TelaExplorar from './TelaExplorar';
import TelaViagens from './TelaViagens';
import TelaPerfil from './TelaPerfil';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Para onde o navegador do sistema devolve o login. Tem que ser IGUALZINHO
// ao que está liberado no banco, senão a volta cai no site e a pessoa fica
// olhando pra tela de entrada de novo. O 'spot' vem do app.json.
const VOLTA_DO_LOGIN = 'spot://auth';

// Notificação recebida com o app ABERTO também aparece. Sem isto ela chega
// silenciosa e a pessoa jura que o app não avisa.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pede permissão e devolve o endereço de entrega do aparelho.
//
// Devolve null em vez de explodir em três casos normais: simulador (não tem
// como receber notificação), pessoa que recusou a permissão, e projeto ainda
// sem id do EAS. Nenhum deles pode impedir o app de abrir.
async function pegarEnderecoDeEntrega() {
  if (!Device.isDevice) return null;
  try {
    const atual = await Notifications.getPermissionsAsync();
    let permitido = atual.granted;
    // Só pergunta se ainda dá: quem já recusou não deve ser perguntado de
    // novo a cada abertura — o iOS nem mostra o alerta, e insistir é ruído.
    if (!permitido && atual.canAskAgain) {
      const pedida = await Notifications.requestPermissionsAsync();
      permitido = pedida.granted;
    }
    if (!permitido) return null;
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;
    if (!projectId) return null;
    const t = await Notifications.getExpoPushTokenAsync({ projectId });
    return t?.data || null;
  } catch (e) {
    return null;
  }
}

// O endereço que a casca carrega. Ele fica GRAVADO no arquivo enviado pra
// Apple: trocar depois exige nova versão e nova revisão. Por isso o domínio
// próprio veio antes do envio, e não depois.
//
// O endereço antigo (spotted-38b.pages.dev) continua no ar e funcionando — a
// Cloudflare não desliga o .pages.dev — então nada quebra durante a troca.
const SITE = 'https://meuspot.app';

// Qual componente desenha cada aba. Aba que nao estiver aqui continua vindo
// do site — e assim que uma tela migra: entra nesta tabela.
const TELAS = {
  dashboard: TelaViagens,
  explore: TelaExplorar,
  friends: TelaAmigos,
  profile: TelaPerfil,
};

const TINTA = '#0b1620';
const PAPEL = '#EAE7E0';
const TERRA = '#c1552f';

// Host do próprio app: tudo que for daqui navega dentro da casca. O resto sai
// pro sistema.
function ehDoApp(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return u.host === new URL(SITE).host;
  } catch (e) {
    return false;
  }
}

// O login do Google acontece no domínio do Supabase e precisa continuar
// dentro da casca, senão a volta do OAuth não encontra a sessão.
// So o dominio do banco continua navegando dentro da casca (a volta do
// OAuth passa por la). accounts.google.com saiu de proposito: dentro da
// janela embutida o Google recusa o login, e deixar entrar so produz uma
// tela de erro sem saida. Quem abre o Google e a folha de autenticacao.
function ehFluxoDeLogin(url) {
  try {
    return new URL(url).host.endsWith('.supabase.co');
  } catch (e) {
    return false;
  }
}

// O provedor de area segura fica aqui, sozinho. Quem LE a margem e o
// Conteudo, que e filho dele — ler no mesmo componente que cria o provedor
// significa ler antes de ele existir, e o app quebra na primeira tela.
export default function App() {
  return (
    <SafeAreaProvider>
      <Conteudo />
    </SafeAreaProvider>
  );
}

function Conteudo() {
  const webRef = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const [semRede, setSemRede] = useState(false);
  const [podeVoltar, setPodeVoltar] = useState(false);
  // Guardado aqui porque o endereço costuma chegar ANTES de o site terminar
  // de carregar. Sem guardar, ele se perde e a pessoa nunca recebe nada.
  const enderecoRef = useRef(null);
  const margem = useSafeAreaInsets();
  // Qual aba está acesa e se a barra deve aparecer. Quem manda nisso é o
  // SITE, não a barra: ele tem telas de detalhe (viagem, cidade, lugar) que
  // escondem a navegação, e o botão de voltar dele muda de tela sem passar
  // por aqui. A barra reflete o app, nunca o contrário.
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [mostrarAbas, setMostrarAbas] = useState(false);
  // Dados da tela de Amigos, mandados pelo site já prontos pra desenhar.
  // null = ainda não chegou; a tela mostra o indicador de carregando.
  // Dados de cada tela nativa, mandados pelo site ja prontos pra desenhar.
  // Um mapa so em vez de um par de estados por tela: tela nova passa a mexer
  // num lugar, nao em cinco.
  const [dadosDaTela, setDadosDaTela] = useState({});
  const [ocupada, setOcupada] = useState('');
  // Aviso e faixa de sem-conexao: os dois existem no site, mas a tela nativa
  // fica NA FRENTE dele. Todo aviso escrito la era invisivel quando a acao
  // partia de uma aba nativa — inclusive os de erro, que viravam falha
  // silenciosa: a pessoa toca, nada acontece, e nada explica.
  const [aviso, setAviso] = useState(null);
  const [semSinal, setSemSinal] = useState(false);

  // Entrega o endereço pro site, que é quem sabe qual conta está logada.
  const entregarEndereco = useCallback(() => {
    const e = enderecoRef.current;
    if (!e || !webRef.current) return;
    webRef.current.injectJavaScript(
      'window.__spotPush=' + JSON.stringify(e) + ';' +
      'window.dispatchEvent(new Event("spot-push-pronto"));true;'
    );
  }, []);

  useEffect(() => {
    let vivo = true;
    pegarEnderecoDeEntrega().then((e) => {
      if (!vivo || !e) return;
      enderecoRef.current = e;
      entregarEndereco();
    });
    // Tocar na notificação com o app fechado abre o app; recarregar garante
    // que a pessoa cai no estado atual e não numa tela de horas atrás.
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      webRef.current?.reload();
    });
    return () => {
      vivo = false;
      sub.remove();
    };
  }, [entregarEndereco]);

  // Android: o botão físico de voltar navega no histórico do site antes de
  // fechar o app. Sem isto, voltar fecha tudo e perde o que a pessoa fazia.
  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (podeVoltar && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [podeVoltar]);

  const tentarDeNovo = useCallback(() => {
    setSemRede(false);
    setCarregando(true);
    webRef.current?.reload();
  }, []);

  // O site pede pra compartilhar mandando uma mensagem pra cá; a folha nativa
  // é melhor que a do navegador e é o que o usuário de iPhone espera.
  const aoReceberMensagem = useCallback((evento) => {
    let dados;
    try {
      dados = JSON.parse(evento.nativeEvent.data);
    } catch (e) {
      return;
    }
    if (dados && dados.tipo === 'compartilhar' && typeof dados.texto === 'string') {
      Share.share({ message: dados.texto }).catch(() => {});
      return;
    }
    // O site diz em que tela está. Sem isso a barra acenderia a aba errada
    // assim que a pessoa usasse o voltar de dentro da página.
    // O site montou o endereco de autorizacao e pede o navegador do sistema.
    // Precisa ser o do sistema: o Google BLOQUEIA login dentro de janela
    // embutida (politica 'use secure browsers'), e a nossa e exatamente isso.
    // openAuthSessionAsync usa a folha de autenticacao do iOS, que eles
    // aceitam, e volta sozinha quando o endereco spot://auth aparece.
    if (dados && dados.tipo === 'aviso') {
      setAviso({ titulo: dados.titulo || '', texto: dados.texto || '', erro: !!dados.erro });
      return;
    }
    if (dados && dados.tipo === 'offline') {
      setSemSinal(!!dados.semRede);
      return;
    }
    if (dados && dados.tipo === 'login-google' && typeof dados.url === 'string') {
      WebBrowser.openAuthSessionAsync(dados.url, VOLTA_DO_LOGIN)
        .then((r) => {
          // Cancelou ou fechou a folha: o site mostra o aviso e nada quebra.
          const volta = r && r.type === 'success' ? r.url : '';
          webRef.current?.injectJavaScript(
            'window.voltouDoLoginGoogle && window.voltouDoLoginGoogle(' +
              JSON.stringify(volta) + ');true;'
          );
        })
        .catch(() => {
          webRef.current?.injectJavaScript(
            'window.voltouDoLoginGoogle && window.voltouDoLoginGoogle("");true;'
          );
        });
      return;
    }
    if (dados && dados.tipo === 'tela') {
      if (typeof dados.aba === 'string') setAbaAtiva(dados.aba);
      setMostrarAbas(!!dados.comAbas);
      // Saiu de Amigos pra uma tela de detalhe (perfil de amigo, ficha de
      // lugar): quem desenha volta a ser o site, então a tela nativa sai da
      // frente. Ela reaparece com os dados que já tinha.
      return;
    }
    // amigos | explorar | viagens | perfil -> a aba correspondente
    const DE_ONDE = { amigos: 'friends', explorar: 'explore', viagens: 'dashboard', perfil: 'profile' };
    const qual = DE_ONDE[dados && dados.tipo];
    if (qual) {
      setOcupada((o) => (o === qual ? '' : o));
      if (dados.pronto !== false) {
        setDadosDaTela((d) => ({ ...d, [qual]: dados.dados }));
      }
    }
  }, []);

  // Tocar numa aba não navega nada aqui: manda o SITE trocar de tela, que é
  // quem sabe carregar os dados daquela aba. Acender a aba localmente antes
  // da resposta deixa o toque instantâneo; se o site discordar, ele corrige
  // na mensagem de volta.
  const trocarDeAba = useCallback((tela) => {
    setAbaAtiva(tela);
    // Pede os dados da aba: ela pode nunca ter sido aberta nesta sessao.
    const PEDIDO = {
      explore: 'darDadosDeExplorar',
      dashboard: 'darDadosDeViagens',
      profile: 'darDadosDePerfil',
    };
    if (PEDIDO[tela]) {
      webRef.current?.injectJavaScript(
        'window.' + PEDIDO[tela] + ' && window.' + PEDIDO[tela] + '();true;'
      );
    }
    webRef.current?.injectJavaScript(
      'window.irParaAba && window.irParaAba(' + JSON.stringify(tela) + ');true;'
    );
  }, []);

  // Toda ação da tela nativa de Amigos é executada PELO SITE: ele tem as
  // regras e a sessão. Aqui só chega o nome da ação.
  // Toda acao de tela nativa e executada PELO SITE: ele tem as regras e a
  // sessao. Daqui so atravessa o nome da acao e um valor simples.
  const FUNCAO_DA_ABA = {
    friends: 'acaoDeAmigos',
    explore: 'acaoDeExplorar',
    dashboard: 'acaoDeViagens',
    profile: 'acaoDePerfil',
  };
  const acaoDaTela = useCallback((aba) => (acao, valor) => {
    if (acao === 'recarregar' || acao === 'buscar') setOcupada(aba);
    webRef.current?.injectJavaScript(
      'window.' + FUNCAO_DA_ABA[aba] + ' && window.' + FUNCAO_DA_ABA[aba] + '(' +
        JSON.stringify(acao) + ',' + JSON.stringify(valor === undefined ? null : valor) + ');true;'
    );
  }, []);

  // Decide o que navega dentro e o que sai pro sistema.
  const aoNavegar = useCallback((req) => {
    const url = req.url || '';
    if (url.startsWith('about:') || url.startsWith('data:')) return true;
    if (ehDoApp(url) || ehFluxoDeLogin(url)) return true;
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  if (semRede) {
    return (
      <>
        <StatusBar style="light" />
        <SafeAreaView style={estilo.fundo}>
          <ScrollView
            contentContainerStyle={estilo.centro}
            refreshControl={<RefreshControl refreshing={false} onRefresh={tentarDeNovo} tintColor={PAPEL} />}
          >
            <Text style={estilo.titulo}>Sem conexão</Text>
            <Text style={estilo.texto}>
              O Spot precisa de internet para carregar seus lugares. Confere a conexão e tenta de novo.
            </Text>
            <Pressable onPress={tentarDeNovo} style={estilo.botao} accessibilityRole="button">
              <Text style={estilo.botaoTexto}>Tentar de novo</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={estilo.fundo} edges={['top', 'left', 'right']}>
        <View style={estilo.pilha}>
          <WebView
            ref={webRef}
            source={{ uri: SITE }}
            style={estilo.web}
            containerStyle={estilo.fundo}
            // Sem isso o WKWebView não entrega a posição pro site.
            geolocationEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            // Puxar pra baixo no topo recarrega; no resto do app não interfere.
            pullToRefreshEnabled
            // Sem destaque cinza no toque, que denuncia navegador.
            allowsLinkPreview={false}
            originWhitelist={['https://*', 'http://*']}
            onShouldStartLoadWithRequest={aoNavegar}
            // O site precisa saber o endereço de volta ANTES de montar o link
            // do Google, então entra antes do conteúdo carregar.
            injectedJavaScriptBeforeContentLoaded={
              'window.enderecoDeVoltaDoLogin=' +
              JSON.stringify(VOLTA_DO_LOGIN) + ';true;'
            }
            onMessage={aoReceberMensagem}
            onLoadStart={() => {
              setCarregando(true);
              // Recarregou: até o site dizer onde está, a barra some. Melhor
              // nenhuma barra que uma barra apontando pra tela errada.
              setMostrarAbas(false);
            }}
            onLoadEnd={() => {
              setCarregando(false);
              // Toda vez que o site termina de carregar, inclusive depois de
              // recarregar: o endereço vive no app, não na página.
              entregarEndereco();
            }}
            onNavigationStateChange={(s) => setPodeVoltar(!!s.canGoBack)}
            onError={() => {
              setCarregando(false);
              setSemRede(true);
            }}
            onHttpError={(e) => {
              // 4xx/5xx na própria página inicial é falha de verdade; erro de um
              // recurso solto (uma foto) não deve derrubar a tela.
              const { statusCode, url } = e.nativeEvent;
              if (url === SITE || url === SITE + '/') {
                if (statusCode >= 500) setSemRede(true);
              }
            }}
          />
          {/* Amigos é nativa: cobre o WebView enquanto a aba está aberta. O
              site continua carregado por baixo — é ele que executa as ações
              e que desenha as telas de detalhe quando a pessoa entra numa. */}
          {/* As quatro abas sao nativas: a tela cobre o WebView enquanto a
              aba esta aberta. O site continua carregado por baixo — e ele que
              executa as acoes e desenha as telas de detalhe. */}
          {mostrarAbas && TELAS[abaAtiva] ? (
            <View style={StyleSheet.absoluteFill}>
              {React.createElement(TELAS[abaAtiva], {
                dados: dadosDaTela[abaAtiva],
                ocupado: ocupada === abaAtiva,
                acao: acaoDaTela(abaAtiva),
              })}
            </View>
          ) : null}
          {mostrarAbas ? (
            <BarraDeAbas ativa={abaAtiva} aoTocar={trocarDeAba} margemDeBaixo={margem.bottom} />
          ) : null}
          {/* Por cima de TUDO, inclusive das telas nativas: e o unico jeito
              de um aviso do site chegar em quem esta numa aba nativa. */}
          {semSinal ? (
            <View style={estilo.faixaSemSinal} pointerEvents="none">
              <Text style={estilo.faixaSemSinalTxt}>
                Sem conexao — mostrando o que esta salvo no aparelho
              </Text>
            </View>
          ) : null}
          {aviso ? <Aviso aviso={aviso} aoSumir={() => setAviso(null)} /> : null}
        </View>
        {carregando ? (
          <View style={estilo.carregando} pointerEvents="none">
            <ActivityIndicator size="large" color={TERRA} />
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}

// O aviso some sozinho, como o do site: 3,5 segundos. O key no elemento pai
// faz um aviso novo reiniciar a contagem em vez de herdar a do anterior.
function Aviso({ aviso, aoSumir }) {
  useEffect(() => {
    const t = setTimeout(aoSumir, 3500);
    return () => clearTimeout(t);
  }, [aviso, aoSumir]);
  return (
    <View style={estilo.aviso} pointerEvents="none">
      <View style={[estilo.avisoCaixa, aviso.erro && estilo.avisoErro]}>
        <Text style={estilo.avisoTitulo}>{aviso.titulo}</Text>
        {aviso.texto ? <Text style={estilo.avisoTexto}>{aviso.texto}</Text> : null}
      </View>
    </View>
  );
}

const estilo = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: TINTA },
  faixaSemSinal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#A8342C',
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  faixaSemSinalTxt: { color: '#fff', fontSize: 12, textAlign: 'center' },
  aviso: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center', paddingHorizontal: 20 },
  avisoCaixa: {
    maxWidth: 420,
    backgroundColor: '#16232A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(234,231,224,0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avisoErro: { borderColor: 'rgba(168,52,44,0.6)' },
  avisoTitulo: { color: '#EAE7E0', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  avisoTexto: { color: '#B4BCBF', fontSize: 12.5, marginTop: 3, textAlign: 'center' },
  // Empilha a barra por cima do WebView em vez de dividir a tela: o site
  // continua ocupando a altura inteira e a barra flutua, exatamente como a
  // .bottom-nav do CSS faz hoje.
  pilha: { flex: 1 },
  web: { flex: 1, backgroundColor: TINTA },
  carregando: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TINTA,
  },
  centro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  titulo: {
    color: PAPEL,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  texto: {
    color: '#94A4AD',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 26,
    maxWidth: 320,
  },
  botao: {
    backgroundColor: TERRA,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: 'center',
  },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
