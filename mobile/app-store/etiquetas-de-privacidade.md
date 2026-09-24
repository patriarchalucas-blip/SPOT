# Etiquetas de privacidade — respostas do questionário

App Store Connect → **App Privacy**. Escrito em 20/09/2026, revisto em
23/09/2026 (localização dos spots, cidade onde mora, mapas do Google), lendo o
código, não de memória. Cada linha tem o arquivo onde dá para conferir.

Esse questionário é declaração formal: errar para menos é motivo de rejeição, e
depois de publicado ele aparece na ficha do app como "Privacidade do app". Por
isso aqui está declarado o que de fato sai do aparelho, inclusive o que não é
guardado em lugar nenhum.

---

## Primeira pergunta: "você coleta dados deste app?"

**Sim.**

---

## O que declarar

Para cada item: o tipo, para que serve, se está ligado à identidade da pessoa e
se é usado para rastreamento. **Nada no Spot é usado para rastreamento** — não
existe IDFA, nem SDK de publicidade, nem analytics de terceiro. Conferido:
zero ocorrências de gtag, Google Analytics, Meta, Mixpanel, Amplitude, PostHog
e Sentry no `index.html`.

### 1. Informações de contato → Endereço de e-mail

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Sim** |
| Usado para rastreamento | Não |

É a credencial de login. Fica em `auth.users` e em `profiles.email`.
Quem entra com Google também entrega o e-mail.

### 2. Informações de contato → Nome

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Sim** |
| Usado para rastreamento | Não |

`profiles.display_name` e `profiles.username`. O nome aparece para os amigos
aceitos — é o que identifica quem recomendou um lugar.

### 3. Conteúdo do usuário → Fotos ou vídeos

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Sim** |
| Usado para rastreamento | Não |

Foto de perfil e foto de lugar, enviadas pela câmera ou pela galeria e
guardadas no Storage do Supabase (`uploadToStorage`, pasta por usuário).

### 4. Conteúdo do usuário → Outro conteúdo do usuário

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Sim** |
| Usado para rastreamento | Não |

A nota pessoal de cada lugar (`spots.my_note`), a avaliação escrita
(`spots.my_review`), os comentários (`spot_comments.body`) e o nome das
viagens. É o coração do produto.

### 5. Identificadores → ID do usuário

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Sim** |
| Usado para rastreamento | Não |

O `id` do Supabase, que amarra tudo, e o endereço de push guardado em
`push_tokens` (tabela criada pela migração 019) para entregar aviso de pedido
de amizade, aceite e comentário.

### 6. Localização → Localização precisa

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Sim** — mudou em 23/09/2026, ver abaixo |
| Usado para rastreamento | Não |

A coordenada do aparelho sai dele: vai para a API do Google Places, por dentro
de `functions/api/places.js`, para achar o lugar em que a pessoa está ("Você
está em X?") e os lugares por perto. Ela **não** é gravada e **não** entra no
cache do Cloudflare (busca por proximidade não é cacheada, só por texto).

**Por que agora é "ligado":** desde a migração 023, cada spot guarda `lat` e
`lng` — a coordenada do **estabelecimento**, vinda do Google, não do GPS. Mas é
um par (pessoa, coordenada) no banco, e um spot marcado como "fui" diz onde a
pessoa esteve. A versão de 20/09 dizia "a tabela `spots` não tem coluna de
coordenada" — deixou de ser verdade. Declarar como ligado é o lado seguro:
declarar menos do que existe é o que dá rejeição.

### 6b. Localização → Localização aproximada

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Sim** |
| Usado para rastreamento | Não |

A cidade onde a pessoa mora (`profiles.home_city`, migração 021) e o país
(`profiles.home_country`), pedidos no primeiro acesso. Os amigos veem.

### 7. Histórico de busca — decisão sua

| | |
|---|---|
| Finalidade | Funcionalidade do app |
| Ligado à identidade | **Não** |
| Usado para rastreamento | Não |

O texto que a pessoa digita ("restaurantes em Lisboa") vai para o Google
Places, e o **resultado** fica num cache do Cloudflare KV com o texto da busca
como chave — compartilhado entre todo mundo, sem nada que ligue a busca a quem
buscou.

Tem gente que não declara isso, argumentando que é a própria função pedida pelo
usuário. **Eu declararia.** Custa uma linha na ficha e tira um motivo de
questionamento. Se você discordar, é defensável não declarar.

---

## O que NÃO declarar (conferido, não existe)

| tipo | por quê |
|---|---|
| Dados de uso / Análise | Não há analytics nenhum no app |
| Dados de diagnóstico | Não há Sentry, Crashlytics nem equivalente |
| Contatos | O app nunca lê a agenda do telefone. Amizade é por username ou por link de convite — decisão de projeto |
| Saúde e condicionamento | Não existe |
| Informações financeiras | Não existe. Não há compra, assinatura nem pagamento |
| Histórico de navegação | Não existe |
| Informações confidenciais | Não existe |
| ID do dispositivo / IDFA | Não usamos. **Consequência: não precisa do aviso de rastreamento (ATT)** |

---

## Terceiros que recebem dado

A Apple pergunta sobre dado coletado "por você ou pelos seus parceiros". Quem
entra em contato com dado de usuário:

| quem | o que recebe | para quê |
|---|---|---|
| Supabase | tudo: e-mail, perfil, viagens, lugares, notas, comentários, fotos | é o banco e a autenticação |
| Cloudflare | tráfego do site e das funções; o token de sessão passa por ali | hospedagem e as funções de API |
| Google Places | nome do lugar buscado e, no check-in, a coordenada | busca de lugar, foto, telefone, nota |
| Google Maps | a região que o mapa mostra (a biblioteca roda no aparelho, chave via `/api/mapa-chave`) e as imagens de `/api/mapa` | mapa da cidade, do Perfil e da ficha |
| Google (login) | o login de quem entra com a conta Google | autenticação |
| Unsplash | o nome da cidade | foto de capa de cidade |
| Visual Crossing | o nome da cidade | temperatura no card de cidade (`/api/climate`) |
| Resend | e-mail de quem se cadastra | confirmação de cadastro e recuperação de senha |
| Expo | endereço de push do aparelho | entrega da notificação |
| Brave Search | nome e cidade do restaurante | achar o Instagram do lugar |

Nenhum deles recebe dado para publicidade ou rastreamento.

---

## Checagem rápida antes de enviar

O que eu conferi em 20/09/2026, e como conferir de novo:

```bash
# nenhum rastreador no app
grep -ci "gtag\|google-analytics\|googletagmanager\|mixpanel\|amplitude\|posthog\|sentry\|fbq" index.html   # esperado: 0

# a posição do APARELHO só é lida nesses dois pontos (check-in e "perto de você")
grep -n "getCurrentPosition" index.html   # esperado: 2 ocorrências

# as páginas obrigatórias estão no ar
curl -s -o /dev/null -w "%{http_code}\n" -L https://meuspot.app/privacidade
```
