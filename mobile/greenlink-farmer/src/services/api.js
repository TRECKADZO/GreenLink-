import axios from 'axios';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

// Toutes les URLs disponibles (Worker CF > CDN Bunny > Direct)
const ALL_URLS = [
  CONFIG.API_URL,
  ...(CONFIG.FALLBACK_URLS || []),
].filter(Boolean);

// Tracking de l'URL qui fonctionne
let workingUrlIndex = 0; // commence par le Worker Cloudflare

function getActiveBaseURL() {
  return (ALL_URLS[workingUrlIndex] || ALL_URLS[0]) + '/api';
}

function promoteUrl(index) {
  if (index !== workingUrlIndex) {
    console.log(`[API] Switching to URL #${index}: ${ALL_URLS[index]}`);
    workingUrlIndex = index;
  }
}

// Instance Axios principale
const axiosInstance = axios.create({
  baseURL: ALL_URLS[0] + '/api',
  timeout: CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

let authToken = null;
let serverHealthy = true;

// Intercepteur request — utilise l'URL active
axiosInstance.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    if (!config._fixedBaseURL) {
      config.baseURL = getActiveBaseURL();
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Detecter Cloudflare / HTML
function isCloudflareOrHtml(error) {
  if (!error.response) return false;
  const data = error.response.data;
  const ct = error.response.headers?.['content-type'] || '';
  if (ct.includes('text/html')) return true;
  if (typeof data === 'string' && (
    data.includes('<!DOCTYPE') || data.includes('cloudflare') ||
    data.includes('Just a moment') || data.includes('Attention Required')
  )) return true;
  return false;
}

// Erreur qui merite un failover
function shouldFailover(error) {
  const s = error.response?.status;
  return (
    !error.response ||
    isCloudflareOrHtml(error) ||
    s === 403 || s === 502 || s === 503 || s >= 500 || s === 0
  );
}

// Intercepteur reponse — retry + failover sur URLs alternatives
axiosInstance.interceptors.response.use(
  (response) => {
    serverHealthy = true;
    return response;
  },
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const retry = config._retry || 0;
    const maxRetries = CONFIG.RETRY_ATTEMPTS || 2;

    // Retry sur la meme URL
    if (retry < maxRetries && shouldFailover(error)) {
      config._retry = retry + 1;
      const delay = 2000 * config._retry + Math.random() * 1500;
      console.log(`[API] Retry ${config._retry}/${maxRetries} in ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
      return axiosInstance(config);
    }

    // Essayer l'URL suivante
    const nextIndex = (config._urlIndex || workingUrlIndex) + 1;
    if (nextIndex < ALL_URLS.length && shouldFailover(error) && !config._triedAll) {
      console.warn(`[API] Failing over to URL #${nextIndex}: ${ALL_URLS[nextIndex]}`);
      config._retry = 0;
      config._urlIndex = nextIndex;
      config._fixedBaseURL = true;
      config.baseURL = ALL_URLS[nextIndex] + '/api';
      await new Promise(r => setTimeout(r, 1000));
      return axiosInstance(config);
    }

    // Tout a echoue
    if (!error.response) {
      serverHealthy = false;
      error.response = {
        status: 0,
        data: { detail: 'Pas de connexion internet. Verifiez votre reseau et reessayez.' }
      };
    } else if (isCloudflareOrHtml(error)) {
      error.response.data = {
        detail: 'Le serveur est temporairement inaccessible. Veuillez patienter et reessayer.'
      };
    }
    return Promise.reject(error);
  }
);

// RACING: Essayer TOUTES les URLs en parallele
// Le premier qui repond gagne
async function raceRequest(method, path, data = null, extraConfig = {}) {
  const urls = ALL_URLS.map(base => base + '/api' + path);

  const makeReq = (url, index) => {
    const cfg = {
      ...extraConfig,
      timeout: CONFIG.REQUEST_TIMEOUT || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...(extraConfig.headers || {}),
      },
    };
    const promise = method === 'post'
      ? axios.post(url, data, cfg)
      : axios.get(url, cfg);

    // On attache l'index pour savoir qui a gagne
    return promise.then(res => {
      promoteUrl(index);
      return res;
    });
  };

  try {
    const result = await Promise.any(urls.map((u, i) => makeReq(u, i)));
    serverHealthy = true;
    return result;
  } catch (aggErr) {
    serverHealthy = false;
    // Retourner la premiere erreur (la plus informative)
    const firstErr = aggErr.errors?.[0] || aggErr;
    throw firstErr;
  }
}

// Health check
async function checkServerHealth() {
  try {
    const url = getActiveBaseURL().replace('/api', '') + '/api/health';
    const r = await axios.get(url, { timeout: 15000, headers: { Accept: 'application/json' } });
    serverHealthy = r.status === 200;
    return serverHealthy;
  } catch (e) {
    serverHealthy = false;
    return false;
  }
}

export const api = {
  setToken: (t) => { authToken = t; },
  checkHealth: checkServerHealth,
  isServerHealthy: () => serverHealthy,
  getActiveURL: () => ALL_URLS[workingUrlIndex],

  get: (url, cfg) => axiosInstance.get(url, cfg),
  post: (url, data, cfg) => axiosInstance.post(url, data, cfg),
  put: (url, data, cfg) => axiosInstance.put(url, data, cfg),
  delete: (url, cfg) => axiosInstance.delete(url, cfg),

  // Racing sur toutes les URLs
  racePost: (url, data, cfg) => raceRequest('post', url, data, cfg),
  raceGet: (url, cfg) => raceRequest('get', url, null, cfg),
};

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
