/**
 * SyncContext — provides the SyncEngine to the whole app.
 *
 * Auto-triggers batch sync when connectivity transitions from offline → online.
 * Exposes queue stats and manual sync trigger to all screens.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { syncEngine } from '../services/syncEngine';
import { useConnectivity } from './ConnectivityContext';
import { useAuth } from './AuthContext';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const { isOnline } = useConnectivity();
  const { isAuthenticated } = useAuth();
  const [queueStats, setQueueStats] = useState({ pending: 0, failed: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const wasOfflineRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Refresh queue stats periodically and on changes
  const refreshStats = useCallback(async () => {
    const stats = await syncEngine.getQueueStats();
    if (mountedRef.current) setQueueStats(stats);
  }, []);

  // Listen to engine events
  useEffect(() => {
    const unsubscribe = syncEngine.onChange((event) => {
      if (!mountedRef.current) return;
      if (event.type === 'sync_start' || event.type === 'pull_start') {
        setSyncing(true);
      } else if (event.type === 'sync_end') {
        setLastSyncResult(prev => ({
          ...prev,
          push: { synced: event.synced, conflicts: event.conflicts, errors: event.errors },
          timestamp: new Date().toISOString(),
        }));
        refreshStats();
      } else if (event.type === 'pull_end') {
        setSyncing(false);
        setLastSyncResult(prev => ({
          ...prev,
          pull: { upserts: event.upserts, deletions: event.deletions },
          timestamp: new Date().toISOString(),
        }));
        refreshStats();
      } else if (event.type === 'enqueued') {
        refreshStats();
      }
    });
    return unsubscribe;
  }, [refreshStats]);

  // Auto-trigger: when transitioning from offline → online
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    // We just came back online
    if (wasOfflineRef.current && isAuthenticated) {
      wasOfflineRef.current = false;
      console.log('[SyncProvider] Connectivity restored — triggering full sync (push + pull)');

      (async () => {
        await new Promise(r => setTimeout(r, 1500));

        const result = await syncEngine.fullSync();

        if (mountedRef.current) {
          const parts = [];
          if (result.push.synced > 0) parts.push(`${result.push.synced} envoye(s)`);
          if (result.push.conflicts > 0) parts.push(`${result.push.conflicts} conflit(s)`);
          if (result.pull.upserts > 0) parts.push(`${result.pull.upserts} recu(s)`);
          if (result.pull.deletions > 0) parts.push(`${result.pull.deletions} supprime(s)`);

          if (parts.length > 0) {
            Alert.alert('Synchronisation terminee', parts.join(', '), [{ text: 'OK' }]);
          }
        }
      })();
    }
  }, [isOnline, isAuthenticated]);

  // Refresh stats on mount and when auth changes
  useEffect(() => {
    refreshStats();
  }, [isAuthenticated, refreshStats]);

  // Manual sync trigger (push only)
  const triggerSync = useCallback(async () => {
    if (!isOnline || !isAuthenticated) {
      return { synced: 0, conflicts: 0, errors: 0, serverWins: [], offline: !isOnline };
    }
    return syncEngine.processQueue();
  }, [isOnline, isAuthenticated]);

  // Manual full sync (push + pull)
  const triggerFullSync = useCallback(async () => {
    if (!isOnline || !isAuthenticated) return null;
    return syncEngine.fullSync();
  }, [isOnline, isAuthenticated]);

  // Pull only (fetch server changes)
  const pullChanges = useCallback(async () => {
    if (!isOnline || !isAuthenticated) return null;
    return syncEngine.pullChanges();
  }, [isOnline, isAuthenticated]);

  // Check if there are changes on the server
  const checkForChanges = useCallback(async () => {
    if (!isOnline || !isAuthenticated) return null;
    return syncEngine.checkForChanges();
  }, [isOnline, isAuthenticated]);

  // Retry previously failed items
  const retryFailed = useCallback(async () => {
    if (!isOnline || !isAuthenticated) return null;
    return syncEngine.retryFailed();
  }, [isOnline, isAuthenticated]);

  return (
    <SyncContext.Provider
      value={{
        syncing,
        queueStats,
        lastSyncResult,
        triggerSync,
        triggerFullSync,
        pullChanges,
        checkForChanges,
        retryFailed,
        refreshStats,
        enqueue: syncEngine.enqueue.bind(syncEngine),
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};
