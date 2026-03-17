import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Linking } from 'react-native';
import { api } from './api';

class CameraService {
  // Demander les permissions caméra uniquement (pas de galerie)
  async requestCameraPermissions() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'GreenLink a besoin de votre appareil photo pour photographier vos parcelles.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }

  // Prendre une photo avec la caméra (nécessite permission CAMERA)
  async takePhoto(options = {}) {
    const hasPermission = await this.requestCameraPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.7,
        base64: options.base64 ?? false,
      });

      if (result.canceled) return null;

      return {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
        type: result.assets[0].type,
        fileSize: result.assets[0].fileSize,
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
      return null;
    }
  }

  /**
   * Choisir une image depuis la galerie via le SYSTEM PHOTO PICKER Android.
   * 
   * IMPORTANT: launchImageLibraryAsync() utilise le Photo Picker système
   * qui ne nécessite AUCUNE permission READ_MEDIA_IMAGES/VIDEO.
   * 
   * Avec blockedPermissions + config plugin removeMediaPermissions,
   * ces permissions sont supprimées du manifest final.
   * Le système photo picker fonctionne sans elles.
   */
  async pickFromGallery(options = {}) {
    try {
      // Pas besoin de demander de permission — le system picker gère tout
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.7,
        base64: options.base64 ?? false,
      });

      if (result.canceled) return null;

      return {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
        type: result.assets[0].type,
        fileSize: result.assets[0].fileSize,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
      return null;
    }
  }

  // Choix: Caméra ou Galerie (via system picker, sans permissions médias)
  async showImagePicker(options = {}) {
    return new Promise((resolve) => {
      Alert.alert(
        'Ajouter une photo',
        'Comment souhaitez-vous ajouter une photo ?',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Galerie', onPress: async () => resolve(await this.pickFromGallery(options)) },
          { text: 'Caméra', onPress: async () => resolve(await this.takePhoto(options)) },
        ]
      );
    });
  }

  // Compresser une image
  async compressImage(uri, quality = 0.5) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.size < 500000) return uri;
      return uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  }

  // Upload une image vers le serveur
  async uploadImage(uri, endpoint = '/upload', fieldName = 'file') {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append(fieldName, { uri, name: filename, type });

      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  // Sauvegarder une image localement
  async saveImageLocally(uri, filename) {
    try {
      const directory = FileSystem.documentDirectory + 'parcels/';
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const destination = directory + filename;
      await FileSystem.copyAsync({ from: uri, to: destination });
      return destination;
    } catch (error) {
      console.error('Error saving image locally:', error);
      return null;
    }
  }

  // Supprimer une image locale
  async deleteLocalImage(uri) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    } catch (error) {
      console.error('Error deleting local image:', error);
      return false;
    }
  }

  // Obtenir les images locales
  async getLocalImages() {
    try {
      const directory = FileSystem.documentDirectory + 'parcels/';
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) return [];
      const files = await FileSystem.readDirectoryAsync(directory);
      return files.map((file) => directory + file);
    } catch (error) {
      console.error('Error getting local images:', error);
      return [];
    }
  }
}

export const cameraService = new CameraService();
