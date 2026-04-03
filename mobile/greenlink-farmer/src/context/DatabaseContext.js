/**
 * DatabaseContext — React context for local SQLite database.
 *
 * Provides:
 *   - dbReady: boolean — true once migrations complete
 *   - db: raw SQLite handle (for advanced queries)
 *   - DAO objects for each table
 *   - syncFromServer(): pull latest data from backend into SQLite
 *   - pushPendingActions(): push offline queue to backend
 *   - storageStats: row counts per table
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  openDatabase,
  getDatabase,
  clearAllData,
  getStorageStats,
  UsersDAO,
  ParcelsDAO,
  HarvestsDAO,
  ProductsDAO,
  OrdersDAO,
  NotificationsDAO,
  MessagesDAO,
  CarbonScoresDAO,
  PaymentsDAO,
  PendingSyncDAO,
} from '../services/database';
import { api, farmerApi } from '../services/api';
import { marketplaceApi } from '../services/marketplace';
import { useAuth } from './AuthContext';

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({ children }) => {
  const [dbReady, setDbReady] = useState(false);
  const [storageStats, setStorageStats] = useState({});
  const [syncStatus, setSyncStatus] = useState({ syncing: false, lastSync: null, error: null });
  const { user, isAuthenticated } = useAuth();
  const syncingRef = useRef(false);

  // Initialize database on mount
  useEffect(() => {
    (async () => {
      try {
        await openDatabase();
        console.log('[DB] SQLite database initialized');
        setDbReady(true);
        refreshStats();
      } catch (e) {
        console.error('[DB] Failed to initialize SQLite:', e);
      }
    })();
  }, []);

  // When user logs in, sync their data
  useEffect(() => {
    if (dbReady && isAuthenticated && user) {
      // Save current user locally
      UsersDAO.upsert(user).catch(e => console.warn('[DB] User upsert error:', e));
    }
  }, [dbReady, isAuthenticated, user]);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (e) {
      console.warn('[DB] Stats error:', e);
    }
  }, []);

  /**
   * Pull latest data from the server into SQLite.
   * Silently skips any individual collection that fails.
   */
  const syncFromServer = useCallback(async () => {
    if (!isAuthenticated || syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus(s => ({ ...s, syncing: true, error: null }));

    const errors = [];

    try {
      // 1) Parcels
      try {
        const resp = await farmerApi.getParcels();
        const parcels = Array.isArray(resp.data) ? resp.data : resp.data?.parcels || [];
        if (parcels.length) await ParcelsDAO.upsertMany(parcels);
      } catch (e) { errors.push('parcels'); }

      // 2) Harvests
      try {
        const resp = await farmerApi.getHarvests();
        const harvests = Array.isArray(resp.data) ? resp.data : resp.data?.harvests || [];
        if (harvests.length) await HarvestsDAO.upsertMany(harvests);
      } catch (e) { errors.push('harvests'); }

      // 3) Products
      try {
        const resp = await marketplaceApi.getProducts();
        const products = Array.isArray(resp.data) ? resp.data : resp.data?.products || [];
        if (products.length) await ProductsDAO.upsertMany(products);
      } catch (e) { errors.push('products'); }

      // 4) Orders
      try {
        const resp = await marketplaceApi.getOrders();
        const orders = Array.isArray(resp.data) ? resp.data : resp.data?.orders || [];
        if (orders.length) await OrdersDAO.upsertMany(orders);
      } catch (e) { errors.push('orders'); }

      // 5) Notifications
      try {
        const resp = await farmerApi.getNotifications();
        const notifs = Array.isArray(resp.data) ? resp.data : resp.data?.notifications || [];
        if (notifs.length) await NotificationsDAO.upsertMany(notifs);
      } catch (e) { errors.push('notifications'); }

      // 6) Carbon score
      try {
        const resp = await farmerApi.getCarbonScore();
        if (resp.data) await CarbonScoresDAO.upsert(resp.data);
      } catch (e) { errors.push('carbon_scores'); }

      // 7) Payments
      try {
        const resp = await farmerApi.getPaymentRequests();
        const payments = Array.isArray(resp.data) ? resp.data : resp.data?.payments || [];
        if (payments.length) await PaymentsDAO.upsertMany(payments);
      } catch (e) { errors.push('payments'); }

      setSyncStatus({
        syncing: false,
        lastSync: new Date().toISOString(),
        error: errors.length ? `Partiel: ${errors.join(', ')}` : null,
      });
    } catch (e) {
      console.error('[DB] Sync error:', e);
      setSyncStatus(s => ({ ...s, syncing: false, error: e.message }));
    } finally {
      syncingRef.current = false;
      refreshStats();
    }
  }, [isAuthenticated, refreshStats]);

  /**
   * Push pending offline actions to the server.
   */
  const pushPendingActions = useCallback(async () => {
    if (!isAuthenticated || syncingRef.current) return { synced: 0, failed: 0 };
    syncingRef.current = true;

    let synced = 0;
    let failed = 0;

    try {
      const pending = await PendingSyncDAO.getPending();
      for (const action of pending) {
        try {
          const payload = JSON.parse(action.payload);
          switch (action.action_type) {
            case 'CREATE_PARCEL':
              await api.post('/greenlink/parcels', payload);
              break;
            case 'CREATE_HARVEST':
              await api.post('/greenlink/harvests', payload);
              break;
            case 'UPDATE_PARCEL':
              await api.put(`/greenlink/parcels/${action.entity_id}`, payload);
              break;
            case 'CREATE_PAYMENT_REQUEST':
              await api.post('/greenlink/payments/request', payload);
              break;
            case 'CREATE_ORDER':
              await api.post('/marketplace/orders', payload);
              break;
            default:
              console.warn('[DB] Unknown sync action:', action.action_type);
          }
          await PendingSyncDAO.markDone(action.id);
          synced++;
        } catch (e) {
          await PendingSyncDAO.markFailed(action.id, e.message);
          failed++;
        }
      }

      // Clean up completed items
      await PendingSyncDAO.clearDone();
    } catch (e) {
      console.error('[DB] Push error:', e);
    } finally {
      syncingRef.current = false;
      refreshStats();
    }

    return { synced, failed };
  }, [isAuthenticated, refreshStats]);

  /**
   * Full sync: push pending, then pull from server.
   */
  const fullSync = useCallback(async () => {
    const pushResult = await pushPendingActions();
    await syncFromServer();
    return pushResult;
  }, [pushPendingActions, syncFromServer]);

  /**
   * Clear all local data (logout scenario).
   */
  const clearLocal = useCallback(async () => {
    await clearAllData();
    setStorageStats({});
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        dbReady,
        db: getDatabase,
        storageStats,
        syncStatus,
        // DAOs
        UsersDAO,
        ParcelsDAO,
        HarvestsDAO,
        ProductsDAO,
        OrdersDAO,
        NotificationsDAO,
        MessagesDAO,
        CarbonScoresDAO,
        PaymentsDAO,
        PendingSyncDAO,
        // Actions
        syncFromServer,
        pushPendingActions,
        fullSync,
        clearLocal,
        refreshStats,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};
