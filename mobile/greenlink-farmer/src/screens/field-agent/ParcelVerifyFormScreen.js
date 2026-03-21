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
});

export default ParcelVerifyFormScreen;
