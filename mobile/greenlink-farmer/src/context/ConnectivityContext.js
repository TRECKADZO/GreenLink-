/**
 * ConnectivityContext — single source of truth for network state.
 *
 * Uses @react-native-community/netinfo event listener (instant detection)
 * combined with a real HEAD ping to the API server (accurate verification).
 *
 * Exposes:
 *   isOnline          — device has internet (verified by real ping)
 *   isServerReachable — backend API responding (< 500)
 *   connectionType    — 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown'
 *   connectionDetails — NetInfo details (cellularGeneration, isConnectionExpensive…)
 *   isInternetReachable — raw NetInfo flag (informational only, not authoritative)
 *   checkNow()        — force an immediate re-check
 *   resetAndRecheck() — optimistic reset + re-check (used after logout)
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config';

const HEALTH_URL = CONFIG.DIRECT_API_URL + '/api/health';
const FALLBACK_URL = 'https://connectivitycheck.gstatic.com/generate_204';
const DEBOUNCE_MS = 800;
const PING_TIMEOUT_MS = 8000;
const FALLBACK_TIMEOUT_MS = 5000;

// ─── Real ping via HEAD ──────────────────────────────────────
async function pingHead(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'Connection': 'close' },
    });
    clearTimeout(timer);
    return { reachable: true, status: res.status };
  } catch {
    clearTimeout(timer);
    return { reachable: false, status: 0 };
  }
}

// ─── Two-step real verification ──────────────────────────────
// 1. HEAD /api/health → server OK?
// 2. If not → HEAD Google connectivity check → internet OK?
async function verifyConnection() {
  const server = await pingHead(HEALTH_URL, PING_TIMEOUT_MS);
  if (server.reachable && server.status < 500) {
    return { isOnline: true, isServerReachable: true, source: 'server-ok' };
  }
  const fallback = await pingHead(FALLBACK_URL, FALLBACK_TIMEOUT_MS);
  if (fallback.reachable) {
    return { isOnline: true, isServerReachable: false, source: 'server-down' };
  }
  return { isOnline: false, isServerReachable: false, source: 'offline' };
}

// Export for non-React services that can't use context
export { verifyConnection };

const ConnectivityContext = createContext(null);

export const ConnectivityProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const debounceRef = useRef(null);
  const mountedRef = useRef(true);

  const applyResult = useCallback((result, netInfoState) => {
    if (!mountedRef.current) return;
    setIsOnline(result.isOnline);
    setIsServerReachable(result.isServerReachable);
    if (netInfoState) {
      setConnectionType(netInfoState.type || 'unknown');
      setConnectionDetails(netInfoState.details || null);
      setIsInternetReachable(netInfoState.isInternetReachable ?? result.isOnline);
    }
    if (__DEV__) {
      console.log(
        `[Connectivity] ${result.source} | online=${result.isOnline} server=${result.isServerReachable} type=${netInfoState?.type || '?'}`
      );
    }
  }, []);

  // Force immediate check — returns the result
  const checkNow = useCallback(async () => {
    const [result, netState] = await Promise.all([
      verifyConnection(),
      NetInfo.fetch(),
    ]);
    applyResult(result, netState);
    return result;
  }, [applyResult]);

  // Optimistic reset + immediate recheck (after logout)
  const resetAndRecheck = useCallback(async () => {
    if (mountedRef.current) {
      setIsOnline(true);
      setIsServerReachable(true);
    }
    await new Promise(r => setTimeout(r, 300));
    return checkNow();
  }, [checkNow]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial check
    (async () => {
      const [result, netState] = await Promise.all([
        verifyConnection(),
        NetInfo.fetch(),
      ]);
      applyResult(result, netState);
    })();

    // Event-driven: NetInfo fires on every network change.
    // Debounced to avoid Android event storms.
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Immediately update connection type (cheap, no network call)
      if (mountedRef.current) {
        setConnectionType(state.type || 'unknown');
        setConnectionDetails(state.details || null);
        setIsInternetReachable(state.isInternetReachable ?? false);
      }

      // Debounce the real ping verification
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (mountedRef.current) {
          verifyConnection().then((result) => applyResult(result, state));
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [applyResult]);

  return (
    <ConnectivityContext.Provider
      value={{
        isOnline,
        isOffline: !isOnline,
        isServerReachable,
        connectionType,
        connectionDetails,
        isInternetReachable,
        checkNow,
        resetAndRecheck,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within ConnectivityProvider');
  }
  return ctx;
};
