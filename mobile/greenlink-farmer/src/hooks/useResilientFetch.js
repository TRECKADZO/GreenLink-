import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook resilient pour les appels API
 * Les retries reseau sont geres par le client API (3 tentatives, 20/40/60s)
 * Ce hook gere: chargement initial, pull-to-refresh, cache local
 */
export function useResilientFetch(fetchFn, { safetyTimeout = 90000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      console.warn('[ResilientFetch] Error:', err.message);
      if (mountedRef.current && !data) {
        const msg = err.type === 'network'
          ? 'Pas de connexion internet. Tirez vers le bas pour reessayer.'
          : 'Impossible de charger les donnees. Tirez vers le bas pour reessayer.';
        setError(msg);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchFn, data]);

  useEffect(() => {
    execute();
    const timeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        setLoading(false);
        if (!data) {
          setError('Impossible de charger les donnees. Tirez vers le bas pour reessayer.');
        }
      }
    }, safetyTimeout);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    execute();
  }, [execute]);

  const retry = useCallback(() => {
    setLoading(true);
    execute();
  }, [execute]);

  return { data, loading, refreshing, error, refresh, retry };
}
