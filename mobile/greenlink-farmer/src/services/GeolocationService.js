// Service de Géolocalisation Mobile - Envoi périodique des positions GPS
// Pour l'application React Native GreenLink Farmer

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert, Platform } from 'react-native';

const LOCATION_TASK_NAME = 'greenlink-location-tracking';
const LOCATION_STORAGE_KEY = 'pending_locations';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ssrte-dashboard.preview.emergentagent.com';

// Configuration du tracking
const TRACKING_CONFIG = {
  // Intervalle d'envoi en millisecondes (30 secondes)
  UPDATE_INTERVAL: 30000,
  // Distance minimum pour déclencher une mise à jour (mètres)
  DISTANCE_FILTER: 10,
  // Précision souhaitée
  ACCURACY: Location.Accuracy.High,
  // Nombre max de positions en cache hors ligne
  MAX_CACHED_LOCATIONS: 500,
  // Intervalle de sync hors ligne (5 minutes)
  OFFLINE_SYNC_INTERVAL: 300000,
};

class GeolocationService {
  constructor() {
    this.isTracking = false;
    this.token = null;
    this.userId = null;
    this.watchId = null;
    this.syncInterval = null;
    this.lastLocation = null;
    this.batteryLevel = null;
  }

  // Initialiser le service avec le token d'authentification
  async initialize(token, userId) {
    this.token = token;
    this.userId = userId;
    
    // Vérifier et demander les permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('[GeoService] Permissions non accordées');
      return false;
    }

    // Configurer le tracking en arrière-plan
    await this.configureBackgroundTracking();
    
