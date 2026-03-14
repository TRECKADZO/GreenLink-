// Scanner QR Code pour identifier les producteurs
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';

const QRScannerScreen = ({ navigation }) => {
  const { token } = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    Vibration.vibrate(100);
    
    try {
      // Le QR code contient l'ID du producteur ou ses informations
      // Format attendu: GREENLINK_FARMER:base64(json) ou JSON avec les infos
      let farmerId = null;
      let farmerData = null;

      if (data.startsWith('GREENLINK_FARMER:')) {
        // Décoder le base64 pour obtenir les données JSON
        const encodedData = data.replace('GREENLINK_FARMER:', '');
        try {
          // Décoder base64 URL-safe
          const base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
          const decoded = atob(base64);
          const parsed = JSON.parse(decoded);
          farmerId = parsed.id || parsed.farmer_id;
          farmerData = parsed;
          console.log('Decoded farmer data:', parsed);
        } catch (decodeError) {
          // Si le décodage échoue, utiliser comme ID direct
          console.log('Using raw ID:', encodedData);
          farmerId = encodedData;
        }
      } else {
        try {
          const parsed = JSON.parse(data);
          farmerId = parsed.id || parsed.farmer_id || parsed._id;
          farmerData = parsed;
        } catch (e) {
          // Si ce n'est pas du JSON, essayer comme ID direct
          farmerId = data;
        }
      }

      if (farmerId) {
        setLoading(true);
        // Chercher le producteur dans la base
        const response = await cooperativeApi.getMemberDetail(token, farmerId);
        
        if (response.data) {
          // Naviguer directement vers le profil avec options d'actions
          Alert.alert(
            '✅ Producteur identifié',
            `${response.data.full_name || response.data.name}\n📍 ${response.data.village || 'Village non défini'}\n📞 ${response.data.phone_number || ''}`,
            [
              { text: 'Fermer', onPress: () => setScanned(false), style: 'cancel' },
              { 
                text: '📋 Profil complet', 
                onPress: () => navigation.navigate('CoopMemberDetail', { memberId: farmerId, memberData: response.data }) 
              },
              { 
                text: '🌳 Ajouter Parcelle', 
                onPress: () => navigation.navigate('AddParcel', { farmerId, farmerData: response.data }) 
              },
              { 
                text: '📝 Formulaire SSRTE', 
                onPress: () => navigation.navigate('SSRTEVisitForm', { farmerId, farmerData: response.data }) 
              },
            ]
          );
        } else {
          Alert.alert(
            'Producteur non trouvé',
            'Ce QR code ne correspond à aucun producteur enregistré dans votre coopérative.',
            [
              { text: 'Réessayer', onPress: () => setScanned(false) },
              { text: 'Ajouter nouveau', onPress: () => navigation.navigate('AddCoopMember') },
            ]
          );
        }
      } else {
        Alert.alert('QR Code invalide', 'Ce QR code n\'est pas reconnu par GreenLink.', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
      }
    } catch (error) {
      console.error('Error scanning:', error);
      Alert.alert(
        'Erreur',
        'Impossible de traiter ce QR code. Vérifiez votre connexion.',
        [{ text: 'Réessayer', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.messageText}>Demande de permission caméra...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-off" size={60} color="#ef4444" />
          <Text style={styles.messageText}>Accès à la caméra refusé</Text>
          <Text style={styles.subText}>
            L'accès à la caméra est nécessaire pour scanner les QR codes.
          </Text>
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsButtonText}>Ouvrir les paramètres</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner QR Code</Text>
        <TouchableOpacity onPress={() => setFlashOn(!flashOn)} style={styles.flashButton}>
          <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={flashOn}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          {/* Overlay */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.instructions}>
                {loading ? 'Recherche du producteur...' : 'Placez le QR code du producteur dans le cadre'}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => navigation.navigate('AddCoopMember')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="person-add" size={22} color="#10b981" />
          </View>
          <Text style={styles.actionText}>Ajouter manuellement</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => navigation.navigate('CoopMembers')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="search" size={22} color="#3b82f6" />
          </View>
          <Text style={styles.actionText}>Rechercher</Text>
        </TouchableOpacity>
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
  messageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  subText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  settingsButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  settingsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
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
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
    margin: 15,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 250,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#10b981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 30,
  },
  instructions: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});

export default QRScannerScreen;
