import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../config';
import { api } from '../../services/api';

const EMPTY_CHILD = { prenom: '', sexe: 'Garcon', age: 0, scolarise: false, travaille_exploitation: false };

const FarmerICIFormScreen = ({ navigation, route }) => {
  const { farmerId: initialFarmerId, farmerName: initialFarmerName } = route.params || {};
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Farmer selection state (when no farmerId provided)
  const [farmerId, setFarmerId] = useState(initialFarmerId || null);
  const [farmerName, setFarmerName] = useState(initialFarmerName || '');
  const [myFarmers, setMyFarmers] = useState([]);
  const [showFarmerList, setShowFarmerList] = useState(!initialFarmerId);

  const [form, setForm] = useState({
    taille_menage: '',
    genre: '',
    niveau_education: '',
    peut_lire_ecrire: true,
    utilise_pesticides: false,
    formation_securite_recue: false,
    membre_groupe_epargne: false,
    household_children: {
      total_enfants: 0,
      enfants_5_11_ans: 0,
      enfants_12_14_ans: 0,
      enfants_15_17_ans: 0,
      enfants_scolarises: 0,
      enfants_travaillant_exploitation: 0,
      taches_effectuees: [],
      liste_enfants: [],
    },
    labor_force: {
      travailleurs_permanents: 0,
      travailleurs_saisonniers: 0,
      travailleurs_avec_contrat: 0,
      salaire_journalier_moyen_xof: 0,
      utilise_main_oeuvre_familiale: true,
    },
  });

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => setIsOnline(state.isConnected));
    if (farmerId) {
      loadProfile();
    } else {
      loadMyFarmers();
    }
    return () => unsub();
  }, [farmerId]);

  const loadMyFarmers = async () => {
    try {
      // Try online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && token) {
        const resp = await api.get('/field-agent/my-farmers');
        setMyFarmers(resp.data.farmers || []);
      } else {
        // Load from cache
        const cached = await AsyncStorage.getItem('assignedFarmers');
        if (cached) {
          const data = JSON.parse(cached);
          setMyFarmers(data.farmers || []);
        }
      }
    } catch (e) {
      console.error('Error loading farmers:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectFarmer = (farmer) => {
    setFarmerId(farmer.id);
    setFarmerName(farmer.full_name);
    setShowFarmerList(false);
    setLoading(true);
  };

  const loadProfile = async () => {
    try {
      // Try online first
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && token) {
        const resp = await api.get(`/ici-data/farmers/${farmerId}/ici-profile`);
        const data = resp.data;
        if (data && !data.message) {
            setForm(prev => ({
              ...prev,
              taille_menage: data.taille_menage || prev.taille_menage,
              genre: data.genre || '',
              niveau_education: data.niveau_education || '',
              peut_lire_ecrire: data.peut_lire_ecrire ?? true,
              utilise_pesticides: data.utilise_pesticides ?? false,
              formation_securite_recue: data.formation_securite_recue ?? false,
              membre_groupe_epargne: data.membre_groupe_epargne ?? false,
              household_children: { ...prev.household_children, ...(data.household_children || {}) },
              labor_force: { ...prev.labor_force, ...(data.labor_force || {}) },
            }));
            // Cache for offline
            await AsyncStorage.setItem(`ici_profile_${farmerId}`, JSON.stringify(data));
        }
      } else {
        // Load from cache
        const cached = await AsyncStorage.getItem(`ici_profile_${farmerId}`);
        if (cached) {
          const data = JSON.parse(cached);
          setForm(prev => ({
            ...prev,
            taille_menage: data.taille_menage || prev.taille_menage,
            genre: data.genre || '',
            niveau_education: data.niveau_education || '',
            peut_lire_ecrire: data.peut_lire_ecrire ?? true,
            utilise_pesticides: data.utilise_pesticides ?? false,
            formation_securite_recue: data.formation_securite_recue ?? false,
            membre_groupe_epargne: data.membre_groupe_epargne ?? false,
            household_children: { ...prev.household_children, ...(data.household_children || {}) },
            labor_force: { ...prev.labor_force, ...(data.labor_force || {}) },
          }));
        }
      }
    } catch (e) {
      console.error('Error loading ICI profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const addChild = () => {
    const children = [...form.household_children.liste_enfants, { ...EMPTY_CHILD }];
    recalcTotals(children);
  };

  const removeChild = (idx) => {
    const children = form.household_children.liste_enfants.filter((_, i) => i !== idx);
    recalcTotals(children);
  };

  const updateChild = (idx, field, value) => {
    const children = [...form.household_children.liste_enfants];
    children[idx] = { ...children[idx], [field]: value };
    recalcTotals(children);
  };

  const recalcTotals = (children) => {
    setForm(prev => ({
      ...prev,
      household_children: {
        ...prev.household_children,
        liste_enfants: children,
        total_enfants: children.length,
        enfants_scolarises: children.filter(c => c.scolarise).length,
        enfants_travaillant_exploitation: children.filter(c => c.travaille_exploitation).length,
        enfants_5_11_ans: children.filter(c => c.age >= 5 && c.age <= 11).length,
        enfants_12_14_ans: children.filter(c => c.age >= 12 && c.age <= 14).length,
        enfants_15_17_ans: children.filter(c => c.age >= 15 && c.age <= 17).length,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Clean form data before sending - ensure taille_menage is a valid int
      const cleanForm = {
        ...form,
        taille_menage: parseInt(form.taille_menage) || 1,
      };
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && token) {
        const resp = await api.post(`/ici-data/farmers/${farmerId}/ici-profile`, cleanForm);
        const data = resp.data;
        await AsyncStorage.setItem(`ici_profile_${farmerId}`, JSON.stringify(cleanForm));
        Alert.alert('Succes', `Fiche ICI sauvegardee. Risque: ${data.niveau_risque || 'N/A'}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Save offline
        await AsyncStorage.setItem(`ici_profile_${farmerId}`, JSON.stringify(cleanForm));
        const pending = JSON.parse(await AsyncStorage.getItem('pendingActions') || '[]');
        pending.push({ type: 'ici_profile', farmerId, data: cleanForm, timestamp: new Date().toISOString() });
        await AsyncStorage.setItem('pendingActions', JSON.stringify(pending));
        Alert.alert('Sauvegarde hors ligne', 'La fiche sera synchronisee quand vous serez connecte.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      console.error('Error saving ICI:', e);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !showFarmerList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Chargement de la fiche...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show farmer selection list when no farmerId
  if (showFarmerList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Visite ICI</Text>
            <Text style={styles.headerSubtitle}>Selectionnez un producteur</Text>
          </View>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {myFarmers.length > 0 ? myFarmers.map(f => (
              <TouchableOpacity key={f.id} style={styles.farmerCard} onPress={() => selectFarmer(f)}>
                <View style={styles.farmerAvatar}>
                  <Ionicons name="person" size={24} color="#06b6d4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.farmerCardName}>{f.full_name}</Text>
                  <Text style={styles.farmerCardInfo}>{f.village} {f.phone_number ? `| ${f.phone_number}` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Aucun fermier assigne</Text>
                <Text style={styles.emptySubtitle}>Contactez votre cooperative pour l'attribution des fermiers.</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Fiche ICI</Text>
          <Text style={styles.headerSubtitle}>{farmerName || 'Producteur'}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#fcd34d" />
          <Text style={styles.offlineText}>Mode hors ligne</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Producteur Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations du Producteur</Text>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Genre</Text>
              <View style={styles.sexeButtonRow}>
                <TouchableOpacity
                  style={[styles.genreButton, form.genre === 'homme' && styles.genreButtonActive]}
                  onPress={() => setForm(p => ({ ...p, genre: 'homme' }))}>
                  <Ionicons name="male" size={16} color={form.genre === 'homme' ? '#fff' : '#64748b'} />
                  <Text style={[styles.genreButtonText, form.genre === 'homme' && styles.genreButtonTextActive]}>Homme</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genreButton, form.genre === 'femme' && styles.genreButtonActive]}
                  onPress={() => setForm(p => ({ ...p, genre: 'femme' }))}>
                  <Ionicons name="female" size={16} color={form.genre === 'femme' ? '#fff' : '#64748b'} />
                  <Text style={[styles.genreButtonText, form.genre === 'femme' && styles.genreButtonTextActive]}>Femme</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Education</Text>
              <View style={styles.educationRow}>
                {[{v:'aucun',l:'Aucun'},{v:'primaire',l:'Primaire'},{v:'secondaire',l:'Second.'},{v:'superieur',l:'Superieur'}].map(opt => (
                  <TouchableOpacity key={opt.v}
                    style={[styles.eduButton, form.niveau_education === opt.v && styles.eduButtonActive]}
                    onPress={() => setForm(p => ({ ...p, niveau_education: opt.v }))}>
                    <Text style={[styles.eduButtonText, form.niveau_education === opt.v && styles.eduButtonTextActive]}>{opt.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Taille du menage</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={form.taille_menage === '' || form.taille_menage === 0 ? '' : String(form.taille_menage)}
                  onChangeText={v => setForm(p => ({ ...p, taille_menage: v === '' ? '' : parseInt(v) || '' }))} />
              </View>
              <View style={[styles.halfField, styles.switchRow]}>
                <Text style={styles.label}>Sait lire/ecrire</Text>
                <Switch value={form.peut_lire_ecrire} onValueChange={v => setForm(p => ({ ...p, peut_lire_ecrire: v }))}
                  trackColor={{ false: '#ccc', true: '#06b6d4' }} />
              </View>
            </View>
          </View>

          {/* Enfants */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Enfants du menage ({form.household_children.liste_enfants.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={addChild}>
                <Ionicons name="add-circle" size={20} color="#06b6d4" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {form.household_children.liste_enfants.length === 0 ? (
              <Text style={styles.emptyText}>Aucun enfant. Appuyez "Ajouter".</Text>
            ) : (
              form.household_children.liste_enfants.map((child, idx) => (
                <View key={idx} style={styles.childCard}>
                  <View style={styles.childHeader}>
                    <Text style={styles.childLabel}>Enfant {idx + 1}</Text>
                    <TouchableOpacity onPress={() => removeChild(idx)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <View style={{ flex: 2, marginRight: 8 }}>
                      <Text style={styles.label}>Prenom</Text>
                      <TextInput style={styles.input} value={child.prenom} placeholder="Prenom"
                        onChangeText={v => updateChild(idx, 'prenom', v)} />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.label}>Sexe</Text>
                      <View style={styles.sexeButtonRow}>
                        <TouchableOpacity
                          style={[styles.sexeButton, child.sexe === 'Garcon' && styles.sexeButtonActive]}
                          onPress={() => updateChild(idx, 'sexe', 'Garcon')}>
                          <Text style={[styles.sexeButtonText, child.sexe === 'Garcon' && styles.sexeButtonTextActive]}>Garcon</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.sexeButton, child.sexe === 'Fille' && styles.sexeButtonActive]}
                          onPress={() => updateChild(idx, 'sexe', 'Fille')}>
                          <Text style={[styles.sexeButtonText, child.sexe === 'Fille' && styles.sexeButtonTextActive]}>Fille</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flex: 0.7 }}>
                      <Text style={styles.label}>Age</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={String(child.age)}
                        onChangeText={v => updateChild(idx, 'age', parseInt(v) || 0)} />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.switchRow, { flex: 1 }]}>
                      <Ionicons name="school" size={16} color={child.scolarise ? '#10b981' : '#ccc'} />
                      <Text style={[styles.switchLabel, child.scolarise && { color: '#10b981' }]}>Scolarise</Text>
                      <Switch value={child.scolarise} onValueChange={v => updateChild(idx, 'scolarise', v)}
                        trackColor={{ false: '#ccc', true: '#10b981' }} />
                    </View>
                    <View style={[styles.switchRow, { flex: 1 }]}>
                      <Ionicons name="warning" size={16} color={child.travaille_exploitation ? '#ef4444' : '#ccc'} />
                      <Text style={[styles.switchLabel, child.travaille_exploitation && { color: '#ef4444' }]}>Travaille</Text>
                      <Switch value={child.travaille_exploitation} onValueChange={v => updateChild(idx, 'travaille_exploitation', v)}
                        trackColor={{ false: '#ccc', true: '#ef4444' }} />
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Summary */}
            {form.household_children.liste_enfants.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
                  <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{form.household_children.enfants_scolarises}</Text>
                  <Text style={styles.summaryLabel}>Scolarises</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.summaryValue, { color: '#d97706' }]}>{form.household_children.enfants_travaillant_exploitation}</Text>
                  <Text style={styles.summaryLabel}>Travaillant</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#ecfdf5' }]}>
                  <Text style={[styles.summaryValue, { color: '#059669' }]}>{form.household_children.total_enfants}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
              </View>
            )}
          </View>

          {/* Pratiques */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pratiques & Securite</Text>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Utilise pesticides</Text>
              <Switch value={form.utilise_pesticides} onValueChange={v => setForm(p => ({ ...p, utilise_pesticides: v }))}
                trackColor={{ false: '#ccc', true: '#f59e0b' }} />
            </View>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Formation securite recue</Text>
              <Switch value={form.formation_securite_recue} onValueChange={v => setForm(p => ({ ...p, formation_securite_recue: v }))}
                trackColor={{ false: '#ccc', true: '#10b981' }} />
            </View>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Membre groupe d'epargne</Text>
              <Switch value={form.membre_groupe_epargne} onValueChange={v => setForm(p => ({ ...p, membre_groupe_epargne: v }))}
                trackColor={{ false: '#ccc', true: '#06b6d4' }} />
            </View>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Main-d'oeuvre familiale</Text>
              <Switch value={form.labor_force.utilise_main_oeuvre_familiale}
                onValueChange={v => setForm(p => ({ ...p, labor_force: { ...p.labor_force, utilise_main_oeuvre_familiale: v } }))}
                trackColor={{ false: '#ccc', true: '#06b6d4' }} />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Sauvegarder la fiche</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06b6d4', paddingHorizontal: 16, paddingVertical: 14 },
  backButton: { marginRight: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#92400e', paddingVertical: 6 },
  offlineText: { color: '#fcd34d', fontSize: 12, marginLeft: 6 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 8 },
  halfField: { flex: 1, marginRight: 8 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#f8fafc' },
  pickerContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc', overflow: 'hidden' },
  picker: { height: 44, marginTop: -4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  switchLabel: { fontSize: 13, color: '#475569' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { color: '#06b6d4', fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, paddingVertical: 16 },
  sexeButtonRow: { flexDirection: 'row', gap: 4 },
  sexeButton: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  sexeButtonActive: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  sexeButtonText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  sexeButtonTextActive: { color: '#fff' },
  genreButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  genreButtonActive: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  genreButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  genreButtonTextActive: { color: '#fff' },
  educationRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  eduButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  eduButtonActive: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  eduButtonText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  eduButtonTextActive: { color: '#fff' },
  childCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#f8fafc' },
  childHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  childLabel: { fontSize: 13, fontWeight: '600', color: '#06b6d4' },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  summaryCard: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' },
  saveButton: { backgroundColor: '#06b6d4', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  farmerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12 },
  farmerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  farmerCardName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  farmerCardInfo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
});

export default FarmerICIFormScreen;
