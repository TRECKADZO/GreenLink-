import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';
import { CONFIG } from '../config';

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
        
        // Vérifier si le token est encore valide
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          await SecureStore.setItemAsync('user', JSON.stringify(response.data));
        } catch (error) {
          // Token invalide, on garde les données locales pour le mode offline
          console.log('Token validation failed, using cached data');
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      console.log('[Auth] Login attempt with:', identifier);
      console.log('[Auth] API URL:', CONFIG.API_URL);
      
      // Health check avant login — permet de détecter Cloudflare tôt
      const healthy = await api.checkHealth();
      if (!healthy) {
        console.warn('[Auth] Server health check failed, trying login anyway...');
      }
      
      const response = await api.post('/auth/login', {
        identifier,
        password,
      });
      
      console.log('[Auth] Login response received');
      
      const { access_token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      api.setToken(access_token);
      
      console.log('[Auth] Login successful');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error.message);
      console.error('[Auth] Error response:', error.response?.data);
      console.error('[Auth] Error status:', error.response?.status);
      
      let errorMessage = 'Erreur de connexion';
      let isServerError = false;
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (typeof data === 'object' && data !== null && data.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(e => e.msg || e).join('\n');
          } else {
            errorMessage = JSON.stringify(data.detail);
          }
        } else if (status === 401) {
          errorMessage = 'Identifiant ou mot de passe incorrect';
        } else if (status === 403) {
          errorMessage = 'Compte desactive. Contactez votre cooperative.';
        } else if (status === 422) {
          errorMessage = 'Veuillez verifier les informations saisies';
        } else if (status === 429) {
          errorMessage = 'Trop de tentatives. Patientez une minute avant de reessayer.';
        } else if (status >= 500 || status === 0) {
          isServerError = true;
          errorMessage = 'Probleme de connexion au serveur. Verifiez votre reseau et reessayez.';
        } else {
          errorMessage = `Erreur (${status}). Verifiez votre connexion et reessayez.`;
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        isServerError = true;
        errorMessage = 'La connexion est trop lente. Verifiez votre reseau et reessayez.';
      } else if (error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
        isServerError = true;
        errorMessage = 'Impossible de contacter le serveur. Verifiez votre connexion internet.';
      }
      
      return {
        success: false,
        error: errorMessage,
        isServerError,
      };
    }
  };

  const register = async (data) => {
    try {
      console.log('[Auth] Register attempt:', data.full_name, data.user_type);
      console.log('[Auth] API URL:', CONFIG.API_URL);
      
      const response = await api.post('/auth/register', {
        ...data,
        user_type: data.user_type || 'producteur',
        legal_acceptance: {
          acceptedConditions: true,
          acceptedPrivacy: true,
          acceptedAt: new Date().toISOString(),
        },
      });
      
      console.log('[Auth] Register response received');
      
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
      console.error('[Auth] Error response:', error.response?.data);
      console.error('[Auth] Error status:', error.response?.status);
      
      let errorMessage = "Erreur d'inscription";
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        const backendError = data?.detail;
        
        if (backendError) {
          if (Array.isArray(backendError)) {
            const messages = backendError.map(err => {
              const msg = err.msg || '';
              return msg.replace('Value error, ', '');
            });
            errorMessage = messages.join('\n');
          } else if (typeof backendError === 'string') {
            const normalizedError = backendError.toLowerCase();
            
            if (normalizedError.includes('téléphone') || 
                normalizedError.includes('telephone') || 
                normalizedError.includes('phone') ||
                normalizedError.includes('numéro')) {
              errorMessage = 'Ce numéro de téléphone est déjà enregistré. Connectez-vous ou utilisez un autre numéro.';
            } else if (normalizedError.includes('email') || normalizedError.includes('mail')) {
              errorMessage = 'Cet email est déjà enregistré. Connectez-vous ou utilisez un autre email.';
            } else if (normalizedError.includes('mot de passe') || normalizedError.includes('password')) {
              errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
            } else {
              errorMessage = backendError;
            }
          } else {
            errorMessage = JSON.stringify(backendError);
          }
        } else if (status === 422) {
          errorMessage = 'Veuillez vérifier les informations saisies. Tous les champs obligatoires doivent être remplis.';
        } else if (status === 429) {
          errorMessage = 'Trop de tentatives. Patientez une minute avant de réessayer.';
        } else if (status >= 500) {
          errorMessage = 'Le serveur rencontre un problème. Réessayez dans quelques instants.';
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'La connexion est trop lente. Vérifiez votre réseau et réessayez.';
      } else if (error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async () => {
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
        error: error.response?.data?.detail || 'Erreur de mise à jour',
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
