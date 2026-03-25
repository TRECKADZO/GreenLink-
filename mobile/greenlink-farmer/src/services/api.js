import axios from 'axios';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

// User-Agent réaliste pour éviter le blocage Cloudflare
const MOBILE_USER_AGENT = Platform.OS === 'android'
  ? 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Instance axios avec headers anti-bot
const axiosInstance = axios.create({
  baseURL: CONFIG.API_URL + '/api',
  timeout: CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': MOBILE_USER_AGENT,
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
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
    // N'ajouter le cache-buster que pour les requêtes GET (les POST/PUT/DELETE n'en ont pas besoin)
    if (config.method === 'get') {
      const separator = config.url.includes('?') ? '&' : '?';
      config.url = `${config.url}${separator}_t=${Date.now()}`;
    }
    
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

// Jitter aléatoire pour éviter les patterns détectés comme bot
function getRetryDelay(attempt) {
  const baseDelay = 1500;
  const jitter = Math.random() * 1000;
  return baseDelay * attempt + jitter;
}

// Intercepteur de réponse avec retry intelligent anti-Cloudflare
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
    
    // Log détaillé pour debug
    if (isCloudflare) {
      console.warn(`[API] Cloudflare block detected (${status}) for ${config.url}, retry ${currentRetry}/${maxRetries}`);
    }
    
    // Conditions de retry
    const shouldRetry = (
      // Erreur réseau (pas de réponse)
      (!error.response && (error.message?.includes('Network') || error.message?.includes('timeout'))) ||
      // Cloudflare HTML response
      isCloudflare ||
      // Erreurs serveur 5xx
      (status >= 500) ||
      // Erreur 404 transitoire (proxy/CDN mal routé)
      (status === 404 && currentRetry < 2) ||
      // Erreur 0 (connexion échouée)
      (status === 0)
    );
    
    if (currentRetry < maxRetries && shouldRetry) {
      config._retry = currentRetry + 1;
      const delay = getRetryDelay(config._retry);
      
      console.log(`[API] Retry ${config._retry}/${maxRetries} in ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Sur les retries Cloudflare, varier les headers pour éviter le pattern
      if (isCloudflare && config._retry > 2) {
        config.headers['Accept'] = 'application/json, text/plain, */*';
        config.headers['Accept-Language'] = 'fr-FR,fr;q=0.9';
        // Supprimer le timestamp cache-buster précédent et en ajouter un nouveau
        config.url = config.url.replace(/[?&]_t=\d+/, '');
        const sep = config.url.includes('?') ? '&' : '?';
        config.url = `${config.url}${sep}_t=${Date.now()}`;
      }
      
      return axiosInstance(config);
    }
    
    // Tous les retries épuisés — formatter le message d'erreur
    if (!error.response) {
      // Pas de réponse du tout
      serverHealthy = false;
      error.response = {
        status: 0,
        data: { detail: 'Pas de connexion internet. Verifiez votre reseau et reessayez.' }
      };
    } else if (isCloudflare) {
      // Cloudflare bloque encore après tous les retries
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
      timeout: 10000,
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
      },
    });
    serverHealthy = response.status === 200;
    lastHealthCheck = now;
    console.log('[API] Health check:', serverHealthy ? 'OK' : 'FAIL');
    return serverHealthy;
  } catch (e) {
    console.warn('[API] Health check failed:', e.message);
    
    // Essai avec headers alternatifs si le premier échoue (Cloudflare)
    try {
      const response2 = await axios.get(CONFIG.API_URL + '/api/health?_t=' + Date.now(), {
        timeout: 10000,
        headers: {
          'User-Agent': MOBILE_USER_AGENT,
          'Accept': '*/*',
          'Accept-Language': 'fr-FR,fr;q=0.9',
        },
      });
      serverHealthy = response2.status === 200;
      lastHealthCheck = now;
      return serverHealthy;
    } catch (e2) {
      serverHealthy = false;
      lastHealthCheck = now;
      return false;
    }
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
