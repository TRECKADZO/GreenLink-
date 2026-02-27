import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchSubscription = null;
  }

  // Demander les permissions de localisation
  async requestPermissions() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permission requise',
          'GreenLink a besoin d\'accéder à votre position pour localiser vos parcelles.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Obtenir la position actuelle
  async getCurrentLocation() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        timestamp: location.timestamp,
      };

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Fallback avec une précision moindre
      try {
        const location = await Location.getLastKnownPositionAsync();
        if (location) {
          return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };
        }
      } catch (fallbackError) {
        console.error('Fallback location also failed:', fallbackError);
      }
      
      return null;
    }
  }

  // Convertir les coordonnées en adresse
  async reverseGeocode(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        return {
          city: addr.city,
          district: addr.district,
          region: addr.region,
          country: addr.country,
          formattedAddress: [addr.district, addr.city, addr.region]
            .filter(Boolean)
            .join(', '),
        };
      }
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Surveiller la position en continu
  async watchPosition(callback, options = {}) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: options.timeInterval || 30000,
          distanceInterval: options.distanceInterval || 50,
        },
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };
          this.currentLocation = coords;
          callback(coords);
        }
      );

      return this.watchSubscription;
    } catch (error) {
      console.error('Error watching position:', error);
      return null;
    }
  }

  // Arrêter la surveillance
  stopWatching() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  // Calculer la distance entre deux points (en km)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Formater les coordonnées pour l'affichage
  formatCoordinates(latitude, longitude) {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(latitude).toFixed(6)}° ${latDir}, ${Math.abs(longitude).toFixed(6)}° ${lonDir}`;
  }
}

export const locationService = new LocationService();
