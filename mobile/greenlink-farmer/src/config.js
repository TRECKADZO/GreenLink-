// Configuration de l'application GreenLink Farmer
// Optimisée pour faible connectivité en Côte d'Ivoire

export const CONFIG = {
  // API Backend - Utilise la même API que le web
  API_URL: 'https://cooperative-mvp.preview.emergentagent.com/api',
  
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

export const COLORS = {
  primary: '#2d5a4d',
  primaryDark: '#1a4038',
  secondary: '#d4a574',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  white: '#ffffff',
  black: '#000000',
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
