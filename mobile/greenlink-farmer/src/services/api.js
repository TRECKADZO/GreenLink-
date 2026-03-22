import axios from 'axios';
import { CONFIG } from '../config';

// Instance axios avec configuration pour faible connectivité
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

// Intercepteur pour ajouter le token
axiosInstance.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour retry automatique et normalisation des erreurs
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Detect non-JSON (HTML) response from proxy/Cloudflare
    let isNonJsonResponse = false;
    if (error.response && typeof error.response.data === 'string') {
      isNonJsonResponse = true;
      const statusCode = error.response.status;
      console.warn(`[API] Non-JSON response (${statusCode}):`, error.response.data?.substring(0, 100));
      error.response.data = {
        detail: statusCode === 502 ? 'Serveur temporairement indisponible. Réessayez.' :
                statusCode === 503 ? 'Service en maintenance. Réessayez dans quelques instants.' :
                statusCode === 504 ? 'Le serveur ne répond pas. Vérifiez votre connexion.' :
                statusCode === 429 ? 'Trop de requêtes. Patientez une minute.' :
                statusCode === 404 ? 'Service temporairement inaccessible. Réessayez.' :
                statusCode === 403 ? 'Accès temporairement bloqué. Réessayez.' :
                `Erreur serveur (${statusCode}).`
      };
    }
    
    // Handle network errors (no response at all)
    if (!error.response && error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('timeout') || msg.includes('abort')) {
        // Network errors should also be retried
        if (!config._retry || config._retry < CONFIG.RETRY_ATTEMPTS) {
          config._retry = (config._retry || 0) + 1;
          console.log(`[API] Network retry ${config._retry}/${CONFIG.RETRY_ATTEMPTS} for ${config.url}`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
          return axiosInstance(config);
        }
        error.response = {
          status: 0,
          data: { detail: 'Pas de connexion internet. Vérifiez votre réseau et réessayez.' }
        };
        return Promise.reject(error);
      }
    }
    
    // Determine if we should retry
    const maxRetries = CONFIG.RETRY_ATTEMPTS;
    const currentRetry = config._retry || 0;
    const status = error.response?.status;
    
    // Retry on: 5xx errors, OR non-JSON 404/403 (proxy/Cloudflare issues)
    const shouldRetry = status >= 500 || (isNonJsonResponse && [404, 403].includes(status));
    
    if (currentRetry >= maxRetries || !shouldRetry) {
      return Promise.reject(error);
    }
    
    config._retry = currentRetry + 1;
    const delay = CONFIG.RETRY_DELAY * config._retry; // Progressive delay
    console.log(`[API] Retry ${config._retry}/${maxRetries} for ${config.url} (delay ${delay}ms)`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return axiosInstance(config);
  }
);

export const api = {
  setToken: (token) => {
    authToken = token;
  },
  
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
};

// API spécifiques pour les producteurs
export const farmerApi = {
  // Parcelles
  getParcels: () => api.get('/greenlink/parcels/my-parcels'),
  createParcel: (data) => api.post('/greenlink/parcels', data),
  
  // Récoltes
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
