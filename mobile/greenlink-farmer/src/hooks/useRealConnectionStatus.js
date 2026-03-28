/**
 * useRealConnectionStatus v1.76 — Hook reseau communaute 2025-2026
 *
 * Principes :
 * 1. Ne JAMAIS faire confiance a NetInfo.isInternetReachable pour les messages d'erreur
 * 2. NetInfo.addEventListener sert UNIQUEMENT de trigger rapide (changement reseau detecte)
 * 3. Toute decision "en ligne / hors-ligne" passe par un vrai fetch HEAD
 * 4. Debounce 800ms sur les evenements NetInfo (evite les rafales Android)
 * 5. Apres logout : resetAndRecheck() force un recheck immediat
 *
 * Flux de verification :
 *   HEAD /api/health (8s) → OK → en ligne + serveur OK
 *                         → KO → HEAD https://1.1.1.1 (5s) → OK → en ligne, serveur KO
 *                                                            → KO → hors-ligne
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

const HEALTH_URL = CONFIG.DIRECT_API_URL + '/api/health';
const FALLBACK_URL = 'https://1.1.1.1';
const DEBOUNCE_MS = 800;
const PING_TIMEOUT_MS = 8000;
const FALLBACK_TIMEOUT_MS = 5000;

// ========================
// Ping reel via HEAD (pas de body = rapide + leger)
// ========================
async function pingHead(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' },
    });
    clearTimeout(timer);
    return { reachable: true, status: res.status };
  } catch {
    clearTimeout(timer);
    return { reachable: false, status: 0 };
  }
}

// ========================
// Verification reelle en 2 etapes :
// 1. HEAD /api/health (8s) → serveur accessible ?
// 2. Si non → HEAD 1.1.1.1 (5s) → internet accessible ?
// ========================
async function checkReal() {
  // Etape 1 : ping le serveur API
  const server = await pingHead(HEALTH_URL, PING_TIMEOUT_MS);
  if (server.reachable && server.status < 500) {
    return { isOnline: true, isServerReachable: true, source: 'server-ok' };
  }

  // Etape 2 : serveur KO → verifier si internet fonctionne via fallback
  const fallback = await pingHead(FALLBACK_URL, FALLBACK_TIMEOUT_MS);
  if (fallback.reachable) {
    // Internet OK mais serveur injoignable
    return { isOnline: true, isServerReachable: false, source: 'server-down' };
  }

  // Ni serveur ni fallback → vraisemblablement hors-ligne
  return { isOnline: false, isServerReachable: false, source: 'offline' };
}

// Export pour usage hors-hook (ex: api.js classifyNetworkError)
export { checkReal };

// ========================
// Hook React
// ========================
export function useRealConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const debounceRef = useRef(null);
  const mountedRef = useRef(true);

  const applyResult = useCallback((result) => {
    if (!mountedRef.current) return;
    setIsOnline(result.isOnline);
    setIsServerReachable(result.isServerReachable);
    if (__DEV__) console.log(`[NET] ${result.source} → online=${result.isOnline} server=${result.isServerReachable}`);
  }, []);

  // Check immediat (pas de debounce)
  const checkNow = useCallback(async () => {
    const result = await checkReal();
    applyResult(result);
    return result;
  }, [applyResult]);

  // Reset optimiste + recheck immediat (appele apres logout)
  const resetAndRecheck = useCallback(async () => {
    if (mountedRef.current) {
      setIsOnline(true);
      setIsServerReachable(true);
    }
    // Petit delai pour laisser OkHttp fermer les connexions stales
    await new Promise(r => setTimeout(r, 300));
    return checkNow();
  }, [checkNow]);

  useEffect(() => {
    mountedRef.current = true;

    // Check initial au montage
    checkReal().then(applyResult);

    // NetInfo.addEventListener : trigger rapide, DEBOUNCE 800ms
    // On ignore completement state.isInternetReachable
    const unsubscribe = NetInfo.addEventListener(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (mountedRef.current) {
          checkReal().then(applyResult);
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [applyResult]);

  return {
    isOnline,
    isServerReachable,
    isOffline: !isOnline,
    checkNow,
    resetAndRecheck,
  };
}
