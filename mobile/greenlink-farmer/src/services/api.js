/**
 * Client API v1.77 — Anti connexions stales OkHttp
 *
 * Corrections cles vs v1.76 :
 * - Connection: close partout (empeche OkHttp de pooler les connexions)
 * - Warm-up GET /health avant chaque retry POST (force nouvelle connexion)
 * - Google connectivity check (plus fiable en Afrique que 1.1.1.1)
 * - Delai 3s entre retries (laisse OkHttp fermer les connexions mortes)
 * - Timeouts 15s / 25s / 35s (moins d'attente pour l'utilisateur)
 */
import { Platform } from 'react-native';
import { CONFIG } from '../config';

const BASE_URL = CONFIG.DIRECT_API_URL + '/api';

// Google connectivity check — utilise par Android nativement, fiable en Afrique
const CONNECTIVITY_CHECK_URL = 'https://connectivitycheck.gstatic.com/generate_204';

let authToken = null;
let requestId = 0;

const USER_AGENT = Platform.OS === 'ios'
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36';

// Connection: close = empeche OkHttp de garder les connexions dans le pool
function getHeaders(extra = {}) {
  const h = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache, no-store',
    'Pragma': 'no-cache',
    'Connection': 'close',
    ...extra,
  };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

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

// Fetch avec timeout via AbortController
async function fetchT(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Classifier les erreurs reseau — utilise Google connectivity check
async function classifyNetworkError(err) {
  if (err instanceof ApiError) return err;

  if (err.name === 'AbortError') {
    return new ApiError(
      'Le serveur met du temps a repondre. Reessayez.',
      0, null, 'timeout'
    );
  }

  // Verifier internet via Google connectivity check (204 = OK)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(CONNECTIVITY_CHECK_URL, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Connection': 'close' },
    });
    clearTimeout(timer);
    // Internet fonctionne → probleme cote serveur
    return new ApiError(
      'Impossible de joindre le serveur. Reessayez dans quelques instants.',
      0, null, 'server'
    );
  } catch {
    return new ApiError(
      'Pas de connexion internet. Verifiez votre WiFi ou donnees mobiles.',
      0, null, 'offline'
    );
  }
}

// Health check avec cache-bust
async function healthCheck(timeoutMs = 8000) {
  try {
    const bust = `?_cb=${Date.now()}`;
    const res = await fetchT(BASE_URL + '/health' + bust, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Connection': 'close',
      },
    }, timeoutMs);
    return { ok: res.status < 500, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// Warm-up : GET /health pour ouvrir une connexion fraiche avant un retry
async function warmupConnection() {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    await fetch(BASE_URL + '/health?_warmup=' + Date.now(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Connection': 'close',
        'Cache-Control': 'no-store',
      },
    });
    clearTimeout(id);
    if (__DEV__) console.log('[API] Warm-up OK');
    return true;
  } catch {
    if (__DEV__) console.log('[API] Warm-up echoue');
    return false;
  }
}

const TIMEOUTS = [15000, 25000, 35000];
const RETRIES = 3;
const RETRY_DELAY = 3000;

