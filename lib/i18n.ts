export type Lang = 'es' | 'ca' | 'en';

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'ca', label: 'CA' },
  { id: 'en', label: 'EN' },
];

export const DEFAULT_LANG: Lang = 'es';

/** Locale BCP-47 para Intl.DateTimeFormat segun el idioma elegido. */
export const LOCALE: Record<Lang, string> = {
  es: 'es-AR',
  ca: 'ca-ES',
  en: 'en-GB',
};

const es = {
  // Navbar
  navFixture: 'Fixture',
  navRanking: 'Ranking',
  navForum: 'Foro',
  signIn: 'Ingresar con Google',
  signOut: 'Salir',
  openSearch: 'Abrir busqueda',
  closeSearch: 'Cerrar busqueda',
  openMenu: 'Abrir menu',
  closeMenu: 'Cerrar menu',

  // Home / fixture
  homeTitle: 'Fixture Mundial 2026',
  homeTaglineUser: 'Carga tu pronostico antes de que empiece cada partido.',
  homeTaglineGuest: 'Ingresa con Google para pronosticar y sumar puntos.',
  matchesOfTeam: 'Partidos de {name}',
  matchesOfDate: 'Partidos del {date}',
  clearFilter: '✕ Quitar filtro',
  loadingMatches: 'Cargando partidos...',
  noMatchesSeeded: 'Todavia no hay partidos cargados. Ejecuta',
  noMatchesInView: 'No hay partidos en esta vista.',

  // Filtros del fixture
  filterAll: 'Todos',
  filterGroups: 'Grupos',
  filterR32: '16avos',
  filterR16: '8avos',
  filterQF: 'Cuartos',
  filterSF: 'Semis',
  filterFinal: 'Final',

  // Estados del partido
  statusUpcoming: 'PROXIMO',
  statusClosed: 'CERRADO',
  statusLive: 'EN VIVO',
  statusFinished: 'FINALIZADO',
  partialScore: 'Parcial',

  // MatchCard
  goalsOf: 'Goles {name}',
  yourPrediction: 'Tu pronostico',
  savedPrediction: 'Guardado',
  save: 'Guardar',
  saving: 'Guardando...',
  savedOk: '✓ Guardado',
  signInToPredict: 'Ingresa para pronosticar',
  predictionsToggle: '📊 Predicciones',
  commentsToggle: '💬 Comentarios',

  // MatchPredictionsPanel
  predictionsTitle: '📊 Predicciones',
  player: 'jugador',
  players: 'jugadores',
  loading: 'Cargando...',
  nobodyPredicted: 'Nadie pronostico este partido.',

  // CommentSection
  matchComments: 'Comentarios del partido',
  forumTitle: 'Foro',
  commentPlaceholder: 'Escribi tu comentario...',
  send: 'Enviar',
  signInToComment: 'Inicia sesion para comentar.',
  loadingComments: 'Cargando comentarios...',
  noComments: 'Todavia no hay comentarios. ¡Se el primero!',
  commentError: 'No se pudo publicar el comentario. Proba de nuevo.',
  signInToSeeComments: 'Inicia sesion para ver el foro y los comentarios.',
  likeButton: 'Me gusta',
  unlikeButton: 'Quitar me gusta',
  likedByTitle: 'Les gusta',
  loadingLikers: 'Cargando...',
  replyButton: 'Responder',
  replyingTo: 'Respondiendo a {name}',
  cancelReply: 'Cancelar',
  inReplyTo: 'En respuesta a {name}',
  editButton: 'Editar',
  deleteButton: 'Eliminar',
  confirmDelete: '¿Eliminar comentario?',
  confirmDeleteYes: 'Sí',
  editedLabel: 'editado',
  unreadBadge: '{count} comentarios nuevos',

  // Leaderboard / Sidebar / Ranking
  noPlayersYet: 'Todavia no hay jugadores.',
  sidebarRanking: 'Ranking',
  viewFullRanking: 'Ver ranking completo →',
  rankingTitle: 'Ranking general',
  rankingTagline:
    'Posiciones en tiempo real. Sumas 3 puntos por acertar el resultado y 5 por el marcador exacto.',

  // Foro
  forumTagline:
    'Charla general del prode. Para comentar un partido puntual, abri los comentarios desde su tarjeta en el fixture.',

  // Perfil
  loadingProfile: 'Cargando perfil...',
  playerNotFound: 'No encontramos este jugador.',
  thisIsYourProfile: 'Este es tu perfil',
  exactCount: 'exactos',
  correctCount: 'aciertos',
  revealedPredictions: 'Predicciones reveladas',
  noRevealedPredictions:
    'Todavia no hay predicciones reveladas: se muestran recien cuando el partido pronosticado comienza.',
  pending: 'pendiente',

  // SearchBar
  searchPlaceholder: 'Buscar pais, fecha o jugador...',
  searchTeams: 'Equipos',
  searchDates: 'Fechas',
  searchMatches: 'Partidos',
  searchPlayers: 'Jugadores',
  noResults: 'Sin resultados.',
  match: 'partido',
  matches: 'partidos',

  // Fases (los valores en Firestore estan en castellano)
  stageGroup: 'Grupo {letter}',
  stageR32: 'Ronda de 32',
  stageR16: 'Octavos de Final',
  stageQF: 'Cuartos de Final',
  stageSF: 'Semifinal',
  stageThird: 'Tercer Puesto',
  stageFinal: 'Final',

  // Tiempo relativo
  now: 'ahora',
  minutesAgo: 'hace {n} min',
  hoursAgo: 'hace {n} h',
  daysAgo: 'hace {n} d',
};

