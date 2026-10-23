// Língua das abas nativas (13/10/2026).
//
// Quem decide a língua é o site (window.IDIOMA: a escolha em Ajustes ou a
// língua do iPhone). Ele avisa a casca com { tipo: 'idioma', lang } e o
// App.js chama definirIdioma. Os textos que o site manda nos pacotes já vêm
// traduzidos (i18n/motor.js); aqui ficam só os textos fixos destas telas.
// Casca nova com site velho: nunca chega o aviso, e tudo fica em português.
let LANG = 'pt';
const ouvintes = new Set();

export function definirIdioma(l) {
  if ((l === 'pt' || l === 'en') && l !== LANG) {
    LANG = l;
    ouvintes.forEach((f) => f(l));
  }
}
export const idiomaAtual = () => LANG;
export function aoMudarIdioma(f) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

const EN = {
  // barra de abas
  Viagens: 'Trips', Explorar: 'Explore', Amigos: 'Friends', Perfil: 'Profile',
  // casca
  'Sem conexão': 'No connection', 'Tentar de novo': 'Try again',
  // Viagens
  Adicionar: 'Add', Ignorar: 'Ignore', 'Abrir seu perfil': 'Open your profile', 'Abrir o mapa-múndi': 'Open the world map',
  'Marcar países que já visitei': "Mark countries I've visited", 'o mapa pinta na hora': 'the map fills in right away',
  'Salvar seu primeiro spot': 'Save your first spot', 'um lugar que você amou ou quer ir': 'a place you loved or want to go',
  'Chamar um amigo': 'Invite a friend', 'e vejam os spots um do outro': "and see each other's spots",
  'Oi, ': 'Hi, ', 'Seu mapa está em branco.': 'Your map is blank.',
  'Comece pelos países onde você já esteve. Leva um minuto.': "Start with the countries you've been to. It takes a minute.",
  'Você conheceu': "You've visited", ' do mundo': ' of the world', 'países': 'countries', cidades: 'cities', spots: 'spots',
  continentes: 'continents', 'Crie uma viagem para pintar o primeiro país.': 'Create a trip to fill in your first country.',
  'Onde você mora': 'Where you live', 'Seu primeiro spot': 'Your first spot',
  'Salve um lugar que você indicaria pra qualquer amigo.': "Save a place you'd recommend to any friend.",
  'Adicionar spot': 'Add spot', 'Colar uma lista do celular': 'Paste a list from your phone',
  'Notas, WhatsApp, Instagram: cole o texto e o Spot encontra os lugares.': 'Notes, WhatsApp, Instagram: paste the text and Spot finds the places.',
  'Salve o primeiro spot e a viagem aparece aqui sozinha.': 'Save your first spot and the trip shows up here on its own.',
  // Amigos
  'Adicionar amigo': 'Add friend', ' foi a ': ' went to ', 'Lisboa · há 2 dias': 'Lisbon · 2 days ago',
  'Convite enviado': 'Invite sent', 'Quando alguém entrar pelo seu link, aparece aqui e vira seu amigo.': 'When someone joins through your link, they show up here and become your friend.',
  'Enviar de novo': 'Send again', 'Assim fica o seu feed': "Here's what your feed looks like",
  'Quem entrar pelo seu link já vira seu amigo.': 'Anyone who joins through your link becomes your friend.',
  'Compartilhar convite': 'Share invite', 'Buscar pelo nome ou @': 'Search by name or @', 'na sua lista': 'on your list',
  'Adicionando...': 'Adding...', '+ minha lista': '+ my list', Atividade: 'Activity',
  'Pedido enviado · esperando aceitar': 'Request sent · waiting for them to accept', ' pedidos enviados · esperando aceitar': ' requests sent · waiting for them to accept',
  ' pedido de amizade': ' friend request', ' pedidos de amizade': ' friend requests',
  'Nenhum pedido': 'No requests', 'Pedidos recebidos e enviados aparecem aqui': 'Received and sent requests show up here',
  Recebidos: 'Received', Enviados: 'Sent', Recusar: 'Decline', Aceitar: 'Accept', Cancelar: 'Cancel',
  'Esperando aceitar · ': 'Waiting to accept · ', 'Esperando aceitar': 'Waiting to accept',
  'Sem amigos ainda': 'No friends yet', 'Toca no + pra adicionar um amigo pelo nome': 'Tap + to add a friend by name',
  'Adiciona alguém pelo username pra ver a atividade aqui': 'Add someone by username to see activity here',
  'Nada por aqui ainda': 'Nothing here yet', 'Seus amigos ainda não marcaram viagens nem spots': "Your friends haven't marked trips or spots yet",
  // Explorar
  'Salvar em Quero ir': 'Save to Wishlist', Fechar: 'Close', 'O que você quer comer?': 'What do you want to eat?',
  'Tendências por lugar': 'Trending by place', 'Cidade, bairro ou rua': 'City, neighborhood or street', Ir: 'Go',
  'Buscas recentes': 'Recent searches', 'Tipo de comida: ': 'Cuisine: ', Todas: 'All',
  'Busque um lugar pra ver o que seus amigos salvaram por lá.': 'Search a place to see what your friends saved there.',
  'Buscando tendências...': 'Finding trends...', 'Nada encontrado': 'Nothing found',
  'Tenta outro lugar: uma cidade, um bairro ou uma rua.': 'Try another place: a city, a neighborhood or a street.',
  'Erro ao buscar': 'Search error', 'Tenta de novo em alguns segundos.': 'Try again in a few seconds.',
  'Descubra o que está bombando': "Discover what's popular", 'Lugares e fotos via Google': 'Places and photos via Google',
  ' avaliações no Google': ' reviews on Google', ' · foto de ': ' · photo by ', 'já foi': 'has been', 'quer ir': 'wants to go',
  'querem ir': 'want to go', 'na lista': 'on the list', ' na lista': ' on the list',
};

export function t(s) {
  if (LANG !== 'en' || typeof s !== 'string') return s;
  return Object.prototype.hasOwnProperty.call(EN, s) ? EN[s] : s;
}
