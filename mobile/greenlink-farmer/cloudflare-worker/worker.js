/**
 * Cloudflare Worker — Proxy API GreenLink Agritech
 * 
 * Ce Worker relaie les requetes de l'app mobile vers le backend Emergent.
 * Deploye sur api.greenlink-agritech.com (domaine du client, pas de blocage).
 * 
 * INSTALLATION:
 * 1. Dashboard Cloudflare > greenlink-agritech.com > Workers Routes
 * 2. Creer un nouveau Worker avec ce code
 * 3. Ajouter la route: api.greenlink-agritech.com/* -> ce Worker
 * 4. DNS: Ajouter un enregistrement AAAA pour "api" pointant vers 100::1 (proxy ON)
 */

const BACKEND_URL = 'https://mobile-network-fix.preview.emergentagent.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Health check du Worker lui-meme
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

    // Construire l'URL backend
    const backendUrl = BACKEND_URL + url.pathname + url.search;

    // Copier les headers (sauf Host)
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('Origin', BACKEND_URL);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

    // Gerer les preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      const backendResponse = await fetch(backendUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' 
          ? await request.arrayBuffer() 
          : undefined,
      });

      // Copier la reponse avec les headers CORS
      const responseHeaders = new Headers(backendResponse.headers);
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
  };
}
