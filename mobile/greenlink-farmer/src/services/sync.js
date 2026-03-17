import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { api } from './api';

const BACKGROUND_SYNC_TASK = 'greenlink-background-sync';

// Définir la tâche de synchronisation (protégé contre les erreurs d'initialisation)
try {
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Task started');
    
    // Vérifier la connexion
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      console.log('[BackgroundSync] No network, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Récupérer les actions en attente
    const pendingActionsStr = await AsyncStorage.getItem('pendingActions');
    if (!pendingActionsStr) {
      console.log('[BackgroundSync] No pending actions');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const pendingActions = JSON.parse(pendingActionsStr);
    if (pendingActions.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log(`[BackgroundSync] Processing ${pendingActions.length} actions`);

    // Récupérer le token
    const token = await AsyncStorage.getItem('token');
    if (token) {
      api.setToken(token);
    }

    const successfulActions = [];
    const failedActions = [];

    for (const action of pendingActions) {
      try {
        await processAction(action);
        successfulActions.push(action);
      } catch (error) {
        console.error(`[BackgroundSync] Failed to process action: ${action.type}`, error);
        failedActions.push(action);
      }
    }

    // Sauvegarder uniquement les actions échouées
    await AsyncStorage.setItem('pendingActions', JSON.stringify(failedActions));

    console.log(`[BackgroundSync] Synced ${successfulActions.length} actions, ${failedActions.length} failed`);

    // Mettre à jour la date de dernière synchronisation
    await AsyncStorage.setItem('lastSync', Date.now().toString());

    return successfulActions.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundSync] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
} catch (e) {
  console.error('[BackgroundSync] Failed to define task:', e.message);
}

// Traiter une action en attente
async function processAction(action) {
  switch (action.type) {
    case 'CREATE_PARCEL':
      await api.post('/greenlink/parcels', action.data);
      break;
    case 'CREATE_HARVEST':
      await api.post('/greenlink/harvests', action.data);
      break;
    case 'UPDATE_PARCEL':
      await api.put(`/greenlink/parcels/${action.id}`, action.data);
      break;
    case 'CREATE_PAYMENT_REQUEST':
      await api.post('/greenlink/payments/request', action.data);
      break;
    default:
      console.warn(`[BackgroundSync] Unknown action type: ${action.type}`);
  }
}

class SyncService {
  constructor() {
    this.isRegistered = false;
  }

  // Enregistrer la tâche de synchronisation
  async registerBackgroundSync() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      
      if (isRegistered) {
        this.isRegistered = true;
        console.log('[SyncService] Background task already registered');
        return true;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes minimum
        stopOnTerminate: false,
        startOnBoot: true,
      });

      this.isRegistered = true;
      console.log('[SyncService] Background task registered');
      return true;
    } catch (error) {
      console.error('[SyncService] Error registering background task:', error);
      return false;
    }
  }

  // Annuler la tâche de synchronisation
  async unregisterBackgroundSync() {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      this.isRegistered = false;
      console.log('[SyncService] Background task unregistered');
      return true;
    } catch (error) {
      console.error('[SyncService] Error unregistering background task:', error);
      return false;
    }
  }

  // Forcer une synchronisation immédiate
  async syncNow() {
    try {
      console.log('[SyncService] Starting immediate sync');

      // Vérifier la connexion
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        return {
          success: false,
          error: 'Pas de connexion internet',
          synced: 0,
          failed: 0,
        };
      }

      // Récupérer le token
      const token = await AsyncStorage.getItem('token');
      if (token) {
        api.setToken(token);
      }

      // Pre-fetch assigned farmers for offline use (field agents)
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.user_type === 'field_agent' || userData.user_type === 'agent_terrain') {
            console.log('[SyncService] Pre-loading assigned farmers for offline use');
            const farmersResp = await api.get('/field-agent/my-farmers');
            if (farmersResp && farmersResp.data) {
              await AsyncStorage.setItem('assignedFarmers', JSON.stringify(farmersResp.data));
              console.log(`[SyncService] Cached ${farmersResp.data.total || 0} assigned farmers`);
            }
          }
        }
      } catch (farmerErr) {
        console.warn('[SyncService] Failed to pre-load assigned farmers:', farmerErr.message);
      }

      // Récupérer les actions en attente
      const pendingActionsStr = await AsyncStorage.getItem('pendingActions');
      if (!pendingActionsStr) {
        return { success: true, synced: 0, failed: 0 };
      }

      const pendingActions = JSON.parse(pendingActionsStr);
      if (pendingActions.length === 0) {
        return { success: true, synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;
      const failedActions = [];

      for (const action of pendingActions) {
        try {
          await processAction(action);
          synced++;
        } catch (error) {
          console.error(`[SyncService] Failed: ${action.type}`, error);
          failedActions.push(action);
          failed++;
        }
      }

      // Sauvegarder les actions échouées
      await AsyncStorage.setItem('pendingActions', JSON.stringify(failedActions));
      await AsyncStorage.setItem('lastSync', Date.now().toString());

      return { success: true, synced, failed };
    } catch (error) {
      console.error('[SyncService] Sync error:', error);
      return { success: false, error: error.message, synced: 0, failed: 0 };
    }
  }

  // Obtenir le statut de synchronisation
  async getSyncStatus() {
    try {
      const pendingActionsStr = await AsyncStorage.getItem('pendingActions');
      const lastSyncStr = await AsyncStorage.getItem('lastSync');
      const networkState = await Network.getNetworkStateAsync();

      const pendingActions = pendingActionsStr ? JSON.parse(pendingActionsStr) : [];
      const lastSync = lastSyncStr ? parseInt(lastSyncStr) : null;

      return {
        isOnline: networkState.isConnected && networkState.isInternetReachable,
        pendingCount: pendingActions.length,
        lastSync: lastSync ? new Date(lastSync) : null,
        isRegistered: this.isRegistered,
      };
    } catch (error) {
      console.error('[SyncService] Error getting sync status:', error);
      return {
        isOnline: false,
        pendingCount: 0,
        lastSync: null,
        isRegistered: false,
      };
    }
  }

  // Ajouter une action en attente
  async addPendingAction(action) {
    try {
      const pendingActionsStr = await AsyncStorage.getItem('pendingActions');
      const pendingActions = pendingActionsStr ? JSON.parse(pendingActionsStr) : [];
      
      pendingActions.push({
        ...action,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      await AsyncStorage.setItem('pendingActions', JSON.stringify(pendingActions));
      return true;
    } catch (error) {
      console.error('[SyncService] Error adding pending action:', error);
      return false;
    }
  }

  // Supprimer une action en attente
  async removePendingAction(actionId) {
    try {
      const pendingActionsStr = await AsyncStorage.getItem('pendingActions');
      if (!pendingActionsStr) return true;

      const pendingActions = JSON.parse(pendingActionsStr);
      const filtered = pendingActions.filter((a) => a.id !== actionId);
      
      await AsyncStorage.setItem('pendingActions', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('[SyncService] Error removing pending action:', error);
      return false;
    }
  }

  // Vider toutes les actions en attente
  async clearPendingActions() {
    try {
      await AsyncStorage.removeItem('pendingActions');
      return true;
    } catch (error) {
      console.error('[SyncService] Error clearing pending actions:', error);
      return false;
    }
  }

  // Récupérer les fermiers assignés depuis le cache offline
  async getOfflineFarmers() {
    try {
      const data = await AsyncStorage.getItem('assignedFarmers');
      if (data) {
        return JSON.parse(data);
      }
      return { farmers: [], total: 0, last_updated: null };
    } catch (error) {
      console.error('[SyncService] Error reading cached farmers:', error);
      return { farmers: [], total: 0, last_updated: null };
    }
  }
}

export const syncService = new SyncService();
