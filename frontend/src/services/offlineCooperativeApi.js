/**
 * Cooperative API Offline Wrapper
 * Intercepte les appels API coopérative et utilise IndexedDB en fallback offline.
 * Permet aussi de sauvegarder les données en cache lors des appels réussis.
 */
import { cooperativeApi } from './cooperativeApi';
import {
  saveCoopMembers,
  getAllCoopMembers,
  getCoopMemberById,
  searchCoopMemberByName,
  searchCoopMemberByPhone,
  saveCoopLots,
  getAllCoopLots,
  saveCoopDashboard,
  getCoopDashboard,
  saveCoopDashboardKPIs,
  getCoopDashboardKPIs,
  queueOfflineAction,
} from './offlineDB';

const wrapWithCache = (apiFn, cacheSaveFn, cacheGetFn) => {
  return async (...args) => {
    try {
      const result = await apiFn(...args);
      // Save to cache on success
      if (cacheSaveFn && result) {
        try { await cacheSaveFn(result); } catch (e) { /* warning */ }
      }
      return result;
    } catch (err) {
      // If network error, try cache
      if (!navigator.onLine || err?.message?.includes('Network') || err?.code === 'ERR_NETWORK') {
        if (cacheGetFn) {
          const cached = await cacheGetFn();
          if (cached) {
            return cached;
          }
        }
      }
      throw err;
    }
  };
};

export const offlineCooperativeApi = {
  // Dashboard — cache the full response
  getDashboard: wrapWithCache(
    cooperativeApi.getDashboard,
    saveCoopDashboard,
    getCoopDashboard
  ),

  getDashboardKPIs: wrapWithCache(
    cooperativeApi.getDashboardKPIs,
    saveCoopDashboardKPIs,
    getCoopDashboardKPIs
  ),

  getDashboardCharts: wrapWithCache(
    cooperativeApi.getDashboardCharts,
    null, // Charts are visual, less critical offline
    null
  ),

  // Members — cache members list
  getMembers: async (params = {}) => {
    try {
      const result = await cooperativeApi.getMembers(params);
      // Cache members for offline
      const members = result.members || result || [];
      try { await saveCoopMembers(members); } catch (e) { /* warning */ }
      return result;
    } catch (err) {
      if (!navigator.onLine || err?.code === 'ERR_NETWORK') {
        const cached = await getAllCoopMembers();
        if (cached && cached.length > 0) {
          return { members: cached, total: cached.length, fromCache: true };
        }
      }
      throw err;
    }
  },

  getMemberDetails: async (memberId) => {
    try {
      return await cooperativeApi.getMemberDetails(memberId);
    } catch (err) {
      if (!navigator.onLine || err?.code === 'ERR_NETWORK') {
        const cached = await getCoopMemberById(memberId);
        if (cached) return { ...cached, fromCache: true };
      }
      throw err;
    }
  },

  // Create member — queue if offline
  createMember: async (memberData) => {
    if (!navigator.onLine) {
      const offlineId = await queueOfflineAction({
        action_type: 'create_member',
        entity_table: 'coop_members',
        payload: memberData,
        endpoint: '/api/cooperative/members',
        method: 'POST',
      });
      return { offline_id: offlineId, queued: true, message: 'Membre enregistré hors-ligne' };
    }
    return cooperativeApi.createMember(memberData);
  },

  // Lots — cache
  getLots: async (status = null) => {
    try {
      const result = await cooperativeApi.getLots(status);
      try { await saveCoopLots(result.lots || result || []); } catch (e) { /* warning */ }
      return result;
    } catch (err) {
      if (!navigator.onLine || err?.code === 'ERR_NETWORK') {
        const cached = await getAllCoopLots();
        if (cached && cached.length > 0) {
          const filtered = status ? cached.filter(l => l.status === status) : cached;
          return { lots: filtered, total: filtered.length, fromCache: true };
        }
      }
      throw err;
    }
  },

  // Create lot — queue if offline
  createLot: async (lotData) => {
    if (!navigator.onLine) {
      const offlineId = await queueOfflineAction({
        action_type: 'create_lot',
        entity_table: 'coop_lots',
        payload: lotData,
        endpoint: '/api/cooperative/lots',
        method: 'POST',
      });
      return { offline_id: offlineId, queued: true, message: 'Lot enregistré hors-ligne' };
    }
    return cooperativeApi.createLot(lotData);
  },

  // Pass-through methods (online-only)
  validateMember: cooperativeApi.validateMember,
  getActivationStats: cooperativeApi.getActivationStats,
  sendActivationReminder: cooperativeApi.sendActivationReminder,
  getMemberParcels: cooperativeApi.getMemberParcels,
  addMemberParcel: cooperativeApi.addMemberParcel,
  deleteMemberParcel: cooperativeApi.deleteMemberParcel,
  importMembersCSV: cooperativeApi.importMembersCSV,
  finalizeLotSale: cooperativeApi.finalizeLotSale,
  getLotContributors: cooperativeApi.getLotContributors,
  executeDistributionPayments: cooperativeApi.executeDistributionPayments,
  getDistributionsHistory: cooperativeApi.getDistributionsHistory,
  getDistributionDetail: cooperativeApi.getDistributionDetail,

  // Search — offline capable
  searchMembers: async (query) => {
    if (!navigator.onLine) {
      const byName = await searchCoopMemberByName(query);
      const byPhone = await searchCoopMemberByPhone(query);
      const combined = [...byName];
      for (const m of byPhone) {
        if (!combined.find(c => c.id === m.id)) combined.push(m);
      }
      return { members: combined, total: combined.length, fromCache: true };
    }
    return cooperativeApi.getMembers({ search: query });
  },

  // Pass-through: ICI Profile (Agent Terrain fiches)
  getICIProfile: cooperativeApi.getICIProfile,
  updateICIProfile: cooperativeApi.updateICIProfile,

  // Pass-through: Field Agents management
  getAgents: cooperativeApi.getAgents,
  createAgent: cooperativeApi.createAgent,
  activateAgent: cooperativeApi.activateAgent,
  getAssignedFarmers: cooperativeApi.getAssignedFarmers,
  assignFarmers: cooperativeApi.assignFarmers,
  unassignFarmers: cooperativeApi.unassignFarmers,

  // Pass-through: Reports & Downloads
  getEUDRReport: cooperativeApi.getEUDRReport,
  downloadEUDRPdf: cooperativeApi.downloadEUDRPdf,
  downloadCarbonPdf: cooperativeApi.downloadCarbonPdf,
  downloadDistributionPdf: cooperativeApi.downloadDistributionPdf,
  downloadMemberReceipt: cooperativeApi.downloadMemberReceipt,

  // Pass-through: Analytics
  getAgentsProgress: cooperativeApi.getAgentsProgress,
  getVillageStats: cooperativeApi.getVillageStats,
  getAuditSelection: cooperativeApi.getAuditSelection,
};
