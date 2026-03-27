/**
 * Client API centralise — fetch natif + AbortController
 * 
 * Anti-Cloudflare:
 *  - credentials: 'include' pour persister le cookie __cf_bm (Bot Management)
 *  - Headers browser-like (User-Agent, Sec-Fetch-*)
 *  - Warm-up GET avant login pour obtenir le cookie Cloudflare
 * 
 * Retry: 3 tentatives, 20s/40s/60s
 */
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

const BASE_URL = CONFIG.DIRECT_API_URL + '/api';

let authToken = null;

const USER_AGENT = Platform.OS === 'ios'
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Headers navigateur complets (anti bot-detection)
function getHeaders(extraHeaders = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    ...extraHeaders,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

// ========================
// ApiError
// ========================
class ApiError extends Error {
  constructor(message, status, data, type) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.type = type; // 'timeout' | 'server' | 'offline' | 'http' | 'unknown'
    this.response = status ? { status, data } : undefined;
  }
}

// ========================
// Fetch avec timeout + credentials (cookie Cloudflare)
// ========================
async function fetchCF(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include', // CRITIQUE: persiste le cookie __cf_bm
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ========================
// Classification d'erreur (leger, pas de HTTP supplementaire)
// ========================
async function classifyError(err) {
  if (err instanceof ApiError) return err;

  if (err.name === 'AbortError') {
    return new ApiError('Le serveur met du temps a repondre', 0, null, 'timeout');
  }

  // Pour TypeError / Network errors: verifier NetInfo (pas de HTTP)
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return new ApiError('Pas de connexion internet', 0, null, 'offline');
    }
    if (netInfo.isInternetReachable === false) {
      return new ApiError('Pas de connexion internet', 0, null, 'offline');
    }
  } catch {}

  // NetInfo dit connecte mais fetch a echoue = probleme serveur, pas internet
  return new ApiError('Impossible de joindre le serveur', 0, null, 'server');
}

// ========================
// Warm-up: GET leger pour etablir le cookie Cloudflare
// ========================
async function warmUpConnection() {
  try {
    if (__DEV__) console.log('[API] Warm-up connection...');
    await fetchCF(BASE_URL + '/health', {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    }, 10000);
    if (__DEV__) console.log('[API] Warm-up OK');
  } catch (e) {
    if (__DEV__) console.log('[API] Warm-up skipped:', e.message);
  }
}

// ========================
// Request avec retry
// ========================
const RETRY_TIMEOUTS = [20000, 40000, 60000];
const MAX_RETRIES = 3;

async function requestWithRetry(url, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const timeout = RETRY_TIMEOUTS[attempt];

    try {
      if (__DEV__) {
        console.log(`[API] ${options.method || 'GET'} ${url} (${attempt + 1}/${MAX_RETRIES}, ${timeout / 1000}s)`);
      }

      const response = await fetchCF(url, options, timeout);

      const contentType = response.headers?.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        return { data, status: response.status };
      }

      // 4xx — erreur client, stop
      if (response.status >= 400 && response.status < 500) {
        throw new ApiError(
          typeof data?.detail === 'string' ? data.detail : `Erreur ${response.status}`,
          response.status, data, 'http'
        );
      }

      // 5xx — retry
      lastError = new ApiError(`Erreur serveur ${response.status}`, response.status, data, 'http');

    } catch (err) {
      if (err instanceof ApiError && err.type === 'http' && err.status >= 400 && err.status < 500) {
        throw err;
      }
      lastError = await classifyError(err);
      if (__DEV__) console.warn(`[API] ${attempt + 1}/${MAX_RETRIES} echoue: ${lastError.type}`);

      if (lastError.type === 'offline') throw lastError;
    }

    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }

  throw lastError;
}

// ========================
// Methodes publiques
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
    if (isFormData) delete headers['Content-Type'];
    return requestWithRetry(buildUrl(url), {
      method: 'POST',
      headers,
      body: isFormData ? data : (data != null ? JSON.stringify(data) : undefined),
    });
  },

  put: (url, data, cfg = {}) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders(cfg.headers);
    if (isFormData) delete headers['Content-Type'];
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

  // ========================
  // Login avec warm-up Cloudflare
  // ========================
  login: async (identifier, password) => {
    // Warm-up: obtenir le cookie __cf_bm AVANT le POST
    await warmUpConnection();

    const url = BASE_URL + '/auth/login';
    const body = JSON.stringify({ identifier, password });
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const timeout = RETRY_TIMEOUTS[attempt];
      try {
        if (__DEV__) console.log(`[API] Login ${attempt + 1}/${MAX_RETRIES} (${timeout / 1000}s)`);

        const response = await fetchCF(url, { method: 'POST', headers, body }, timeout);
        const data = await response.json();

        if (response.ok) {
          if (__DEV__) console.log('[API] Login OK');
          return { data, status: response.status };
        }

        if (response.status >= 400 && response.status < 500) {
          throw new ApiError(data?.detail || `Erreur ${response.status}`, response.status, data, 'http');
        }

        lastError = new ApiError(`Erreur serveur ${response.status}`, response.status, data, 'http');
      } catch (err) {
        if (err instanceof ApiError && err.type === 'http' && err.status >= 400 && err.status < 500) {
          throw err;
        }
        lastError = await classifyError(err);
        if (__DEV__) console.warn(`[API] Login ${attempt + 1} echoue: ${lastError.type}`);
        if (lastError.type === 'offline') throw lastError;
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
// API producteurs
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
