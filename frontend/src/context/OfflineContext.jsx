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
  const retryTimer = useRef(null);
  const retryCount = useRef(0);
  const isOnlineRef = useRef(navigator.onLine);
  const pendingCountRef = useRef(0);

  // Keep refs in sync with state for use in callbacks
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);
  useEffect(() => { pendingCountRef.current = pendingCount; }, [pendingCount]);

  // Core sync function — uses refs to avoid stale closures
  const doSync = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || syncInProgress.current || !isOnlineRef.current) return;

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

      const remaining = await getPendingActionsCount();
      setPendingCount(remaining);
      retryCount.current = 0; // Reset retry on success
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    } catch (err) {
      console.error('[OfflineSync] Error:', err);
      setSyncError(err.message);
      // Schedule retry with exponential backoff (max 60s)
      scheduleRetry();
    } finally {
      setSyncing(false);
      syncInProgress.current = false;
    }
  }, []);

  const scheduleRetry = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const delay = Math.min(5000 * Math.pow(2, retryCount.current), 60000);
    retryCount.current += 1;
    retryTimer.current = setTimeout(() => {
      if (isOnlineRef.current && pendingCountRef.current > 0) {
        doSync();
      }
    }, delay);
  }, [doSync]);

  // Public syncAll — wraps doSync
  const syncAll = useCallback(async () => {
    retryCount.current = 0;
    await doSync();
  }, [doSync]);

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
        const count = await getPendingActionsCount();
        setPendingCount(count);
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

  // Auto-sync: triggers when isOnline changes OR pendingCount increases
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncInProgress.current) {
      doSync();
    }
  }, [isOnline, pendingCount, doSync]);

  // Also sync when user returns to the tab (handles background/foreground transitions)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOnlineRef.current && pendingCountRef.current > 0 && !syncInProgress.current) {
        doSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [doSync]);

  const queueAction = useCallback(async (action) => {
    const id = await queueOfflineAction(action);
    setPendingCount((c) => c + 1);

    // Try sync immediately if online
    if (isOnlineRef.current && !syncInProgress.current) {
      setTimeout(() => doSync(), 500);
    }
    return id;
  }, [doSync]);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

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
