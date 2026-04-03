/**
 * Offline-first data layer.
 *
 * Every read/write goes through here. The contract:
 *   READ  – online → API + cache to SQLite → return data
 *         – offline → read from SQLite → return cached data
 *   WRITE – online → API + upsert SQLite → return result
 *         – offline → save to SQLite + enqueue in pending_sync → return local data
 *
 * Usage in screens:
 *   import { offlineParcels } from '../services/offlineData';
 *   const parcels = await offlineParcels.fetch(isOnline);
 *   await offlineParcels.create(isOnline, parcelData);
 */
import {
  ParcelsDAO,
  HarvestsDAO,
  ProductsDAO,
  OrdersDAO,
  NotificationsDAO,
  CarbonScoresDAO,
  PaymentsDAO,
  PendingSyncDAO,
} from './database';
import { syncEngine } from './syncEngine';
import { api, farmerApi } from './api';
import { marketplaceApi } from './marketplace';
import { carbonApi } from './carbon';

// ─── Helpers ──────────────────────────────────────────────────
function tempId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseArray(resp, key) {
  if (Array.isArray(resp.data)) return resp.data;
  if (resp.data && Array.isArray(resp.data[key])) return resp.data[key];
  return [];
}

// ─── PARCELS ──────────────────────────────────────────────────
export const offlineParcels = {
  async fetch(isOnline) {
    if (isOnline) {
      try {
        const resp = await farmerApi.getParcels();
        const parcels = Array.isArray(resp.data) ? resp.data : resp.data?.parcels || [];
        if (parcels.length) await ParcelsDAO.upsertMany(parcels);
        return parcels;
      } catch (e) {
        console.warn('[offlineData] parcels fetch failed, falling back to SQLite:', e.message);
        return ParcelsDAO.getAll();
      }
    }
    return ParcelsDAO.getAll();
  },

  async create(isOnline, data) {
    if (isOnline) {
      try {
        const resp = await farmerApi.createParcel(data);
        const created = resp.data;
        if (created) await ParcelsDAO.upsert(created);
        return { success: true, data: created };
      } catch (e) {
        return { success: false, error: e.data?.detail || e.message };
      }
    }
    // Offline: save locally + queue
    const localId = tempId();
    const localParcel = { ...data, id: localId, created_at: new Date().toISOString(), verification_status: 'pending' };
    await ParcelsDAO.upsert(localParcel);
    await syncEngine.enqueue('CREATE_PARCEL', 'parcels', localId, data);
    return { success: true, data: localParcel, offline: true };
  },
};

// ─── HARVESTS ─────────────────────────────────────────────────
export const offlineHarvests = {
  async fetch(isOnline, params) {
    if (isOnline) {
      try {
        const resp = await farmerApi.getHarvests(params || '');
        const raw = resp.data || resp;
        const harvests = raw.harvests || (Array.isArray(raw) ? raw : []);
        const stats = raw.stats || {};
        if (harvests.length) await HarvestsDAO.upsertMany(harvests);
        return { harvests, stats };
      } catch (e) {
        console.warn('[offlineData] harvests fetch failed, falling back to SQLite:', e.message);
        const rows = await HarvestsDAO.getAll();
        return { harvests: rows, stats: {} };
      }
    }
    const rows = await HarvestsDAO.getAll();
    return { harvests: rows, stats: {} };
  },

  async create(isOnline, data) {
    if (isOnline) {
      try {
        const resp = await farmerApi.createHarvest(data);
        const created = resp.data;
        if (created) await HarvestsDAO.upsert(created);
        return { success: true, data: created };
      } catch (e) {
        return { success: false, error: e.data?.detail || e.message };
      }
    }
    const localId = tempId();
    const localHarvest = { ...data, id: localId, created_at: new Date().toISOString(), payment_status: 'pending' };
    await HarvestsDAO.upsert(localHarvest);
    await PendingSyncDAO.add('CREATE_HARVEST', 'harvests', localId, data);
    return { success: true, data: localHarvest, offline: true };
  },
};

