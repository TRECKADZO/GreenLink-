const CACHE_NAME = 'greenlink-agent-v1';
const API_CACHE = 'greenlink-api-v1';

// Ressources statiques à pré-cacher
const PRECACHE_URLS = [
  '/',
  '/agent/terrain',
  '/agent/search',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Installation: pré-cache des ressources statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Certaines URLs peuvent échouer en dev, on continue
        console.log('[SW] Some precache URLs failed, continuing...');
      });
    })
  );
  self.skipWaiting();
});

// Activation: nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: stratégie Network-First pour API, Cache-First pour statique
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les requêtes cross-origin non-API
  if (request.method !== 'GET') return;

  // API calls: Network-First avec cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Navigation et ressources statiques: Cache-First avec network fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Assets (JS, CSS, images): Cache-First
  event.respondWith(cacheFirst(request));
});

// Stratégie Network-First pour les API
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
    return new Response(JSON.stringify({ error: 'offline', message: 'Pas de connexion réseau' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Stratégie Network-First pour la navigation
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
    // Fallback vers la page d'accueil en cache
    const fallback = await caches.match('/');
    if (fallback) return fallback;
    return new Response('Hors-ligne', { status: 503 });
  }
}

// Stratégie Cache-First pour les assets
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

// Background Sync: upload des actions offline quand le réseau revient
self.addEventListener('sync', (event) => {
  if (event.tag === 'greenlink-sync-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Notifier les clients qu'une sync est disponible
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_AVAILABLE' });
  });
}

// Push notifications
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
  const url = event.notification.data?.url || '/agent/terrain';
  event.waitUntil(self.clients.openWindow(url));
});
