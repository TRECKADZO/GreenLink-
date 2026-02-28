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
  }
};

export default cooperativeApi;
