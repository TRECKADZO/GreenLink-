/**
 * SyncEngine — batch sync queue with last-write-wins conflict resolution.
 *
 * Stores changes in SQLite `pending_sync`. When connectivity is restored,
 * groups pending items by entity_table, sends them in a single POST to
 * /api/sync/batch, and handles per-item results including conflicts.
 *
 * Conflict resolution (last-write-wins):
 *   - Each queued action stores a client_timestamp.
 *   - The server compares client_timestamp vs server's updated_at.
 *   - If client is newer → client wins, server applies the change.
 *   - If server is newer → server wins, client receives the server version
 *     and updates its local SQLite accordingly.
 *
 * Usage:
 *   import { syncEngine } from './syncEngine';
 *   const result = await syncEngine.processQueue();  // manual trigger
 *   // Auto-trigger is handled by SyncProvider in context.
 */
import { PendingSyncDAO, ParcelsDAO, HarvestsDAO, OrdersDAO, PaymentsDAO, getDatabase } from './database';
import { api } from './api';

const BATCH_SIZE = 20;
const MAX_RETRY_DELAY_MS = 30000;
const BASE_RETRY_DELAY_MS = 2000;

class SyncEngine {
  constructor() {
    this._processing = false;
    this._listeners = [];
  }

  // ─── Event system ──────────────────────────────────────────
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _emit(event) {
    for (const fn of this._listeners) {
      try { fn(event); } catch (e) { /* silent */ }
    }
  }

  // ─── Queue a change ────────────────────────────────────────
  async enqueue(actionType, entityTable, entityId, payload) {
    await PendingSyncDAO.add(actionType, entityTable, entityId, payload);
    this._emit({ type: 'enqueued', actionType, entityTable, entityId });
  }

  // ─── Get queue stats ──────────────────────────────────────
  async getQueueStats() {
    const db = getDatabase();
    if (!db) return { pending: 0, failed: 0, total: 0 };

    const pending = await db.getFirstAsync("SELECT COUNT(*) as c FROM pending_sync WHERE status = 'pending'");
    const failed = await db.getFirstAsync("SELECT COUNT(*) as c FROM pending_sync WHERE status = 'failed'");
    const total = await db.getFirstAsync("SELECT COUNT(*) as c FROM pending_sync");

    return {
      pending: pending?.c || 0,
      failed: failed?.c || 0,
      total: total?.c || 0,
    };
  }

