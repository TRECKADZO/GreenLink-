import { api } from './api';

// API Carbon/RSE pour l'app mobile
export const carbonApi = {
  // Crédits Carbone disponibles
  getCarbonCredits: (params = {}) => api.get('/greenlink/carbon-credits', { params }),
  getCarbonCredit: (id) => api.get(`/greenlink/carbon-credits/${id}`),
  
  // Achats de crédits
  purchaseCarbonCredits: (data) => api.post('/greenlink/carbon-credits/purchase', data),
  getMyCarbonPurchases: () => api.get('/greenlink/carbon/my-purchases'),
  
  // Score carbone de l'agriculteur
  getMyCarbonScore: () => api.get('/greenlink/carbon/my-score'),
  getMyCarbonCredits: () => api.get('/greenlink/carbon/my-credits'),
  
  // Statistiques impact
  getCarbonImpact: () => api.get('/greenlink/rse/impact-dashboard'),
  
  // Projets carbone
  getCarbonProjects: () => api.get('/greenlink/carbon/projects'),
  getProjectDetails: (id) => api.get(`/greenlink/carbon/projects/${id}`),
};
