import axios from 'axios';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

// User-Agent honnete — les faux User-Agent de navigateur DECLENCHENT Cloudflare
const MOBILE_USER_AGENT = `GreenLinkAgritech/1.62 ${Platform.OS}`;

// === GESTION FAILOVER CDN ===
// Si l'URL primaire (Cloudflare) echoue, on bascule automatiquement sur le proxy Bunny CDN.
// Le CDN relaie les requetes vers le meme backend, mais sans passer par Cloudflare.
let preferFallback = false;
let fallbackSuccessCount = 0;
let primaryFailCount = 0;
const FALLBACK_THRESHOLD = 2;     // Apres 2 echecs primaires consecutifs, preferer le fallback
const PRIMARY_RECHECK_AFTER = 10; // Re-tester le primaire apres 10 requetes CDN reussies

function getActiveBaseURL() {
  if (preferFallback && CONFIG.FALLBACK_API_URL) {
    return CONFIG.FALLBACK_API_URL + '/api';
  }
  return CONFIG.API_URL + '/api';
}

function getFallbackBaseURL() {
  if (CONFIG.FALLBACK_API_URL) {
    return CONFIG.FALLBACK_API_URL + '/api';
  }
  return null;
}

function onPrimarySuccess() {
  primaryFailCount = 0;
  if (preferFallback) {
    console.log('[API] Primary recovered — switching back from CDN');
    preferFallback = false;
    fallbackSuccessCount = 0;
  }
}

function onPrimaryFail() {
  primaryFailCount++;
  if (primaryFailCount >= FALLBACK_THRESHOLD && CONFIG.FALLBACK_API_URL) {
    if (!preferFallback) {
      console.warn(`[API] Primary failed ${primaryFailCount}x — switching to CDN fallback`);
    }
    preferFallback = true;
  }
}

function onFallbackSuccess() {
  fallbackSuccessCount++;
  // Periodiquement re-tester le primaire pour voir s'il est redevenu accessible
  if (fallbackSuccessCount >= PRIMARY_RECHECK_AFTER) {
    console.log('[API] Re-testing primary URL after CDN streak...');
    preferFallback = false;
    fallbackSuccessCount = 0;
    primaryFailCount = 0;
  }
}

// === INSTANCE AXIOS PRINCIPALE ===
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

// Etat de sante du serveur
let serverHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000;

// Intercepteur request — ajoute token + adapte baseURL selon failover
axiosInstance.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    // Adapter l'URL de base selon l'etat du failover
    // Sauf si c'est deja un retry fallback (marqué _useFallback)
    if (!config._useFallback) {
      config.baseURL = getActiveBaseURL();
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Detecter si la reponse est du Cloudflare/HTML au lieu de JSON
function isCloudflareResponse(error) {
  if (!error.response) return false;
  const data = error.response.data;
  const contentType = error.response.headers?.['content-type'] || '';
  
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
  
  if (contentType.includes('text/html')) {
    return true;
  }
  
  return false;
}

// Detecter si c'est une erreur reseau/Cloudflare qui merite un failover CDN
function isFailoverCandidate(error) {
  const status = error.response?.status;
  return (
    !error.response && (error.message?.includes('Network') || error.message?.includes('timeout') || error.code === 'ECONNABORTED') ||
    isCloudflareResponse(error) ||
    status === 403 ||
    status >= 500 ||
    status === 0
  );
}

// Delai progressif avec jitter
function getRetryDelay(attempt) {
  const baseDelay = 3000;
  const jitter = Math.random() * 2000;
  return baseDelay * attempt + jitter;
}

// === INTERCEPTEUR REPONSE avec RETRY + FAILOVER CDN ===
axiosInstance.interceptors.response.use(
  (response) => {
    serverHealthy = true;
    // Tracker le succes selon l'URL utilisee
    if (response.config._useFallback) {
      onFallbackSuccess();
    } else {
      onPrimarySuccess();
    }
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
      console.warn(`[API] Cloudflare block (${status}) for ${config.url}, retry ${currentRetry}/${maxRetries}`);
    }
    
    // Conditions de retry sur l'URL courante
    const shouldRetry = (
      (!error.response && (error.message?.includes('Network') || error.message?.includes('timeout') || error.code === 'ECONNABORTED')) ||
      isCloudflare ||
      (status >= 500) ||
      (status === 0)
    );
    
    // Retry sur la meme URL (primaire ou fallback)
    if (currentRetry < maxRetries && shouldRetry) {
      config._retry = currentRetry + 1;
      const delay = getRetryDelay(config._retry);
      console.log(`[API] Retry ${config._retry}/${maxRetries} in ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosInstance(config);
    }
    
    // === FAILOVER CDN ===
    // Si tous les retries sur l'URL primaire sont epuises ET qu'on n'a pas encore tente le fallback
    const fallbackURL = getFallbackBaseURL();
    if (fallbackURL && !config._useFallback && isFailoverCandidate(error)) {
      console.warn('[API] All retries exhausted on primary — trying CDN fallback:', fallbackURL);
      onPrimaryFail();
      
      // Reset retry counter pour le fallback
      config._retry = 0;
      config._useFallback = true;
      config.baseURL = fallbackURL;
      
      // Petit delai avant le fallback
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return axiosInstance(config);
    }
    
    // Si on etait deja sur le fallback et ca a echoue aussi
    if (config._useFallback && shouldRetry) {
      console.error('[API] CDN fallback also failed');
    }
    
    // Tous les retries et le fallback epuises — formatter le message d'erreur
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

// Verifier la sante du serveur (endpoint leger)
async function checkServerHealth() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && serverHealthy) {
    return serverHealthy;
  }
  
  try {
    // Essayer l'URL active (primaire ou CDN selon l'etat)
    const activeURL = preferFallback ? CONFIG.FALLBACK_API_URL : CONFIG.API_URL;
    const response = await axios.get(activeURL + '/api/health', {
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    });
    serverHealthy = response.status === 200;
    lastHealthCheck = now;
    console.log('[API] Health check:', serverHealthy ? 'OK' : 'FAIL', `(${activeURL})`);
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
  isUsingFallback: () => preferFallback,
  
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
};

// API specifiques pour les producteurs
export const farmerApi = {
  // Parcelles
  getParcels: () => api.get('/greenlink/parcels/my-parcels'),
  createParcel: (data) => api.post('/greenlink/parcels', data),
  
  // Recoltes
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