// ─── PRODUCTS ─────────────────────────────────────────────────
export const offlineProducts = {
  async fetch(isOnline, filters) {
    if (isOnline) {
      try {
        const resp = await marketplaceApi.getProducts(filters || {});
        const products = Array.isArray(resp.data) ? resp.data : resp.data?.products || [];
        if (products.length) await ProductsDAO.upsertMany(products);
        return products;
      } catch (e) {
        console.warn('[offlineData] products fetch failed, falling back to SQLite:', e.message);
        return ProductsDAO.getAll(filters?.category);
      }
    }
    return ProductsDAO.getAll(filters?.category);
  },

  async search(isOnline, query) {
    if (!query) return this.fetch(isOnline);
    if (isOnline) {
      try {
        const resp = await marketplaceApi.getProducts({ search: query });
        const products = Array.isArray(resp.data) ? resp.data : resp.data?.products || [];
        if (products.length) await ProductsDAO.upsertMany(products);
        return products;
      } catch (e) {
        return ProductsDAO.search(query);
      }
    }
    return ProductsDAO.search(query);
  },

  async getById(isOnline, id) {
    if (isOnline) {
      try {
        const resp = await marketplaceApi.getProduct(id);
        if (resp.data) await ProductsDAO.upsert(resp.data);
        return resp.data;
      } catch (e) {
        return ProductsDAO.getById(id);
      }
    }
    return ProductsDAO.getById(id);
  },
};

// ─── ORDERS ───────────────────────────────────────────────────
export const offlineOrders = {
  async fetch(isOnline) {
    if (isOnline) {
      try {
        const resp = await marketplaceApi.getOrders();
        const orders = Array.isArray(resp.data) ? resp.data : resp.data?.orders || [];
        if (orders.length) await OrdersDAO.upsertMany(orders);
        return orders;
      } catch (e) {
        console.warn('[offlineData] orders fetch failed, falling back to SQLite:', e.message);
        return OrdersDAO.getAll();
      }
    }
    return OrdersDAO.getAll();
  },

  async create(isOnline, data) {
    if (isOnline) {
      try {
        const resp = await marketplaceApi.createOrder(data);
        const created = resp.data;
        if (created) await OrdersDAO.upsert(created);
        return { success: true, data: created };
      } catch (e) {
        return { success: false, error: e.data?.detail || e.message };
      }
    }
    const localId = tempId();
    const localOrder = { ...data, id: localId, status: 'pending', created_at: new Date().toISOString() };
    await OrdersDAO.upsert(localOrder);
    await syncEngine.enqueue('CREATE_ORDER', 'orders', localId, data);
    return { success: true, data: localOrder, offline: true };
  },

  async getById(isOnline, id) {
    if (isOnline) {
      try {
        const resp = await marketplaceApi.getOrder(id);
        if (resp.data) await OrdersDAO.upsert(resp.data);
        return resp.data;
      } catch (e) {
        return OrdersDAO.getById(id);
      }
    }
    return OrdersDAO.getById(id);
  },
};

// ─── NOTIFICATIONS ────────────────────────────────────────────
export const offlineNotifications = {
  async fetch(isOnline) {
    if (isOnline) {
      try {
        const resp = await api.get('/notifications/history', { params: { limit: 100 } });
        const notifs = resp.data?.notifications || [];
        if (notifs.length) await NotificationsDAO.upsertMany(notifs);
        return notifs;
      } catch (e) {
        console.warn('[offlineData] notifications fetch failed, falling back to SQLite:', e.message);
        // userId unknown here — return all cached
        const rows = await NotificationsDAO.getByUser('*');
        return rows.length ? rows : [];
      }
    }
    // Offline — we return whatever is cached; caller can filter
    const db = require('./database').getDatabase();
    if (!db) return [];
    const rows = await db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC');
    return rows || [];
  },

  async markRead(isOnline, id) {
    await NotificationsDAO.markRead(id);
    if (isOnline) {
      try { await api.put(`/notifications/history/${id}/read`); } catch (e) { /* silent */ }
    }
  },

  async markAllRead(isOnline, userId) {
    // Mark all local as read
    const db = require('./database').getDatabase();
    if (db) await db.runAsync('UPDATE notifications SET is_read = 1');
    if (isOnline) {
      try { await api.put('/notifications/history/read-all'); } catch (e) { /* silent */ }
    }
  },
};

