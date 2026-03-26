import axios from 'axios';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

// User-Agent honnete — les faux User-Agent de navigateur DECLENCHENT Cloudflare
const MOBILE_USER_AGENT = `GreenLinkAgritech/1.63 ${Platform.OS}`;

// === GESTION FAILOVER CDN ===
// STRATEGIE: CDN en PREMIER car Cloudflare bloque les reseaux mobiles CI
// Si le CDN echoue, on bascule sur l'URL directe (fallback)
let preferPrimary = false; // false = CDN d'abord (defaut)
let cdnConsecutiveFails = 0;
let primaryConsecutiveFails = 0;
const SWITCH_THRESHOLD = 3;

function getActiveBaseURL() {
  if (preferPrimary) {
    return CONFIG.API_URL + '/api';
  }
  // Par defaut: CDN d'abord (contourne Cloudflare)
  return (CONFIG.FALLBACK_API_URL || CONFIG.API_URL) + '/api';
}

function getAlternateBaseURL() {
  if (preferPrimary) {
    return (CONFIG.FALLBACK_API_URL || CONFIG.API_URL) + '/api';
  }
  return CONFIG.API_URL + '/api';
}

function onActiveSuccess() {
  if (preferPrimary) {
    primaryConsecutiveFails = 0;
  } else {
    cdnConsecutiveFails = 0;
  }
}

function onActiveFail() {
  if (preferPrimary) {
    primaryConsecutiveFails++;
    if (primaryConsecutiveFails >= SWITCH_THRESHOLD && CONFIG.FALLBACK_API_URL) {
      console.warn('[API] Primary failed too many times, switching to CDN');
      preferPrimary = false;
      primaryConsecutiveFails = 0;
    }
  } else {
    cdnConsecutiveFails++;
    if (cdnConsecutiveFails >= SWITCH_THRESHOLD) {
      console.warn('[API] CDN failed too many times, switching to primary');
      preferPrimary = true;
      cdnConsecutiveFails = 0;
    }
  }
}

