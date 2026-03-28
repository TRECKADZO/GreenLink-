/**
 * useNetworkStatus v1.75 — Hook reseau avec NetInfo.addEventListener + health check reel
 *
 * - Ecoute les changements reseau via NetInfo.addEventListener (temps reel)
 * - Verifie la connectivite reelle via GET /api/health
 * - Expose resetNetworkState() pour forcer un refresh (appele au logout)
 * - Throttle: max 1 check toutes les 3 secondes
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

const HEALTH_URL = CONFIG.DIRECT_API_URL + '/api/health';
const THROTTLE_MS = 3000;
const HEALTH_TIMEOUT_MS = 10000;

/**
 * Test de connectivite reel : NetInfo + GET /api/health
 * Retourne { isConnected, serverReachable, source }
 */
export async function checkRealConnectivity() {
  // 1. NetInfo d'abord — si pas de reseau, inutile de tester HTTP
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { isConnected: false, serverReachable: false, source: 'netinfo-disconnected' };
    }
  } catch {
    // NetInfo echoue — on continue avec le test HTTP
  }

  // 2. Test HTTP reel (GET /api/health)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
    });
    clearTimeout(timer);
    const serverOk = response.status < 500;
    return { isConnected: true, serverReachable: serverOk, source: 'http-check' };
  } catch {
    // HTTP echoue — verifier NetInfo pour distinguer offline vs serveur down
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable !== false) {
        // Internet OK mais serveur injoignable
        return { isConnected: true, serverReachable: false, source: 'server-unreachable' };
      }
      return { isConnected: false, serverReachable: false, source: 'netinfo-confirmed-offline' };
    } catch {
      return { isConnected: false, serverReachable: false, source: 'unknown' };
    }
  }
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [serverReachable, setServerReachable] = useState(true);
  const lastCheckRef = useRef(0);
  const mountedRef = useRef(true);

  // Ecouter les changements reseau en temps reel
  useEffect(() => {
    mountedRef.current = true;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!mountedRef.current) return;
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable ?? true;
      setIsConnected(connected);
      setIsInternetReachable(reachable);

      // Si NetInfo dit offline, pas besoin de health check
      if (!connected) {
        setServerReachable(false);
      }
    });

    // Check initial
    NetInfo.fetch().then((state) => {
      if (!mountedRef.current) return;
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  /**
   * Verification manuelle de la connectivite (throttle 3s)
   * Appelee avant login, ou quand on suspecte un probleme
   */
  const checkConnectivity = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheckRef.current < THROTTLE_MS) {
      return { isConnected, serverReachable };
    }
    lastCheckRef.current = now;

    const result = await checkRealConnectivity();
    if (mountedRef.current) {
      setIsConnected(result.isConnected);
      setIsInternetReachable(result.isConnected);
      setServerReachable(result.serverReachable);
    }
    return result;
  }, [isConnected, serverReachable]);

  /**
   * Reset complet de l'etat reseau — appele au logout
   * Force une re-evaluation complete au prochain check
   */
  const resetNetworkState = useCallback(() => {
    lastCheckRef.current = 0;
    setIsConnected(true);
    setIsInternetReachable(true);
    setServerReachable(true);
  }, []);

  return {
    isConnected,
    isInternetReachable,
    serverReachable,
    isOffline: !isConnected,
    checkConnectivity,
    resetNetworkState,
  };
}
