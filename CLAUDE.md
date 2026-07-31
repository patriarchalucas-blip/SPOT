# SPOT — Contexto do projeto

Este arquivo é lido automaticamente pelo Claude Code ao abrir esta pasta. Ele existia antes como um documento colado manualmente em cada novo chat no claude.ai; a partir de agora, vive aqui.

## Quem é o usuário

**Lucas** — Estagiário de FP&A na Sólides Tecnologia (HR tech B2B SaaS, SP), estudante da FGV EAESP. Estilo: direto, sem rodeios, português brasileiro casual, odeia over-explanation e retrabalho evitável. Quando o Claude erra, quer reconhecimento direto + solução, sem desculpa longa. Prefere que o Claude verifique o código antes de pedir pra ele testar. Não tolera hardcode/gambiarra. Quando não sabe algo, quer que o Claude diga isso, não chute.

## O projeto

App pessoal de viagem — "Letterboxd para viagem". Salva lugares (restaurante/hotel/experiência) com nota pessoal, marca "quero ir"/"já fui", avalia. Tagline: "seus lugares · sua voz". Caso de uso: viagem aos Bálcãs (Croácia + Montenegro + Bósnia) com grupo de 6 amigos. Lucas está pensando em profissionalizar isso como produto de verdade (não é urgente, é intenção de médio prazo).

## Arquitetura atual

- **Frontend:** `index.html` — single file, HTML+CSS+JS inline, sem framework, sem build step. ~1750 linhas.
- **Backend:** Supabase (auth + Postgres via REST direto — **nunca usar o SDK JS pra writes**, tem bug de schema cache que trava infinito; toda a camada de dados usa `fetch` direto com `apikey`+`Authorization: Bearer <token>`).
- **Deploy:** Cloudflare Pages, auto-deploy a cada push no branch `main` do GitHub.
- **Repo:** `github.com/patriarchalucas-blip/SPOT`
- **Site:** `spotted-38b.pages.dev` (Lucas quer trocar por domínio próprio via Cloudflare Registrar — ainda não decidiu o nome)

### Credenciais (já em uso, client-side — ver seção "Dívida técnica")
```
Supabase URL: https://kzidnilsyrvauzgelsqd.supabase.co
Supabase anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (está no <script> do index.html)
Google Places API key (New Places API v1): está no index.html
Unsplash Access Key: está no index.html
```
Nenhuma chave da Anthropic está no projeto ainda — e **não pode** ir direto no client (ver "Próximos passos").

## Banco de dados (Supabase)

```sql
trips: id, user_id, name, destinations[], dates, date_start, date_end, status, created_at
spots: id, user_id, trip_id, name, category(food/hotel/experience), my_note, city, address,
       photo_url, place_type, status(want/been/skip), my_rating, my_review, rating_google, created_at
profiles: id (=auth.users.id), email, display_name, username, created_at
follows: id, follower_id, following_id, status(pending/accepted), created_at
```

- `profiles` tem trigger `handle_new_user` que popula automaticamente no signup.
- `follows` tem RLS: só vê quem tem vínculo (próprio, pedido pendente, ou aceito). Busca por username passa por uma função `find_profile_by_username(uname text)` (security definer) que **nunca** devolve email — só id/nome/username. Isso existe pra impedir qualquer usuário logado de varrer a tabela de emails de todo mundo via chamada direta à API (a anon key é pública no código).
- **Pegadinha já mordida uma vez:** a tabela `trips` não tinha política de UPDATE (só INSERT/DELETE foram testados originalmente). Se qualquer feature nova precisar dar UPDATE numa tabela, confirma que a política existe antes de assumir que vai funcionar.
- Trips com `dates==='__quickvisit__'` e sem spots são o recurso "marcar país que já visitei" (Perfil → botão dedicado) — contam pro mapa/stats mas **não** aparecem na lista "Minhas viagens" do Dashboard (ver `isQuickVisit()` no JS).

## Sistema de design (definido, não é mais "estilo padrão de IA")

Motivo da existência: o visual original (fundo creme `#f4ede1` + serifada de alto contraste + acento terracota) é literalmente um dos padrões mais reconhecíveis de "app feito por LLM" — Lucas percebeu isso e pedimos um redesign consciente.

- **Cores** (`:root` no CSS): `--ink:#16232A` (Harbor Ink), `--surface:#EBEDE6` (Sail Canvas, frio, não creme-café), `--green:#2F5D62` (Deep Sea, status "concluída"/positivo), `--amber:#A9915F` (Brass, status "quero ir"), `--red:#A8342C`. Tela de login/perfil usa fundo escuro `#0b1620`.
- **Tipografia:** `Fraunces` (display/títulos — trocou o Playfair Display original, que ficava com cara de "editorial genérico"), `DM Sans` (corpo), `IBM Plex Mono` (dados: números, datas, status, labels — dá uma linguagem de "manifesto/ficha", separa prosa de dado).
- **Logo:** wordmark único "Sp[pin]t" — um pin clássico de localização (círculo + furo, cor terracota `#c1552f`) substitui o "o" de "Spot", tanto no texto quanto sozinho como ícone do app (favicon/PWA). Isso passou por VÁRIAS iterações (selo de carimbo, sol/onda, gema facetada) até chegar num pin clássico simples — Lucas rejeitou tudo que fugia do óbvio/reconhecível. **Não reabrir essa discussão sem pedido explícito.**
- **Cards de viagem:** formato "canhoto de passagem" (ticket stub) — foto pequena à esquerda + ficha de dados à direita com traço fino, não o card-com-foto-full-bleed-e-sombra genérico de antes.
- **Responsivo desktop** (`@media(min-width:900px)`): nav lateral fixa substitui bottom-nav, conteúdo em grid, login com foto full-bleed. Telas de detalhe (viagem/spot específico) ficam em largura focada sem sidebar — decisão de escopo, não bug.
- **Hover** isolado em `@media(hover:hover)` pra não afetar toque.