// === INSTANCE AXIOS PRINCIPALE ===
const axiosInstance = axios.create({
  // CDN par defaut pour contourner Cloudflare
  baseURL: (CONFIG.FALLBACK_API_URL || CONFIG.API_URL) + '/api',
  timeout: CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token d'authentification
let authToken = null;

// Etat de sante
let serverHealthy = true;

// Intercepteur request
axiosInstance.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    // Utiliser l'URL active (CDN ou primaire) sauf si deja en mode fallback
    if (!config._useAlternate) {
      config.baseURL = getActiveBaseURL();
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Detecter reponse Cloudflare/HTML
function isCloudflareResponse(error) {
  if (!error.response) return false;
  const data = error.response.data;
  const contentType = error.response.headers?.['content-type'] || '';
  if (typeof data === 'string' && (
    data.includes('<!DOCTYPE') || data.includes('<html') ||
    data.includes('cloudflare') || data.includes('cf-') ||
    data.includes('Attention Required') || data.includes('Just a moment')
  )) return true;
  if (contentType.includes('text/html')) return true;
  return false;
}

// Erreur qui merite un failover vers l'URL alternative
function shouldFailover(error) {
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
  const baseDelay = 2000; // 2s base (reduit de 3s)
  const jitter = Math.random() * 1500;
  return baseDelay * attempt + jitter;
}

// === INTERCEPTEUR REPONSE ===
axiosInstance.interceptors.response.use(
  (response) => {
    serverHealthy = true;
    if (response.config._useAlternate) {
      // L'alternative a fonctionne -> inverser la preference
      preferPrimary = !preferPrimary;
      console.log(`[API] Alternate success — switching default to ${preferPrimary ? 'primary' : 'CDN'}`);
    } else {
      onActiveSuccess();
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
      console.warn(`[API] Cloudflare block (${status}) on ${config.baseURL}${config.url}`);
    }

    // Conditions de retry
    const canRetry = (
      (!error.response && (error.message?.includes('Network') || error.message?.includes('timeout') || error.code === 'ECONNABORTED')) ||
      isCloudflare ||
      (status >= 500) ||
      (status === 0)
    );

    // Retry sur l'URL courante (max 2 tentatives)
    if (currentRetry < maxRetries && canRetry) {
      config._retry = currentRetry + 1;
      const delay = getRetryDelay(config._retry);
      console.log(`[API] Retry ${config._retry}/${maxRetries} in ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosInstance(config);
    }

    // === FAILOVER vers l'URL ALTERNATIVE ===
    const alternateURL = getAlternateBaseURL();
    if (alternateURL && !config._useAlternate && shouldFailover(error)) {
      console.warn(`[API] Switching to alternate: ${alternateURL}`);
      onActiveFail();

      config._retry = 0;
      config._useAlternate = true;
      config.baseURL = alternateURL;

      await new Promise(resolve => setTimeout(resolve, 1000));
      return axiosInstance(config);
    }

    // Tout a echoue
    if (!error.response) {
      serverHealthy = false;
      error.response = {
        status: 0,
        data: { detail: 'Pas de connexion internet. Verifiez votre reseau et reessayez.' }
      };
    } else if (isCloudflare) {
      serverHealthy = false;
      error.response.data = {
        detail: 'Le serveur est temporairement inaccessible. Veuillez patienter et reessayer.'
      };
    }

    return Promise.reject(error);
  }
);

// === RACING: Essayer les deux URLs en parallele ===
// Utilise pour les operations critiques (login, premiere requete)
async function raceRequest(method, url, data = null, extraConfig = {}) {
  const urls = [
    (CONFIG.FALLBACK_API_URL || CONFIG.API_URL) + '/api' + url,
    CONFIG.API_URL + '/api' + url,
  ];
  // Deduplicate si FALLBACK == primary
  const uniqueUrls = [...new Set(urls)];

  if (uniqueUrls.length === 1) {
    // Pas de CDN, requete simple
    if (method === 'post') return axiosInstance.post(url, data, extraConfig);
    return axiosInstance.get(url, extraConfig);
  }

  const makeRequest = (baseUrl) => {
    const reqConfig = {
      ...extraConfig,
      timeout: 30000, // 30s pour le racing
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...(extraConfig.headers || {}),
      },
    };
    if (method === 'post') {
      return axios.post(baseUrl, data, reqConfig);
    }
    return axios.get(baseUrl, reqConfig);
  };

  // Lancer les deux en parallele, prendre le premier qui reussit
  try {
    const result = await Promise.any(uniqueUrls.map(u => makeRequest(u)));
    console.log(`[API] Race winner: ${result.config?.url || 'unknown'}`);
    serverHealthy = true;
    return result;
  } catch (aggregateError) {
    // Tous ont echoue
    console.error('[API] All race URLs failed');
    serverHealthy = false;
    const lastError = aggregateError.errors?.[0] || aggregateError;
    throw lastError;
  }
}

// Health check via l'URL active
async function checkServerHealth() {
  try {
    const activeURL = getActiveBaseURL().replace('/api', '');
    const response = await axios.get(activeURL + '/api/health', {
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    });
    serverHealthy = response.status === 200;
    console.log('[API] Health:', serverHealthy ? 'OK' : 'FAIL');
    return serverHealthy;
  } catch (e) {
    console.warn('[API] Health failed:', e.message);
    serverHealthy = false;
    return false;
  }
}

export const api = {
  setToken: (token) => { authToken = token; },
  checkHealth: checkServerHealth,
  isServerHealthy: () => serverHealthy,
  isUsingCDN: () => !preferPrimary,

  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),

  // Racing pour operations critiques
  racePost: (url, data, config) => raceRequest('post', url, data, config),
  raceGet: (url, config) => raceRequest('get', url, null, config),
};

// API specifiques producteurs
export const farmerApi = {
  getParcels: () => api.get('/greenlink/parcels/my-parcels'),
  createParcel: (data) => api.post('/greenlink/parcels', data),
  getHarvests: (params) => api.get(`/greenlink/harvests/my-harvests${params || ''}`),
  createHarvest: (data) => api.post('/greenlink/harvests', data),
  getDashboard: () => api.get('/greenlink/farmer/dashboard'),
  getPaymentRequests: () => api.get('/greenlink/payments/my-requests'),
  createPaymentRequest: (data) => api.post('/greenlink/payments/request', data),
  getSmsHistory: () => api.get('/greenlink/sms/history'),
  getNotifications: () => api.get('/greenlink/notifications'),
  markNotificationRead: (id) => api.put(`/greenlink/notifications/${id}/read`),
  getCarbonScore: () => api.get('/greenlink/carbon/my-score'),
  registerDevice: (data) => api.post('/greenlink/notifications/register-device', data),
  unregisterDevice: (token) => api.delete(`/greenlink/notifications/unregister-device?push_token=${token}`),
};