async function requestWithRetry(url, options = {}) {
  const rid = ++requestId;
  let lastError = null;

  for (let i = 0; i < RETRIES; i++) {
    const t = TIMEOUTS[i];
    try {
      if (__DEV__) console.log(`[API #${rid}] ${options.method || 'GET'} ${url} (${i + 1}/${RETRIES}, ${t / 1000}s)`);

      const res = await fetchT(url, options, t);
      const ct = res.headers?.get('content-type') || '';
      const data = ct.includes('json') ? await res.json() : await res.text();

      if (res.ok) return { data, status: res.status };

      if (res.status === 429) {
        throw new ApiError('Trop de tentatives. Patientez une minute.', 429, data, 'http');
      }
      if (res.status >= 400 && res.status < 500) {
        throw new ApiError(
          typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`,
          res.status, data, 'http'
        );
      }

      lastError = new ApiError(`Erreur serveur ${res.status}`, res.status, data, 'server');
    } catch (err) {
      if (err instanceof ApiError && err.type === 'http') throw err;

      lastError = await classifyNetworkError(err);
      if (__DEV__) console.warn(`[API #${rid}] ${i + 1}/${RETRIES}: ${lastError.type}`);
      if (lastError.type === 'offline') throw lastError;
    }

    // Avant le prochain retry : attendre + warm-up
    if (i < RETRIES - 1) {
      if (__DEV__) console.log(`[API #${rid}] Attente ${RETRY_DELAY / 1000}s + warm-up...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      await warmupConnection();
    }
  }

  throw lastError;
}

function buildUrl(path) {
  if (path.startsWith('http')) return path;
  return BASE_URL + (path.startsWith('/') ? path : '/' + path);
}

const api = {
  setToken: (t) => { authToken = t; },
  getToken: () => authToken,
  getBaseUrl: () => BASE_URL,
  healthCheck,

  flushConnections: async () => {
    authToken = null;
    if (__DEV__) console.log('[API] Auth token cleared');
  },

  get: (url, cfg = {}) => {
    let finalUrl = buildUrl(url);
    if (cfg.params) {
      const qs = Object.entries(cfg.params)
        .filter(([_, v]) => v != null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
    return requestWithRetry(finalUrl, { method: 'GET', headers: getHeaders(cfg.headers) });
  },

  post: (url, data, cfg = {}) => {
    const fm = data instanceof FormData;
    const h = getHeaders(cfg.headers);
    if (fm) delete h['Content-Type'];
    return requestWithRetry(buildUrl(url), {
      method: 'POST', headers: h,
      body: fm ? data : (data != null ? JSON.stringify(data) : undefined),
    });
  },

  put: (url, data, cfg = {}) => {
    const fm = data instanceof FormData;
    const h = getHeaders(cfg.headers);
    if (fm) delete h['Content-Type'];
    return requestWithRetry(buildUrl(url), {
      method: 'PUT', headers: h,
      body: fm ? data : (data != null ? JSON.stringify(data) : undefined),
    });
  },

  delete: (url, cfg = {}) => {
    return requestWithRetry(buildUrl(url), {
      method: 'DELETE', headers: getHeaders(cfg.headers),
    });
  },

  // Login avec warm-up obligatoire
  login: async (identifier, password) => {
    // 1. Warm-up : ouvrir une connexion fraiche
    if (__DEV__) console.log('[API] Login: warm-up connexion...');
    await warmupConnection();

    // 2. POST login avec retries
    const url = BASE_URL + '/auth/login';
    const body = JSON.stringify({ identifier, password });
    const headers = getHeaders();
    delete headers['Authorization'];

    let lastError = null;
    for (let i = 0; i < RETRIES; i++) {
      const t = TIMEOUTS[i];
      try {
        if (__DEV__) console.log(`[API] Login POST ${i + 1}/${RETRIES} (${t / 1000}s)`);

        const res = await fetchT(url, { method: 'POST', headers, body }, t);
        const data = await res.json();

        if (res.ok) {
          if (__DEV__) console.log('[API] Login OK');
          return { data, status: res.status };
        }

        if (res.status === 429) {
          throw new ApiError('Trop de tentatives. Patientez une minute.', 429, data, 'http');
        }
        if (res.status >= 400 && res.status < 500) {
          throw new ApiError(data?.detail || `Erreur ${res.status}`, res.status, data, 'http');
        }

        lastError = new ApiError(`Erreur serveur ${res.status}`, res.status, data, 'server');
      } catch (err) {
        if (err instanceof ApiError && err.type === 'http') throw err;
        lastError = await classifyNetworkError(err);
        if (__DEV__) console.warn(`[API] Login ${i + 1}: ${lastError.type}`);
        if (lastError.type === 'offline') throw lastError;
      }

      if (i < RETRIES - 1) {
        if (__DEV__) console.log(`[API] Login retry: attente 3s + warm-up...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        await warmupConnection();
      }
    }

    throw lastError;
  },
};

export { api };
export default api;

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
