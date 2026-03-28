import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.setToken(storedToken);
        
        // Verifier si le token est encore valide (silencieux)
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          await SecureStore.setItemAsync('user', JSON.stringify(response.data));
        } catch (error) {
          // Token invalide ou offline — garder les donnees locales
          console.log('[Auth] Token validation failed, using cached data');
        }
      }
    } catch (error) {
      console.error('[Auth] Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      console.log('[Auth] Login with:', identifier);
      const response = await api.login(identifier, password);
      
      const { access_token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      api.setToken(access_token);
      
      console.log('[Auth] Login successful');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error.message, 'type:', error.type);
      
      let errorMessage = 'Erreur de connexion';
      let isServerError = false;
      
      const status = error.status || error.response?.status;
      const data = error.data || error.response?.data;
      
      if (status) {
        if (status === 401) {
          errorMessage = 'Identifiant ou mot de passe incorrect';
        } else if (status === 403) {
          errorMessage = 'Compte desactive. Contactez votre cooperative.';
        } else if (status === 422) {
          errorMessage = 'Veuillez verifier les informations saisies';
        } else if (status === 429) {
          errorMessage = 'Trop de tentatives. Patientez une minute avant de reessayer.';
        } else if (status >= 500) {
          isServerError = true;
          errorMessage = 'Le serveur rencontre un probleme. Reessayez dans quelques instants.';
        }
        if (data?.detail && typeof data.detail === 'string') {
          errorMessage = data.detail;
        }
      } else {
        // Pas de status HTTP — verifier NetInfo avant de conclure
        isServerError = true;
        try {
          const NetInfo = require('@react-native-community/netinfo').default;
          const netState = await NetInfo.fetch();
          if (!netState.isConnected || netState.isInternetReachable === false) {
            errorMessage = 'Pas de connexion internet. Verifiez votre WiFi ou donnees mobiles.';
          } else if (error.type === 'timeout') {
            errorMessage = 'Le serveur met du temps a repondre. Reessayez dans quelques instants.';
          } else {
            errorMessage = 'Impossible de joindre le serveur. Reessayez dans quelques instants.';
          }
        } catch {
          errorMessage = error.type === 'timeout'
            ? 'Le serveur met du temps a repondre. Reessayez dans quelques instants.'
            : 'Impossible de se connecter. Reessayez dans quelques instants.';
        }
      }
      
      return { success: false, error: errorMessage, isServerError };
    }
  };

  const register = async (data) => {
    try {
      console.log('[Auth] Register attempt:', data.full_name, data.user_type);
      
      const response = await api.post('/auth/register', {
        ...data,
        user_type: data.user_type || 'producteur',
        legal_acceptance: {
          acceptedConditions: true,
          acceptedPrivacy: true,
          acceptedAt: new Date().toISOString(),
        },
      });
      
      const { access_token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      api.setToken(access_token);
      
      console.log('[Auth] Registration successful');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Register error:', error.message);
      
      let errorMessage = "Erreur d'inscription";
      const status = error.status || error.response?.status;
      const data = error.data || error.response?.data;
      const backendError = data?.detail;
      
      if (backendError) {
        if (Array.isArray(backendError)) {
          errorMessage = backendError.map(err => (err.msg || '').replace('Value error, ', '')).join('\n');
        } else if (typeof backendError === 'string') {
          const norm = backendError.toLowerCase();
          if (norm.includes('telephone') || norm.includes('phone') || norm.includes('numero')) {
            errorMessage = 'Ce numero est deja enregistre. Connectez-vous ou utilisez un autre numero.';
          } else if (norm.includes('email') || norm.includes('mail')) {
            errorMessage = 'Cet email est deja enregistre. Connectez-vous ou utilisez un autre email.';
          } else {
            errorMessage = backendError;
          }
        }
      } else if (status === 422) {
        errorMessage = 'Veuillez verifier les informations saisies.';
      } else if (status >= 500) {
        errorMessage = 'Le serveur rencontre un probleme. Reessayez dans quelques instants.';
      } else if (error.type === 'timeout' || error.type === 'network') {
        errorMessage = 'Impossible de se connecter au serveur. Verifiez votre connexion internet.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    // 1. Flush le pool de connexions OkHttp AVANT de supprimer le token
    await api.flushConnections();
    // 2. Nettoyer l'auth
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setUser(null);
    api.setToken(null);
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      setUser(response.data);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.data?.detail || error.message || 'Erreur de mise a jour',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
