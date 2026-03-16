/**
 * Service IndexedDB pour le mode offline-first de l'agent terrain
 * GreenLink Agritech - Côte d'Ivoire
 *
 * Stocke localement: planteurs, parcelles, visites SSRTE, actions en attente
 * Synchronisation sécurisée avec Background Sync
 */
import { openDB } from 'idb';

const DB_NAME = 'greenlink_agent_offline';
const DB_VERSION = 1;

const STORES = {
  FARMERS: 'farmers',
  PARCELS: 'parcels',
  SSRTE_VISITS: 'ssrte_visits',
  PENDING_ACTIONS: 'pending_actions',
  META: 'meta',
};

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Planteurs - index par téléphone, village, nom
      if (!db.objectStoreNames.contains(STORES.FARMERS)) {
        const farmersStore = db.createObjectStore(STORES.FARMERS, { keyPath: 'id' });
        farmersStore.createIndex('phone_number', 'phone_number', { unique: false });
        farmersStore.createIndex('village', 'village', { unique: false });
        farmersStore.createIndex('full_name', 'full_name', { unique: false });
        farmersStore.createIndex('status', 'status', { unique: false });
      }

      // Parcelles
      if (!db.objectStoreNames.contains(STORES.PARCELS)) {
        const parcelsStore = db.createObjectStore(STORES.PARCELS, { keyPath: 'id' });
        parcelsStore.createIndex('farmer_id', 'farmer_id', { unique: false });
        parcelsStore.createIndex('verification_status', 'verification_status', { unique: false });
      }

      // Visites SSRTE
      if (!db.objectStoreNames.contains(STORES.SSRTE_VISITS)) {
        const visitsStore = db.createObjectStore(STORES.SSRTE_VISITS, { keyPath: 'id' });
        visitsStore.createIndex('farmer_id', 'farmer_id', { unique: false });
      }

      // Actions en attente (offline queue)
      if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const actionsStore = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'offline_id' });
        actionsStore.createIndex('action_type', 'action_type', { unique: false });
        actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Métadonnées (dernière sync, version)
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ============= MÉTADONNÉES =============

export async function getLastSyncTime() {
  const db = await getDB();
  const meta = await db.get(STORES.META, 'last_sync');
  return meta?.value || null;
}

export async function setLastSyncTime(timestamp) {
  const db = await getDB();
  await db.put(STORES.META, { key: 'last_sync', value: timestamp });
}

export async function getSyncVersion() {
  const db = await getDB();
  const meta = await db.get(STORES.META, 'data_version');
  return meta?.value || null;
}

// ============= STOCKAGE DES PLANTEURS =============

export async function saveFarmers(farmers) {
  const db = await getDB();
  const tx = db.transaction(STORES.FARMERS, 'readwrite');
  // Vider puis remplir (sync complète)
  await tx.store.clear();
  for (const farmer of farmers) {
    await tx.store.put(farmer);
  }
  await tx.done;
}

export async function getAllFarmers() {
  const db = await getDB();
  return db.getAll(STORES.FARMERS);
}

export async function getFarmerById(id) {
  const db = await getDB();
  return db.get(STORES.FARMERS, id);
}

export async function searchFarmerByPhone(phone) {
  const db = await getDB();
  const normalized = normalizePhone(phone);
  const patterns = getPhonePatterns(normalized);

  // Chercher d'abord par index
  const allFarmers = await db.getAll(STORES.FARMERS);
  return allFarmers.filter((f) => {
    const farmerPhone = normalizePhone(f.phone_number || '');
    return patterns.some(
      (p) => farmerPhone === p || (f.phone_number || '').includes(p)
    );
  });
}

export async function searchFarmerByName(name) {
  const db = await getDB();
  const allFarmers = await db.getAll(STORES.FARMERS);
  const lower = name.toLowerCase();
  return allFarmers.filter((f) =>
    (f.full_name || '').toLowerCase().includes(lower)
  );
}

export async function getFarmersCount() {
  const db = await getDB();
  return db.count(STORES.FARMERS);
}

// ============= PARCELLES =============

export async function saveParcels(parcels) {
  const db = await getDB();
  const tx = db.transaction(STORES.PARCELS, 'readwrite');
  await tx.store.clear();
  for (const p of parcels) {
    await tx.store.put(p);
  }
  await tx.done;
}

export async function getParcelsByFarmerId(farmerId) {
  const db = await getDB();
  return db.getAllFromIndex(STORES.PARCELS, 'farmer_id', farmerId);
}

// ============= VISITES SSRTE =============

