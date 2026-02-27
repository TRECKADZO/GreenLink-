import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Linking, Platform } from 'react-native';
import { api } from './api';

class CameraService {
  // Demander les permissions
  async requestCameraPermissions() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'GreenLink a besoin d\'accéder à votre appareil photo pour prendre des photos de vos parcelles.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }

  async requestMediaLibraryPermissions() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'GreenLink a besoin d\'accéder à vos photos.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }

  // Prendre une photo avec la caméra
  async takePhoto(options = {}) {
    const hasPermission = await this.requestCameraPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.7, // Compression pour économiser les données
        base64: options.base64 ?? false,
      });

      if (result.canceled) {
        return null;
      }

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

  // Sélectionner une image de la galerie
  async pickImage(options = {}) {
    const hasPermission = await this.requestMediaLibraryPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.7,
        allowsMultipleSelection: options.multiple ?? false,
        selectionLimit: options.limit ?? 5,
      });

      if (result.canceled) {
        return null;
      }

      if (options.multiple) {
        return result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type,
          fileSize: asset.fileSize,
        }));
      }

      return {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
        type: result.assets[0].type,
        fileSize: result.assets[0].fileSize,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
      return null;
    }
  }

  // Afficher le sélecteur (caméra ou galerie)
  showImagePicker(options = {}) {
    return new Promise((resolve) => {
      Alert.alert(
        'Ajouter une photo',
        'Choisissez une option',
        [
          {
            text: 'Appareil photo',
            onPress: async () => {
              const result = await this.takePhoto(options);
              resolve(result);
            },
          },
          {
            text: 'Galerie',
            onPress: async () => {
              const result = await this.pickImage(options);
              resolve(result);
            },
          },
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  }

  // Compresser une image
  async compressImage(uri, quality = 0.5) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      // Si l'image fait moins de 500KB, pas besoin de compresser
      if (fileInfo.size < 500000) {
        return uri;
      }

      // Pour une vraie compression, il faudrait utiliser expo-image-manipulator
      // Mais pour économiser les dépendances, on retourne l'image originale
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

      formData.append(fieldName, {
        uri,
        name: filename,
        type,
      });

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
      
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(directory);
      return files.map((file) => directory + file);
    } catch (error) {
      console.error('Error getting local images:', error);
      return [];
    }
  }
}

export const cameraService = new CameraService();
