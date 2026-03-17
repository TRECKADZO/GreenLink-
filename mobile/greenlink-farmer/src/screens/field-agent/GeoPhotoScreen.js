// Capture de photos géolocalisées
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

// Lazy import expo-camera to prevent crash if module fails
let Camera = null;
let CameraView = null;
try {
  const cam = require('expo-camera');
  Camera = cam.Camera;
  CameraView = cam.CameraView;
} catch (e) {
  console.error('[GeoPhoto] expo-camera failed to load:', e?.message);
}

const OFFLINE_PHOTOS_KEY = 'offline_photos';

const GeoPhotoScreen = ({ navigation, route }) => {
  const { farmerId, farmerName, context } = route.params || {};
  const cameraRef = useRef(null);
  
  const [hasPermission, setHasPermission] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [photoType, setPhotoType] = useState('parcel'); // parcel, identity, other
  const [notes, setNotes] = useState('');

  const photoTypes = [
    { id: 'parcel', label: 'Parcelle', icon: 'leaf' },
    { id: 'identity', label: 'Producteur', icon: 'person' },
    { id: 'ssrte', label: 'Visite SSRTE', icon: 'clipboard' },
    { id: 'other', label: 'Autre', icon: 'camera' },
  ];

  useEffect(() => {
    initializePermissions();
  }, []);

  const initializePermissions = async () => {
    // Camera permission
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    
    // Location permission
    const locationStatus = await Location.requestForegroundPermissionsAsync();
    
    setHasPermission(cameraStatus.status === 'granted' && locationStatus.status === 'granted');
    
    if (locationStatus.status === 'granted') {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);
    } catch (error) {
      console.error('Error getting location:', error);
      // Essayer avec une précision plus basse
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
      } catch (e) {
        Alert.alert('GPS indisponible', 'Impossible d\'obtenir votre position GPS.');
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        exif: true,
      });
      
      // Rafraîchir la position GPS
      await getCurrentLocation();
      
      setCapturedPhoto(photo);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  const retakePicture = () => {
    setCapturedPhoto(null);
  };

  const savePhoto = async () => {
    if (!capturedPhoto || isSaving) return;
    
    setIsSaving(true);
    try {
      const isOnline = (await NetInfo.fetch()).isConnected;
      
      const photoData = {
        id: Date.now().toString(),
        uri: capturedPhoto.uri,
        type: photoType,
        farmerId: farmerId || null,
        farmerName: farmerName || null,
        context: context || null,
        notes: notes,
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
        } : null,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      // Sauvegarder localement d'abord
      const localPath = `${FileSystem.documentDirectory}photos/${photoData.id}.jpg`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos/`, { intermediates: true });
      await FileSystem.copyAsync({ from: capturedPhoto.uri, to: localPath });
      photoData.localUri = localPath;

      // Ajouter à la liste des photos en attente
      const existingPhotos = await AsyncStorage.getItem(OFFLINE_PHOTOS_KEY);
      const photos = existingPhotos ? JSON.parse(existingPhotos) : [];
      photos.push(photoData);
      await AsyncStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(photos));

      if (isOnline) {
        // TODO: Upload au serveur
        // await uploadPhoto(photoData);
        Alert.alert(
          'Photo enregistrée',
          'La photo a été sauvegardée avec succès.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Photo sauvegardée (hors ligne)',
          'La photo sera synchronisée automatiquement lorsque vous serez connecté.',
          [
            { text: 'Prendre une autre', onPress: retakePicture },
            { text: 'Terminer', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la photo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Vérification des permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-off" size={60} color="#ef4444" />
          <Text style={styles.errorTitle}>Permissions requises</Text>
          <Text style={styles.errorText}>
            L'accès à la caméra et au GPS est nécessaire pour cette fonctionnalité.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Mode preview de la photo capturée
  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={retakePicture} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmer la photo</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />

          {/* GPS Info */}
          <View style={styles.gpsInfo}>
            <Ionicons name="location" size={20} color="#10b981" />
            {location ? (
              <View style={styles.gpsText}>
                <Text style={styles.gpsCoords}>
                  {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                </Text>
                <Text style={styles.gpsAccuracy}>
                  Précision: ±{Math.round(location.coords.accuracy)}m
                </Text>
              </View>
            ) : (
              <Text style={styles.gpsUnavailable}>GPS non disponible</Text>
            )}
          </View>

          {/* Type selector */}
          <Text style={styles.sectionLabel}>Type de photo</Text>
          <View style={styles.typeSelector}>
            {photoTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  photoType === type.id && styles.typeButtonActive
                ]}
                onPress={() => setPhotoType(type.id)}
              >
                <Ionicons 
                  name={type.icon} 
                  size={20} 
                  color={photoType === type.id ? '#fff' : '#94a3b8'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  photoType === type.id && styles.typeButtonTextActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Farmer info if available */}
          {farmerId && (
            <View style={styles.farmerInfo}>
              <Ionicons name="person" size={20} color="#3b82f6" />
              <Text style={styles.farmerName}>{farmerName || farmerId}</Text>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              Date: {new Date().toLocaleString('fr-FR')}
            </Text>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
            <Ionicons name="refresh" size={22} color="#fff" />
            <Text style={styles.retakeButtonText}>Reprendre</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={savePhoto}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={22} color="#fff" />
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Mode camera
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo géolocalisée</Text>
        <TouchableOpacity 
          onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')} 
          style={styles.flashButton}
        >
          <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* GPS Status */}
      <View style={styles.gpsStatus}>
        {locationLoading ? (
          <>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={styles.gpsStatusText}>Acquisition GPS...</Text>
          </>
        ) : location ? (
          <>
            <Ionicons name="location" size={18} color="#10b981" />
            <Text style={[styles.gpsStatusText, { color: '#10b981' }]}>
              GPS actif (±{Math.round(location.coords.accuracy)}m)
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="location-outline" size={18} color="#ef4444" />
            <Text style={[styles.gpsStatusText, { color: '#ef4444' }]}>GPS indisponible</Text>
          </>
        )}
        <TouchableOpacity onPress={getCurrentLocation} style={styles.refreshGps}>
          <Ionicons name="refresh" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={flashMode}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.gridLine} />
            <View style={styles.gridLineVertical} />
          </View>
        </CameraView>
      </View>

      {/* Capture Button */}
      <View style={styles.captureContainer}>
        <TouchableOpacity 
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]} 
          onPress={takePicture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
        <Text style={styles.captureHint}>Appuyez pour capturer</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 15,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
  },
  errorText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  flashButton: {
    padding: 5,
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  gpsStatusText: {
    marginLeft: 8,
    color: '#94a3b8',
    fontSize: 13,
  },
  refreshGps: {
    marginLeft: 10,
    padding: 5,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
    margin: 15,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  gridLineVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  captureContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  captureHint: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 13,
  },
  // Preview styles
  previewContainer: {
    flex: 1,
    padding: 15,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    resizeMode: 'cover',
  },
  gpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  gpsText: {
    marginLeft: 10,
  },
  gpsCoords: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  gpsAccuracy: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  gpsUnavailable: {
    color: '#ef4444',
    marginLeft: 10,
  },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 20,
    marginBottom: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  typeButtonActive: {
    backgroundColor: '#10b981',
  },
  typeButtonText: {
    color: '#94a3b8',
    marginLeft: 6,
    fontSize: 13,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  farmerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  farmerName: {
    color: '#93c5fd',
    marginLeft: 10,
    fontWeight: '600',
  },
  metadata: {
    marginTop: 15,
    padding: 10,
  },
  metadataText: {
    color: '#64748b',
    fontSize: 12,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 15,
    borderRadius: 12,
    marginRight: 10,
  },
  retakeButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 15,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default GeoPhotoScreen;
