import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(response.data);
          setToken(savedToken);
        } catch (error) {
          console.error('Token invalid:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const register = async (identifier, password, fullName, userType, isEmail = false, additionalData = null) => {
    try {
      console.log('[Auth] Attempting registration:', { identifier, fullName, userType, isEmail });
      console.log('[Auth] API URL:', API);
      
      const payload = {
        password,
        full_name: fullName,
        user_type: userType
      };
      
      // Add either phone_number or email
      if (isEmail) {
        payload.email = identifier;
      } else {
        payload.phone_number = identifier;
      }

      // Add additional data (legal acceptance + ICI data) if provided
      if (additionalData) {
        // Legal acceptance fields
        if (additionalData.acceptedConditions !== undefined) {
          payload.legal_acceptance = {
            acceptedConditions: additionalData.acceptedConditions,
            acceptedPrivacy: additionalData.acceptedPrivacy,
            acceptedAt: additionalData.acceptedAt
          };
        }
        
        // Location fields
        if (additionalData.departement) {
          payload.department = additionalData.departement;
        }
        if (additionalData.zone) {
          payload.zone = additionalData.zone;
        }
        if (additionalData.village) {
          payload.village = additionalData.village;
        }
        
        // ICI demographic fields for producers
        if (additionalData.genre) {
          payload.genre = additionalData.genre;
        }
        if (additionalData.date_naissance) {
          payload.date_naissance = additionalData.date_naissance;
        }
        if (additionalData.niveau_education) {
          payload.niveau_education = additionalData.niveau_education;
        }
        if (additionalData.taille_menage) {
          payload.taille_menage = additionalData.taille_menage;
        }
        if (additionalData.nombre_enfants) {
          payload.nombre_enfants = additionalData.nombre_enfants;
        }
      }
      
      console.log('[Auth] Registration payload:', payload);
      
      const response = await axios.post(`${API}/auth/register`, payload);
      
      console.log('[Auth] Registration response:', response.data);
      
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      
      console.log('[Auth] Registration successful, token saved');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      console.error('[Auth] Error response:', error.response?.data);
      console.error('[Auth] Error status:', error.response?.status);
      console.error('[Auth] Error message:', error.message);
      
      // More detailed error message
      let errorMessage = 'Erreur lors de l\'inscription';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'La connexion a expiré. Veuillez réessayer.';
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const login = async (identifier, password) => {
    try {
      console.log('[Auth] Attempting login with:', identifier);
      console.log('[Auth] API URL:', API);
      
      const response = await axios.post(`${API}/auth/login`, {
        identifier,
        password
      });
      
      console.log('[Auth] Login response:', response.data);
      
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      
      console.log('[Auth] Login successful, token saved');
      return { success: true, user: userData };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      console.error('[Auth] Error response:', error.response?.data);
      console.error('[Auth] Error status:', error.response?.status);
      console.error('[Auth] Error message:', error.message);
      
      // More detailed error message
      let errorMessage = 'Erreur lors de la connexion';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'La connexion a expiré. Veuillez réessayer.';
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erreur lors de la mise à jour'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};