export type TranslationKey = keyof typeof es;
type Dict = Record<TranslationKey, string>;

const ca: Dict = {
  navFixture: 'Calendari',
  navRanking: 'Classificació',
  navForum: 'Fòrum',
  signIn: 'Inicia sessió amb Google',
  signOut: 'Sortir',
  openSearch: 'Obre la cerca',
  closeSearch: 'Tanca la cerca',
  openMenu: 'Obre el menú',
  closeMenu: 'Tanca el menú',

  homeTitle: 'Calendari Mundial 2026',
  homeTaglineUser: 'Carrega el teu pronòstic abans que comenci cada partit.',
  homeTaglineGuest: 'Inicia sessió amb Google per pronosticar i sumar punts.',
  matchesOfTeam: 'Partits de {name}',
  matchesOfDate: 'Partits del {date}',
  clearFilter: '✕ Treu el filtre',
  loadingMatches: 'Carregant partits...',
  noMatchesSeeded: 'Encara no hi ha partits carregats. Executa',
  noMatchesInView: 'No hi ha partits en aquesta vista.',

  filterAll: 'Tots',
  filterGroups: 'Grups',
  filterR32: 'Setzens',
  filterR16: 'Vuitens',
  filterQF: 'Quarts',
  filterSF: 'Semis',
  filterFinal: 'Final',

  statusUpcoming: 'PROPER',
  statusClosed: 'TANCAT',
  statusLive: 'EN DIRECTE',
  partialScore: 'Parcial',
  statusFinished: 'FINALITZAT',

  goalsOf: 'Gols {name}',
  yourPrediction: 'El teu pronòstic',
  savedPrediction: 'Desat',
  save: 'Desa',
  saving: 'Desant...',
  savedOk: '✓ Desat',
  signInToPredict: 'Inicia sessió per pronosticar',
  predictionsToggle: '📊 Prediccions',
  commentsToggle: '💬 Comentaris',

  predictionsTitle: '📊 Prediccions',
  player: 'jugador',
  players: 'jugadors',
  loading: 'Carregant...',
  nobodyPredicted: 'Ningú ha pronosticat aquest partit.',

  matchComments: 'Comentaris del partit',
  forumTitle: 'Fòrum',
  commentPlaceholder: 'Escriu el teu comentari...',
  send: 'Envia',
  signInToComment: 'Inicia sessió per comentar.',
  loadingComments: 'Carregant comentaris...',
  noComments: 'Encara no hi ha comentaris. Sigues el primer!',
  commentError: "No s'ha pogut publicar el comentari. Torna-ho a provar.",
  signInToSeeComments: 'Inicia sessió per veure el fòrum i els comentaris.',
  likeButton: "M'agrada",
  unlikeButton: "Treure el m'agrada",
  likedByTitle: 'Els agrada',
  loadingLikers: 'Carregant...',
  replyButton: 'Respondre',
  replyingTo: 'Responent a {name}',
  cancelReply: 'Cancel·lar',
  inReplyTo: 'En resposta a {name}',
  editButton: 'Edita',
  deleteButton: 'Elimina',
  confirmDelete: 'Eliminar el comentari?',
  confirmDeleteYes: 'Sí',
  editedLabel: 'editat',
  unreadBadge: '{count} comentaris nous',

  noPlayersYet: 'Encara no hi ha jugadors.',
  sidebarRanking: 'Classificació',
  viewFullRanking: 'Mostra la classificació completa →',
  rankingTitle: 'Classificació general',
  rankingTagline:
    'Posicions en temps real. Sumes 3 punts per encertar el resultat i 5 pel marcador exacte.',

  forumTagline:
    'Xerrada general del prode. Per comentar un partit concret, obre els comentaris des de la seva targeta al calendari.',

  loadingProfile: 'Carregant perfil...',
  playerNotFound: 'No hem trobat aquest jugador.',
  thisIsYourProfile: 'Aquest és el teu perfil',
  exactCount: 'exactes',
  correctCount: 'encerts',
  revealedPredictions: 'Prediccions revelades',
  noRevealedPredictions:
    'Encara no hi ha prediccions revelades: es mostren quan comença el partit pronosticat.',
  pending: 'pendent',

  searchPlaceholder: 'Cerca país, data o jugador...',
  searchTeams: 'Equips',
  searchDates: 'Dates',
  searchMatches: 'Partits',
  searchPlayers: 'Jugadors',
  noResults: 'Sense resultats.',
  match: 'partit',
  matches: 'partits',

  stageGroup: 'Grup {letter}',
  stageR32: 'Setzens de final',
  stageR16: 'Vuitens de final',
  stageQF: 'Quarts de final',
  stageSF: 'Semifinal',
  stageThird: 'Tercer lloc',
  stageFinal: 'Final',

  now: 'ara',
  minutesAgo: 'fa {n} min',
  hoursAgo: 'fa {n} h',
  daysAgo: 'fa {n} d',
};

