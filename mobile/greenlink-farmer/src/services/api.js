import axios from 'axios';
import { CONFIG } from '../config';

// URLs dans l'ordre de priorite
const PRIMARY_URL = CONFIG.API_URL + '/api';
const FALLBACK_URL = CONFIG.DIRECT_API_URL + '/api';

// Instance Axios simple — CDN Bunny en premier
const api = axios.create({
  baseURL: PRIMARY_URL,
  timeout: CONFIG.REQUEST_TIMEOUT || 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

let authToken = null;

// Intercepteur request — ajoute le token
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Intercepteur reponse — retry simple + fallback URL directe
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Ne pas retry si c'est une erreur metier (401, 422, etc.)
    const status = error.response?.status;
    if (status && status < 500 && status !== 0) {
      return Promise.reject(error);
    }

    // Retry 1 fois sur la meme URL
    if (!config._retried) {
      config._retried = true;
      await new Promise(r => setTimeout(r, 2000));
      return api(config);
    }

    // Si on etait sur le CDN, essayer l'URL directe
    if (!config._triedFallback && config.baseURL === PRIMARY_URL) {
      console.log('[API] CDN failed, trying direct URL');
      config._triedFallback = true;
      config._retried = false;
      config.baseURL = FALLBACK_URL;
      return api(config);
    }

    return Promise.reject(error);
  }
);

// API publique
const apiService = {
  setToken: (token) => { authToken = token; },

  get: (url, cfg) => api.get(url, cfg),
  post: (url, data, cfg) => api.post(url, data, cfg),
  put: (url, data, cfg) => api.put(url, data, cfg),
  delete: (url, cfg) => api.delete(url, cfg),

  // Login special — essaie les 2 URLs directement
  login: async (identifier, password) => {
    const payload = { identifier, password };
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

    // Essai 1: CDN Bunny
    try {
      console.log('[API] Login via CDN:', PRIMARY_URL);
      const res = await axios.post(PRIMARY_URL + '/auth/login', payload, {
        timeout: 30000, headers,
      });
      return res;
    } catch (e1) {
      console.warn('[API] CDN login failed:', e1.message);
    }

    // Essai 2: URL directe
    try {
      console.log('[API] Login via direct:', FALLBACK_URL);
      const res = await axios.post(FALLBACK_URL + '/auth/login', payload, {
        timeout: 30000, headers,
      });
      return res;
    } catch (e2) {
      console.warn('[API] Direct login failed:', e2.message);
      throw e2;
    }
  },
};

export { apiService as api };
export default apiService;

// API specifiques producteurs
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
