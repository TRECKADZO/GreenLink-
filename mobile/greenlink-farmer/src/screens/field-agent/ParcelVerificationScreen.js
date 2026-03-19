import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

let Location = null;
try { Location = require('expo-location'); } catch (e) {}

const CROP_TYPES = [
  { id: 'cacao', label: 'Cacao', icon: 'leaf' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe' },
  { id: 'palmier', label: 'Palmier a huile', icon: 'flower' },
  { id: 'hevea', label: 'Hevea', icon: 'water' },
  { id: 'maraichage', label: 'Maraichage', icon: 'nutrition' },
  { id: 'autre', label: 'Autre', icon: 'apps' },
];

const ParcelVerificationScreen = ({ navigation, route }) => {
  const { farmerId, farmerName, farmerData } = route?.params || {};
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [parcels, setParcels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);

  // New parcel form
  const [village, setVillage] = useState('');
  const [area, setArea] = useState('');
  const [cropType, setCropType] = useState('cacao');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadParcels();
    getLocation();
  }, []);

  const getLocation = async () => {
    if (!Location) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {}
  };

  const loadParcels = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/field-agent/farmer-parcels/${farmerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setParcels(data.parcels || data || []);
      }
    } catch (e) {
      console.warn('Load parcels error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!village.trim()) {
      Alert.alert('Erreur', 'Indiquez le village/lieu de la parcelle');
      return;
    }
    if (!area || parseFloat(area) <= 0) {
      Alert.alert('Erreur', 'Indiquez la superficie en hectares');
      return;
    }

    setSubmitting(true);
    try {
      const parcelData = {
        village: village.trim(),
        area_hectares: parseFloat(area),
        crop_type: cropType,
        notes: notes.trim(),
        gps_coordinates: location || null,
      };

      const res = await fetch(`${API_URL}/api/field-agent/farmer-parcels/${farmerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(parcelData),
      });

      if (res.ok) {
        Alert.alert('Parcelle declaree', 'La parcelle a ete enregistree avec succes.', [
          { text: 'OK', onPress: () => { setShowForm(false); resetForm(); loadParcels(); } }
        ]);
      } else {
        const d = await res.json().catch(() => ({}));
        Alert.alert('Erreur', d.detail || 'Impossible de sauvegarder la parcelle');
      }
    } catch {
      Alert.alert('Erreur', 'Erreur reseau');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setVillage('');
    setArea('');
    setCropType('cacao');
    setNotes('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Declaration parcelles</Text>
          <Text style={styles.headerSubtitle}>{farmerName || 'Agriculteur'}</Text>
        </View>
        {!showForm && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* GPS Info */}
        <View style={styles.gpsCard}>
          <Ionicons name="location" size={16} color={location ? '#059669' : '#94a3b8'} />
          <Text style={[styles.gpsText, { color: location ? '#059669' : '#94a3b8' }]}>
            {location ? `GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Localisation en cours...'}
          </Text>
        </View>

        {/* New Parcel Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nouvelle parcelle</Text>

            <Text style={styles.label}>Village / Lieu</Text>
            <TextInput
              style={styles.input}
              value={village}
              onChangeText={setVillage}
              placeholder="Ex: Bouafle, Zone Nord"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Superficie (hectares)</Text>
            <TextInput
              style={styles.input}
              value={area}
              onChangeText={setArea}
              placeholder="Ex: 2.5"
              keyboardType="decimal-pad"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Type de culture</Text>
            <View style={styles.cropGrid}>
              {CROP_TYPES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.cropBtn, cropType === c.id && styles.cropBtnActive]}
                  onPress={() => setCropType(c.id)}
                >
                  <Ionicons name={c.icon} size={18} color={cropType === c.id ? '#059669' : '#94a3b8'} />
                  <Text style={[styles.cropText, cropType === c.id && styles.cropTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observations..."
              placeholderTextColor="#94a3b8"
              multiline
            />

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); resetForm(); }}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Existing Parcels */}
        <Text style={styles.sectionTitle}>
          Parcelles enregistrees ({parcels.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 30 }} />
        ) : parcels.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucune parcelle declaree</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => setShowForm(true)}>
              <Text style={styles.emptyCtaText}>Declarer une parcelle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          parcels.map((p, i) => (
            <View key={p._id || p.id || i} style={styles.parcelCard}>
              <View style={styles.parcelHeader}>
                <Ionicons name="leaf" size={18} color="#059669" />
                <Text style={styles.parcelVillage}>{p.village || p.location || `Parcelle ${i + 1}`}</Text>
                <View style={styles.areaBadge}>
                  <Text style={styles.areaText}>{p.area_hectares || p.area || '?'} ha</Text>
                </View>
              </View>
              <View style={styles.parcelDetails}>
                <Text style={styles.parcelInfo}>Culture: {p.crop_type || 'cacao'}</Text>
                {p.gps_coordinates && (
                  <Text style={styles.parcelGps}>
                    GPS: {p.gps_coordinates.lat?.toFixed(4)}, {p.gps_coordinates.lng?.toFixed(4)}
                  </Text>
                )}
                {p.carbon_score > 0 && (
                  <View style={styles.carbonBadge}>
                    <Ionicons name="leaf" size={12} color="#059669" />
                    <Text style={styles.carbonText}>Score carbone: {p.carbon_score}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  headerSubtitle: { fontSize: 12, color: '#64748b' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  gpsCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fff', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  gpsText: { fontSize: 12, fontWeight: '500' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#d1fae5' },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },
  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cropBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  cropBtnActive: { borderColor: '#059669', backgroundColor: '#ecfdf5' },
  cropText: { fontSize: 12, color: '#64748b' },
  cropTextActive: { color: '#059669', fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, backgroundColor: '#059669' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
  emptyCta: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#059669', borderRadius: 8 },
  emptyCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  parcelCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  parcelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  parcelVillage: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1e293b' },
  areaBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  areaText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  parcelDetails: { marginTop: 8, gap: 4 },
  parcelInfo: { fontSize: 12, color: '#64748b' },
  parcelGps: { fontSize: 11, color: '#94a3b8' },
  carbonBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  carbonText: { fontSize: 11, color: '#059669', fontWeight: '500' },
});

export default ParcelVerificationScreen;
