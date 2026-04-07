import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

let Location = null;
try { Location = require('expo-location'); } catch (e) {}

const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzope', 'Agboville',
  'Bangolo', 'Bouafle', 'Bouake', 'Daloa', 'Divo',
  'Gagnoa', 'Korhogo', 'Man', 'San-Pedro', 'Soubre',
  'Yamoussoukro', 'Autre'
];

const CROP_TYPES = [
  { id: 'cacao', label: 'Cacao', icon: 'nutrition-outline' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe-outline' },
  { id: 'anacarde', label: 'Anacarde', icon: 'leaf-outline' },
  { id: 'hevea', label: 'Hevea', icon: 'water-outline' },
  { id: 'palmier', label: 'Palmier a huile', icon: 'sunny-outline' },
];

const CERTIFICATIONS = [
  { id: '', label: 'Aucune' },
  { id: 'Rainforest Alliance', label: 'Rainforest Alliance' },
  { id: 'UTZ', label: 'UTZ Certified' },
  { id: 'Fairtrade', label: 'Fairtrade' },
  { id: 'Bio', label: 'Bio' },
];

const ParcelDeclareFormScreen = ({ navigation, route }) => {
  const { farmer, onDeclared } = route?.params || {};
  const { token } = useAuth();

  const [form, setForm] = useState({
    location: '', village: farmer?.village || '', department: '',
    area_hectares: '', crop_type: 'cacao', certification: '',
    arbres_grands: '', arbres_moyens: '', arbres_petits: '',
    couverture_ombragee: '', notes: '',
  });
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showCertPicker, setShowCertPicker] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalTrees = (parseInt(form.arbres_grands) || 0) + (parseInt(form.arbres_moyens) || 0) + (parseInt(form.arbres_petits) || 0);

  useEffect(() => { getLocation(); }, []);

  const getLocation = async () => {
    if (!Location) { setGpsLoading(false); return; }
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (e) { console.warn('GPS error:', e); }
    finally { setGpsLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.location.trim() || !form.village.trim() || !form.area_hectares) {
      Alert.alert('Champs requis', 'Remplissez le nom, village et superficie');
      return;
    }
    Alert.alert('Confirmer', `Declarer une parcelle pour ${farmer?.full_name}?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: submitForm },
    ]);
  };

  const submitForm = async () => {
    setSubmitting(true);
    try {
      const body = {
        location: form.location, village: form.village, department: form.department,
        area_hectares: parseFloat(form.area_hectares), crop_type: form.crop_type,
        certification: form.certification, notes: form.notes,
      };
      if (form.arbres_grands) body.arbres_grands = parseInt(form.arbres_grands);
      if (form.arbres_moyens) body.arbres_moyens = parseInt(form.arbres_moyens);
      if (form.arbres_petits) body.arbres_petits = parseInt(form.arbres_petits);
      if (form.couverture_ombragee) body.couverture_ombragee = parseFloat(form.couverture_ombragee);
      if (gps) { body.gps_lat = gps.lat; body.gps_lng = gps.lng; }

      const res = await api.post(`/field-agent/farmer-parcels/${farmer.id}`, body);
      Alert.alert('Parcelle declaree', `Score carbone: ${res.data.carbon_score || 0}/10`, [
        { text: 'OK', onPress: () => { if (onDeclared) onDeclared(); navigation.goBack(); } }
      ]);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de declarer la parcelle');
    } finally { setSubmitting(false); }
  };

  const PickerModal = ({ visible, onClose, data, onSelect, selected, title }) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
          </View>
          <FlatList data={data} keyExtractor={i => i.id || i}
            renderItem={({ item }) => {
              const id = item.id || item;
              const label = item.label || item;
              const isSelected = selected === id;
              return (
                <TouchableOpacity style={[styles.modalItem, isSelected && { backgroundColor: '#ecfdf5' }]}
                  onPress={() => { onSelect(id); onClose(); }}>
                  <Text style={[styles.modalItemText, isSelected && { color: '#059669', fontWeight: '700' }]}>{label}</Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#059669" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );

  if (!farmer) {
    return <SafeAreaView style={styles.container}><Text style={{ padding: 20 }}>Agriculteur non trouve</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Declarer une parcelle</Text>
          <Text style={styles.headerSub}>{farmer.full_name} - {farmer.village || 'N/A'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Nom parcelle & Village */}
        <Text style={styles.sectionTitle}>Localisation</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Nom parcelle *</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={v => setField('location', v)} placeholder="Parcelle Nord" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Village *</Text>
            <TextInput style={styles.input} value={form.village} onChangeText={v => setField('village', v)} placeholder="Kossou" />
          </View>
        </View>

        {/* Department */}
        <Text style={styles.label}>Departement</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDeptPicker(true)}>
          <Text style={form.department ? styles.pickerValue : styles.pickerPlaceholder}>{form.department || 'Choisir un departement'}</Text>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Area & Crop */}
        <Text style={styles.sectionTitle}>Caracteristiques</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Superficie (ha) *</Text>
            <TextInput style={styles.input} value={form.area_hectares} onChangeText={v => setField('area_hectares', v)} keyboardType="decimal-pad" placeholder="3.5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Culture</Text>
            <View style={styles.cropRow}>
              {CROP_TYPES.slice(0, 3).map(c => (
                <TouchableOpacity key={c.id} onPress={() => setField('crop_type', c.id)}
                  style={[styles.cropBtn, form.crop_type === c.id && styles.cropBtnActive]}>
                  <Ionicons name={c.icon} size={16} color={form.crop_type === c.id ? '#059669' : '#94a3b8'} />
                  <Text style={[styles.cropLabel, form.crop_type === c.id && { color: '#059669' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Certification */}
        <Text style={styles.label}>Certification</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCertPicker(true)}>
          <Text style={form.certification ? styles.pickerValue : styles.pickerPlaceholder}>
            {CERTIFICATIONS.find(c => c.id === form.certification)?.label || 'Aucune'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Tree Strata */}
        <Text style={styles.sectionTitle}>Arbres ombrages par strate</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.strateLabel}>Strate 3{'\n'}(&gt;30m)</Text>
            <TextInput style={[styles.input, { textAlign: 'center' }]} value={form.arbres_grands} onChangeText={v => setField('arbres_grands', v)} keyboardType="number-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.strateLabel}>Strate 2{'\n'}(5-30m)</Text>
            <TextInput style={[styles.input, { textAlign: 'center' }]} value={form.arbres_moyens} onChangeText={v => setField('arbres_moyens', v)} keyboardType="number-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.strateLabel}>Strate 1{'\n'}(3-5m)</Text>
            <TextInput style={[styles.input, { textAlign: 'center' }]} value={form.arbres_petits} onChangeText={v => setField('arbres_petits', v)} keyboardType="number-pad" placeholder="0" />
          </View>
        </View>
        {totalTrees > 0 && <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600', marginTop: 4 }}>Total: {totalTrees} arbres</Text>}

        {/* Couverture */}
        <Text style={styles.label}>Couverture ombragee (%)</Text>
        <TextInput style={[styles.input, { maxWidth: 150 }]} value={form.couverture_ombragee} onChangeText={v => setField('couverture_ombragee', v)} keyboardType="decimal-pad" placeholder="40" />

        {/* GPS */}
        <Text style={styles.sectionTitle}>Coordonnees GPS</Text>
        <View style={styles.gpsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="navigate-circle" size={20} color={gps ? '#059669' : '#f59e0b'} />
            {gpsLoading ? <ActivityIndicator size="small" color="#059669" />
              : gps ? <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</Text>
                : <Text style={{ fontSize: 13, color: '#94a3b8' }}>GPS non disponible</Text>}
            <TouchableOpacity onPress={getLocation} style={{ marginLeft: 'auto' }}>
              <Ionicons name="refresh" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <Text style={styles.label}>Notes / Observations</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.notes} onChangeText={v => setField('notes', v)} multiline placeholder="Observations sur la parcelle..." />

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          {submitting ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.submitText}>Enregistrer la parcelle</Text></>}
        </TouchableOpacity>
      </ScrollView>

      <PickerModal visible={showDeptPicker} onClose={() => setShowDeptPicker(false)} title="Departement"
        data={DEPARTMENTS} selected={form.department} onSelect={v => setField('department', v)} />
      <PickerModal visible={showCertPicker} onClose={() => setShowCertPicker(false)} title="Certification"
        data={CERTIFICATIONS} selected={form.certification} onSelect={v => setField('certification', v)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4, marginTop: 10 },
  strateLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  row: { flexDirection: 'row', gap: 10 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  pickerValue: { fontSize: 14, color: '#1e293b' },
  pickerPlaceholder: { fontSize: 14, color: '#94a3b8' },
  cropRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cropBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  cropBtnActive: { borderColor: '#059669', backgroundColor: '#ecfdf5' },
  cropLabel: { fontSize: 11, color: '#64748b' },
  gpsCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, marginTop: 24 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemText: { fontSize: 15, color: '#1e293b' },
});

export default ParcelDeclareFormScreen;