  // ─── Process the full queue in batches ─────────────────────
  async processQueue() {
    if (this._processing) {
      console.log('[SyncEngine] Already processing, skipping');
      return { synced: 0, conflicts: 0, errors: 0, serverWins: [] };
    }

    this._processing = true;
    this._emit({ type: 'sync_start' });

    let totalSynced = 0;
    let totalConflicts = 0;
    let totalErrors = 0;
    const allServerWins = [];

    try {
      // Get all pending actions
      const allPending = await PendingSyncDAO.getPending();
      if (!allPending.length) {
        this._emit({ type: 'sync_end', synced: 0, conflicts: 0, errors: 0 });
        return { synced: 0, conflicts: 0, errors: 0, serverWins: [] };
      }

      console.log(`[SyncEngine] Processing ${allPending.length} pending actions`);

      // Split into batches
      const batches = [];
      for (let i = 0; i < allPending.length; i += BATCH_SIZE) {
        batches.push(allPending.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        const result = await this._processBatch(batch);
        totalSynced += result.synced;
        totalConflicts += result.conflicts;
        totalErrors += result.errors;
        allServerWins.push(...result.serverWins);
      }

      // Clean up completed items
      await PendingSyncDAO.clearDone();

    } catch (e) {
      console.error('[SyncEngine] Fatal queue error:', e);
      totalErrors++;
    } finally {
      this._processing = false;
      this._emit({
        type: 'sync_end',
        synced: totalSynced,
        conflicts: totalConflicts,
        errors: totalErrors,
      });
    }

    return {
      synced: totalSynced,
      conflicts: totalConflicts,
      errors: totalErrors,
      serverWins: allServerWins,
    };
  }

  // ─── Process a single batch via /api/sync/batch ────────────
  async _processBatch(batch) {
    let synced = 0;
    let conflicts = 0;
    let errors = 0;
    const serverWins = [];

    // Build the API payload
    const actions = batch.map(item => ({
      action_type: item.action_type,
      entity_table: item.entity_table,
      entity_id: item.entity_id || null,
      payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
      client_timestamp: item.created_at,
    }));

    try {
      const resp = await api.post('/sync/batch', { actions });
      const data = resp.data;

      // Process per-item results
      for (let i = 0; i < data.results.length; i++) {
        const result = data.results[i];
        const queueItem = batch[i];

        if (result.status === 'synced' || result.status === 'conflict_client_wins') {
          await PendingSyncDAO.markDone(queueItem.id);
          synced++;

          // If server returned a new entity_id, update local SQLite
          if (result.entity_id && result.entity_id !== queueItem.entity_id) {
            await this._updateLocalEntityId(
              queueItem.entity_table,
              queueItem.entity_id,
              result.entity_id
            );
          }

          if (result.status === 'conflict_client_wins') {
            conflicts++;
            console.log(`[SyncEngine] Conflict resolved: client wins for ${queueItem.entity_table}/${queueItem.entity_id}`);
          }

        } else if (result.status === 'conflict_server_wins') {
          // Server has newer data — apply it locally
          await PendingSyncDAO.markDone(queueItem.id);
          conflicts++;

          if (result.server_data) {
            await this._applyServerVersion(queueItem.entity_table, result.entity_id, result.server_data);
            serverWins.push({
              table: queueItem.entity_table,
              entityId: result.entity_id,
              data: result.server_data,
            });
          }

          console.log(`[SyncEngine] Conflict resolved: server wins for ${queueItem.entity_table}/${result.entity_id}`);

        } else {
          // Error
          await PendingSyncDAO.markFailed(queueItem.id, result.message);
          errors++;
          console.warn(`[SyncEngine] Action failed: ${result.message}`);
        }
      }

    } catch (e) {
      console.error('[SyncEngine] Batch API call failed:', e.message);
      // Mark all items in this batch as failed (with retry)
      for (const item of batch) {
        await PendingSyncDAO.markFailed(item.id, e.message);
      }
      errors += batch.length;
    }

    return { synced, conflicts, errors, serverWins };
  }

  // ─── Update local entity ID after server assigns a real one ─
  async _updateLocalEntityId(table, oldId, newId) {
    if (!oldId || !newId || oldId === newId) return;
    const db = getDatabase();
    if (!db) return;

    try {
      // Update the entity's id in the relevant table
      const tableMap = {
        parcels: 'parcels',
        harvests: 'harvests',
        orders: 'orders',
        payments: 'payments',
        products: 'products',
        notifications: 'notifications',
        messages: 'messages',
        carbon_scores: 'carbon_scores',
      };
      const sqlTable = tableMap[table];
      if (sqlTable) {
        await db.runAsync(`UPDATE ${sqlTable} SET id = ? WHERE id = ?`, [newId, oldId]);
      }
    } catch (e) {
      console.warn(`[SyncEngine] updateLocalId error for ${table}:`, e.message);
    }
  }

  // ─── Apply server version to local SQLite (server wins) ────
  async _applyServerVersion(table, entityId, serverData) {
    try {
      const data = { ...serverData, id: entityId };

      switch (table) {
        case 'parcels':
          await ParcelsDAO.upsert(data);
          break;
        case 'harvests':
          await HarvestsDAO.upsert(data);
          break;
        case 'orders':
          await OrdersDAO.upsert(data);
          break;
        case 'payments':
          await PaymentsDAO.upsert(data);
          break;
        default:
          console.warn(`[SyncEngine] No DAO handler for table: ${table}`);
      }
    } catch (e) {
      console.warn(`[SyncEngine] applyServerVersion error for ${table}:`, e.message);
    }
  }

  // ─── Retry failed items (called on subsequent sync attempts) ─
  async retryFailed() {
    const db = getDatabase();
    if (!db) return;

    // Reset 'failed' items back to 'pending' with reset retry_count
    await db.runAsync(
      "UPDATE pending_sync SET status = 'pending', retry_count = 0 WHERE status = 'failed'"
    );

    return this.processQueue();
  }
}

export const syncEngine = new SyncEngine();
