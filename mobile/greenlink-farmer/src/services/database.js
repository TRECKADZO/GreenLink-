/**
 * GreenLink Local Database Service
 * Expo SQLite — mirrors key backend MongoDB collections for offline-first usage.
 *
 * Collections mirrored:
 *   users, parcels, harvests, products, orders,
 *   notifications, messages, carbon_scores, payments, pending_sync
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'greenlink_local.db';
const DB_VERSION = 1;

let _db = null;

// ─── Open / Init ──────────────────────────────────────────────
export async function openDatabase() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(_db);
  return _db;
}

export function getDatabase() {
  return _db;
}

// ─── Migrations ───────────────────────────────────────────────
async function runMigrations(db) {
  // Version tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS db_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = await db.getFirstAsync(
    'SELECT value FROM db_meta WHERE key = ?',
    ['schema_version']
  );
  const currentVersion = row ? parseInt(row.value, 10) : 0;

  if (currentVersion < 1) {
    await migrateV1(db);
  }

  // Bump version
  await db.runAsync(
    `INSERT OR REPLACE INTO db_meta (key, value) VALUES ('schema_version', ?)`,
    [String(DB_VERSION)]
  );
}

async function migrateV1(db) {
  await db.execAsync(`
    -- ==============================
    -- USERS (current user + cached)
    -- ==============================
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone_number TEXT,
      email TEXT,
      user_type TEXT NOT NULL DEFAULT 'producteur',
      full_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      department TEXT,
      village TEXT,
      crops TEXT,
      farm_location TEXT,
      farm_size REAL,
      company_name TEXT,
      purchase_volume TEXT,
      coop_name TEXT,
      coop_code TEXT,
      registration_number TEXT,
      certifications TEXT,
      headquarters_address TEXT,
      headquarters_region TEXT,
      commission_rate REAL,
      orange_money_business TEXT,
      date_naissance TEXT,
      genre TEXT,
      niveau_education TEXT,
      taille_menage INTEGER,
      nombre_enfants INTEGER,
      created_at TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    -- ==============================
    -- PARCELS
    -- ==============================
    CREATE TABLE IF NOT EXISTS parcels (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      farmer_name TEXT,
      phone_number TEXT,
      location TEXT,
      region TEXT,
      department TEXT,
      crop_type TEXT DEFAULT '',
      area_hectares REAL,
      trees_count INTEGER DEFAULT 0,
      farming_practices TEXT,
      has_shade_trees INTEGER DEFAULT 0,
      uses_organic_fertilizer INTEGER DEFAULT 0,
      has_erosion_control INTEGER DEFAULT 0,
      latitude REAL,
      longitude REAL,
      planting_year INTEGER,
      photos TEXT,
      language TEXT DEFAULT 'francais',
      member_id TEXT,
      member_name TEXT,
      carbon_score REAL DEFAULT 0.0,
      carbon_credits_earned REAL DEFAULT 0.0,
      verification_status TEXT DEFAULT 'pending',
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_parcels_farmer ON parcels(farmer_id);

    -- ==============================
    -- HARVESTS
    -- ==============================
    CREATE TABLE IF NOT EXISTS harvests (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      parcel_id TEXT,
      quantity_kg REAL DEFAULT 0,
      quality_grade TEXT DEFAULT 'B',
      price_per_kg REAL DEFAULT 0,
      sale_type TEXT DEFAULT 'cooperative',
      harvest_date TEXT,
      carbon_premium REAL DEFAULT 0.0,
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      transaction_id TEXT,
      notes TEXT,
      created_at TEXT,
      synced_at TEXT,
      raw_json TEXT,
      FOREIGN KEY (parcel_id) REFERENCES parcels(id)
    );

    CREATE INDEX IF NOT EXISTS idx_harvests_farmer ON harvests(farmer_id);
    CREATE INDEX IF NOT EXISTS idx_harvests_parcel ON harvests(parcel_id);

    -- ==============================
    -- PRODUCTS (marketplace)
    -- ==============================
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      price REAL DEFAULT 0,
      unit TEXT,
      stock_quantity INTEGER DEFAULT 0,
      images TEXT,
      specifications TEXT,
      supplier_id TEXT,
      supplier_name TEXT,
      is_active INTEGER DEFAULT 1,
      total_sales INTEGER DEFAULT 0,
      rating REAL DEFAULT 0.0,
      reviews_count INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

    -- ==============================
    -- ORDERS (marketplace)
    -- ==============================
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      supplier_id TEXT,
      supplier_name TEXT,
      items TEXT,
      total_amount REAL DEFAULT 0,
      delivery_address TEXT,
      delivery_location TEXT,
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      estimated_delivery TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    -- ==============================
    -- NOTIFICATIONS
    -- ==============================
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      message TEXT,
      type TEXT,
      action_url TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);

    -- ==============================
    -- MESSAGES
    -- ==============================
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT,
      sender_name TEXT,
      receiver_id TEXT,
      receiver_name TEXT,
      conversation_id TEXT,
      content TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_msg_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_msg_receiver ON messages(receiver_id);

    -- ==============================
    -- CARBON SCORES
    -- ==============================
    CREATE TABLE IF NOT EXISTS carbon_scores (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      phone_number TEXT,
      total_score REAL DEFAULT 0,
      level_label TEXT,
      carbon_credits REAL DEFAULT 0,
      estimated_premium REAL DEFAULT 0,
      practices TEXT,
      last_evaluation TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_carbon_farmer ON carbon_scores(farmer_id);

    -- ==============================
    -- PAYMENTS
    -- ==============================
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      harvest_id TEXT,
      phone_number TEXT,
      amount REAL DEFAULT 0,
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      transaction_id TEXT,
      created_at TEXT,
      synced_at TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_payments_farmer ON payments(farmer_id);

    -- ==============================
    -- PENDING SYNC QUEUE
    -- ==============================
    CREATE TABLE IF NOT EXISTS pending_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      entity_table TEXT NOT NULL,
      entity_id TEXT,
      payload TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 5,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_attempt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_status ON pending_sync(status);
  `);
}

// ─── Generic helpers ──────────────────────────────────────────
function now() {
  return new Date().toISOString();
}

// ─── USERS ────────────────────────────────────────────────────
export const UsersDAO = {
  async upsert(user) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO users
        (id, phone_number, email, user_type, full_name, is_active,
         department, village, crops, farm_location, farm_size,
         company_name, purchase_volume, coop_name, coop_code,
         registration_number, certifications, headquarters_address,
         headquarters_region, commission_rate, orange_money_business,
         date_naissance, genre, niveau_education, taille_menage,
         nombre_enfants, created_at, synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        user.id || user._id,
        user.phone_number || null,
        user.email || null,
        user.user_type || 'producteur',
        user.full_name,
        user.is_active !== false ? 1 : 0,
        user.department || null,
        user.village || null,
        JSON.stringify(user.crops || []),
        user.farm_location || null,
        user.farm_size || null,
        user.company_name || null,
        user.purchase_volume || null,
        user.coop_name || null,
        user.coop_code || null,
        user.registration_number || null,
        JSON.stringify(user.certifications || []),
        user.headquarters_address || null,
        user.headquarters_region || null,
        user.commission_rate || null,
        user.orange_money_business || null,
        user.date_naissance || null,
        user.genre || null,
        user.niveau_education || null,
        user.taille_menage || null,
        user.nombre_enfants || null,
        user.created_at || now(),
        now(),
        JSON.stringify(user),
      ]
    );
  },

  async getById(id) {
    const db = getDatabase();
    return db.getFirstAsync('SELECT * FROM users WHERE id = ?', [id]);
  },

  async getCurrentUser() {
    const db = getDatabase();
    return db.getFirstAsync('SELECT * FROM users ORDER BY synced_at DESC LIMIT 1');
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM users');
  },
};

// ─── PARCELS ──────────────────────────────────────────────────
export const ParcelsDAO = {
  async upsert(parcel) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO parcels
        (id, farmer_id, farmer_name, phone_number, location, region,
         department, crop_type, area_hectares, trees_count, farming_practices,
         has_shade_trees, uses_organic_fertilizer, has_erosion_control,
         latitude, longitude, planting_year, photos, language, member_id,
         member_name, carbon_score, carbon_credits_earned, verification_status,
         is_active, created_at, updated_at, synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        parcel.id || parcel._id,
        parcel.farmer_id || null,
        parcel.farmer_name || null,
        parcel.phone_number || null,
        parcel.location || '',
        parcel.region || null,
        parcel.department || null,
        parcel.crop_type || '',
        parcel.area_hectares || parcel.size || null,
        parcel.trees_count || 0,
        JSON.stringify(parcel.farming_practices || []),
        parcel.has_shade_trees ? 1 : 0,
        parcel.uses_organic_fertilizer ? 1 : 0,
        parcel.has_erosion_control ? 1 : 0,
        parcel.latitude || parcel.coordinates?.latitude || null,
        parcel.longitude || parcel.coordinates?.longitude || null,
        parcel.planting_year || null,
        JSON.stringify(parcel.photos || []),
        parcel.language || 'francais',
        parcel.member_id || null,
        parcel.member_name || null,
        parcel.carbon_score || 0,
        parcel.carbon_credits_earned || 0,
        parcel.verification_status || 'pending',
        parcel.is_active !== false ? 1 : 0,
        parcel.created_at || now(),
        parcel.updated_at || now(),
        now(),
        JSON.stringify(parcel),
      ]
    );
  },

  async upsertMany(parcels) {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const p of parcels) {
        await this.upsert(p);
      }
    });
  },

  async getByFarmer(farmerId) {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM parcels WHERE farmer_id = ? AND is_active = 1 ORDER BY created_at DESC', [farmerId]);
  },

  async getAll() {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM parcels WHERE is_active = 1 ORDER BY created_at DESC');
  },

  async getById(id) {
    const db = getDatabase();
    return db.getFirstAsync('SELECT * FROM parcels WHERE id = ?', [id]);
  },

  async delete(id) {
    const db = getDatabase();
    await db.runAsync('UPDATE parcels SET is_active = 0 WHERE id = ?', [id]);
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM parcels');
  },
};

// ─── HARVESTS ─────────────────────────────────────────────────
export const HarvestsDAO = {
  async upsert(h) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO harvests
        (id, farmer_id, parcel_id, quantity_kg, quality_grade, price_per_kg,
         sale_type, harvest_date, carbon_premium, total_amount, payment_status,
         payment_method, transaction_id, notes, created_at, synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        h.id || h._id,
        h.farmer_id || null,
        h.parcel_id || null,
        h.quantity_kg || h.quantity || 0,
        h.quality_grade || h.quality || 'B',
        h.price_per_kg || 0,
        h.sale_type || 'cooperative',
        h.harvest_date || now(),
        h.carbon_premium || 0,
        h.total_amount || 0,
        h.payment_status || 'pending',
        h.payment_method || null,
        h.transaction_id || null,
        h.notes || null,
        h.created_at || now(),
        now(),
        JSON.stringify(h),
      ]
    );
  },

  async upsertMany(harvests) {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const h of harvests) {
        await this.upsert(h);
      }
    });
  },

  async getByFarmer(farmerId) {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM harvests WHERE farmer_id = ? ORDER BY harvest_date DESC', [farmerId]);
  },

  async getByParcel(parcelId) {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM harvests WHERE parcel_id = ? ORDER BY harvest_date DESC', [parcelId]);
  },

  async getAll() {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM harvests ORDER BY harvest_date DESC');
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM harvests');
  },
};

// ─── PRODUCTS ─────────────────────────────────────────────────
export const ProductsDAO = {
  async upsert(p) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO products
        (id, name, category, description, price, unit, stock_quantity,
         images, specifications, supplier_id, supplier_name, is_active,
         total_sales, rating, reviews_count, created_at, updated_at,
         synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.id || p._id,
        p.name,
        p.category || null,
        p.description || null,
        p.price || 0,
        p.unit || null,
        p.stock_quantity || 0,
        JSON.stringify(p.images || []),
        JSON.stringify(p.specifications || {}),
        p.supplier_id || null,
        p.supplier_name || null,
        p.is_active !== false ? 1 : 0,
        p.total_sales || 0,
        p.rating || 0,
        p.reviews_count || 0,
        p.created_at || now(),
        p.updated_at || now(),
        now(),
        JSON.stringify(p),
      ]
    );
  },

  async upsertMany(products) {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const p of products) {
        await this.upsert(p);
      }
    });
  },

  async getAll(category) {
    const db = getDatabase();
    if (category) {
      return db.getAllAsync('SELECT * FROM products WHERE is_active = 1 AND category = ? ORDER BY name', [category]);
    }
    return db.getAllAsync('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
  },

  async getById(id) {
    const db = getDatabase();
    return db.getFirstAsync('SELECT * FROM products WHERE id = ?', [id]);
  },

  async search(query) {
    const db = getDatabase();
    const term = `%${query}%`;
    return db.getAllAsync(
      'SELECT * FROM products WHERE is_active = 1 AND (name LIKE ? OR description LIKE ? OR category LIKE ?) ORDER BY name',
      [term, term, term]
    );
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM products');
  },
};

// ─── ORDERS ───────────────────────────────────────────────────
export const OrdersDAO = {
  async upsert(o) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO orders
        (id, order_number, customer_id, customer_name, customer_phone,
         supplier_id, supplier_name, items, total_amount, delivery_address,
         delivery_location, payment_method, status, notes,
         estimated_delivery, created_at, updated_at, synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        o.id || o._id,
        o.order_number || null,
        o.customer_id || null,
        o.customer_name || null,
        o.customer_phone || null,
        o.supplier_id || null,
        o.supplier_name || null,
        JSON.stringify(o.items || []),
        o.total_amount || 0,
        o.delivery_address || null,
        o.delivery_location || null,
        o.payment_method || null,
        o.status || 'pending',
        o.notes || null,
        o.estimated_delivery || null,
        o.created_at || now(),
        o.updated_at || now(),
        now(),
        JSON.stringify(o),
      ]
    );
  },

  async upsertMany(orders) {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const o of orders) {
        await this.upsert(o);
      }
    });
  },

  async getByCustomer(customerId) {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
  },

  async getAll() {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM orders ORDER BY created_at DESC');
  },

  async getById(id) {
    const db = getDatabase();
    return db.getFirstAsync('SELECT * FROM orders WHERE id = ?', [id]);
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM orders');
  },
};

// ─── NOTIFICATIONS ────────────────────────────────────────────
export const NotificationsDAO = {
  async upsert(n) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO notifications
        (id, user_id, title, message, type, action_url, is_read,
         created_at, synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        n.id || n._id,
        n.user_id || null,
        n.title || '',
        n.message || '',
        n.type || 'system',
        n.action_url || null,
        n.is_read ? 1 : 0,
        n.created_at || now(),
        now(),
        JSON.stringify(n),
      ]
    );
  },

  async upsertMany(notifications) {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const n of notifications) {
        await this.upsert(n);
      }
    });
  },

  async getByUser(userId) {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  },

  async getUnreadCount(userId) {
    const db = getDatabase();
    const row = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return row?.count || 0;
  },

  async markRead(id) {
    const db = getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM notifications');
  },
};

// ─── MESSAGES ─────────────────────────────────────────────────
export const MessagesDAO = {
  async upsert(m) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO messages
        (id, sender_id, sender_name, receiver_id, receiver_name,
         conversation_id, content, is_read, created_at, synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        m.id || m._id,
        m.sender_id || null,
        m.sender_name || null,
        m.receiver_id || null,
        m.receiver_name || null,
        m.conversation_id || null,
        m.content || '',
        m.is_read ? 1 : 0,
        m.created_at || now(),
        now(),
        JSON.stringify(m),
      ]
    );
  },

  async upsertMany(messages) {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const m of messages) {
        await this.upsert(m);
      }
    });
  },

  async getByConversation(conversationId) {
    const db = getDatabase();
    return db.getAllAsync(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
  },

  async getConversations(userId) {
    const db = getDatabase();
    return db.getAllAsync(
      `SELECT m.*, MAX(m.created_at) as last_msg_at
       FROM messages m
       WHERE m.sender_id = ? OR m.receiver_id = ?
       GROUP BY m.conversation_id
       ORDER BY last_msg_at DESC`,
      [userId, userId]
    );
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM messages');
  },
};

// ─── CARBON SCORES ────────────────────────────────────────────
export const CarbonScoresDAO = {
  async upsert(c) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO carbon_scores
        (id, farmer_id, phone_number, total_score, level_label,
         carbon_credits, estimated_premium, practices, last_evaluation,
         synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        c.id || c._id || c.farmer_id,
        c.farmer_id || null,
        c.phone_number || null,
        c.total_score || c.score || 0,
        c.level_label || c.level || null,
        c.carbon_credits || 0,
        c.estimated_premium || 0,
        JSON.stringify(c.practices || []),
        c.last_evaluation || now(),
        now(),
        JSON.stringify(c),
      ]
    );
  },

  async getByFarmer(farmerId) {
    const db = getDatabase();
    return db.getFirstAsync('SELECT * FROM carbon_scores WHERE farmer_id = ?', [farmerId]);
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM carbon_scores');
  },
};

// ─── PAYMENTS ─────────────────────────────────────────────────
export const PaymentsDAO = {
  async upsert(p) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO payments
        (id, farmer_id, harvest_id, phone_number, amount, payment_method,
         status, transaction_id, created_at, synced_at, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.id || p._id,
        p.farmer_id || null,
        p.harvest_id || null,
        p.phone_number || null,
        p.amount || 0,
        p.payment_method || null,
        p.status || 'pending',
        p.transaction_id || null,
        p.created_at || now(),
        now(),
        JSON.stringify(p),
      ]
    );
  },

  async upsertMany(payments) {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const p of payments) {
        await this.upsert(p);
      }
    });
  },

  async getByFarmer(farmerId) {
    const db = getDatabase();
    return db.getAllAsync('SELECT * FROM payments WHERE farmer_id = ? ORDER BY created_at DESC', [farmerId]);
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM payments');
  },
};

// ─── PENDING SYNC ─────────────────────────────────────────────
export const PendingSyncDAO = {
  async add(actionType, entityTable, entityId, payload) {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO pending_sync (action_type, entity_table, entity_id, payload, created_at)
       VALUES (?,?,?,?,?)`,
      [actionType, entityTable, entityId, JSON.stringify(payload), now()]
    );
  },

  async getPending() {
    const db = getDatabase();
    return db.getAllAsync(
      `SELECT * FROM pending_sync WHERE status = 'pending' AND retry_count < max_retries ORDER BY created_at ASC`
    );
  },

  async markDone(id) {
    const db = getDatabase();
    await db.runAsync("UPDATE pending_sync SET status = 'done' WHERE id = ?", [id]);
  },

  async markFailed(id, errorMsg) {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE pending_sync SET retry_count = retry_count + 1, last_attempt = ?, error_message = ?,
       status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE 'pending' END
       WHERE id = ?`,
      [now(), errorMsg || null, id]
    );
  },

  async getCount() {
    const db = getDatabase();
    const row = await db.getFirstAsync("SELECT COUNT(*) as count FROM pending_sync WHERE status = 'pending'");
    return row?.count || 0;
  },

  async clearDone() {
    const db = getDatabase();
    await db.runAsync("DELETE FROM pending_sync WHERE status = 'done'");
  },

  async deleteAll() {
    const db = getDatabase();
    await db.runAsync('DELETE FROM pending_sync');
  },
};

// ─── BULK / UTILITY ───────────────────────────────────────────
export async function clearAllData() {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM users');
    await db.runAsync('DELETE FROM parcels');
    await db.runAsync('DELETE FROM harvests');
    await db.runAsync('DELETE FROM products');
    await db.runAsync('DELETE FROM orders');
    await db.runAsync('DELETE FROM notifications');
    await db.runAsync('DELETE FROM messages');
    await db.runAsync('DELETE FROM carbon_scores');
    await db.runAsync('DELETE FROM payments');
    await db.runAsync('DELETE FROM pending_sync');
  });
}

export async function getStorageStats() {
  const db = getDatabase();
  const tables = ['users', 'parcels', 'harvests', 'products', 'orders', 'notifications', 'messages', 'carbon_scores', 'payments', 'pending_sync'];
  const stats = {};
  for (const t of tables) {
    const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${t}`);
    stats[t] = row?.count || 0;
  }
  return stats;
}

export async function closeDatabase() {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}
