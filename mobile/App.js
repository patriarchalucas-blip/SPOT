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

import React, { useCallback, useRef, useState } from 'react';
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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

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
    }
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
          onLoadStart={() => setCarregando(true)}
          onLoadEnd={() => setCarregando(false)}
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
