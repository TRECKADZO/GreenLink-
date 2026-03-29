/**
 * Cloudflare Worker v3 — Proxy API GreenLink Agritech
 *
 * v3 : Ajoute Connection: close sur TOUTES les reponses
 * - Empeche OkHttp Android de pooler les connexions
 * - Elimine le probleme de connexions stales apres logout
 * - Gere le cookie __cf_bm du backend Cloudflare
 */

const BACKEND_URL = 'https://mobile-network-fix.preview.emergentagent.com';

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
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'close',
          ...corsHeaders(),
        },
      });
    }

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { 'Connection': 'close', ...corsHeaders() },
      });
    }

    const backendUrl = BACKEND_URL + url.pathname + url.search;

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('Origin', BACKEND_URL);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

    if (cfCookie) {
      const existing = headers.get('Cookie') || '';
      headers.set('Cookie', existing ? `${existing}; ${cfCookie}` : cfCookie);
    }

    try {
      const backendResponse = await fetch(backendUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.arrayBuffer()
          : undefined,
      });

      // Capturer le cookie __cf_bm
      const setCookieAll = backendResponse.headers.getAll
        ? backendResponse.headers.getAll('set-cookie')
        : [backendResponse.headers.get('set-cookie')].filter(Boolean);

      for (const sc of setCookieAll) {
        if (sc && sc.includes('__cf_bm')) {
          const match = sc.match(/__cf_bm=([^;]+)/);
          if (match) cfCookie = `__cf_bm=${match[1]}`;
        }
      }

      // Reponse avec Connection: close + CORS — sans set-cookie
      const responseHeaders = new Headers(backendResponse.headers);
      responseHeaders.delete('set-cookie');
      responseHeaders.set('Connection', 'close');
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
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'close',
          ...corsHeaders(),
        },
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
