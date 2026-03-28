/**
 * Client API centralise — SOLUTION ANTI OKHTTP STALE CONNECTIONS
 * 
 * Probleme: Sur Android, fetch() utilise OkHttp qui garde un pool de connexions.
 * Apres logout, les connexions deviennent perimes (fermes cote serveur) mais
 * OkHttp essaie de les reutiliser → TypeError "Network request failed".
 * 
 * Solution:
 *  1. Login via XMLHttpRequest (pool HTTP independant de fetch/OkHttp)
 *  2. Connection: close sur toutes les requetes (pas de keep-alive)
 *  3. Flush du pool au logout
 */
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

const BASE_URL = CONFIG.DIRECT_API_URL + '/api';

let authToken = null;

const USER_AGENT = Platform.OS === 'ios'
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

function getHeaders(extraHeaders = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Connection': 'close', // CRITIQUE: empeche OkHttp de garder des connexions perimes
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
    this.type = type;
    this.response = status ? { status, data } : undefined;
  }
}

// ========================
// XMLHttpRequest wrapper — independant du pool OkHttp
// Utilise pour le login (le call le plus critique)
// ========================
function xhrRequest(method, url, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = timeoutMs;
    xhr.withCredentials = true;

    // Set headers
    Object.entries(headers).forEach(([key, value]) => {
      try { xhr.setRequestHeader(key, value); } catch (e) {}
    });

    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      });
    };

    xhr.onerror = () => {
      reject(new ApiError('Erreur reseau', 0, null, 'network'));
    };

    xhr.ontimeout = () => {
      reject(new ApiError('Le serveur met du temps a repondre', 0, null, 'timeout'));
    };

    xhr.send(body || null);
  });
}

// ========================
// fetch avec timeout + Connection: close
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
// Classification d'erreur
// ========================
async function classifyError(err) {
  if (err instanceof ApiError) return err;
  if (err.name === 'AbortError') {
    return new ApiError('Le serveur met du temps a repondre', 0, null, 'timeout');
  }
  // Verifier NetInfo (leger, pas de HTTP)
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
      return new ApiError('Pas de connexion internet', 0, null, 'offline');
    }
  } catch {}
  return new ApiError('Impossible de joindre le serveur', 0, null, 'server');
}

// ========================
// Request avec retry (fetch classique pour les appels authentifies)
// ========================
const RETRY_TIMEOUTS = [25000, 45000, 65000];
const MAX_RETRIES = 3;

async function requestWithRetry(url, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const timeout = RETRY_TIMEOUTS[attempt];

    try {
      if (__DEV__) console.log(`[API] ${options.method || 'GET'} ${url} (${attempt + 1}/${MAX_RETRIES})`);

      const response = await fetchWithTimeout(url, options, timeout);
      const contentType = response.headers?.get('content-type') || '';
      let data = contentType.includes('json') ? await response.json() : await response.text();

      if (response.ok) return { data, status: response.status };

      if (response.status >= 400 && response.status < 500) {
        throw new ApiError(
          typeof data?.detail === 'string' ? data.detail : `Erreur ${response.status}`,
          response.status, data, 'http'
        );
      }

      lastError = new ApiError(`Erreur serveur ${response.status}`, response.status, data, 'http');
    } catch (err) {
      if (err instanceof ApiError && err.type === 'http' && err.status >= 400 && err.status < 500) throw err;
      lastError = await classifyError(err);
      if (lastError.type === 'offline') throw lastError;
    }

    if (attempt < MAX_RETRIES - 1) {
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
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
    return requestWithRetry(finalUrl, { method: 'GET', headers: getHeaders(cfg.headers) });
  },

  post: (url, data, cfg = {}) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders(cfg.headers);
    if (isFormData) delete headers['Content-Type'];
    return requestWithRetry(buildUrl(url), {
      method: 'POST', headers,
      body: isFormData ? data : (data != null ? JSON.stringify(data) : undefined),
    });
  },

  put: (url, data, cfg = {}) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders(cfg.headers);
    if (isFormData) delete headers['Content-Type'];
    return requestWithRetry(buildUrl(url), {
      method: 'PUT', headers,
      body: isFormData ? data : (data != null ? JSON.stringify(data) : undefined),
    });
  },

  delete: (url, cfg = {}) => {
    return requestWithRetry(buildUrl(url), { method: 'DELETE', headers: getHeaders(cfg.headers) });
  },

  // ========================
  // LOGIN via XMLHttpRequest — NE PASSE PAS par le pool OkHttp
  // C'est la solution au bug "Serveur injoignable apres logout"
  // ========================
  login: async (identifier, password) => {
    const url = BASE_URL + '/auth/login';
    const body = JSON.stringify({ identifier, password });
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
    };

    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const timeout = RETRY_TIMEOUTS[attempt];
      try {
        if (__DEV__) console.log(`[API] Login XHR ${attempt + 1}/${MAX_RETRIES} (${timeout / 1000}s)`);

        const result = await xhrRequest('POST', url, headers, body, timeout);

        if (result.ok) {
          if (__DEV__) console.log('[API] Login OK via XHR');
          return { data: result.data, status: result.status };
        }

        // 429 Rate limit — stop immédiat, pas de retry
        if (result.status === 429) {
          throw new ApiError(
            'Trop de tentatives. Patientez une minute.',
            429, result.data, 'http'
          );
        }

        // 4xx — erreur client (mauvais mot de passe, etc.)
        if (result.status >= 400 && result.status < 500) {
          throw new ApiError(
            result.data?.detail || `Erreur ${result.status}`,
            result.status, result.data, 'http'
          );
        }

        // 5xx — retry
        lastError = new ApiError(`Erreur serveur ${result.status}`, result.status, result.data, 'http');
      } catch (err) {
        if (err instanceof ApiError && err.type === 'http' && err.status >= 400 && err.status < 500) {
          throw err;
        }
        if (err instanceof ApiError) {
          lastError = err;
        } else {
          lastError = await classifyError(err);
        }
        if (__DEV__) console.warn(`[API] Login ${attempt + 1} echoue: ${lastError.type} — ${lastError.message}`);
        if (lastError.type === 'offline') throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }

    throw lastError;
  },

  // Flush: vider le pool de connexions (appeler au logout)
  flushConnections: async () => {
    try {
      // Faire une requete dummy avec Connection: close pour forcer OkHttp a fermer
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);
      await fetch(BASE_URL + '/health', {
        method: 'GET',
        headers: { 'Connection': 'close', 'Cache-Control': 'no-store' },
        signal: controller.signal,
      }).catch(() => {});
    } catch {}
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