export async function saveSSRTEVisits(visits) {
  const db = await getDB();
  const tx = db.transaction(STORES.SSRTE_VISITS, 'readwrite');
  await tx.store.clear();
  for (const v of visits) {
    await tx.store.put(v);
  }
  await tx.done;
}

export async function getSSRTEVisitsByFarmerId(farmerId) {
  const db = await getDB();
  return db.getAllFromIndex(STORES.SSRTE_VISITS, 'farmer_id', farmerId);
}

// ============= FILE D'ATTENTE OFFLINE =============

export async function queueOfflineAction(action) {
  const db = await getDB();
  const offlineId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const record = {
    ...action,
    offline_id: offlineId,
    timestamp: new Date().toISOString(),
  };
  await db.put(STORES.PENDING_ACTIONS, record);
  return offlineId;
}

export async function getPendingActions() {
  const db = await getDB();
  return db.getAll(STORES.PENDING_ACTIONS);
}

export async function getPendingActionsCount() {
  const db = await getDB();
  return db.count(STORES.PENDING_ACTIONS);
}

export async function removePendingAction(offlineId) {
  const db = await getDB();
  await db.delete(STORES.PENDING_ACTIONS, offlineId);
}

export async function clearSyncedActions(offlineIds) {
  const db = await getDB();
  const tx = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
  for (const id of offlineIds) {
    await tx.store.delete(id);
  }
  await tx.done;
}

// ============= SYNCHRONISATION COMPLÈTE =============

export async function performFullSync(apiUrl, token) {
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Télécharger les données de la zone
  const res = await fetch(`${apiUrl}/api/agent/sync/download`, { headers });
  if (!res.ok) throw new Error(`Sync download failed: ${res.status}`);

  const data = await res.json();

  // 2. Sauvegarder dans IndexedDB
  await saveFarmers(data.farmers || []);

  // Extraire et sauvegarder les parcelles
  const allParcels = [];
  for (const f of data.farmers || []) {
    for (const p of f.parcels || []) {
      allParcels.push({ ...p, farmer_id: f.id });
    }
  }
  await saveParcels(allParcels);
  await saveSSRTEVisits(data.ssrte_visits || []);

  // 3. Mettre à jour les métadonnées
  await setLastSyncTime(data.sync_timestamp);
  const db = await getDB();
  await db.put(STORES.META, { key: 'data_version', value: data.data_version });
  await db.put(STORES.META, { key: 'farmers_count', value: data.farmers_count });
  await db.put(STORES.META, { key: 'parcels_count', value: data.parcels_count });

  return {
    farmersCount: data.farmers_count,
    parcelsCount: data.parcels_count,
    ssrteVisitsCount: (data.ssrte_visits || []).length,
    syncTimestamp: data.sync_timestamp,
  };
}

export async function uploadPendingActions(apiUrl, token) {
  const pending = await getPendingActions();
  if (pending.length === 0) return { synced: 0, errors: 0 };

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${apiUrl}/api/agent/sync/upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      actions: pending,
      sync_timestamp: new Date().toISOString(),
    }),
  });

  if (!res.ok) throw new Error(`Sync upload failed: ${res.status}`);

  const result = await res.json();

  // Supprimer les actions synchronisées avec succès
  const syncedIds = (result.results || [])
    .filter((r) => r.status === 'synced' || r.status === 'already_synced')
    .map((r) => r.offline_id);

  await clearSyncedActions(syncedIds);

  return { synced: result.synced, errors: result.errors };
}

// ============= UTILITAIRES TÉLÉPHONE =============

function normalizePhone(phone) {
  let p = (phone || '').replace(/[\s\-\.]/g, '');
  if (p.startsWith('+225')) p = p.slice(4);
  else if (p.startsWith('225')) p = p.slice(3);
  else if (p.startsWith('00225')) p = p.slice(5);
  return p;
}

function getPhonePatterns(normalized) {
  const patterns = [normalized];
  const clean = normalized.replace(/^0/, '');
  patterns.push(`+225${normalized}`, `+225${clean}`);
  if (normalized.startsWith('0')) {
    patterns.push(normalized.slice(1), `+225${normalized.slice(1)}`);
  } else if (normalized.length <= 10) {
    patterns.push(`0${normalized}`, `+2250${normalized}`);
  }
  return [...new Set(patterns)];
}

// ============= NETTOYAGE =============

export async function clearAllOfflineData() {
  const db = await getDB();
  const stores = [STORES.FARMERS, STORES.PARCELS, STORES.SSRTE_VISITS, STORES.PENDING_ACTIONS, STORES.META];
  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}
