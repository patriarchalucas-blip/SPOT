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
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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

// Trocar por https://meuspott.app quando o domínio estiver apontado.
const SITE = 'https://spotted-38b.pages.dev';

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
function ehFluxoDeLogin(url) {
  try {
    const h = new URL(url).host;
    return h.endsWith('.supabase.co') || h === 'accounts.google.com';
  } catch (e) {
    return false;
  }
}

export default function App() {
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
    if (dados && dados.tipo === 'tela') {
      if (typeof dados.aba === 'string') setAbaAtiva(dados.aba);
      setMostrarAbas(!!dados.comAbas);
    }
  }, []);

  // Tocar numa aba não navega nada aqui: manda o SITE trocar de tela, que é
  // quem sabe carregar os dados daquela aba. Acender a aba localmente antes
  // da resposta deixa o toque instantâneo; se o site discordar, ele corrige
  // na mensagem de volta.
  const trocarDeAba = useCallback((tela) => {
    setAbaAtiva(tela);
    webRef.current?.injectJavaScript(
      'window.irParaAba && window.irParaAba(' + JSON.stringify(tela) + ');true;'
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
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
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
          {mostrarAbas ? (
            <BarraDeAbas ativa={abaAtiva} aoTocar={trocarDeAba} margemDeBaixo={margem.bottom} />
          ) : null}
        </View>
        {carregando ? (
          <View style={estilo.carregando} pointerEvents="none">
            <ActivityIndicator size="large" color={TERRA} />
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const estilo = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: TINTA },
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
