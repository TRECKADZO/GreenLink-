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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';
import { farmerApi } from '../../services/api';

const OFFLINE_REDD_VISITS_KEY = 'offline_redd_visits';

const REDD_CATEGORIES = [
  {
    id: 'agroforesterie',
    title: 'Agroforesterie',
    color: '#059669',
    practices: [
      { code: 'AGF1', name: "Arbres d'ombrage (30-50%)" },
      { code: 'AGF2', name: 'Systeme multi-strates' },
      { code: 'AGF3', name: 'Enrichissement parcelles' },
      { code: 'AGF4', name: 'Transition vers ombrage' },
    ],
  },
  {
    id: 'zero_deforestation',
    title: 'Zero-Deforestation',
    color: '#2563eb',
    practices: [
      { code: 'ZD1', name: 'Intensification durable' },
      { code: 'ZD2', name: 'Engagement zero deforestation' },
      { code: 'ZD3', name: 'Restauration degradees' },
      { code: 'ZD4', name: 'Protection forets classees' },
    ],
  },
  {
    id: 'gestion_sols',
    title: 'Gestion Sols',
    color: '#d97706',
    practices: [
      { code: 'SOL1', name: 'Paillage et compostage' },
      { code: 'SOL2', name: 'Biochar' },
      { code: 'SOL3', name: 'Couverture vegetale' },
      { code: 'SOL4', name: 'Gestion integree ravageurs' },
      { code: 'SOL5', name: 'Taille et elagage sanitaire' },
    ],
  },
  {
    id: 'restauration',
    title: 'Restauration',
    color: '#0d9488',
    practices: [
      { code: 'REST1', name: 'Reboisement' },
      { code: 'REST2', name: 'Plantations bois-energie' },
      { code: 'REST3', name: 'Protection zones ripariennes' },
      { code: 'REST4', name: 'Valorisation residus agricoles' },
    ],
  },
  {
    id: 'tracabilite',
    title: 'Tracabilite',
    color: '#7c3aed',
    practices: [
      { code: 'TRAC1', name: 'GPS parcelles' },
      { code: 'TRAC2', name: 'Safeguards sociaux' },
      { code: 'TRAC3', name: 'Monitoring MRV' },
      { code: 'TRAC4', name: 'Certification ARS 1000' },
    ],
  },
];

