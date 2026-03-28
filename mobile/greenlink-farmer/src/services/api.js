/**
 * Client API v1.75 — fetch + AbortController
 * 
 * - fetch moderne (pas XHR)
 * - Connection: keep-alive
 * - Timeouts progressifs 25s / 45s / 65s
 * - 3 retries avec backoff exponentiel
 * - Headers mobile complets (anti Cloudflare)
 * - Classification d'erreur via NetInfo (pas de faux "pas d'internet")
 */
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

const BASE_URL = CONFIG.DIRECT_API_URL + '/api';

let authToken = null;

// Compteur de requetes pour debug
let requestId = 0;

const USER_AGENT = Platform.OS === 'ios'
  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  : 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36';

function getHeaders(extra = {}) {
  const h = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache, no-store',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive',
    ...extra,
  };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

// ========================
// ApiError — types: timeout | offline | server | http | unknown
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
// fetch + AbortController timeout
// ========================
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

// ========================
// Classifier une erreur reseau avec NetInfo
// JAMAIS afficher "pas d'internet" sans verification reelle
// ========================
async function classifyNetworkError(err) {
  if (err instanceof ApiError) return err;

  // AbortError = timeout du AbortController
  if (err.name === 'AbortError') {
    return new ApiError(
      'Le serveur met du temps a repondre. Reessayez.',
      0, null, 'timeout'
    );
  }

  // TypeError = erreur reseau fetch — VERIFIER NetInfo avant de conclure
  let netConnected = true;
  try {
    const state = await NetInfo.fetch();
    netConnected = state.isConnected && state.isInternetReachable !== false;
  } catch {}

  if (!netConnected) {
    return new ApiError(
      'Pas de connexion internet. Verifiez votre WiFi ou donnees mobiles.',
      0, null, 'offline'
    );
  }

  // Internet OK mais fetch a echoue → probleme serveur/reseau intermediaire
  return new ApiError(
    'Impossible de joindre le serveur pour le moment.',
    0, null, 'server'
  );
}

// ========================
// Test de connectivite reel (GET /api/health)
// ========================
async function healthCheck(timeoutMs = 10000) {
  try {
    const res = await fetchT(BASE_URL + '/health', {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, 'Cache-Control': 'no-store' },
    }, timeoutMs);
    return { ok: res.status < 500, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// ========================
// Requete avec retry + backoff
// ========================
const TIMEOUTS = [25000, 45000, 65000];
const RETRIES = 3;

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

      if (res.ok) {
        if (__DEV__) console.log(`[API #${rid}] OK ${res.status}`);
        return { data, status: res.status };
      }

      // 429 Rate limit — stop
      if (res.status === 429) {
        throw new ApiError('Trop de tentatives. Patientez une minute.', 429, data, 'http');
      }

      // 4xx — stop (erreur client)
      if (res.status >= 400 && res.status < 500) {
        throw new ApiError(
          typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`,
          res.status, data, 'http'
        );
      }

      // 5xx — retry
      if (__DEV__) console.warn(`[API #${rid}] ${res.status} serveur — retry`);
      lastError = new ApiError(`Erreur serveur ${res.status}`, res.status, data, 'server');

    } catch (err) {
      // 4xx deja classifiee — propager
      if (err instanceof ApiError && err.type === 'http') throw err;

      lastError = await classifyNetworkError(err);
      if (__DEV__) console.warn(`[API #${rid}] ${i + 1}/${RETRIES}: ${lastError.type} — ${lastError.message}`);

      // Offline confirme — pas la peine de retry
      if (lastError.type === 'offline') throw lastError;
    }

    // Backoff avant retry
    if (i < RETRIES - 1) {
      const delay = 2000 * (i + 1);
      if (__DEV__) console.log(`[API #${rid}] Backoff ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ========================
// Construction URL
// ========================
function buildUrl(path) {
  if (path.startsWith('http')) return path;
  return BASE_URL + (path.startsWith('/') ? path : '/' + path);
}

// ========================
// Service API public
// ========================
const api = {
  setToken: (t) => { authToken = t; },
  getToken: () => authToken,
  getBaseUrl: () => BASE_URL,
  healthCheck,

  // Flush les connexions OkHttp stales (appele au logout)
  // Envoie un GET /health avec Connection: close pour forcer la fermeture du pool
  flushConnections: async () => {
    authToken = null;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      await fetch(BASE_URL + '/health', {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Connection': 'close',
          'Cache-Control': 'no-store',
        },
        signal: controller.signal,
      });
      clearTimeout(id);
      if (__DEV__) console.log('[API] Connexions flushed (Connection: close)');
    } catch {
      if (__DEV__) console.log('[API] Flush connexions — ignore erreur');
    }
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

  // ========================
  // LOGIN — health check d'abord, puis POST
  // ========================
  login: async (identifier, password) => {
    // 1. Health check rapide pour verifier que le serveur repond
    if (__DEV__) console.log('[API] Login: health check prealable...');
    const health = await healthCheck(10000);
    if (!health.ok) {
      // Verifier si c'est un probleme internet ou serveur
      const state = await NetInfo.fetch();
      if (!state.isConnected || state.isInternetReachable === false) {
        throw new ApiError(
          'Pas de connexion internet. Verifiez votre WiFi ou donnees mobiles.',
          0, null, 'offline'
        );
      }
      if (__DEV__) console.log('[API] Health check echoue mais internet OK — on tente quand meme');
    }

    // 2. POST login avec retries
    const url = BASE_URL + '/auth/login';
    const body = JSON.stringify({ identifier, password });
    const headers = getHeaders();
    delete headers['Authorization']; // Pas de token pour login

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

        // 429 — stop
        if (res.status === 429) {
          throw new ApiError('Trop de tentatives. Patientez une minute.', 429, data, 'http');
        }

        // 4xx — stop
        if (res.status >= 400 && res.status < 500) {
          throw new ApiError(data?.detail || `Erreur ${res.status}`, res.status, data, 'http');
        }

        // 5xx — retry
        lastError = new ApiError(`Erreur serveur ${res.status}`, res.status, data, 'server');
      } catch (err) {
        if (err instanceof ApiError && err.type === 'http') throw err;
        lastError = await classifyNetworkError(err);
        if (__DEV__) console.warn(`[API] Login ${i + 1}: ${lastError.type}`);
        if (lastError.type === 'offline') throw lastError;
      }

      if (i < RETRIES - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }

    throw lastError;
  },
};

export { api };
export default api;

// ========================
// API producteurs
// ========================
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
