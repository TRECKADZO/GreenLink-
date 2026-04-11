/**
 * Service de pre-telechargement des tuiles cartographiques
 * GreenLink Agritech - Mode Offline-First
 *
 * Genere les URLs de tuiles pour une zone geographique donnee
 * et communique avec le Service Worker pour les cacher.
 */

const TILE_URL_TEMPLATE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SUBDOMAINS = ['a', 'b', 'c'];

/**
 * Convertit lat/lng en coordonnees de tuile
 */
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/**
 * Genere toutes les URLs de tuiles pour une zone rectangulaire
 * @param {number} centerLat - Latitude du centre
 * @param {number} centerLng - Longitude du centre
 * @param {number} radiusKm - Rayon en km (0.5 a 2)
 * @param {number} minZoom - Zoom minimum (10)
 * @param {number} maxZoom - Zoom maximum (17)
 * @returns {string[]} Liste des URLs de tuiles
 */
export function generateTileUrls(centerLat, centerLng, radiusKm = 1, minZoom = 10, maxZoom = 17) {
  // Approximation: 1 degre latitude ~ 111 km
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

  const bounds = {
    north: centerLat + latDelta,
    south: centerLat - latDelta,
    east: centerLng + lngDelta,
    west: centerLng - lngDelta,
  };

  const urls = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const topLeft = latLngToTile(bounds.north, bounds.west, z);
    const bottomRight = latLngToTile(bounds.south, bounds.east, z);

    const xMin = Math.min(topLeft.x, bottomRight.x);
    const xMax = Math.max(topLeft.x, bottomRight.x);
    const yMin = Math.min(topLeft.y, bottomRight.y);
    const yMax = Math.max(topLeft.y, bottomRight.y);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const subdomain = SUBDOMAINS[(x + y) % SUBDOMAINS.length];
        const url = TILE_URL_TEMPLATE
          .replace('{s}', subdomain)
          .replace('{z}', z)
          .replace('{x}', x)
          .replace('{y}', y);
        urls.push(url);
      }
    }
  }

  return urls;
}

/**
 * Calcule le centre et le rayon a partir d'un polygone
 * @param {Array} polygon - [[lat, lng], ...]
 * @returns {{ lat: number, lng: number, radiusKm: number }}
 */
export function boundsFromPolygon(polygon) {
  if (!polygon || polygon.length === 0) {
    return { lat: 6.8, lng: -5.3, radiusKm: 1 }; // Centre Cote d'Ivoire par defaut
  }

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of polygon) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Rayon = max de la distance lat/lng + marge de 500m
  const latKm = (maxLat - minLat) * 111;
  const lngKm = (maxLng - minLng) * 111 * Math.cos((centerLat * Math.PI) / 180);
  const radiusKm = Math.max(latKm, lngKm) / 2 + 0.5;

  return { lat: centerLat, lng: centerLng, radiusKm: Math.min(Math.max(radiusKm, 0.5), 3) };
}

/**
 * Demande au Service Worker de pre-cacher les tuiles
 * @param {string[]} urls - Liste des URLs de tuiles
 * @returns {Promise} Resolve quand le SW confirme
 */
export function requestTilesPrecache(urls) {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker?.controller) {
      reject(new Error('Service Worker non disponible'));
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: 'PRECACHE_TILES',
      urls,
    });
    resolve();
  });
}

/**
 * Demande les statistiques du cache tuiles au SW
 * @returns {Promise<{ count: number, estimatedMB: string }>}
 */
export function requestTilesCacheStats() {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker?.controller) {
      resolve({ count: 0, estimatedMB: '0' });
      return;
    }

    const handler = (event) => {
      if (event.data?.type === 'TILES_CACHE_STATS') {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(event.data);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    navigator.serviceWorker.controller.postMessage({ type: 'GET_TILES_CACHE_STATS' });

    // Timeout 3s
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', handler);
      resolve({ count: 0, estimatedMB: '0' });
    }, 3000);
  });
}

/**
 * Vide le cache tuiles
 * @returns {Promise}
 */
export function requestClearTilesCache() {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker?.controller) {
      resolve();
      return;
    }

    const handler = (event) => {
      if (event.data?.type === 'TILES_CACHE_CLEARED') {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_TILES_CACHE' });

    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', handler);
      resolve();
    }, 3000);
  });
}