const REDDTrackingFormScreen = ({ navigation, route }) => {
  const { farmerId: paramFarmerId, farmerData: paramFarmerData, farmerName: paramFarmerName } = route.params || {};
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(paramFarmerId || '');
  const [farmerName, setFarmerName] = useState(paramFarmerData?.full_name || paramFarmerData?.name || paramFarmerName || '');

  // Practice statuses: { [code]: 'conforme' | 'non_conforme' | 'non_evalue' }
  const [practiceStatuses, setPracticeStatuses] = useState({});
  const [superficieVerifiee, setSuperficieVerifiee] = useState('');
  const [arbresComptes, setArbresComptes] = useState('');
  const [observations, setObservations] = useState('');
  const [recommandations, setRecommandations] = useState('');
  const [suiviRequis, setSuiviRequis] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    loadMembers();
    return () => unsubscribe();
  }, []);

  const loadMembers = async () => {
    try {
      const cachedMembers = await AsyncStorage.getItem('cached_members');
      if (cachedMembers) setMembers(JSON.parse(cachedMembers));
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        const response = await cooperativeApi.getMembers(token);
        if (response.data?.members) {
          setMembers(response.data.members);
          await AsyncStorage.setItem('cached_members', JSON.stringify(response.data.members));
        }
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const togglePractice = (code, category) => {
    setPracticeStatuses(prev => {
      const current = prev[code];
      if (!current || current === 'non_evalue') return { ...prev, [code]: 'conforme' };
      if (current === 'conforme') return { ...prev, [code]: 'non_conforme' };
      return { ...prev, [code]: 'non_evalue' };
    });
  };

  const getStatusIcon = (code) => {
    const status = practiceStatuses[code];
    if (status === 'conforme') return { icon: 'checkmark-circle', color: '#10b981' };
    if (status === 'non_conforme') return { icon: 'close-circle', color: '#ef4444' };
    return { icon: 'ellipse-outline', color: '#64748b' };
  };

  const getStatusLabel = (code) => {
    const status = practiceStatuses[code];
    if (status === 'conforme') return 'Conforme';
    if (status === 'non_conforme') return 'Non conforme';
    return 'Non evalue';
  };

  const computeSummary = () => {
    let total = 0, verified = 0;
    Object.values(practiceStatuses).forEach(s => {
      if (s !== 'non_evalue') total++;
      if (s === 'conforme') verified++;
    });
    return { total, verified, pct: total > 0 ? Math.round(verified / total * 100) : 0 };
  };

  const saveVisit = async () => {
    if (!selectedFarmer && !farmerName) {
      Alert.alert('Erreur', 'Veuillez selectionner un producteur');
      return;
    }

    const evaluated = Object.entries(practiceStatuses).filter(([_, s]) => s !== 'non_evalue');
    if (evaluated.length === 0) {
      Alert.alert('Erreur', 'Veuillez evaluer au moins une pratique');
      return;
    }

    setLoading(true);

    const practices_verified = [];
    for (const cat of REDD_CATEGORIES) {
      for (const p of cat.practices) {
        const status = practiceStatuses[p.code];
        if (status && status !== 'non_evalue') {
          practices_verified.push({
            code: p.code,
            name: p.name,
            category: cat.id,
            status: status,
          });
        }
      }
    }

    const visitData = {
      farmer_id: selectedFarmer || `manual_${Date.now()}`,
      farmer_name: farmerName || members.find(m => m._id === selectedFarmer)?.full_name || '',
      farmer_phone: paramFarmerData?.phone || '',
      coop_id: user?.coop_id || '',
      coop_name: user?.coop_name || '',
      practices_verified,
      superficie_verifiee: parseFloat(superficieVerifiee) || 0,
      arbres_comptes: parseInt(arbresComptes) || 0,
      observations: observations || '',
      recommandations: recommandations || '',
      suivi_requis: suiviRequis,
      photos_count: 0,
      date_visite: new Date().toISOString(),
    };

    try {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        await farmerApi.post('/redd/tracking/visit', visitData);
        Alert.alert(
          'Succes',
          'La fiche de suivi REDD+ a ete enregistree.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        const existing = await AsyncStorage.getItem(OFFLINE_REDD_VISITS_KEY);
        const visits = existing ? JSON.parse(existing) : [];
        visits.push({ ...visitData, offline_id: `redd_${Date.now()}` });
        await AsyncStorage.setItem(OFFLINE_REDD_VISITS_KEY, JSON.stringify(visits));
        Alert.alert(
          'Sauvegarde hors ligne',
          'La fiche sera synchronisee automatiquement.',
          [
            { text: 'Nouvelle fiche', onPress: resetForm },
            { text: 'Terminer', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving REDD visit:', error);
      try {
        const existing = await AsyncStorage.getItem(OFFLINE_REDD_VISITS_KEY);
        const visits = existing ? JSON.parse(existing) : [];
        visits.push({ ...visitData, offline_id: `redd_${Date.now()}` });
        await AsyncStorage.setItem(OFFLINE_REDD_VISITS_KEY, JSON.stringify(visits));
        Alert.alert('Sauvegarde locale', 'Erreur reseau. Fiche sauvegardee localement.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de sauvegarder la fiche.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFarmer('');
    setFarmerName('');
    setPracticeStatuses({});
    setSuperficieVerifiee('');
    setArbresComptes('');
    setObservations('');
    setRecommandations('');
    setSuiviRequis(false);
  };

  const summary = computeSummary();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fiche REDD+</Text>
        <View style={styles.onlineStatus}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={18} color="#fcd34d" />
            <Text style={styles.offlineBannerText}>Mode hors ligne</Text>
          </View>
        )}

        {/* Farmer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Producteur</Text>
          {paramFarmerId ? (
            <View style={styles.selectedFarmer}>
              <Ionicons name="person" size={20} color="#10b981" />
              <Text style={styles.selectedFarmerText}>{farmerName || paramFarmerId}</Text>
            </View>
          ) : (
            <TextInput
              style={styles.inputField}
              placeholder="Nom du producteur"
              placeholderTextColor="#64748b"
              value={farmerName}
              onChangeText={setFarmerName}
            />
          )}
        </View>

        {/* Superficie & Arbres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesures terrain</Text>
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Superficie verifiee (ha)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ex: 3.5"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={superficieVerifiee}
                onChangeText={setSuperficieVerifiee}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Arbres comptes</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ex: 45"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={arbresComptes}
                onChangeText={setArbresComptes}
              />
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.verified}</Text>
              <Text style={styles.summaryLabel}>Conformes</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{summary.total - summary.verified}</Text>
              <Text style={styles.summaryLabel}>Non conformes</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>{summary.pct}%</Text>
              <Text style={styles.summaryLabel}>Conformite</Text>
            </View>
          </View>
        </View>

        {/* Practice Categories */}
        {REDD_CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.section}>
            <View style={[styles.catHeader, { borderLeftColor: cat.color }]}>
              <Text style={[styles.catTitle, { color: cat.color }]}>{cat.title}</Text>
              <Text style={styles.catCount}>
                {cat.practices.filter(p => practiceStatuses[p.code] === 'conforme').length}/{cat.practices.length}
              </Text>
            </View>
            {cat.practices.map((practice) => {
              const { icon, color } = getStatusIcon(practice.code);
              return (
                <TouchableOpacity
                  key={practice.code}
                  style={[
                    styles.practiceItem,
                    practiceStatuses[practice.code] === 'conforme' && styles.practiceItemConforme,
                    practiceStatuses[practice.code] === 'non_conforme' && styles.practiceItemNonConforme,
                  ]}
                  onPress={() => togglePractice(practice.code, cat.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon} size={22} color={color} />
                  <View style={styles.practiceInfo}>
                    <Text style={styles.practiceName}>{practice.name}</Text>
                    <Text style={[styles.practiceStatus, { color }]}>{getStatusLabel(practice.code)}</Text>
                  </View>
                  <Text style={styles.practiceCode}>{practice.code}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Observations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observations terrain</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Decrivez vos observations sur le terrain..."
            placeholderTextColor="#64748b"
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Recommandations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommandations</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Recommandations pour le producteur..."
            placeholderTextColor="#64748b"
            value={recommandations}
            onChangeText={setRecommandations}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Suivi requis */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Visite de suivi requise</Text>
          <Switch
            value={suiviRequis}
            onValueChange={setSuiviRequis}
            trackColor={{ false: '#334155', true: '#10b981' }}
            thumbColor={suiviRequis ? '#fff' : '#94a3b8'}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Submit */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={saveVisit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Enregistrer la fiche</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  onlineStatus: { padding: 5 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  content: { flex: 1, padding: 15 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  offlineBannerText: { color: '#fcd34d', marginLeft: 10, fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  selectedFarmer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 10,
  },
  selectedFarmerText: { color: '#fff', marginLeft: 10, fontSize: 15 },
  rowFields: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  fieldLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  inputField: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { color: '#10b981', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  catHeader: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catTitle: { fontSize: 15, fontWeight: '700' },
  catCount: { color: '#94a3b8', fontSize: 13 },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  practiceItemConforme: { backgroundColor: '#064e3b' },
  practiceItemNonConforme: { backgroundColor: '#450a0a' },
  practiceInfo: { flex: 1, marginLeft: 10 },
  practiceName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  practiceStatus: { fontSize: 11, marginTop: 1 },
  practiceCode: { color: '#475569', fontSize: 10, fontWeight: '600' },
  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    textAlignVertical: 'top',
    minHeight: 80,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  switchLabel: { color: '#fff', fontSize: 15 },
  submitContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default REDDTrackingFormScreen;
