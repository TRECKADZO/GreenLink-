/**
 * Cloudflare Worker v2 — Proxy API GreenLink Agritech
 *
 * CORRECTIF v2 : Gestion du cookie __cf_bm
 * - Le backend Emergent est protege par Cloudflare qui exige un cookie __cf_bm
 * - Le Worker stocke ce cookie et le renvoie sur chaque requete backend
 * - Le cookie est SUPPRIME des reponses vers le mobile (domaine incompatible)
 * - Cela empeche Cloudflare de bloquer le Worker apres plusieurs requetes
 */

const BACKEND_URL = 'https://mobile-network-fix.preview.emergentagent.com';

// Cookie jar global — persiste entre les requetes Worker
let cfCookie = '';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Health check du Worker
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'greenlink-worker-proxy',
        backend: BACKEND_URL,
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Construire l'URL backend
    const backendUrl = BACKEND_URL + url.pathname + url.search;

    // Copier les headers (sauf Host)
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('Origin', BACKEND_URL);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

    // INJECTER le cookie __cf_bm stocke (si on en a un)
    if (cfCookie) {
      const existingCookies = headers.get('Cookie') || '';
      headers.set('Cookie', existingCookies ? `${existingCookies}; ${cfCookie}` : cfCookie);
    }

    try {
      const backendResponse = await fetch(backendUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.arrayBuffer()
          : undefined,
      });

      // CAPTURER le nouveau cookie __cf_bm du backend
      const setCookieAll = backendResponse.headers.getAll
        ? backendResponse.headers.getAll('set-cookie')
        : [backendResponse.headers.get('set-cookie')].filter(Boolean);

      for (const sc of setCookieAll) {
        if (sc && sc.includes('__cf_bm')) {
          const match = sc.match(/__cf_bm=([^;]+)/);
          if (match) {
            cfCookie = `__cf_bm=${match[1]}`;
          }
        }
      }

      // Construire la reponse — SUPPRIMER set-cookie du backend
      const responseHeaders = new Headers(backendResponse.headers);
      responseHeaders.delete('set-cookie');

      // Ajouter nos headers CORS propres
      Object.entries(corsHeaders()).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({
        detail: 'Backend temporairement inaccessible',
        error: err.message,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Cache-Control, Pragma',
    'Access-Control-Max-Age': '86400',
  };
}
