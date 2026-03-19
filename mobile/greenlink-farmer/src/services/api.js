import axios from 'axios';
import { CONFIG } from '../config';

// Instance axios avec configuration pour faible connectivité
const axiosInstance = axios.create({
  baseURL: CONFIG.API_URL + '/api',
  timeout: CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
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
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour retry automatique
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Ne pas retry si déjà fait ou si c'est une erreur 4xx
    if (config._retry >= CONFIG.RETRY_ATTEMPTS || (error.response && error.response.status < 500)) {
      return Promise.reject(error);
    }
    
    config._retry = (config._retry || 0) + 1;
    
    // Attendre avant de retry
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    
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
  getHarvests: () => api.get('/greenlink/harvests/my-harvests'),
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
