/**
 * Client API centralise — fetch natif + AbortController
 * 
 * Anti-Cloudflare: headers browser-like pour eviter le Bot Fight Mode
 * Retry automatique avec backoff exponentiel (3 tentatives, 20s/40s/60s)
 * Compatible React Native / Expo / Web
 */
import { Platform } from 'react-native';
import { CONFIG } from '../config';

// URL unique vers le backend (pas de fallback CDN)
const BASE_URL = CONFIG.DIRECT_API_URL + '/api';

// Token d'authentification
let authToken = null;

// User-Agent realiste selon la plateforme
const USER_AGENT = Platform.OS === 'ios'
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Headers qui imitent un vrai navigateur mobile
function getHeaders(extraHeaders = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...extraHeaders,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

// ========================
// Types d'erreur custom
// ========================
class ApiError extends Error {
  constructor(message, status, data, type) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.type = type; // 'timeout' | 'network' | 'abort' | 'http' | 'unknown'
    // Compat Axios : certains screens lisent error.response
    this.response = status ? { status, data } : undefined;
  }
}

// ========================
// Fetch avec timeout via AbortController
// ========================
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ========================
// Requete avec retry + backoff exponentiel
// ========================
const RETRY_TIMEOUTS = [20000, 40000, 60000]; // 20s, 40s, 60s
const MAX_RETRIES = 3;

