const CACHE_NAME = 'greenlink-v3';
const API_CACHE = 'greenlink-api-v3';
const TILES_CACHE = 'greenlink-tiles-v1';
const TILES_MAX_BYTES = 200 * 1024 * 1024; // 200 Mo

// Domaines de tuiles interceptes
const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
];

// Ressources statiques a pre-cacher
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Installation: pre-cache des ressources statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        console.log('[SW] Some precache URLs failed, continuing...');
      });
    })
  );
  self.skipWaiting();
});

// Activation: nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  const KEEP = [CACHE_NAME, API_CACHE, TILES_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !KEEP.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: routing par type de requete
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Tuiles de carte: Cache-First
  if (TILE_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(tilesCacheFirst(request));
    return;
  }

  // API calls: Network-First avec cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Navigation: Network-First
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Assets (JS, CSS, images): Cache-First
  event.respondWith(cacheFirst(request));
});

// ============= TILES: Cache-First =============
async function tilesCacheFirst(request) {
  const cache = await caches.open(TILES_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      // Nettoyage asynchrone si cache trop gros
      trimTilesCache();
    }
    return response;
  } catch (e) {
    // Tuile grise 1x1 pixel PNG transparent comme fallback
    return new Response(
      Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0)),
      { status: 200, headers: { 'Content-Type': 'image/png' } }
    );
  }
}

// Nettoyage LRU du cache tuiles (supprime les plus anciennes si > 200Mo)
async function trimTilesCache() {
  try {
    const cache = await caches.open(TILES_CACHE);
    const keys = await cache.keys();

    // Estimation: ~15 Ko par tuile en moyenne
    const estimatedSize = keys.length * 15000;
    if (estimatedSize <= TILES_MAX_BYTES) return;

    // Supprimer les 20% les plus anciennes (en tete de liste = les plus anciennes)
    const toDelete = Math.floor(keys.length * 0.2);
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW-Tiles] Cleaned ${toDelete} old tiles, kept ${keys.length - toDelete}`);
  } catch (e) {
    // Nettoyage non critique
  }
}

// ============= API: Network-First =============
async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'Pas de connexion reseau' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============= Navigation: Network-First =============
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match('/');
    if (fallback) return fallback;
    return new Response('Hors-ligne', { status: 503 });
  }
}

// ============= Assets: Cache-First =============
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('', { status: 503 });
  }
}

// ============= Messages du client (pre-telechargement tuiles) =============
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PRECACHE_TILES') {
    event.waitUntil(precacheTiles(event.data.urls, event.source));
  }
  if (event.data?.type === 'GET_TILES_CACHE_STATS') {
    event.waitUntil(sendTilesCacheStats(event.source));
  }
  if (event.data?.type === 'CLEAR_TILES_CACHE') {
    event.waitUntil(clearTilesCache(event.source));
  }
});

async function precacheTiles(urls, client) {
  const cache = await caches.open(TILES_CACHE);
  const total = urls.length;
  let done = 0;
  let errors = 0;
  const BATCH = 6; // Telecharger 6 tuiles en parallele

  for (let i = 0; i < total; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const existing = await cache.match(url);
        if (existing) return; // Deja en cache
        const res = await fetch(url);
        if (res.ok) {
          await cache.put(url, res);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      })
    );
    done += batch.length;
    errors += results.filter((r) => r.status === 'rejected').length;

    // Envoyer la progression au client
    if (client) {
      try {
        client.postMessage({
          type: 'TILES_PRECACHE_PROGRESS',
          done,
          total,
          errors,
          percent: Math.round((done / total) * 100),
        });
      } catch (e) { /* client ferme */ }
    }
  }

  // Nettoyage si necessaire
  await trimTilesCache();

  if (client) {
    try {
      client.postMessage({ type: 'TILES_PRECACHE_COMPLETE', done, total, errors });
    } catch (e) { /* ignore */ }
  }
}

async function sendTilesCacheStats(client) {
  try {
    const cache = await caches.open(TILES_CACHE);
    const keys = await cache.keys();
    const count = keys.length;
    const estimatedMB = ((count * 15000) / (1024 * 1024)).toFixed(1);
    if (client) {
      client.postMessage({ type: 'TILES_CACHE_STATS', count, estimatedMB });
    }
  } catch (e) {
    if (client) client.postMessage({ type: 'TILES_CACHE_STATS', count: 0, estimatedMB: '0' });
  }
}

async function clearTilesCache(client) {
  try {
    await caches.delete(TILES_CACHE);
    if (client) client.postMessage({ type: 'TILES_CACHE_CLEARED' });
  } catch (e) {
    if (client) client.postMessage({ type: 'TILES_CACHE_CLEARED' });
  }
}

// ============= Background Sync =============
self.addEventListener('sync', (event) => {
  if (event.tag === 'greenlink-sync-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_AVAILABLE' });
  });
}

// ============= Push Notifications =============
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'GreenLink', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'greenlink',
      data: data.url ? { url: data.url } : {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(self.clients.openWindow(url));
});
