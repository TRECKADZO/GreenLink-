/**
 * Hook React pour la gestion du mode offline-first
 * GreenLink Agritech - Agent Terrain
 *
 * Détection online/offline + sync automatique + sync manuelle
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { tokenService } from '../services/tokenService';
import {
  performFullSync,
  uploadPendingActions,
  getLastSyncTime,
  getPendingActionsCount,
  getFarmersCount,
  searchFarmerByPhone,
  searchFarmerByName,
  getFarmerById,
  queueOfflineAction,
} from '../services/offlineDB';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function useOfflineAgent() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [cachedFarmers, setCachedFarmers] = useState(0);
  const [syncError, setSyncError] = useState(null);
  const syncInProgress = useRef(false);

  // Détection online/offline
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charger l'état initial depuis IndexedDB
  useEffect(() => {
    (async () => {
      const ls = await getLastSyncTime();
      setLastSync(ls);
      setPendingCount(await getPendingActionsCount());
      setCachedFarmers(await getFarmersCount());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync quand on revient en ligne
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncInProgress.current) {
      syncAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Écouter les messages du Service Worker pour Background Sync
  useEffect(() => {
    const handleSWSync = () => {
      if (isOnline && !syncInProgress.current) {
        syncAll();
      }
    };
    window.addEventListener('sw-sync-available', handleSWSync);
    return () => window.removeEventListener('sw-sync-available', handleSWSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const getToken = () => tokenService.getToken();

  // Synchronisation complète (download + upload)
  const syncAll = useCallback(async () => {
    const token = getToken();
    if (!token || syncInProgress.current) return;

    syncInProgress.current = true;
    setSyncing(true);
    setSyncError(null);

    try {
      // 1. Upload des actions en attente
      const uploadResult = await uploadPendingActions(API_URL, token);

      // 2. Télécharger les données fraîches
      const downloadResult = await performFullSync(API_URL, token);

      setLastSync(downloadResult.syncTimestamp);
      setCachedFarmers(downloadResult.farmersCount);
      setPendingCount(await getPendingActionsCount());

      return { upload: uploadResult, download: downloadResult };
    } catch (err) {
      /* error logged */
      setSyncError(err.message);
      throw err;
    } finally {
      setSyncing(false);
      syncInProgress.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recherche offline par téléphone
  const searchOffline = useCallback(async (phone) => {
    const results = await searchFarmerByPhone(phone);
    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recherche offline par nom
  const searchOfflineByName = useCallback(async (name) => {
    const results = await searchFarmerByName(name);
    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Détails d'un planteur offline
  const getFarmerOffline = useCallback(async (id) => {
    return getFarmerById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ajouter une action à la file d'attente
  const addPendingAction = useCallback(async (action) => {
    const id = await queueOfflineAction(action);
    setPendingCount((c) => c + 1);
    return id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isOnline,
    syncing,
    lastSync,
    pendingCount,
    cachedFarmers,
    syncError,
    syncAll,
    searchOffline,
    searchOfflineByName,
    getFarmerOffline,
    addPendingAction,
  };
}
