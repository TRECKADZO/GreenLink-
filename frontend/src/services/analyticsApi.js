import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/admin/analytics`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const analyticsApi = {
  // Main Strategic Dashboard
  getDashboard: async (period = 'year') => {
    const response = await axios.get(`${API}/dashboard`, {
      headers: getAuthHeader(),
      params: { period }
    });
    return response.data;
  },

  // Detailed Reports
  getProductionReport: async (params = {}) => {
    const response = await axios.get(`${API}/report/production`, {
      headers: getAuthHeader(),
      params
    });
    return response.data;
  },

  getCarbonReport: async () => {
    const response = await axios.get(`${API}/report/carbon`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getSocialImpactReport: async () => {
    const response = await axios.get(`${API}/report/social-impact`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getTradeReport: async () => {
    const response = await axios.get(`${API}/report/trade`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getEUDRComplianceReport: async () => {
    const response = await axios.get(`${API}/report/eudr-compliance`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getRegionsAnalytics: async () => {
    const response = await axios.get(`${API}/regions`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  exportCSV: async (reportType) => {
    const response = await axios.get(`${API}/export/csv`, {
      headers: getAuthHeader(),
      params: { report_type: reportType }
    });
    return response.data;
  }
};

export default analyticsApi;