async function requestWithRetry(url, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const timeout = RETRY_TIMEOUTS[attempt];

    try {
      if (__DEV__) {
        console.log(`[API] ${options.method || 'GET'} ${url} (tentative ${attempt + 1}/${MAX_RETRIES}, timeout ${timeout / 1000}s)`);
      }

      const response = await fetchWithTimeout(url, options, timeout);

      // Reponse HTTP recue (meme si erreur 4xx/5xx)
      const contentType = response.headers?.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        if (__DEV__) console.log(`[API] ${response.status} OK ${url}`);
        return { data, status: response.status };
      }

      // Erreur HTTP 4xx — ne pas retry (erreur client)
      if (response.status >= 400 && response.status < 500) {
        if (__DEV__) console.warn(`[API] ${response.status} ${url}`, data);
        throw new ApiError(
          typeof data?.detail === 'string' ? data.detail : `Erreur ${response.status}`,
          response.status,
          data,
          'http'
        );
      }

      // Erreur HTTP 5xx — retry
      if (__DEV__) console.warn(`[API] ${response.status} serveur, retry...`, url);
      lastError = new ApiError(`Erreur serveur ${response.status}`, response.status, data, 'http');

    } catch (err) {
      // AbortError = timeout
      if (err.name === 'AbortError') {
        if (__DEV__) console.warn(`[API] Timeout ${timeout / 1000}s ${url} (tentative ${attempt + 1})`);
        lastError = new ApiError('Timeout', 0, null, 'timeout');
      }
      // Erreur reseau (pas de response du tout)
      else if (err.name === 'TypeError' && (err.message?.includes('Network') || err.message?.includes('fetch'))) {
        if (__DEV__) console.warn(`[API] Network error ${url}:`, err.message);
        lastError = new ApiError('Erreur reseau', 0, null, 'network');
      }
      // Erreur HTTP 4xx lancee par le bloc ci-dessus — ne pas retry
      else if (err instanceof ApiError && err.type === 'http' && err.status >= 400 && err.status < 500) {
        throw err;
      }
      // Autre erreur
      else if (!(err instanceof ApiError)) {
        if (__DEV__) console.warn(`[API] Error ${url}:`, err.message);
        lastError = new ApiError(err.message || 'Erreur inconnue', 0, null, 'unknown');
      } else {
        lastError = err;
      }
    }

    // Backoff exponentiel avant le retry (sauf derniere tentative)
    if (attempt < MAX_RETRIES - 1) {
      const delay = 2000 * (attempt + 1); // 2s, 4s
      if (__DEV__) console.log(`[API] Attente ${delay / 1000}s avant tentative ${attempt + 2}...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Toutes les tentatives echouees
  if (__DEV__) console.error(`[API] Echec definitif apres ${MAX_RETRIES} tentatives:`, lastError?.message);
  throw lastError;
}

// ========================
// Methodes HTTP publiques
// ========================
function buildUrl(path) {
  if (path.startsWith('http')) return path;
  return BASE_URL + (path.startsWith('/') ? path : '/' + path);
}

const apiService = {
  setToken: (token) => { authToken = token; },
  getToken: () => authToken,
  getBaseUrl: () => BASE_URL,

  get: (url, cfg = {}) => {
    const fullUrl = buildUrl(url);
    const params = cfg.params;
    let finalUrl = fullUrl;
    if (params) {
      const qs = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
    return requestWithRetry(finalUrl, {
      method: 'GET',
      headers: getHeaders(cfg.headers),
    });
  },

  post: (url, data, cfg = {}) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders(cfg.headers);
    if (isFormData) {
      // Laisser fetch gerer le Content-Type pour FormData (boundary)
      delete headers['Content-Type'];
    }
    return requestWithRetry(buildUrl(url), {
      method: 'POST',
      headers,
      body: isFormData ? data : (data != null ? JSON.stringify(data) : undefined),
    });
  },

  put: (url, data, cfg = {}) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders(cfg.headers);
    if (isFormData) {
      delete headers['Content-Type'];
    }
    return requestWithRetry(buildUrl(url), {
      method: 'PUT',
      headers,
      body: isFormData ? data : (data != null ? JSON.stringify(data) : undefined),
    });
  },

  delete: (url, cfg = {}) => {
    return requestWithRetry(buildUrl(url), {
      method: 'DELETE',
      headers: getHeaders(cfg.headers),
    });
  },

  // Login specifique — memes retries, mais sans token
  login: async (identifier, password) => {
    const url = BASE_URL + '/auth/login';
    const body = JSON.stringify({ identifier, password });
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const timeout = RETRY_TIMEOUTS[attempt];
      try {
        if (__DEV__) console.log(`[API] Login tentative ${attempt + 1}/${MAX_RETRIES} (timeout ${timeout / 1000}s)`);

        const response = await fetchWithTimeout(url, { method: 'POST', headers, body }, timeout);
        const data = await response.json();

        if (response.ok) {
          if (__DEV__) console.log('[API] Login OK');
          return { data, status: response.status };
        }

        // 4xx — erreur client, ne pas retry
        if (response.status >= 400 && response.status < 500) {
          throw new ApiError(
            data?.detail || `Erreur ${response.status}`,
            response.status,
            data,
            'http'
          );
        }

        // 5xx — retry
        lastError = new ApiError(`Erreur serveur ${response.status}`, response.status, data, 'http');
      } catch (err) {
        if (err instanceof ApiError && err.type === 'http' && err.status >= 400 && err.status < 500) {
          throw err;
        }
        if (err.name === 'AbortError') {
          lastError = new ApiError('Timeout', 0, null, 'timeout');
        } else if (!(err instanceof ApiError)) {
          lastError = new ApiError(err.message || 'Erreur reseau', 0, null, 'network');
        } else {
          lastError = err;
        }
        if (__DEV__) console.warn(`[API] Login tentative ${attempt + 1} echouee:`, lastError.type, lastError.message);
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    throw lastError;
  },
};

export { apiService as api };
export default apiService;

// ========================
// API specifiques producteurs (interface identique)
// ========================
export const farmerApi = {
  getParcels: () => apiService.get('/greenlink/parcels/my-parcels'),
  createParcel: (data) => apiService.post('/greenlink/parcels', data),
  getHarvests: (params) => apiService.get(`/greenlink/harvests/my-harvests${params || ''}`),
  createHarvest: (data) => apiService.post('/greenlink/harvests', data),
  getDashboard: () => apiService.get('/greenlink/farmer/dashboard'),
  getPaymentRequests: () => apiService.get('/greenlink/payments/my-requests'),
  createPaymentRequest: (data) => apiService.post('/greenlink/payments/request', data),
  getSmsHistory: () => apiService.get('/greenlink/sms/history'),
  getNotifications: () => apiService.get('/greenlink/notifications'),
  markNotificationRead: (id) => apiService.put(`/greenlink/notifications/${id}/read`),
  getCarbonScore: () => apiService.get('/greenlink/carbon/my-score'),
  registerDevice: (data) => apiService.post('/greenlink/notifications/register-device', data),
  unregisterDevice: (token) => apiService.delete(`/greenlink/notifications/unregister-device?push_token=${token}`),
};