    return true;
  }

  // Demander les permissions de localisation
  async requestPermissions() {
    try {
      // Permission foreground
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'application a besoin d\'accéder à votre position pour le suivi terrain.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Permission background (Android & iOS)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('[GeoService] Permission arrière-plan non accordée');
        // Continuer quand même avec le foreground
      }

      return true;
    } catch (error) {
      console.error('[GeoService] Erreur permissions:', error);
      return false;
    }
  }

  // Configurer le tracking en arrière-plan
  async configureBackgroundTracking() {
    try {
      // Définir la tâche de background
      TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
        if (error) {
          console.error('[GeoService] Background task error:', error);
          return;
        }
        
        if (data) {
          const { locations } = data;
          if (locations && locations.length > 0) {
            await this.processLocations(locations);
          }
        }
      });

      console.log('[GeoService] Background tracking configuré');
    } catch (error) {
      console.error('[GeoService] Erreur config background:', error);
    }
  }

  // Démarrer le tracking
  async startTracking() {
    if (this.isTracking) {
      console.log('[GeoService] Tracking déjà actif');
      return;
    }

    try {
      // Démarrer le watch de position
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: TRACKING_CONFIG.ACCURACY,
          timeInterval: TRACKING_CONFIG.UPDATE_INTERVAL,
          distanceInterval: TRACKING_CONFIG.DISTANCE_FILTER,
        },
        (location) => this.onLocationUpdate(location)
      );

      // Démarrer le tracking background si possible
      const isBackgroundAvailable = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
        .catch(() => false);
      
      if (!isBackgroundAvailable) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: TRACKING_CONFIG.ACCURACY,
          timeInterval: TRACKING_CONFIG.UPDATE_INTERVAL,
          distanceInterval: TRACKING_CONFIG.DISTANCE_FILTER,
          foregroundService: {
            notificationTitle: 'GreenLink Tracking',
            notificationBody: 'Suivi de position actif',
            notificationColor: '#10b981',
          },
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType.Other,
        }).catch(err => console.warn('[GeoService] Background non disponible:', err));
      }

      // Démarrer la synchronisation périodique
      this.startPeriodicSync();

      this.isTracking = true;
      console.log('[GeoService] Tracking démarré');

      // Envoyer la position initiale
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: TRACKING_CONFIG.ACCURACY,
      });
      await this.onLocationUpdate(currentLocation);

    } catch (error) {
      console.error('[GeoService] Erreur démarrage tracking:', error);
      throw error;
    }
  }

  // Arrêter le tracking
  async stopTracking() {
    try {
      // Arrêter le watch
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      // Arrêter le background tracking
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
        .catch(() => false);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Arrêter la sync périodique
      this.stopPeriodicSync();

      // Marquer comme hors ligne
      await this.markOffline();

      this.isTracking = false;
      console.log('[GeoService] Tracking arrêté');
    } catch (error) {
      console.error('[GeoService] Erreur arrêt tracking:', error);
    }
  }

  // Callback sur mise à jour de position
  async onLocationUpdate(location) {
    if (!location || !location.coords) return;

    const { latitude, longitude, accuracy, altitude, speed, heading } = location.coords;
    
    this.lastLocation = {
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      timestamp: new Date().toISOString(),
    };

    // Envoyer au serveur
    await this.sendLocationToServer(this.lastLocation);
  }

  // Traiter les locations du background
  async processLocations(locations) {
    for (const location of locations) {
      await this.onLocationUpdate(location);
    }
  }

  // Envoyer la position au serveur
  async sendLocationToServer(location) {
    // Vérifier la connexion
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      // Stocker en cache si hors ligne
      await this.cacheLocation(location);
      return;
    }

    try {
      // Récupérer le niveau de batterie si possible
      let batteryLevel = this.batteryLevel;
      try {
        if (Platform.OS === 'android') {
          // Implémenter si nécessaire avec expo-battery
        }
      } catch (e) {}

      const response = await fetch(`${API_BASE_URL}/api/agents/geo/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          speed: location.speed,
          heading: location.heading,
          battery_level: batteryLevel,
          is_moving: location.speed > 0.5,
          activity_type: this.detectActivityType(location.speed),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('[GeoService] Position envoyée:', location.latitude, location.longitude);
    } catch (error) {
      console.error('[GeoService] Erreur envoi position:', error);
      // Stocker en cache pour réessayer plus tard
      await this.cacheLocation(location);
    }
  }

  // Détecter le type d'activité basé sur la vitesse
  detectActivityType(speed) {
    if (!speed || speed < 0.5) return 'stationary';
    if (speed < 2) return 'walking';
    if (speed < 8) return 'running';
    return 'driving';
  }

  // Stocker une position en cache (mode hors ligne)
  async cacheLocation(location) {
    try {
      const cachedData = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      let locations = cachedData ? JSON.parse(cachedData) : [];
      
      // Limiter la taille du cache
      if (locations.length >= TRACKING_CONFIG.MAX_CACHED_LOCATIONS) {
        locations = locations.slice(-TRACKING_CONFIG.MAX_CACHED_LOCATIONS + 1);
      }
      
      locations.push({
        ...location,
        cached_at: new Date().toISOString(),
      });
      
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locations));
      console.log('[GeoService] Position cachée. Total:', locations.length);
    } catch (error) {
      console.error('[GeoService] Erreur cache:', error);
    }
  }

  // Synchroniser les positions en cache
  async syncCachedLocations() {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    try {
      const cachedData = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (!cachedData) return;

      const locations = JSON.parse(cachedData);
      if (locations.length === 0) return;

      console.log('[GeoService] Sync de', locations.length, 'positions cachées');

      // Envoyer par batch
      const batchSize = 50;
      const failedLocations = [];

      for (let i = 0; i < locations.length; i += batchSize) {
        const batch = locations.slice(i, i + batchSize);
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/agents/geo/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`,
            },
            body: JSON.stringify({ locations: batch }),
          });

          if (!response.ok) {
            failedLocations.push(...batch);
          }
        } catch (error) {
          failedLocations.push(...batch);
        }
      }

      // Garder les échecs pour réessayer
      if (failedLocations.length > 0) {
        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(failedLocations));
      } else {
        await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
      }

      console.log('[GeoService] Sync terminée. Échecs:', failedLocations.length);
    } catch (error) {
      console.error('[GeoService] Erreur sync:', error);
    }
  }

  // Démarrer la synchronisation périodique
  startPeriodicSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.syncCachedLocations();
    }, TRACKING_CONFIG.OFFLINE_SYNC_INTERVAL);
  }

  // Arrêter la synchronisation périodique
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Marquer l'agent comme hors ligne
  async markOffline() {
    try {
      await fetch(`${API_BASE_URL}/api/agents/geo/offline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
    } catch (error) {
      console.error('[GeoService] Erreur marquage offline:', error);
    }
  }

  // Obtenir la dernière position connue
  getLastLocation() {
    return this.lastLocation;
  }

  // Vérifier si le tracking est actif
  isActive() {
    return this.isTracking;
  }

  // Mettre à jour le niveau de batterie
  setBatteryLevel(level) {
    this.batteryLevel = level;
  }
}

// Export singleton
export const geolocationService = new GeolocationService();
export default geolocationService;
