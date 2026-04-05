/**
 * OfflineContext — Contexte global pour le mode offline-first
 * GreenLink Agritech — Web PWA
 *
 * Fournit à toute l'app :
 *  - isOnline (boolean)
 *  - syncing (boolean)
 *  - pendingCount (int) — actions en attente
 *  - lastSync (ISO string)
 *  - syncAll() — sync manuelle
 *  - queueAction(action) — ajouter une action à la file
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  performFullSync,
  uploadPendingActions,
  getLastSyncTime,
  getPendingActionsCount,
  getFarmersCount,
  queueOfflineAction,
  getCoopMembersCount,
  syncCooperativeData,
} from '../services/offlineDB';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OfflineContext = createContext({
  isOnline: true,
  syncing: false,
  lastSync: null,
  pendingCount: 0,
  cachedFarmers: 0,
  cachedMembers: 0,
  syncError: null,
  syncAll: async () => {},
  queueAction: async () => {},
  userType: null,
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [cachedFarmers, setCachedFarmers] = useState(0);
  const [cachedMembers, setCachedMembers] = useState(0);
  const [syncError, setSyncError] = useState(null);
  const [userType, setUserType] = useState(null);
  const syncInProgress = useRef(false);
  const pingInterval = useRef(null);

  // Detect online/offline + real ping
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Real ping every 30s to detect captive portals / flaky connections
    const checkReal = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${API_URL}/api/health`, { signal: ctrl.signal });
        clearTimeout(t);
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    pingInterval.current = setInterval(checkReal, 30000);
    checkReal();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(pingInterval.current);
    };
  }, []);

  // Load initial state from IndexedDB
  useEffect(() => {
    (async () => {
      try {
        setLastSync(await getLastSyncTime());
        setPendingCount(await getPendingActionsCount());
        setCachedFarmers(await getFarmersCount());
        setCachedMembers(await getCoopMembersCount());
      } catch { /* IndexedDB may not be ready */ }
    })();
    // Read user type from localStorage
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUserType(u.user_type);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncInProgress.current) {
      syncAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const getToken = () => localStorage.getItem('token');

  const syncAll = useCallback(async () => {
    const token = getToken();
    if (!token || syncInProgress.current || !isOnline) return;

    syncInProgress.current = true;
    setSyncing(true);
    setSyncError(null);

    try {
      // 1. Upload pending actions
      await uploadPendingActions(API_URL, token);

      // 2. Download fresh data based on user type
      const storedUser = localStorage.getItem('user');
      const ut = storedUser ? JSON.parse(storedUser).user_type : null;

      if (ut === 'field_agent') {
        const result = await performFullSync(API_URL, token);
        setCachedFarmers(result.farmersCount);
        setLastSync(result.syncTimestamp);
      }

      if (ut === 'cooperative') {
        const result = await syncCooperativeData(API_URL, token);
        setCachedMembers(result.membersCount);
        setLastSync(result.syncTimestamp);
      }

      setPendingCount(await getPendingActionsCount());
    } catch (err) {
      console.error('[OfflineSync] Error:', err);
      setSyncError(err.message);
    } finally {
      setSyncing(false);
      syncInProgress.current = false;
    }
  }, [isOnline]);

  const queueAction = useCallback(async (action) => {
    const id = await queueOfflineAction(action);
    setPendingCount((c) => c + 1);

    // Try sync immediately if online
    if (isOnline && !syncInProgress.current) {
      setTimeout(() => syncAll(), 500);
    }
    return id;
  }, [isOnline, syncAll]);

  return (
    <OfflineContext.Provider value={{
      isOnline,
      syncing,
      lastSync,
      pendingCount,
      cachedFarmers,
      cachedMembers,
      syncError,
      syncAll,
      queueAction,
      userType,
    }}>
      {children}
    </OfflineContext.Provider>
  );
};