// ─── CARBON SCORE ─────────────────────────────────────────────
export const offlineCarbonScore = {
  async fetch(isOnline, farmerId) {
    if (isOnline) {
      try {
        const resp = await carbonApi.getMyCarbonScore();
        if (resp.data) {
          await CarbonScoresDAO.upsert({ ...resp.data, farmer_id: farmerId });
        }
        return resp.data;
      } catch (e) {
        console.warn('[offlineData] carbon score fetch failed, falling back to SQLite:', e.message);
        return CarbonScoresDAO.getByFarmer(farmerId);
      }
    }
    const row = await CarbonScoresDAO.getByFarmer(farmerId);
    if (row?.raw_json) {
      try { return JSON.parse(row.raw_json); } catch { return row; }
    }
    return row;
  },
};

// ─── PAYMENTS ─────────────────────────────────────────────────
export const offlinePayments = {
  async fetch(isOnline) {
    if (isOnline) {
      try {
        const resp = await farmerApi.getPaymentRequests();
        const payments = Array.isArray(resp.data) ? resp.data : resp.data?.payments || [];
        if (payments.length) await PaymentsDAO.upsertMany(payments);
        return payments;
      } catch (e) {
        console.warn('[offlineData] payments fetch failed, falling back to SQLite:', e.message);
        return PaymentsDAO.getByFarmer('*');
      }
    }
    const db = require('./database').getDatabase();
    if (!db) return [];
    return db.getAllAsync('SELECT * FROM payments ORDER BY created_at DESC') || [];
  },

  async createRequest(isOnline, data) {
    if (isOnline) {
      try {
        const resp = await farmerApi.createPaymentRequest(data || {});
        const created = resp.data;
        if (created) await PaymentsDAO.upsert(created);
        return { success: true, data: created };
      } catch (e) {
        return { success: false, error: e.data?.detail || e.message };
      }
    }
    const localId = tempId();
    const localPayment = { ...data, id: localId, status: 'pending', created_at: new Date().toISOString() };
    await PaymentsDAO.upsert(localPayment);
    await syncEngine.enqueue('CREATE_PAYMENT_REQUEST', 'payments', localId, data || {});
    return { success: true, data: localPayment, offline: true };
  },
};

// ─── CARBON PAYMENTS DASHBOARD ────────────────────────────────
export const offlineCarbonPayments = {
  async fetch(isOnline) {
    if (isOnline) {
      try {
        const resp = await api.get('/carbon-payments/dashboard');
        // Store raw JSON in a simple key-value approach via db_meta
        const db = require('./database').getDatabase();
        if (db && resp.data) {
          await db.runAsync(
            `INSERT OR REPLACE INTO db_meta (key, value) VALUES ('cache_carbon_payments', ?)`,
            [JSON.stringify(resp.data)]
          );
        }
        return resp.data;
      } catch (e) {
        console.warn('[offlineData] carbon payments fetch failed, falling back to cache:', e.message);
        return this._readCache();
      }
    }
    return this._readCache();
  },

  async _readCache() {
    try {
      const db = require('./database').getDatabase();
      if (!db) return null;
      const row = await db.getFirstAsync("SELECT value FROM db_meta WHERE key = 'cache_carbon_payments'");
      return row ? JSON.parse(row.value) : null;
    } catch { return null; }
  },
};

// ─── GENERIC CACHE (for dashboard-level composite data) ───────
export const offlineCache = {
  async _write(key, data) {
    try {
      const db = require('./database').getDatabase();
      if (db && data != null) {
        await db.runAsync(
          `INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)`,
          [`cache_${key}`, JSON.stringify(data)]
        );
      }
    } catch (e) { console.warn('[offlineCache] write error:', e.message); }
  },

  async _read(key) {
    try {
      const db = require('./database').getDatabase();
      if (!db) return null;
      const row = await db.getFirstAsync('SELECT value FROM db_meta WHERE key = ?', [`cache_${key}`]);
      return row ? JSON.parse(row.value) : null;
    } catch { return null; }
  },

  /**
   * Generic fetch: online → call apiFn + cache result; offline → read from SQLite cache.
   * @param {boolean} isOnline
   * @param {string} cacheKey
   * @param {Function} apiFn  — async () => response.data
   */
  async fetch(isOnline, cacheKey, apiFn) {
    if (isOnline) {
      try {
        const data = await apiFn();
        await this._write(cacheKey, data);
        return data;
      } catch (e) {
        console.warn(`[offlineCache] ${cacheKey} fetch failed, falling back to SQLite:`, e.message);
        return this._read(cacheKey);
      }
    }
    return this._read(cacheKey);
  },
};