## Features construídas (funcionando em produção)

- Auth (Google OAuth + email/senha), CRUD de viagens/spots, upload de foto via busca no Google Places (New Places API), fotos de destino via Unsplash com cache em localStorage.
- Botão "Reservar mesa" em spots de comida → busca genérica no TheFork (sem afiliado ainda, é só o link — vira monetização quando tiver volume de uso real pra aplicar em programas de parceria).
- **Amigos:** pedido de amizade por username (não por email — decisão explícita do Lucas), aceitar/recusar/cancelar, feed de atividade dos amigos (viagens marcadas, spots com status "been" — spots "want" não entram no feed, decisão deliberada pra não virar mural de lista de desejos).
- **Perfil:** mapa-múndi (d3-geo + world-atlas), username editável, "X/243 países" (lista completa ISO 3166-1 em pt-BR, gerada via pycountry — antes só tinha 47 países hardcoded).
- 243 países com bandeira + região + nome geo (pra bater com o TopoJSON do mapa) — tudo numa fonte única (`COUNTRIES`), não existe mais lista duplicada.

## Dívida técnica conhecida (Lucas já está ciente, discutido explicitamente)

1. **Chaves de API expostas no client** (Google Places, Unsplash, Supabase anon key). Aceitável pra 6 amigos de confiança, **inaceitável** se abrir pra estranhos. Resolve com Cloudflare Pages Functions (serverless) — infra que já existe de graça na plataforma que ele já usa, não precisa de backend novo.
2. **Unsplash 50 req/hora compartilhado entre TODOS os usuários** (é uma chave fixa só, não por usuário) — já travou fotos durante testes. Não escala além de um punhado de gente. Precisa resolver antes de crescer (self-host de fotos curadas, ou trocar de provedor).
3. **Single HTML file gigante** — ótimo pra iterar rápido em chat, ruim pra qualquer dev revisar/testar depois. Candidato natural a virar múltiplos arquivos agora que o projeto migrou pro Claude Code.
4. **Deploy manual, sem staging/CI** — cada mudança vai direto pra produção.

## Próximos passos discutidos (não construídos ainda, sem ordem de prioridade fechada)

- **IA dentro do Spot** — duas ideias concretas already discutidas com o Lucas:
  1. **Recapitulação de viagem**: gerar texto narrativo juntando notas+spots de uma viagem, pra compartilhar.
  2. **Buscar sugestões via blogs** (preenche a aba "Explorar", hoje só um placeholder "em breve"): backend chama Claude com a ferramenta de web search ativada, pesquisa blogs de viagem reais sobre o destino, devolve lugares sugeridos com motivo — usuário confirma e adiciona (cai no fluxo normal de Google Places + nota pessoal). Enquadrar como sugestão, nunca como fato.
  - As duas precisam da MESMA peça de infra (function serverless escondendo a chave Anthropic) — construir uma vez, os dois recursos em cima.
  - Modelo sugerido: Claude Haiku (rápido/barato, mais que suficiente pra essas tarefas). Não confiar em preço de cabeça — checar docs.claude.com antes de decidir volume de uso.
- **Rebranding "amador"**: Lucas sinalizou que o app ainda parece amador mesmo depois do redesign de paleta/tipografia/cards. Suspeita levantada (não confirmada com ele ainda): uso de emoji cru como ícone (nav, categorias, status) é um tell clássico de "app gerado rápido" — provavelmente o próximo ponto de ataque quando ele disser "execute". **Não mexer nisso sem ele confirmar direção primeiro** — ele tem histórico de rejeitar decisões de design tomadas sem alinhamento prévio (ver seção Logo).
- **Domínio próprio** (Cloudflare Registrar) — decidido que ele quer, nome ainda não escolhido.
- **Placar entre amigos** (gamificação) — Lucas achou "fraco", não vale reintroduzir sem uma abordagem nova.
- **Importar notas soltas via IA** — colar bagunçado (bloco de notas/WhatsApp) e a IA separa em lugares estruturados. Mesma peça de infra do recap/explorar.

## Como Lucas trabalha (importante pro Claude Code também)

- Prefere que decisões de escopo grande (redesign, arquitetura) sejam **discutidas antes de executar** — ele literalmente diz "não execute ainda" quando quer só pensar junto, e "execute" quando quer que rode. Respeitar isso.
- Detesta ficar subindo SQL manualmente no Supabase repetidas vezes — sempre que possível, preferir soluções client-side/migração automática em vez de pedir mais uma rodada de SQL, e quando for inevitável, avisar antes e agrupar tudo num único script.
- Valoriza diagnóstico antes de pedir pra ele testar às cegas — checar código, simular localmente (ex: headless browser) antes de afirmar "deve estar funcionando".
