/**
 * useNetworkStatus — Hook centralise pour la detection reseau
 * Utilise NetInfo + test HTTP reel (GET, pas HEAD)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

const HEALTH_URL = CONFIG.DIRECT_API_URL + '/api/health';

export async function checkRealConnectivity() {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { isConnected: false, source: 'netinfo' };
    }

    // Test HTTP reel (GET, pas HEAD qui retourne 405)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
      credentials: 'include',
    });
    clearTimeout(timer);
    return { isConnected: response.status < 500, source: 'http' };
  } catch {
    try {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && netInfo.isInternetReachable !== false) {
        return { isConnected: true, source: 'netinfo-fallback', serverReachable: false };
      }
      return { isConnected: false, source: 'netinfo-confirmed' };
    } catch {
      return { isConnected: false, source: 'unknown' };
    }
  }
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });
    return () => unsubscribe();
  }, []);

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

  return { isConnected, isInternetReachable, isOffline: !isConnected, checkConnectivity };
}
