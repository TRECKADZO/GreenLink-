/**
 * Offline Audit Service
 * Handles offline storage and synchronization of audit data
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { API_URL } from '../config';

const PENDING_AUDITS_KEY = '@greenlink_pending_audits';
const OFFLINE_PHOTOS_DIR = FileSystem.documentDirectory + 'offline_photos/';

class AuditOfflineService {
  constructor() {
    this.isOnline = true;
    this.setupNetworkListener();
    this.ensurePhotosDirectory();
  }

  async ensurePhotosDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(OFFLINE_PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(OFFLINE_PHOTOS_DIR, { intermediates: true });
    }
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // Auto-sync when coming back online
      if (wasOffline && this.isOnline) {
        this.syncPendingAudits();
      }
    });
  }

  async checkConnection() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    return this.isOnline;
  }

  /**
   * Save photo locally for offline use
   */
  async savePhotoLocally(uri) {
    try {
      const fileName = `audit_photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const localPath = OFFLINE_PHOTOS_DIR + fileName;
      
      await FileSystem.copyAsync({
        from: uri,
        to: localPath
      });
      
      return localPath;
    } catch (error) {
      console.error('Error saving photo locally:', error);
      return uri; // Return original URI if copy fails
    }
  }

  /**
   * Save audit locally when offline
   */
  async saveAuditLocally(auditData, missionId, auditorId) {
    try {
      // Save photos locally
      const localPhotos = [];
      for (const photo of auditData.photos || []) {
        if (photo.uri) {
          const localPath = await this.savePhotoLocally(photo.uri);
          localPhotos.push({
            ...photo,
            localUri: localPath
          });
        }
      }

      const offlineAudit = {
        id: `offline_${Date.now()}`,
        ...auditData,
        photos: localPhotos,
        missionId,
        auditorId,
        savedAt: new Date().toISOString(),
        synced: false
      };

      // Get existing pending audits
      const existing = await this.getPendingAudits();
      existing.push(offlineAudit);
      
      await AsyncStorage.setItem(PENDING_AUDITS_KEY, JSON.stringify(existing));
      
      return {
        success: true,
        offlineId: offlineAudit.id,
        message: 'Audit sauvegardé localement. Il sera synchronisé automatiquement.'
      };
    } catch (error) {
      console.error('Error saving audit locally:', error);
      throw error;
    }
  }

  /**
   * Get all pending (unsynchronized) audits
   */
  async getPendingAudits() {
    try {
      const data = await AsyncStorage.getItem(PENDING_AUDITS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending audits:', error);
      return [];
    }
  }

  /**
   * Get count of pending audits
   */
  async getPendingCount() {
    const pending = await this.getPendingAudits();
    return pending.filter(a => !a.synced).length;
  }

  /**
   * Sync a single audit to the server
   */
  async syncAudit(audit) {
    try {
      const response = await fetch(
        `${API_URL}/api/carbon-auditor/audit/submit?auditor_id=${audit.auditorId}&mission_id=${audit.missionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parcel_id: audit.parcel_id,
            actual_area_hectares: audit.actual_area_hectares,
            shade_trees_count: audit.shade_trees_count,
            shade_trees_density: audit.shade_trees_density,
            organic_practices: audit.organic_practices,
            soil_cover: audit.soil_cover,
            composting: audit.composting,
            erosion_control: audit.erosion_control,
            crop_health: audit.crop_health,
            photos: audit.photos.map(p => p.uri || p.localUri),
            gps_lat: audit.gps_lat,
            gps_lng: audit.gps_lng,
            observations: audit.observations,
            recommendation: audit.recommendation,
            rejection_reason: audit.rejection_reason
          })
        }
      );

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error syncing audit:', error);
      throw error;
    }
  }

  /**
   * Sync all pending audits
   */
  async syncPendingAudits() {
    if (!await this.checkConnection()) {
      return { synced: 0, failed: 0, message: 'Pas de connexion' };
    }

    const pending = await this.getPendingAudits();
    const unsynced = pending.filter(a => !a.synced);
    
    if (unsynced.length === 0) {
      return { synced: 0, failed: 0, message: 'Aucun audit en attente' };
    }

    let synced = 0;
    let failed = 0;

    for (const audit of unsynced) {
      try {
        await this.syncAudit(audit);
        audit.synced = true;
        audit.syncedAt = new Date().toISOString();
        synced++;
      } catch (error) {
        failed++;
        audit.syncError = error.message;
      }
    }

    // Update storage
    await AsyncStorage.setItem(PENDING_AUDITS_KEY, JSON.stringify(pending));

    // Clean up synced audits after 24 hours
    this.cleanupSyncedAudits();

    return {
      synced,
      failed,
      message: `${synced} audit(s) synchronisé(s)${failed > 0 ? `, ${failed} en échec` : ''}`
    };
  }

  /**
   * Remove synced audits older than 24 hours
   */
  async cleanupSyncedAudits() {
    try {
      const pending = await this.getPendingAudits();
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      
      const filtered = pending.filter(audit => {
        if (!audit.synced) return true;
        const syncedTime = new Date(audit.syncedAt).getTime();
        return syncedTime > cutoff;
      });

      await AsyncStorage.setItem(PENDING_AUDITS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error cleaning up audits:', error);
    }
  }

  /**
   * Delete a pending audit
   */
  async deletePendingAudit(offlineId) {
    try {
      const pending = await this.getPendingAudits();
      const filtered = pending.filter(a => a.id !== offlineId);
      await AsyncStorage.setItem(PENDING_AUDITS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting pending audit:', error);
      return false;
    }
  }

  /**
   * Cache mission data for offline access
   */
  async cacheMissionData(missionId, data) {
    try {
      const key = `@mission_cache_${missionId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error caching mission:', error);
    }
  }

  /**
   * Get cached mission data
   */
  async getCachedMission(missionId) {
    try {
      const key = `@mission_cache_${missionId}`;
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached mission:', error);
      return null;
    }
  }
}

export const auditOfflineService = new AuditOfflineService();
export default auditOfflineService;
