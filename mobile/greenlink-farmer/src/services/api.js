import axios from 'axios';
import { CONFIG } from '../config';

// URLs dans l'ordre de priorite
// Le CDN ne proxy pas les routes /api, donc utiliser l'URL directe en priorite
const PRIMARY_URL = CONFIG.DIRECT_API_URL + '/api';
const FALLBACK_URL = CONFIG.API_URL + '/api';

// Instance Axios simple — URL directe en premier
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

// Intercepteur reponse — retry sur URL directe (le CDN ne proxy pas /api)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const status = error.response?.status;
    if (status && status < 500 && status !== 0) {
      return Promise.reject(error);
    }

    // Retry 1 fois sur la meme URL directe
    if (!config._retried) {
      config._retried = true;
      await new Promise(r => setTimeout(r, 2000));
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

  // Login — essaie l'URL directe avec retries (le CDN ne proxy pas /api)
  login: async (identifier, password) => {
    const payload = { identifier, password };
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const MAX_RETRIES = 3;
    const TIMEOUTS = [15000, 30000, 45000];
    let lastError = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        console.log(`[API] Login attempt ${i + 1}/${MAX_RETRIES} via:`, PRIMARY_URL);
        const res = await axios.post(PRIMARY_URL + '/auth/login', payload, {
          timeout: TIMEOUTS[i], headers,
        });
        return res;
      } catch (err) {
        console.warn(`[API] Login attempt ${i + 1} failed:`, err.message);
        lastError = err;
        if (err.response && err.response.status < 500 && err.response.status !== 0) {
          throw err;
        }
        if (i < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        }
      }
    }
    throw lastError;
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
