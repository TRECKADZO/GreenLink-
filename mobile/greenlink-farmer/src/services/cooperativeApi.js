import { api } from './api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Service API pour les agents de terrain des coopératives
 * Permet la gestion des membres, parcelles, et consultations
 */
export const cooperativeApi = {
  // ============= DASHBOARD =============
  
  getDashboard: async () => {
    const response = await api.get('/cooperative/dashboard');
    return response.data;
  },

  // ============= MEMBERS =============
  
  getMembers: async (params = {}) => {
    const response = await api.get('/cooperative/members', { params });
    return response.data;
  },

  getMemberDetails: async (memberId) => {
    const response = await api.get(`/cooperative/members/${memberId}`);
    return response.data;
  },

  createMember: async (memberData) => {
    const response = await api.post('/cooperative/members', memberData);
    return response.data;
  },

  validateMember: async (memberId) => {
    const response = await api.put(`/cooperative/members/${memberId}/validate`);
    return response.data;
  },

  // ============= MEMBER PARCELS =============
  
  getMemberParcels: async (memberId) => {
    const response = await api.get(`/cooperative/members/${memberId}/parcels`);
    return response.data;
  },

  addMemberParcel: async (memberId, parcelData) => {
    const response = await api.post(`/cooperative/members/${memberId}/parcels`, parcelData);
    return response.data;
  },

  deleteMemberParcel: async (memberId, parcelId) => {
    const response = await api.delete(`/cooperative/members/${memberId}/parcels/${parcelId}`);
    return response.data;
  },

  // ============= PARCEL VERIFICATION =============
  
  getPendingParcels: async () => {
    const response = await api.get('/cooperative/parcels/pending-verification');
    return response.data;
  },

  getAllParcels: async (verificationStatus = null) => {
    const params = verificationStatus ? { verification_status: verificationStatus } : {};
    const response = await api.get('/cooperative/parcels/all', { params });
    return response.data;
  },

  // ============= AGENTS TERRAIN =============

  getAgents: async () => {
    const response = await api.get('/cooperative/agents');
    return response.data;
  },

  getAssignedFarmers: async (agentId) => {
    const response = await api.get(`/cooperative/agents/${agentId}/assigned-farmers`);
    return response.data;
  },

  assignFarmersToAgent: async (agentId, farmerIds) => {
    const response = await api.post(`/cooperative/agents/${agentId}/assign-farmers`, { farmer_ids: farmerIds });
    return response.data;
  },


  getParcelDetails: async (token, parcelId) => {
    const response = await api.get(`/cooperative/parcels/${parcelId}/details`);
    return response;
  },

  verifyParcel: async (token, parcelId, verificationData) => {
    const response = await api.put(`/cooperative/parcels/${parcelId}/verify`, verificationData);
    return response.data;
  },

  getMemberDetail: async (token, memberId) => {
    const response = await api.get(`/cooperative/members/${memberId}`);
    return response;
  },

  // ============= LOTS =============
  
  getLots: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/cooperative/lots', { params });
    return response.data;
  },

  createLot: async (lotData) => {
    const response = await api.post('/cooperative/lots', lotData);
    return response.data;
  },

  // ============= DISTRIBUTIONS =============
  
  getDistributions: async () => {
    const response = await api.get('/cooperative/distributions');
    return response.data;
  },

  // ============= REPORTS =============
  
  getEUDRReport: async () => {
    const response = await api.get('/cooperative/reports/eudr');
    return response.data;
  },

  getVillageStats: async () => {
    const response = await api.get('/cooperative/stats/villages');
    return response.data;
  },

  // ============= SSRTE VISITS =============
  
  /**
   * Create SSRTE visit report
   */
  createSSRTEVisit: async (token, visitData) => {
    const response = await api.post('/ici-data/ssrte/visit', visitData);
    return response.data;
  },

  /**
   * Get SSRTE visits list
   */
  getSSRTEVisits: async (token, params = {}) => {
    const response = await api.get('/ssrte/visits', { params });
    return response;
  },

  /**
   * Get SSRTE stats overview
   */
  getSSRTEStats: async (token, params = {}) => {
    const response = await api.get('/ssrte/stats/overview', { params });
    return response;
  },

  /**
   * Get SSRTE cases
   */
  getSSRTECases: async (token, params = {}) => {
    const response = await api.get('/ssrte/cases', { params });
    return response;
  },

  /**
   * Get member detail by ID
   */
  getMemberDetail: async (token, memberId) => {
    const response = await api.get(`/cooperative/members/${memberId}`);
    return response;
  },

  /**
   * Sync offline visits
   */
  syncOfflineVisits: async (visits) => {
    const response = await api.post('/ici-export/offline/sync', { 
      visits, 
      sync_timestamp: new Date().toISOString() 
    });
    return response.data;
  },

  /**
   * Get data for offline mode
   */
  getOfflineData: async () => {
    const response = await api.get('/ici-export/offline/pending');
    return response.data;
  },

  // ============= PDF DOWNLOADS =============
  
  /**
   * Download EUDR PDF report
   */
  downloadEUDRPdf: async () => {
    try {
      const response = await api.get('/cooperative/reports/eudr/pdf', {
        responseType: 'arraybuffer'
      });
      
      const filename = `rapport_eudr_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      // Convert arraybuffer to base64
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
      
      return { success: true, fileUri };
    } catch (error) {
      console.error('Error downloading EUDR PDF:', error);
      throw error;
    }
  },

  /**
   * Download Carbon PDF report
   */
  downloadCarbonPdf: async () => {
    try {
      const response = await api.get('/cooperative/reports/carbon/pdf', {
        responseType: 'arraybuffer'
      });
      
      const filename = `rapport_carbone_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
      
      return { success: true, fileUri };
    } catch (error) {
      console.error('Error downloading Carbon PDF:', error);
      throw error;
    }
  },

  /**
   * Download individual member payment receipt
   */
  downloadMemberReceipt: async (memberId, distributionId, memberName) => {
    try {
      const response = await api.get(
        `/cooperative/members/${memberId}/receipt/pdf?distribution_id=${distributionId}`,
        { responseType: 'arraybuffer' }
      );
      
      const safeName = memberName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const filename = `recu_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
      
      return { success: true, fileUri };
    } catch (error) {
      console.error('Error downloading member receipt:', error);
      throw error;
    }
  },

  /**
   * Download distribution report PDF
   */
  downloadDistributionPdf: async (distributionId) => {
    try {
      const response = await api.get(
        `/cooperative/distributions/${distributionId}/pdf`,
        { responseType: 'arraybuffer' }
      );
      
      const filename = `distribution_${distributionId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
      
      return { success: true, fileUri };
    } catch (error) {
      console.error('Error downloading distribution PDF:', error);
      throw error;
    }
  },

  // ============= PARCELS =============

  getParcelDetails: async (token, parcelId) => {
    const response = await api.get(`/cooperative/parcels/${parcelId}/details`);
    return response.data;
  },

  verifyParcel: async (token, parcelId, data) => {
    const response = await api.put(`/cooperative/parcels/${parcelId}/verify`, data);
    return response.data;
  },

  getMemberParcels: async (memberId) => {
    const response = await api.get(`/cooperative/members/${memberId}/parcels`);
    return response.data;
  },

  addMemberParcel: async (memberId, data) => {
    const response = await api.post(`/cooperative/members/${memberId}/parcels`, data);
    return response.data;
  },

  // ============= GEOTAGGED PHOTOS =============

  uploadGeoPhoto: async (photoData) => {
    const response = await api.post('/field-agent/geotagged-photos', photoData);
    return response.data;
  },

  // ============= HARVESTS (RÉCOLTES) =============

  getHarvests: async (statut = null, page = 1) => {
    let url = `/cooperative/harvests?page=${page}`;
    if (statut) url += `&statut=${statut}`;
    const response = await api.get(url);
    return response.data;
  },

  validateHarvest: async (harvestId) => {
    const response = await api.put(`/cooperative/harvests/${harvestId}/validate`);
    return response.data;
  },

  rejectHarvest: async (harvestId, reason = '') => {
    const response = await api.put(`/cooperative/harvests/${harvestId}/reject`, { reason });
    return response.data;
  },

  getHarvestsSummary: async () => {
    const response = await api.get('/cooperative/harvests/summary');
    return response.data;
  },
};

export default cooperativeApi;
