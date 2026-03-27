/**
 * useNetworkStatus — Hook centralise pour la detection reseau
 * 
 * Utilise NetInfo + un vrai test HTTP pour eviter les faux positifs.
 * Ne jamais conclure "pas d'internet" sans verification reelle.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

// Test leger vers le backend (HEAD request, pas de body)
const HEALTH_URL = CONFIG.DIRECT_API_URL + '/api/health';

/**
 * Verification reelle de la connectivite internet
 * Fait un HEAD request vers le backend avec timeout court
 */
export async function checkRealConnectivity() {
  try {
    // 1. Verifier NetInfo d'abord (rapide)
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { isConnected: false, source: 'netinfo' };
    }

    // 2. Si NetInfo dit connecte, faire un vrai test HTTP
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(HEALTH_URL, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timer);
    
    return { isConnected: response.ok || response.status < 500, source: 'http' };
  } catch (err) {
    // Si le HEAD echoue, tester avec NetInfo seul
    try {
      const netInfo = await NetInfo.fetch();
      // Si NetInfo dit connecte mais le HEAD echoue = serveur down, pas "no internet"
      if (netInfo.isConnected && netInfo.isInternetReachable !== false) {
        return { isConnected: true, source: 'netinfo-fallback', serverReachable: false };
      }
      return { isConnected: false, source: 'netinfo-confirmed' };
    } catch {
      return { isConnected: false, source: 'unknown' };
    }
  }
}

/**
 * Hook React pour suivre l'etat reseau en temps reel
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    // Listener NetInfo en temps reel
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
      // isInternetReachable peut etre null (en cours de verification)
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    // Check initial
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    return () => unsubscribe();
  }, []);

  // Verification approfondie avec anti-spam (max 1 check / 3s)
  const checkConnectivity = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheckRef.current < 3000) {
      return { isConnected, isInternetReachable };
    }
    lastCheckRef.current = now;

    const result = await checkRealConnectivity();
    setIsConnected(result.isConnected);
    setIsInternetReachable(result.isConnected);
    return result;
  }, [isConnected, isInternetReachable]);

  return {
    isConnected,
    isInternetReachable,
    isOffline: !isConnected,
    checkConnectivity,
  };
}
