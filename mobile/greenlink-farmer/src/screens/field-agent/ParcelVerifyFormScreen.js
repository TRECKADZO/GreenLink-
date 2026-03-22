import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

let Location = null;
try { Location = require('expo-location'); } catch (e) {}

let ImagePicker = null;
try { ImagePicker = require('expo-image-picker'); } catch (e) {}

const STATUSES = [
  { id: 'verified', label: 'Conforme', icon: 'checkmark-circle', color: '#059669', bg: '#ecfdf5' },
  { id: 'needs_correction', label: 'A corriger', icon: 'alert-circle', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'rejected', label: 'Non conforme', icon: 'close-circle', color: '#ef4444', bg: '#fee2e2' },
];

const ECOLOGICAL_PRACTICES = [
  { id: 'compostage', label: 'Compostage', icon: 'leaf' },
  { id: 'absence_pesticides', label: 'Absence de pesticides chimiques', icon: 'shield-checkmark' },
  { id: 'gestion_dechets', label: 'Gestion des dechets', icon: 'trash' },
  { id: 'protection_cours_eau', label: 'Protection des cours d\'eau', icon: 'water' },
  { id: 'agroforesterie', label: 'Agroforesterie', icon: 'flower' },
];

const ParcelVerifyFormScreen = ({ navigation, route }) => {
  const { parcel, onVerified } = route?.params || {};
  const { token } = useAuth();

  const [status, setStatus] = useState('verified');
  const [notes, setNotes] = useState('');
  const [correctedArea, setCorrectedArea] = useState('');
  const [photos, setPhotos] = useState([]);
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Carbon premium fields
  const [treeCount, setTreeCount] = useState('');
  const [shadeOverride, setShadeOverride] = useState('');
  const [selectedPractices, setSelectedPractices] = useState([]);

  // Auto-calculate shade cover from tree count and parcel area
  const CANOPY_M2_PER_TREE = 80; // average shade tree canopy ~80m²
  const parcelArea = correctedArea ? parseFloat(correctedArea) : (parcel?.superficie || 0);
  const autoShadeCover = (treeCount && parcelArea > 0)
    ? Math.min(((parseInt(treeCount) * CANOPY_M2_PER_TREE) / (parcelArea * 10000)) * 100, 100)
    : 0;
  const effectiveShadeCover = shadeOverride !== '' ? parseFloat(shadeOverride) : autoShadeCover;

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    if (!Location) { setGpsLoading(false); return; }
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (e) {
      console.warn('GPS error:', e);
    } finally {
      setGpsLoading(false);
    }
  };

  const takePhoto = async () => {
    if (!ImagePicker) { Alert.alert('Erreur', 'Camera non disponible'); return; }
    try {
      const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez la camera pour prendre des photos');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const togglePractice = (practiceId) => {
    setSelectedPractices(prev =>
      prev.includes(practiceId)
        ? prev.filter(id => id !== practiceId)
        : [...prev, practiceId]
    );
  };

  const handleSubmit = async () => {
    if (!notes.trim() && status !== 'verified') {
      Alert.alert('Notes requises', 'Ajoutez des notes pour expliquer votre decision');
      return;
    }

    Alert.alert(
      'Confirmer la verification',
      `Statut: ${STATUSES.find(s => s.id === status)?.label}\n${notes ? `Notes: ${notes}` : ''}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: submitVerification },
      ]
    );
  };

  const submitVerification = async () => {
    setSubmitting(true);
    try {
      const body = {
        verification_status: status,
        verification_notes: notes.trim(),
        verification_photos: photos,
        nombre_arbres: treeCount ? parseInt(treeCount) : null,
        couverture_ombragee: effectiveShadeCover > 0 ? Math.round(effectiveShadeCover * 10) / 10 : null,
        pratiques_ecologiques: selectedPractices,
      };
      if (gps) {
        body.gps_lat = gps.lat;
        body.gps_lng = gps.lng;
      }
      if (correctedArea && parseFloat(correctedArea) > 0) {
        body.corrected_area_hectares = parseFloat(correctedArea);
      }

      const res = await fetch(`${API_URL}/api/field-agent/parcels/${parcel.id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        Alert.alert('Verification enregistree', data.message, [
          { text: 'OK', onPress: () => {
            if (onVerified) onVerified();
            navigation.goBack();
          }}
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Erreur', err.detail || 'Impossible de sauvegarder');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Erreur reseau');
    } finally {
      setSubmitting(false);
    }
  };

  if (!parcel) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20 }}>Parcelle non trouvee</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Verification terrain</Text>
          <Text style={styles.headerSub}>{parcel.nom_producteur}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Parcel Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Informations parcelle</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={16} color="#64748b" />
              <Text style={styles.infoLabel}>Agriculteur</Text>
              <Text style={styles.infoValue}>{parcel.nom_producteur}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color="#64748b" />
              <Text style={styles.infoLabel}>Village</Text>
              <Text style={styles.infoValue}>{parcel.village || parcel.location || '-'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="resize-outline" size={16} color="#64748b" />
              <Text style={styles.infoLabel}>Surface declaree</Text>
              <Text style={styles.infoValue}>{parcel.superficie} ha</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="leaf-outline" size={16} color="#64748b" />
              <Text style={styles.infoLabel}>Culture</Text>
              <Text style={styles.infoValue}>{parcel.type_culture || 'cacao'}</Text>
            </View>
          </View>
          {parcel.coordonnees_gps && (
            <View style={styles.gpsExisting}>
              <Ionicons name="navigate" size={14} color="#6366f1" />
              <Text style={styles.gpsExistingText}>
                GPS declare: {parcel.coordonnees_gps.lat?.toFixed(5)}, {parcel.coordonnees_gps.lng?.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* GPS Verification */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsHeader}>
            <Ionicons name="navigate-circle" size={20} color={gps ? '#059669' : '#f59e0b'} />
            <Text style={styles.gpsTitle}>Position GPS actuelle</Text>
            <TouchableOpacity onPress={getLocation}>
              <Ionicons name="refresh" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : gps ? (
            <Text style={styles.gpsCoords}>
              {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
            </Text>
          ) : (
            <Text style={styles.gpsError}>GPS non disponible</Text>
          )}
        </View>

        {/* Verification Status */}
        <Text style={styles.sectionTitle}>Decision de verification</Text>
        <View style={styles.statusGrid}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.statusBtn, status === s.id && { borderColor: s.color, backgroundColor: s.bg }]}
              onPress={() => setStatus(s.id)}
            >
              <Ionicons name={s.icon} size={24} color={status === s.id ? s.color : '#94a3b8'} />
              <Text style={[styles.statusText, status === s.id && { color: s.color, fontWeight: '700' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Corrected Area (if not verified) */}
        {status !== 'verified' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Surface corrigee (hectares)</Text>
            <TextInput
              style={styles.input}
              value={correctedArea}
              onChangeText={setCorrectedArea}
              placeholder={`Declaree: ${parcel.superficie} ha`}
              keyboardType="decimal-pad"
              placeholderTextColor="#94a3b8"
            />
          </View>
        )}

        {/* Carbon Premium Section */}
        <View style={styles.carbonSection}>
          <View style={styles.carbonSectionHeader}>
            <Ionicons name="leaf" size={18} color="#059669" />
            <Text style={styles.carbonSectionTitle}>Indicateurs prime carbone</Text>
          </View>

          {/* Tree Count */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Decomptage des arbres</Text>
            <TextInput
              style={styles.input}
              value={treeCount}
              onChangeText={(val) => {
                setTreeCount(val);
                setShadeOverride('');
              }}
              placeholder="Nombre d'arbres observes sur la parcelle"
              keyboardType="number-pad"
              placeholderTextColor="#94a3b8"
              testID="tree-count-input"
            />
            {treeCount !== '' && parcelArea > 0 && (
              <Text style={styles.densityHint}>
                Densite: {Math.round(parseInt(treeCount || 0) / parcelArea)} arbres/ha
              </Text>
            )}
          </View>

          {/* Shade Cover - Auto-calculated */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Couverture ombragee</Text>
            {treeCount !== '' && parcelArea > 0 ? (
              <View>
                <View style={styles.shadeAutoCard}>
                  <View style={styles.shadeAutoRow}>
                    <Ionicons name="calculator" size={16} color="#059669" />
                    <Text style={styles.shadeAutoLabel}>Calcul automatique</Text>
                  </View>
                  <Text style={styles.shadeAutoValue}>
                    {autoShadeCover.toFixed(1)}%
                  </Text>
                  <Text style={styles.shadeAutoFormula}>
                    {treeCount} arbres x 80m² canopee / {parcelArea} ha
                  </Text>
                  <View style={styles.shadeIndicator}>
                    <View style={[styles.shadeBar, { width: `${Math.min(autoShadeCover, 100)}%` }]} />
                  </View>
                </View>
                <View style={styles.shadeOverrideRow}>
                  <Text style={styles.shadeOverrideLabel}>Ajuster manuellement :</Text>
                  <TextInput
                    style={styles.shadeOverrideInput}
                    value={shadeOverride}
                    onChangeText={(val) => {
                      const num = parseFloat(val);
                      if (val === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
                        setShadeOverride(val);
                      }
                    }}
                    placeholder={`${autoShadeCover.toFixed(1)}%`}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#94a3b8"
                    testID="shade-override-input"
                  />
                </View>
                {shadeOverride !== '' && (
                  <Text style={styles.shadeOverrideNote}>
                    Valeur ajustee: {parseFloat(shadeOverride).toFixed(1)}% (auto: {autoShadeCover.toFixed(1)}%)
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.shadeEmptyCard}>
                <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
                <Text style={styles.shadeEmptyText}>
                  Saisissez le nombre d'arbres pour calculer automatiquement la couverture ombragee
                </Text>
              </View>
            )}
          </View>

          {/* Ecological Practices Checklist */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pratiques ecologiques observees</Text>
            <View style={styles.practicesList}>
              {ECOLOGICAL_PRACTICES.map(practice => {
                const isSelected = selectedPractices.includes(practice.id);
                return (
                  <TouchableOpacity
                    key={practice.id}
                    style={[styles.practiceItem, isSelected && styles.practiceItemActive]}
                    onPress={() => togglePractice(practice.id)}
                    testID={`practice-${practice.id}`}
                  >
                    <View style={[styles.practiceCheckbox, isSelected && styles.practiceCheckboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Ionicons name={practice.icon} size={16} color={isSelected ? '#059669' : '#94a3b8'} />
                    <Text style={[styles.practiceLabel, isSelected && styles.practiceLabelActive]}>
                      {practice.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedPractices.length > 0 && (
              <Text style={styles.practiceCount}>
                {selectedPractices.length} pratique{selectedPractices.length > 1 ? 's' : ''} selectionnee{selectedPractices.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Notes de verification {status !== 'verified' ? '(obligatoire)' : '(optionnel)'}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observations du terrain, etat de la parcelle, problemes constates..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Photos */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Photos de verification</Text>
          <View style={styles.photosRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImg} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color="#059669" />
                <Text style={styles.addPhotoText}>Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.submitText}>Valider la verification</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  content: { flex: 1, padding: 16 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  infoItem: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 11, color: '#94a3b8' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  gpsExisting: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  gpsExistingText: { fontSize: 12, color: '#6366f1' },
  gpsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  gpsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  gpsTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#475569' },
  gpsCoords: { fontSize: 13, color: '#059669', fontWeight: '600', marginLeft: 28 },
  gpsError: { fontSize: 12, color: '#f59e0b', marginLeft: 28 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10, marginTop: 4 },
  statusGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusBtn: { flex: 1, alignItems: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  statusText: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top' },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: -4, right: -4 },
  addPhotoBtn: { width: 72, height: 72, borderRadius: 10, borderWidth: 2, borderColor: '#d1fae5', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addPhotoText: { fontSize: 10, color: '#059669', fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Carbon premium styles
  carbonSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#d1fae5' },
  carbonSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  carbonSectionTitle: { fontSize: 14, fontWeight: '700', color: '#059669' },
  shadeIndicator: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  shadeBar: { height: '100%', backgroundColor: '#059669', borderRadius: 3 },
  densityHint: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 4 },
  shadeAutoCard: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#d1fae5' },
  shadeAutoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  shadeAutoLabel: { fontSize: 11, color: '#059669', fontWeight: '600' },
  shadeAutoValue: { fontSize: 28, fontWeight: '800', color: '#059669', marginBottom: 2 },
  shadeAutoFormula: { fontSize: 10, color: '#64748b', marginBottom: 8 },
  shadeOverrideRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  shadeOverrideLabel: { fontSize: 11, color: '#64748b' },
  shadeOverrideInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, fontSize: 14, color: '#1e293b', backgroundColor: '#fff', textAlign: 'center' },
  shadeOverrideNote: { fontSize: 10, color: '#f59e0b', fontWeight: '500', marginTop: 4 },
  shadeEmptyCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  shadeEmptyText: { flex: 1, fontSize: 12, color: '#94a3b8' },
  practicesList: { gap: 8 },
  practiceItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  practiceItemActive: { borderColor: '#059669', backgroundColor: '#ecfdf5' },
  practiceCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  practiceCheckboxActive: { backgroundColor: '#059669', borderColor: '#059669' },
  practiceLabel: { flex: 1, fontSize: 13, color: '#64748b' },
  practiceLabelActive: { color: '#1e293b', fontWeight: '600' },
  practiceCount: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 6 },
});

export default ParcelVerifyFormScreen;
