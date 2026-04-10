import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { tokenService } from '../services/tokenService';
import logger from '../services/logger';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(tokenService.getToken());
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = tokenService.getToken();
      if (savedToken) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(response.data);
          setToken(savedToken);
        } catch (error) {
          logger.error('Token invalid:', error);
          tokenService.removeToken();
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async (identifier, password, fullName, userType, isEmail = false, additionalData = null) => {
    try {
      logger.log('[Auth] Attempting registration:', { identifier, fullName, userType, isEmail });
      
      const payload = {
        password,
        full_name: fullName,
        user_type: userType
      };
      
      if (isEmail) {
        payload.email = identifier;
      } else {
        payload.phone_number = identifier;
      }

      if (additionalData) {
        if (additionalData.acceptedConditions !== undefined) {
          payload.legal_acceptance = {
            acceptedConditions: additionalData.acceptedConditions,
            acceptedPrivacy: additionalData.acceptedPrivacy,
            acceptedAt: additionalData.acceptedAt
          };
        }
        if (additionalData.departement) payload.department = additionalData.departement;
        if (additionalData.zone) payload.zone = additionalData.zone;
        if (additionalData.village) payload.village = additionalData.village;
        if (additionalData.coop_name) payload.coop_name = additionalData.coop_name;
        if (additionalData.sponsor_referral_code) payload.sponsor_referral_code = additionalData.sponsor_referral_code;
        if (additionalData.genre) payload.genre = additionalData.genre;
        if (additionalData.date_naissance) payload.date_naissance = additionalData.date_naissance;
        if (additionalData.niveau_education) payload.niveau_education = additionalData.niveau_education;
        if (additionalData.taille_menage) payload.taille_menage = additionalData.taille_menage;
        if (additionalData.nombre_enfants) payload.nombre_enfants = additionalData.nombre_enfants;
      }
      
      const response = await axios.post(`${API}/auth/register`, payload);
      
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      tokenService.setToken(access_token);
      
      return { success: true, user: userData };
    } catch (error) {
      logger.error('[Auth] Registration error:', error.response?.data || error.message);
      
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
      
      return { success: false, error: errorMessage };
    }
  };

  const login = async (identifier, password) => {
    try {
      logger.log('[Auth] Attempting login with:', identifier);
      
      const response = await axios.post(`${API}/auth/login`, {
        identifier,
        password
      });
      
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      tokenService.setToken(access_token);
      tokenService.setUser(userData);
      
      // Trigger offline sync for field_agent and cooperative users
      if (userData.user_type === 'field_agent' || userData.user_type === 'cooperative') {
        try {
          const { syncCooperativeData, performFullSync } = await import('../services/offlineDB');
          if (userData.user_type === 'cooperative') {
            syncCooperativeData(BACKEND_URL, access_token).catch(() => {});
          } else {
            performFullSync(BACKEND_URL, access_token).catch(() => {});
          }
        } catch (e) { logger.warn('[Auth] Offline DB not ready:', e.message); }
      }
      
      return { success: true, user: userData };
    } catch (error) {
      logger.error('[Auth] Login error:', error.response?.data || error.message);
      
      let errorMessage = 'Erreur lors de la connexion';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 429) {
        errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Impossible de joindre le serveur. Verifiez votre connexion internet et reessayez.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'La connexion a expire. Veuillez reessayer.';
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    tokenService.clearAll();
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
