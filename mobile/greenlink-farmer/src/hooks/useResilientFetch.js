import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook résilient pour les appels API en Côte d'Ivoire
 * - Retry automatique silencieux (3 tentatives avec délai croissant)
 * - Safety timeout étendu (60s au lieu de 20s)
 * - Cache local : si des données existent, l'erreur est masquée
 * - Appels séquentiels pour réduire la charge réseau
 */
export function useResilientFetch(fetchFn, { autoRetry = true, maxRetries = 3, safetyTimeout = 60000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);

  const execute = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setRetryCount(0);
      }
    } catch (err) {
      console.warn('[ResilientFetch] Error:', err.message);
      if (mountedRef.current && !data) {
        setError('Connexion difficile. Tirez vers le bas pour reessayer.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchFn, data]);

  // Initial fetch + safety timeout
  useEffect(() => {
    execute();
    const timeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        setLoading(false);
        if (!data) {
          setError('Le serveur met du temps a repondre. Tirez vers le bas pour reessayer.');
        }
      }
    }, safetyTimeout);
    return () => { clearTimeout(timeout); };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-retry silencieux
  useEffect(() => {
    if (autoRetry && error && !data && retryCount < maxRetries) {
      const delay = 8000 + retryCount * 4000;
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          console.log(`[ResilientFetch] Auto-retry ${retryCount + 1}/${maxRetries}`);
          setRetryCount(prev => prev + 1);
          execute(true);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, data, autoRetry, maxRetries, execute]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setRetryCount(0);
    execute();
  }, [execute]);

  const retry = useCallback(() => {
    setRetryCount(0);
    setLoading(true);
    execute();
  }, [execute]);

  return { data, loading, refreshing, error, retryCount, maxRetries, refresh, retry };
}
