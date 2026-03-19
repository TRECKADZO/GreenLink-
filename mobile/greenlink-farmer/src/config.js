// Configuration de l'application GreenLink Farmer
// Optimisée pour faible connectivité en Côte d'Ivoire

export const CONFIG = {
  // API Backend - Uses EXPO_PUBLIC_API_URL from EAS build or falls back to hardcoded URL
  API_URL: process.env.EXPO_PUBLIC_API_URL 
    || 'https://greenlink-bug-fixes.preview.emergentagent.com',
  
  // Timeouts adaptés à la faible connectivité
  REQUEST_TIMEOUT: 30000, // 30 secondes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 secondes entre les tentatives
  
  // Cache local
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 heures
  
  // Synchronisation offline
  SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  
  // Pagination
  PAGE_SIZE: 10,
};

// Named export for backward compatibility with screens importing { API_URL }
export const API_URL = CONFIG.API_URL;


export const COLORS = {
  primary: '#2d5a4d',
  primaryDark: '#1a4038',
  secondary: '#d4a574',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  // UI Colors
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  orange: '#f97316', // Orange Money
  accent: '#d4a574', // Accent color (same as secondary)
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Messages USSD-style
export const MESSAGES = {
  welcome: "Bienvenue sur GreenLink",
  selectOption: "Sélectionnez une option:",
  loading: "Chargement...",
  offline: "Mode hors-ligne",
  sync: "Synchronisation...",
  error: "Une erreur est survenue",
  retry: "Réessayer",
  success: "Opération réussie",
  noData: "Aucune donnée",
  
  // Menu principal
  menu: {
    parcels: "1. Mes Parcelles",
    harvest: "2. Déclarer Récolte",
    payments: "3. Mes Paiements",
    notifications: "4. Notifications",
    profile: "5. Mon Profil",
    logout: "0. Déconnexion",
  },
};

// Liste des 51 départements producteurs de Côte d'Ivoire
export const DEPARTEMENTS = [
  { code: "ABEN", nom: "Abengourou", zone: "Est" },
  { code: "ABID", nom: "Abidjan", zone: "Sud" },
  { code: "ABOI", nom: "Aboisso", zone: "Sud-Est" },
  { code: "ADIA", nom: "Adiaké", zone: "Sud-Est" },
  { code: "ADZO", nom: "Adzopé", zone: "Sud-Est" },
  { code: "AGBO", nom: "Agboville", zone: "Sud" },
  { code: "AGNI", nom: "Agnibilékro", zone: "Est" },
  { code: "ALEP", nom: "Alépé", zone: "Sud-Est" },
  { code: "BANG", nom: "Bangolo", zone: "Ouest" },
  { code: "BEOU", nom: "Béoumi", zone: "Centre" },
  { code: "BIAN", nom: "Biankouma", zone: "Ouest" },
  { code: "BOCA", nom: "Bocanda", zone: "Centre" },
  { code: "BOND", nom: "Bondoukou", zone: "Nord-Est" },
  { code: "BONG", nom: "Bongouanou", zone: "Centre-Est" },
  { code: "BOUA", nom: "Bouaflé", zone: "Centre-Ouest" },
  { code: "BOUK", nom: "Bouaké", zone: "Centre" },
  { code: "DABA", nom: "Dabakala", zone: "Nord" },
  { code: "DABO", nom: "Dabou", zone: "Sud" },
  { code: "DANA", nom: "Danané", zone: "Ouest" },
  { code: "DAOU", nom: "Daoukro", zone: "Centre-Est" },
  { code: "DIMB", nom: "Dimbokro", zone: "Centre" },
  { code: "DALO", nom: "Daloa", zone: "Centre-Ouest" },
  { code: "DIVO", nom: "Divo", zone: "Sud" },
  { code: "DOUE", nom: "Duékoué", zone: "Ouest" },
  { code: "GAGN", nom: "Gagnoa", zone: "Centre-Ouest" },
  { code: "BASS", nom: "Grand-Bassam", zone: "Sud" },
  { code: "LAHO", nom: "Grand-Lahou", zone: "Sud" },
  { code: "GUIG", nom: "Guiglo", zone: "Ouest" },
  { code: "ISSI", nom: "Issia", zone: "Centre-Ouest" },
  { code: "JACQ", nom: "Jacqueville", zone: "Sud" },
  { code: "LAKO", nom: "Lakota", zone: "Sud-Ouest" },
  { code: "MAN", nom: "Man", zone: "Ouest" },
  { code: "MANK", nom: "Mankono", zone: "Nord" },
  { code: "MBAH", nom: "M'Bahiakro", zone: "Centre" },
  { code: "OUME", nom: "Oumé", zone: "Centre-Ouest" },
  { code: "SAKA", nom: "Sakassou", zone: "Centre" },
  { code: "SANP", nom: "San-Pédro", zone: "Sud-Ouest" },
  { code: "SASS", nom: "Sassandra", zone: "Sud-Ouest" },
  { code: "SEGU", nom: "Séguéla", zone: "Nord-Ouest" },
  { code: "SINF", nom: "Sinfra", zone: "Centre-Ouest" },
  { code: "SOUB", nom: "Soubré", zone: "Sud-Ouest" },
  { code: "TABO", nom: "Tabou", zone: "Sud-Ouest" },
  { code: "TAND", nom: "Tanda", zone: "Nord-Est" },
  { code: "TIAS", nom: "Tiassalé", zone: "Sud" },
  { code: "TOUL", nom: "Touleupleu", zone: "Ouest" },
  { code: "TIEB", nom: "Tiébissou", zone: "Centre" },
  { code: "TOUB", nom: "Touba", zone: "Nord-Ouest" },
  { code: "TOUM", nom: "Toumodi", zone: "Centre" },
  { code: "VAVO", nom: "Vavoua", zone: "Centre-Ouest" },
  { code: "YAMO", nom: "Yamoussoukro", zone: "Centre" },
  { code: "ZUEN", nom: "Zuénoula", zone: "Centre-Ouest" },
];

// Cultures principales
export const CULTURES = [
  { id: "cacao", nom: "Cacao", emoji: "🌰" },
  { id: "cafe", nom: "Café", emoji: "☕" },
  { id: "anacarde", nom: "Anacarde", emoji: "🥜" },
  { id: "hevea", nom: "Hévéa", emoji: "🌳" },
  { id: "palmier", nom: "Palmier", emoji: "🌴" },
  { id: "riz", nom: "Riz", emoji: "🌾" },
  { id: "maraichage", nom: "Maraîchage", emoji: "🥬" },
];
