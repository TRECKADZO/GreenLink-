import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnectivity } from './ConnectivityContext';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const { isOnline, checkNow } = useConnectivity();
  const [pendingActions, setPendingActions] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    loadPendingActions();
  }, []);

  const loadPendingActions = async () => {
    try {
      const stored = await AsyncStorage.getItem('pendingActions');
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  const addPendingAction = async (action) => {
    const newActions = [...pendingActions, { ...action, timestamp: Date.now() }];
    setPendingActions(newActions);
    await AsyncStorage.setItem('pendingActions', JSON.stringify(newActions));
  };

  const removePendingAction = async (timestamp) => {
    const newActions = pendingActions.filter(a => a.timestamp !== timestamp);
    setPendingActions(newActions);
    await AsyncStorage.setItem('pendingActions', JSON.stringify(newActions));
  };

  const clearPendingActions = async () => {
    setPendingActions([]);
    await AsyncStorage.removeItem('pendingActions');
  };

  // Cache des donnees pour mode offline
  const cacheData = async (key, data) => {
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  const getCachedData = async (key, maxAge = 24 * 60 * 60 * 1000) => {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < maxAge) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  };

  const updateLastSync = async () => {
    const now = Date.now();
    setLastSync(now);
    await AsyncStorage.setItem('lastSync', now.toString());
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingActions,
        lastSync,
        addPendingAction,
        removePendingAction,
        clearPendingActions,
        cacheData,
        getCachedData,
        updateLastSync,
        checkNetwork: checkNow,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};
