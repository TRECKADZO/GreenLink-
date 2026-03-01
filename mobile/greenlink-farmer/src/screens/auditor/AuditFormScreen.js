import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../config';
import axios from 'axios';
import { API_URL } from '../../config';
import { auditOfflineService } from '../../services/auditOffline';

const AuditFormScreen = ({ navigation, route }) => {
  const { missionId, parcelId, parcel } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photos, setPhotos] = useState([]);
  
  const [formData, setFormData] = useState({
    actual_area_hectares: parcel?.area_hectares?.toString() || '',
    shade_trees_count: '',
    shade_trees_density: '',
    organic_practices: false,
    soil_cover: false,
    composting: false,
    erosion_control: false,
    crop_health: '',
    gps_lat: parcel?.gps_lat?.toString() || '',
    gps_lng: parcel?.gps_lng?.toString() || '',
    observations: '',
    recommendation: '',
    rejection_reason: '',
  });

  const densityOptions = [
    { value: 'low', label: 'Faible (≤20/ha)' },
    { value: 'medium', label: 'Moyenne (21-40/ha)' },
    { value: 'high', label: 'Élevée (41+/ha)' },
  ];

  const healthOptions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Bon' },
    { value: 'average', label: 'Moyen' },
    { value: 'poor', label: 'Mauvais' },
  ];

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour cette fonctionnalité');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setFormData(prev => ({
        ...prev,
        gps_lat: location.coords.latitude.toFixed(6),
        gps_lng: location.coords.longitude.toFixed(6),
      }));

      Alert.alert('Succès', 'Position GPS capturée');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'obtenir la position GPS');
    } finally {
      setGettingLocation(false);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limite atteinte', 'Maximum 5 photos autorisées');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez l\'accès à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        // Get current location for photo
        let photoLocation = null;
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          photoLocation = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
        } catch (e) {
          console.log('Could not get photo location');
        }

        setPhotos(prev => [...prev, {
          uri: result.assets[0].uri,
          timestamp: new Date().toISOString(),
          location: photoLocation,
        }]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.actual_area_hectares) {
      Alert.alert('Erreur', 'La superficie réelle est requise');
      return false;
    }
    if (!formData.shade_trees_density) {
      Alert.alert('Erreur', 'La densité des arbres d\'ombrage est requise');
      return false;
    }
    if (!formData.crop_health) {
      Alert.alert('Erreur', 'L\'état de santé des cultures est requis');
      return false;
    }
    if (!formData.recommendation) {
      Alert.alert('Erreur', 'Veuillez sélectionner une décision d\'audit');
      return false;
    }
    if (formData.recommendation === 'rejected' && !formData.rejection_reason) {
      Alert.alert('Erreur', 'Veuillez indiquer la raison du rejet');
      return false;
    }
    if (photos.length === 0) {
      Alert.alert('Erreur', 'Au moins une photo est requise');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    Alert.alert(
      'Confirmer',
      `Voulez-vous soumettre cet audit avec la décision "${
        formData.recommendation === 'approved' ? 'Approuvé' :
        formData.recommendation === 'rejected' ? 'Rejeté' : 'À revoir'
      }" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Soumettre', onPress: submitAudit },
      ]
    );
  };

  const submitAudit = async () => {
    setSubmitting(true);
    try {
      const auditData = {
        parcel_id: parcelId,
        actual_area_hectares: parseFloat(formData.actual_area_hectares),
        shade_trees_count: parseInt(formData.shade_trees_count) || 0,
        shade_trees_density: formData.shade_trees_density,
        organic_practices: formData.organic_practices,
        soil_cover: formData.soil_cover,
        composting: formData.composting,
        erosion_control: formData.erosion_control,
        crop_health: formData.crop_health,
        photos: photos.map(p => p.uri), // In production, upload to cloud first
        gps_lat: formData.gps_lat ? parseFloat(formData.gps_lat) : null,
        gps_lng: formData.gps_lng ? parseFloat(formData.gps_lng) : null,
        observations: formData.observations,
        recommendation: formData.recommendation,
        rejection_reason: formData.rejection_reason || null,
      };

      const response = await axios.post(
        `${API_URL}/api/carbon-auditor/audit/submit?auditor_id=${user.id}&mission_id=${missionId}`,
        auditData
      );

      Alert.alert(
        'Succès! 🎉',
        `Audit soumis avec succès!\nScore carbone calculé: ${response.data.carbon_score}/10`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting audit:', error);
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de soumettre l\'audit');
    } finally {
      setSubmitting(false);
    }
  };

  const PracticeToggle = ({ label, icon, value, onToggle }) => (
    <TouchableOpacity
      style={[styles.practiceItem, value && styles.practiceItemActive]}
      onPress={onToggle}
    >
      <Text style={styles.practiceIcon}>{icon}</Text>
      <Text style={[styles.practiceLabel, value && styles.practiceLabelActive]}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        {value && <View style={styles.toggleDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audit de Parcelle</Text>
        <Text style={styles.headerSubtitle}>{parcel?.location} - {parcel?.farmer_name}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Parcel Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌱 Informations parcelle</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Village</Text>
              <Text style={styles.infoValue}>{parcel?.village}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Superficie déclarée</Text>
              <Text style={styles.infoValue}>{parcel?.area_hectares} ha</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Culture</Text>
              <Text style={styles.infoValue}>{parcel?.crop_type}</Text>
            </View>
            <View style={[styles.infoItem, styles.infoItemHighlight]}>
              <Text style={styles.infoLabel}>Score déclaré</Text>
              <Text style={styles.infoValueHighlight}>{parcel?.carbon_score || '-'}/10</Text>
            </View>
          </View>
        </View>

        {/* Verification */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Vérification terrain</Text>
          
          <Text style={styles.inputLabel}>Superficie réelle (ha) *</Text>
          <TextInput
            style={styles.input}
            value={formData.actual_area_hectares}
            onChangeText={(text) => setFormData({...formData, actual_area_hectares: text})}
            keyboardType="decimal-pad"
            placeholder="Ex: 2.5"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <Text style={styles.inputLabel}>Nombre d'arbres d'ombrage</Text>
          <TextInput
            style={styles.input}
            value={formData.shade_trees_count}
            onChangeText={(text) => setFormData({...formData, shade_trees_count: text})}
            keyboardType="number-pad"
            placeholder="Ex: 45"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <Text style={styles.inputLabel}>Densité arbres d'ombrage *</Text>
          <View style={styles.optionsRow}>
            {densityOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionButton,
                  formData.shade_trees_density === opt.value && styles.optionButtonActive
                ]}
                onPress={() => setFormData({...formData, shade_trees_density: opt.value})}
              >
                <Text style={[
                  styles.optionText,
                  formData.shade_trees_density === opt.value && styles.optionTextActive
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>État de santé des cultures *</Text>
          <View style={styles.optionsRow}>
            {healthOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionButton,
                  formData.crop_health === opt.value && styles.optionButtonActive
                ]}
                onPress={() => setFormData({...formData, crop_health: opt.value})}
              >
                <Text style={[
                  styles.optionText,
                  formData.crop_health === opt.value && styles.optionTextActive
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sustainable Practices */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌿 Pratiques durables</Text>
          <PracticeToggle
            label="Agriculture biologique"
            icon="🌱"
            value={formData.organic_practices}
            onToggle={() => setFormData({...formData, organic_practices: !formData.organic_practices})}
          />
          <PracticeToggle
            label="Couverture du sol"
            icon="🌾"
            value={formData.soil_cover}
            onToggle={() => setFormData({...formData, soil_cover: !formData.soil_cover})}
          />
          <PracticeToggle
            label="Compostage"
            icon="♻️"
            value={formData.composting}
            onToggle={() => setFormData({...formData, composting: !formData.composting})}
          />
          <PracticeToggle
            label="Contrôle érosion"
            icon="🏔️"
            value={formData.erosion_control}
            onToggle={() => setFormData({...formData, erosion_control: !formData.erosion_control})}
          />
        </View>

        {/* GPS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛰️ Position GPS</Text>
          <View style={styles.gpsRow}>
            <View style={styles.gpsInput}>
              <Text style={styles.gpsLabel}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={formData.gps_lat}
                onChangeText={(text) => setFormData({...formData, gps_lat: text})}
                keyboardType="decimal-pad"
                placeholder="6.827623"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>
            <View style={styles.gpsInput}>
              <Text style={styles.gpsLabel}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={formData.gps_lng}
                onChangeText={(text) => setFormData({...formData, gps_lng: text})}
                keyboardType="decimal-pad"
                placeholder="-5.282031"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            <Text style={styles.gpsButtonText}>
              {gettingLocation ? '⏳ Obtention...' : '📍 Capturer ma position'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📷 Photos de la parcelle *</Text>
          <Text style={styles.photoHint}>Prenez au moins 1 photo (max 5)</Text>
          
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.photoRemoveText}>×</Text>
                </TouchableOpacity>
                {photo.location && (
                  <View style={styles.photoGps}>
                    <Text style={styles.photoGpsText}>📍</Text>
                  </View>
                )}
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.photoAdd} onPress={takePhoto}>
                <Text style={styles.photoAddIcon}>📷</Text>
                <Text style={styles.photoAddText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Observations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Observations</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.observations}
            onChangeText={(text) => setFormData({...formData, observations: text})}
            placeholder="Notes et observations..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Decision */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚖️ Décision d'audit *</Text>
          <View style={styles.decisionGrid}>
            <TouchableOpacity
              style={[
                styles.decisionButton,
                formData.recommendation === 'approved' && styles.decisionApproved
              ]}
              onPress={() => setFormData({...formData, recommendation: 'approved', rejection_reason: ''})}
            >
              <Text style={styles.decisionIcon}>✅</Text>
              <Text style={[
                styles.decisionText,
                formData.recommendation === 'approved' && styles.decisionTextActive
              ]}>Approuvé</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.decisionButton,
                formData.recommendation === 'needs_review' && styles.decisionReview
              ]}
              onPress={() => setFormData({...formData, recommendation: 'needs_review'})}
            >
              <Text style={styles.decisionIcon}>⚠️</Text>
              <Text style={[
                styles.decisionText,
                formData.recommendation === 'needs_review' && styles.decisionTextActive
              ]}>À revoir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.decisionButton,
                formData.recommendation === 'rejected' && styles.decisionRejected
              ]}
              onPress={() => setFormData({...formData, recommendation: 'rejected'})}
            >
              <Text style={styles.decisionIcon}>❌</Text>
              <Text style={[
                styles.decisionText,
                formData.recommendation === 'rejected' && styles.decisionTextActive
              ]}>Rejeté</Text>
            </TouchableOpacity>
          </View>

          {formData.recommendation === 'rejected' && (
            <View style={styles.rejectionContainer}>
              <Text style={styles.inputLabel}>Raison du rejet *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.rejection_reason}
                onChangeText={(text) => setFormData({...formData, rejection_reason: text})}
                placeholder="Expliquez pourquoi la parcelle est rejetée..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>💾 Soumettre l'audit</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#059669',
    padding: SPACING.md,
    paddingTop: 50,
  },
  backButton: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 10,
  },
  infoItemHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoValueHighlight: {
    color: '#10B981',
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  optionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  optionTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  practiceItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  practiceIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  practiceLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  practiceLabelActive: {
    color: '#10B981',
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: '#10B981',
    alignItems: 'flex-end',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  gpsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gpsInput: {
    flex: 1,
  },
  gpsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  gpsButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  gpsButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  photoHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: SPACING.sm,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoGps: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoGpsText: {
    fontSize: 10,
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  photoAddText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  decisionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  decisionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  decisionApproved: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  decisionReview: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  decisionRejected: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  decisionIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  decisionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  decisionTextActive: {
    color: '#fff',
  },
  rejectionContainer: {
    marginTop: SPACING.md,
  },
  submitButton: {
    backgroundColor: '#059669',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AuditFormScreen;