const en: Dict = {
  navFixture: 'Fixtures',
  navRanking: 'Leaderboard',
  navForum: 'Forum',
  signIn: 'Sign in with Google',
  signOut: 'Sign out',
  openSearch: 'Open search',
  closeSearch: 'Close search',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',

  homeTitle: '2026 World Cup Fixtures',
  homeTaglineUser: 'Enter your prediction before each match kicks off.',
  homeTaglineGuest: 'Sign in with Google to predict and earn points.',
  matchesOfTeam: '{name} matches',
  matchesOfDate: 'Matches on {date}',
  clearFilter: '✕ Clear filter',
  loadingMatches: 'Loading matches...',
  noMatchesSeeded: 'No matches loaded yet. Run',
  noMatchesInView: 'No matches in this view.',

  filterAll: 'All',
  filterGroups: 'Groups',
  filterR32: 'R32',
  filterR16: 'R16',
  filterQF: 'Quarters',
  filterSF: 'Semis',
  filterFinal: 'Final',

  statusUpcoming: 'UPCOMING',
  statusClosed: 'CLOSED',
  statusLive: 'LIVE',
  partialScore: 'Live',
  statusFinished: 'FINISHED',

  goalsOf: '{name} goals',
  yourPrediction: 'Your prediction',
  savedPrediction: 'Saved',
  save: 'Save',
  saving: 'Saving...',
  savedOk: '✓ Saved',
  signInToPredict: 'Sign in to predict',
  predictionsToggle: '📊 Predictions',
  commentsToggle: '💬 Comments',

  predictionsTitle: '📊 Predictions',
  player: 'player',
  players: 'players',
  loading: 'Loading...',
  nobodyPredicted: 'No one predicted this match.',

  matchComments: 'Match comments',
  forumTitle: 'Forum',
  commentPlaceholder: 'Write your comment...',
  send: 'Send',
  signInToComment: 'Sign in to comment.',
  loadingComments: 'Loading comments...',
  noComments: 'No comments yet. Be the first!',
  commentError: 'Could not post the comment. Try again.',
  signInToSeeComments: 'Sign in to see the forum and comments.',
  likeButton: 'Like',
  unlikeButton: 'Unlike',
  likedByTitle: 'Liked by',
  loadingLikers: 'Loading...',
  replyButton: 'Reply',
  replyingTo: 'Replying to {name}',
  cancelReply: 'Cancel',
  inReplyTo: 'In reply to {name}',
  editButton: 'Edit',
  deleteButton: 'Delete',
  confirmDelete: 'Delete comment?',
  confirmDeleteYes: 'Yes',
  editedLabel: 'edited',
  unreadBadge: '{count} new comments',

  noPlayersYet: 'No players yet.',
  sidebarRanking: 'Leaderboard',
  viewFullRanking: 'View full leaderboard →',
  rankingTitle: 'Overall leaderboard',
  rankingTagline:
    'Live standings. You earn 3 points for the correct outcome and 5 for the exact score.',

  forumTagline:
    'General chat about the prode. To discuss a specific match, open the comments from its card in the fixtures.',

  loadingProfile: 'Loading profile...',
  playerNotFound: 'Player not found.',
  thisIsYourProfile: 'This is your profile',
  exactCount: 'exact',
  correctCount: 'correct',
  revealedPredictions: 'Revealed predictions',
  noRevealedPredictions:
    'No revealed predictions yet: they appear once the predicted match kicks off.',
  pending: 'pending',

  searchPlaceholder: 'Search country, date or player...',
  searchTeams: 'Teams',
  searchDates: 'Dates',
  searchMatches: 'Matches',
  searchPlayers: 'Players',
  noResults: 'No results.',
  match: 'match',
  matches: 'matches',

  stageGroup: 'Group {letter}',
  stageR32: 'Round of 32',
  stageR16: 'Round of 16',
  stageQF: 'Quarter-finals',
  stageSF: 'Semi-final',
  stageThird: 'Third place',
  stageFinal: 'Final',

  now: 'now',
  minutesAgo: '{n} min ago',
  hoursAgo: '{n} h ago',
  daysAgo: '{n} d ago',
};

const DICTS: Record<Lang, Dict> = { es, ca, en };

/** Traduce una clave, reemplazando placeholders {x} si se pasan vars. */
export function translate(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  let out = DICTS[lang][key] ?? es[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}

/**
 * Traduce el nombre de fase tal como esta guardado en Firestore (castellano:
 * "Grupo A", "Ronda de 32", "Octavos de Final", ...). Si no se reconoce,
 * devuelve el valor original.
 */
export function translateStage(lang: Lang, stage: string): string {
  const group = stage.match(/^Grupo ([A-L])$/);
  if (group) return translate(lang, 'stageGroup', { letter: group[1] });
  const map: Record<string, TranslationKey> = {
    'Ronda de 32': 'stageR32',
    'Octavos de Final': 'stageR16',
    'Cuartos de Final': 'stageQF',
    Semifinal: 'stageSF',
    'Tercer Puesto': 'stageThird',
    Final: 'stageFinal',
  };
  const key = map[stage];
  return key ? translate(lang, key) : stage;
}
