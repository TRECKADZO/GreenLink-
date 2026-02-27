import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/greenlink`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const greenlinkApi = {
  // Farmer/Agriculteur APIs
  declareParcelle: async (parcelData) => {
    const response = await axios.post(`${API}/parcels`, parcelData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getMyParcels: async () => {
    const response = await axios.get(`${API}/parcels/my-parcels`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  declareHarvest: async (harvestData) => {
    const response = await axios.post(`${API}/harvests`, harvestData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  requestPayment: async (paymentData) => {
    const response = await axios.post(`${API}/payments/request`, paymentData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getFarmerDashboard: async () => {
    const response = await axios.get(`${API}/farmer/dashboard`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Buyer/Acheteur APIs
  createBuyerOrder: async (orderData) => {
    const response = await axios.post(`${API}/buyer/orders`, orderData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getBuyerOrders: async () => {
    const response = await axios.get(`${API}/buyer/orders`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getTraceabilityReport: async (orderId) => {
    const response = await axios.get(`${API}/buyer/traceability/${orderId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getBuyerDashboard: async () => {
    const response = await axios.get(`${API}/buyer/dashboard`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  exportEUDRReport: async (orderId) => {
    const response = await axios.get(`${API}/buyer/traceability/${orderId}`, {
      headers: getAuthHeader(),
      responseType: 'blob'
    });
    return response.data;
  },

  // RSE/Carbon Credits APIs
  getCarbonCredits: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API}/carbon-credits?${params}`);
    return response.data;
  },

  purchaseCarbonCredits: async (purchaseData) => {
    const response = await axios.post(`${API}/carbon-credits/purchase`, purchaseData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getRSEImpactDashboard: async () => {
    const response = await axios.get(`${API}/rse/impact-dashboard`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // SMS Notifications APIs
  getSmsHistory: async () => {
    const response = await axios.get(`${API}/sms/history`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  sendWeeklySummary: async () => {
    const response = await axios.post(`${API}/sms/send-weekly-summary`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  }
};