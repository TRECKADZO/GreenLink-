import axios from 'axios';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

// User-Agent honnete — les faux User-Agent de navigateur DECLENCHENT Cloudflare
const MOBILE_USER_AGENT = `GreenLinkAgritech/1.60 ${Platform.OS}`;

// Instance axios avec headers minimaux et honnetes
// IMPORTANT: Moins de headers custom = moins de suspicion Cloudflare
const axiosInstance = axios.create({
  baseURL: CONFIG.API_URL + '/api',
  timeout: CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token d'authentification
let authToken = null;

// État de santé du serveur
let serverHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 secondes entre les checks

// Intercepteur pour ajouter le token
axiosInstance.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    // AUCUN cache-buster sur les URLs — le proxy/CDN peut mal router les requetes avec query params
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Détecter si la réponse est du Cloudflare/HTML au lieu de JSON
function isCloudflareResponse(error) {
  if (!error.response) return false;
  const data = error.response.data;
  const contentType = error.response.headers?.['content-type'] || '';
  
  // Réponse HTML au lieu de JSON
  if (typeof data === 'string' && (
    data.includes('<!DOCTYPE') || 
    data.includes('<html') || 
    data.includes('cloudflare') ||
    data.includes('cf-') ||
    data.includes('Attention Required') ||
    data.includes('Just a moment')
  )) {
    return true;
  }
  
  // Content-Type HTML quand on attend du JSON
  if (contentType.includes('text/html')) {
    return true;
  }
  
  return false;
}

// Delai progressif avec jitter — adapte aux reseaux lents CI
function getRetryDelay(attempt) {
  const baseDelay = 3000; // 3s base — laisser le temps au reseau 2G/3G
  const jitter = Math.random() * 2000; // 0-2s aleatoire
  return baseDelay * attempt + jitter; // 3s, 6s, 9s, 12s (progressif)
}

// Intercepteur de réponse avec retry simple et robuste
axiosInstance.interceptors.response.use(
  (response) => {
    serverHealthy = true;
    return response;
  },
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);
    
    const currentRetry = config._retry || 0;
    const maxRetries = CONFIG.RETRY_ATTEMPTS;
    const isCloudflare = isCloudflareResponse(error);
    const status = error.response?.status;
    
    if (isCloudflare) {
      console.warn(`[API] Cloudflare block detected (${status}) for ${config.url}, retry ${currentRetry}/${maxRetries}`);
    }
    
    // Conditions de retry — adaptees faible connectivite CI
    const shouldRetry = (
      // Erreur réseau (pas de réponse du tout) — frequent en 2G/3G
      (!error.response && (error.message?.includes('Network') || error.message?.includes('timeout') || error.code === 'ECONNABORTED')) ||
      // Cloudflare HTML response
      isCloudflare ||
      // Erreurs serveur 5xx
      (status >= 500) ||
      // Erreur 0 (connexion échouée)
      (status === 0)
    );
    // NOTE: On ne retente PAS les 404 — un 404 signifie que l'URL n'existe pas
    // Le cache-buster sur POST causait des 404 en boucle auparavant
    
    if (currentRetry < maxRetries && shouldRetry) {
      config._retry = currentRetry + 1;
      const delay = getRetryDelay(config._retry);
      
      console.log(`[API] Retry ${config._retry}/${maxRetries} in ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // IMPORTANT: NE PAS modifier l'URL sur les retries
      // Les cache-busters et modifications d'URL causent des 404 proxy
      
      return axiosInstance(config);
    }
    
    // Tous les retries épuisés — formatter le message d'erreur
    if (!error.response) {
      serverHealthy = false;
      error.response = {
        status: 0,
        data: { detail: 'Pas de connexion internet. Verifiez votre reseau et reessayez.' }
      };
    } else if (isCloudflare) {
      serverHealthy = false;
      error.response.data = {
        detail: 'Le serveur est temporairement inaccessible. Veuillez patienter quelques instants et reessayer.'
      };
    }
    
    return Promise.reject(error);
  }
);

// Vérifier la santé du serveur (endpoint léger)
async function checkServerHealth() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && serverHealthy) {
    return serverHealthy;
  }
  
  try {
    const response = await axios.get(CONFIG.API_URL + '/api/health', {
      timeout: 15000, // 15s — assez pour 2G/3G sans bloquer longtemps
      headers: {
        'Accept': 'application/json',
      },
    });
    serverHealthy = response.status === 200;
    lastHealthCheck = now;
    console.log('[API] Health check:', serverHealthy ? 'OK' : 'FAIL');
    return serverHealthy;
  } catch (e) {
    console.warn('[API] Health check failed:', e.message);
    serverHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}

export const api = {
  setToken: (token) => {
    authToken = token;
  },
  
  checkHealth: checkServerHealth,
  isServerHealthy: () => serverHealthy,
  
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
};

// API spécifiques pour les producteurs
export const farmerApi = {
  // Parcelles
  getParcels: () => api.get('/greenlink/parcels/my-parcels'),
  createParcel: (data) => api.post('/greenlink/parcels', data),
  
  // Récoltes
  getHarvests: (params) => api.get(`/greenlink/harvests/my-harvests${params || ''}`),
  createHarvest: (data) => api.post('/greenlink/harvests', data),
  
  // Dashboard
  getDashboard: () => api.get('/greenlink/farmer/dashboard'),
  
  // Paiements
  getPaymentRequests: () => api.get('/greenlink/payments/my-requests'),
  createPaymentRequest: (data) => api.post('/greenlink/payments/request', data),
  
  // SMS / Notifications
  getSmsHistory: () => api.get('/greenlink/sms/history'),
  getNotifications: () => api.get('/greenlink/notifications'),
  markNotificationRead: (id) => api.put(`/greenlink/notifications/${id}/read`),
  
  // Score carbone
  getCarbonScore: () => api.get('/greenlink/carbon/my-score'),
  
  // Device registration for push notifications
  registerDevice: (data) => api.post('/greenlink/notifications/register-device', data),
  unregisterDevice: (token) => api.delete(`/greenlink/notifications/unregister-device?push_token=${token}`),
};
