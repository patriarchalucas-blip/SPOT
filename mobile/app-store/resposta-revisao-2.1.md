# Resposta à revisão — Guideline 2.1, Information Needed (26/09/2026)

A primeira submissão (build 8) voltou com "2.1 - Information Needed": conta de
desenvolvedor nova, a Apple pede um vídeo gravado num iPhone e cinco respostas
em texto. Não é defeito. O texto abaixo vai **na resposta da Central de
Resoluções** e **no campo Notas** da revisão (a Apple pede os dois).

A senha da conta demo NÃO entra aqui (repo público): ela está no campo próprio
do formulário.

---

```
Hello, and thank you for the review. Answers below; the screen recording is attached.

1. SCREEN RECORDING
Attached. Recorded on a physical iPhone running the latest iOS. It starts at app launch and shows: signing in with the demo account, the main flow (saving a place, rating it, Explore, Friends feed, commenting), reporting a comment and the block option, then signing out, creating a NEW account with Sign in with Apple and deleting that account from inside the app (Profile > Settings > Delete my account). The app has no paid content.

2. PURPOSE AND AUDIENCE
Spot is a personal travel journal with a social layer — "Letterboxd for places". People save restaurants, hotels and experiences they want to visit or have visited, give them a personal rating (half-star steps) and a short note, and see the places their friends recommend. The problem it solves: travel recommendations are scattered across chat messages, notes apps and anonymous review sites. Spot keeps them in one place and weights them by people you actually know. Audience: adults who travel for leisure, especially groups of friends planning trips together. The app is free, has no ads and no in-app purchases.

3. HOW TO ACCESS THE MAIN FEATURES
Sign in with the demo account in the login fields of this form (email + password). It already has trips, places and a friend, so nothing needs to be set up.
- Viagens (first tab): trips grouped by country, world map, "where I live" section. Tap a trip > a city > a place to open its page (rating, note, status "want to go / been / not recommended").
- Add a place: "Adicionar spot" > category > search (powered by Google Places) > rate and save.
- Explorar (second tab): type a city to see well-rated places there, filter by category and type of food, and see which friends have been. The "+" on a photo saves it as "want to go".
- Amigos (third tab): feed of places friends have visited, friend requests by username, invite link. Comments appear on a friend's place page.
- Perfil (fourth tab): countries visited, map, settings.
Moderation (Guideline 1.2): "Denunciar" (report) is on every comment and in the menu of a friend's profile; "Bloquear" (block) is in the same menu and removes the person from feed, list and comments. There is no public profile or public feed: content is only visible between two people who accepted each other, enforced in the database (row-level security), not only in the interface.
Account deletion: Perfil > Configurações > Excluir minha conta. It deletes the account and all its data (trips, places, photos, comments, friendships, reports).

4. EXTERNAL SERVICES
- Supabase: authentication, database and photo storage.
- Sign in with Apple and Google Sign-In: login.
- Google Maps Platform (Places API, Static Maps): place search, place details and place photos.
- Unsplash API: city cover photos (credited to the photographer).
- Visual Crossing: typical weather for a destination.
- Brave Search API: finding a venue's official Instagram page.
- Expo Push Notifications (via Apple Push Notification service): friend requests and comments.
- Resend: account confirmation and password-reset emails.
- Cloudflare Pages: hosting of the web content and the server functions that keep API keys off the device.
No AI services are used.

5. REGIONAL DIFFERENCES
None. The app works the same in every region. It is currently offered in Brazil only and the interface is in Portuguese (Brazil); place data comes from Google for any city in the world.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable: Spot is not in a regulated industry and does not distribute protected third-party material. Place data and photos are displayed through the official Google Maps Platform and Unsplash APIs, under their terms and with the required attribution.
```

---

## Roteiro do vídeo (Lucas grava no iPhone)

Gravação de tela: Central de Controle → botão de gravar (se não aparecer:
Ajustes → Central de Controle → adicionar "Gravação de Tela"). Tudo num vídeo
só, começando com o app FECHADO.

1. Abrir o Spot pelo ícone.
2. Entrar com a conta demo (demo@meuspot.app) por e-mail e senha.
3. Viagens: tocar numa viagem → cidade → spot. Mostrar nota, status, texto.
4. Adicionar spot: buscar um restaurante, dar nota, salvar.
5. Explorar: buscar uma cidade, tocar em "Japonesa", tocar numa foto.
6. Amigos: mostrar o feed. Abrir um spot do amigo, escrever um comentário.
7. Num comentário do amigo: tocar em Denunciar, escolher um motivo, enviar.
8. Perfil do amigo → menu → mostrar a opção Bloquear, abrir e **cancelar**
   (bloquear de verdade desfaz a amizade da conta demo).
9. Perfil → Configurações → Sair.
10. Tocar em "Entrar com a Apple" → cria uma conta NOVA (pode ocultar o e-mail).
11. Passar rápido pelo primeiro acesso.
12. Perfil → Configurações → Excluir minha conta → confirmar.
13. Parar a gravação.

Uns 3 a 4 minutos. Não precisa narrar.
