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
      const response = await api.post('/auth/login', {
        identifier,
        password,
      });
      
      const { access_token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      api.setToken(access_token);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erreur de connexion',
      };
    }
  };

  const register = async (data) => {
    try {
      const response = await api.post('/auth/register', {
        ...data,
        user_type: 'producteur',
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
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erreur d\'inscription',
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
