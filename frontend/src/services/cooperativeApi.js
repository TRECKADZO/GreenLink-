import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/cooperative`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const cooperativeApi = {
  // Dashboard
  getDashboard: async () => {
    const response = await axios.get(`${API}/dashboard`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Members Management
  getMembers: async (params = {}) => {
    const response = await axios.get(`${API}/members`, {
      headers: getAuthHeader(),
      params
    });
    return response.data;
  },

  getMemberDetails: async (memberId) => {
    const response = await axios.get(`${API}/members/${memberId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  createMember: async (memberData) => {
    const response = await axios.post(`${API}/members`, memberData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  importMembersCSV: async (membersData) => {
    const response = await axios.post(`${API}/members/import-csv`, membersData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Member Parcels
  getMemberParcels: async (memberId) => {
    const response = await axios.get(`${API}/members/${memberId}/parcels`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  addMemberParcel: async (memberId, parcelData) => {
    const response = await axios.post(`${API}/members/${memberId}/parcels`, parcelData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  deleteMemberParcel: async (memberId, parcelId) => {
    const response = await axios.delete(`${API}/members/${memberId}/parcels/${parcelId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  validateMember: async (memberId) => {
    const response = await axios.put(`${API}/members/${memberId}/validate`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Lots Management
  getLots: async (status = null) => {
    const params = status ? { status } : {};
    const response = await axios.get(`${API}/lots`, {
      headers: getAuthHeader(),
      params
    });
    return response.data;
  },

  createLot: async (lotData) => {
    const response = await axios.post(`${API}/lots`, lotData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  finalizeLotSale: async (lotId, saleData) => {
    const params = new URLSearchParams(saleData).toString();
    const response = await axios.put(`${API}/lots/${lotId}/finalize?${params}`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Distributions
  distributeLotPremiums: async (lotId) => {
    const response = await axios.post(`${API}/lots/${lotId}/distribute`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  executeDistributionPayments: async (distributionId) => {
    const response = await axios.put(`${API}/distributions/${distributionId}/execute`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getDistributionsHistory: async () => {
    const response = await axios.get(`${API}/distributions`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Agents Management
  getAgents: async () => {
    const response = await axios.get(`${API}/agents`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  createAgent: async (agentData) => {
    const response = await axios.post(`${API}/agents`, agentData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Reports
  getEUDRReport: async () => {
    const response = await axios.get(`${API}/reports/eudr`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  downloadEUDRPdf: async () => {
    const response = await axios.get(`${API}/reports/eudr/pdf`, {
      headers: getAuthHeader(),
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rapport_eudr_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  downloadCarbonPdf: async () => {
    const response = await axios.get(`${API}/reports/carbon/pdf`, {
      headers: getAuthHeader(),
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rapport_carbone_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  downloadDistributionPdf: async (distributionId) => {
    const response = await axios.get(`${API}/distributions/${distributionId}/pdf`, {
      headers: getAuthHeader(),
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rapport_distribution_${distributionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  downloadMemberReceipt: async (memberId, distributionId, memberName = 'membre') => {
    const response = await axios.get(`${API}/members/${memberId}/receipt/pdf`, {
      headers: getAuthHeader(),
      params: { distribution_id: distributionId },
      responseType: 'blob'
    });
    const safeName = memberName.replace(/\s+/g, '_');
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `recu_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  getAuditSelection: async (sampleRate = 0.10) => {
    const response = await axios.get(`${API}/reports/audit-selection`, {
      headers: getAuthHeader(),
      params: { sample_rate: sampleRate }
    });
    return response.data;
  },

  // Statistics
  getVillageStats: async () => {
    const response = await axios.get(`${API}/stats/villages`, {
      headers: getAuthHeader()
    });
    return response.data;
  }
};

export default cooperativeApi;
