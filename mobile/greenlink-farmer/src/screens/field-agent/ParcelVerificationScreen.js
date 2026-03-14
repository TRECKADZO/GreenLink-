// Écran de vérification des parcelles pour agents terrain
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS, FONTS, SPACING } from '../../config';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: '#f59e0b', icon: 'time-outline' },
  verified: { label: 'Vérifié', color: '#10b981', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejeté', color: '#ef4444', icon: 'close-circle-outline' },
  needs_correction: { label: 'À corriger', color: '#f97316', icon: 'alert-circle-outline' },
};

const ParcelVerificationScreen = ({ navigation, route }) => {
  const { parcelId, parcelData } = route?.params || {};
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parcel, setParcel] = useState(parcelData || null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');
  const [correctedArea, setCorrectedArea] = useState('');

  useEffect(() => {
    if (parcelId) {
      fetchParcelDetails();
    }
    getCurrentLocation();
  }, [parcelId]);

  const fetchParcelDetails = async () => {
    try {
      setLoading(true);
      const response = await cooperativeApi.getParcelDetails(token, parcelId);
      if (response.data) {
        setParcel(response.data);
      }
    } catch (error) {
      console.error('Error fetching parcel:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la parcelle');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Activez la localisation pour vérifier la parcelle');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Activez la caméra pour prendre des photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
        exif: true,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const submitVerification = async (status) => {
    if (!currentLocation) {
      Alert.alert('GPS requis', 'Veuillez activer votre GPS pour vérifier la parcelle');
      return;
    }

    if (status === 'rejected' && !notes) {
      Alert.alert('Notes requises', 'Veuillez expliquer pourquoi la parcelle est rejetée');
      return;
    }

    try {
      setSubmitting(true);
      
      const verificationData = {
        verification_status: status,
        verification_notes: notes,
        verified_gps_lat: currentLocation.lat,
        verified_gps_lng: currentLocation.lng,
        verification_photos: photos,
        corrected_area_hectares: correctedArea ? parseFloat(correctedArea) : null
      };

      await cooperativeApi.verifyParcel(token, parcel.id, verificationData);
      
      Alert.alert(
        'Succès',
        status === 'verified' 
          ? 'Parcelle vérifiée avec succès!' 
          : 'Statut de la parcelle mis à jour',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Erreur', 'Impossible de soumettre la vérification');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmVerification = (status) => {
    const statusLabel = STATUS_CONFIG[status]?.label || status;
    Alert.alert(
      'Confirmer',
      `Voulez-vous marquer cette parcelle comme "${statusLabel}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => submitVerification(status) }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!parcel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
          <Text style={styles.errorText}>Parcelle non trouvée</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[parcel.verification_status] || STATUS_CONFIG.pending;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérification Parcelle</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Farmer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Producteur</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.infoText}>{parcel.farmer?.name || 'Inconnu'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.infoText}>{parcel.farmer?.phone || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.infoText}>{parcel.farmer?.village || parcel.village || '-'}</Text>
          </View>
        </View>

        {/* Parcel Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations Parcelle</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{parcel.area_hectares} ha</Text>
              <Text style={styles.statLabel}>Superficie</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{parcel.crop_type}</Text>
              <Text style={styles.statLabel}>Culture</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{parcel.carbon_score}/10</Text>
              <Text style={styles.statLabel}>Score Carbone</Text>
            </View>
          </View>
          
          {parcel.gps_coordinates && (
            <View style={styles.gpsInfo}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
              <Text style={styles.gpsText}>
                GPS déclaré: {parcel.gps_coordinates.lat?.toFixed(5)}, {parcel.gps_coordinates.lng?.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* Current Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Votre position actuelle</Text>
          {currentLocation ? (
            <View style={styles.gpsInfo}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.gpsText}>
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.gpsButton} onPress={getCurrentLocation}>
              <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
              <Text style={styles.gpsButtonText}>Obtenir ma position GPS</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photos de vérification</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
              <Text style={styles.addPhotoText}>Prendre photo</Text>
            </TouchableOpacity>
            {photos.map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.photoPreview} />
            ))}
          </ScrollView>
          <Text style={styles.photoCount}>{photos.length} photo(s) ajoutée(s)</Text>
        </View>

        {/* Correction Area */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Correction superficie (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nouvelle superficie en hectares"
            placeholderTextColor={COLORS.textLight}
            value={correctedArea}
            onChangeText={setCorrectedArea}
            keyboardType="decimal-pad"
          />
          <Text style={styles.inputHint}>
            Laisser vide si la superficie déclarée ({parcel.area_hectares} ha) est correcte
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes de vérification</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Observations, remarques..."
            placeholderTextColor={COLORS.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.verifyButton]}
            onPress={() => confirmVerification('verified')}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Valider la parcelle</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.correctionButton]}
            onPress={() => confirmVerification('needs_correction')}
            disabled={submitting}
          >
            <Ionicons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Demander correction</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => confirmVerification('rejected')}
            disabled={submitting}
          >
            <Ionicons name="close-circle" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Rejeter</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.lg,
    color: COLORS.danger,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoText: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },
  gpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  gpsText: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  gpsButtonText: {
    marginLeft: SPACING.sm,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  addPhotoText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    marginTop: 4,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  photoCount: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputHint: {
    marginTop: SPACING.xs,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
  },
  actionsContainer: {
    marginTop: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  actionButtonText: {
    marginLeft: SPACING.sm,
    color: '#fff',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  verifyButton: {
    backgroundColor: COLORS.success,
  },
  correctionButton: {
    backgroundColor: '#f97316',
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  backButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: FONTS.weights.bold,
  },
});

export default ParcelVerificationScreen;
