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
      { code: 'AGF1', name: "Arbres d'ombrage (30-50%)", hint: "Verifiez si 30 a 50% de la parcelle est couverte par des arbres. Comptez les grands arbres au-dessus des cacaoyers." },
      { code: 'AGF2', name: 'Systeme multi-strates', hint: "Y a-t-il plusieurs niveaux de vegetation ? Herbes au sol, cacaoyers au milieu, grands arbres en haut." },
      { code: 'AGF3', name: 'Enrichissement parcelles', hint: "Le producteur a-t-il plante de nouveaux arbres fruitiers ou forestiers recemment ?" },
      { code: 'AGF4', name: 'Transition vers ombrage', hint: "Si la parcelle etait en plein soleil, a-t-il commence a planter des arbres d'ombrage ?" },
    ],
  },
  {
    id: 'zero_deforestation',
    title: 'Zero-Deforestation',
    color: '#2563eb',
    practices: [
      { code: 'ZD1', name: 'Intensification durable', hint: "Produit-il plus sur la meme surface sans defricher ? Ex: taille, engrais bio, nouvelles varietes." },
      { code: 'ZD2', name: 'Engagement zero deforestation', hint: "S'est-il engage a ne plus couper de foret pour agrandir ses parcelles ?" },
      { code: 'ZD3', name: 'Restauration degradees', hint: "Y a-t-il des parcelles abandonnees qu'il est en train de replanter ou restaurer ?" },
      { code: 'ZD4', name: 'Protection forets classees', hint: "Les parcelles sont-elles eloignees des forets classees ? Respecte-t-il les limites protegees ?" },
    ],
  },
  {
    id: 'gestion_sols',
    title: 'Gestion Sols',
    color: '#d97706',
    practices: [
      { code: 'SOL1', name: 'Paillage et compostage', hint: "Y a-t-il des tas de compost ou du paillage (feuilles mortes, cosses) au pied des arbres ?" },
      { code: 'SOL2', name: 'Biochar', hint: "Utilise-t-il du charbon vegetal (bois brule sans flamme) melange a la terre pour enrichir le sol ?" },
      { code: 'SOL3', name: 'Couverture vegetale', hint: "Le sol est-il couvert par des plantes basses entre les arbres ? Pas de sol nu visible." },
      { code: 'SOL4', name: 'Gestion integree ravageurs', hint: "Lutte-t-il contre les maladies sans produits chimiques dangereux ? Ex: piegeage, produits naturels." },
      { code: 'SOL5', name: 'Taille et elagage sanitaire', hint: "Les cacaoyers sont-ils bien tailles ? Les branches mortes ou malades sont-elles coupees ?" },
    ],
  },
  {
    id: 'restauration',
    title: 'Restauration',
    color: '#0d9488',
    practices: [
      { code: 'REST1', name: 'Reboisement', hint: "A-t-il plante de nouveaux arbres forestiers ou aide des jeunes pousses naturelles a grandir ?" },
      { code: 'REST2', name: 'Plantations bois-energie', hint: "Y a-t-il des arbres plantes pour le bois de chauffage afin d'eviter de couper la foret ?" },
      { code: 'REST3', name: 'Protection zones ripariennes', hint: "Les bords de cours d'eau sont-ils proteges avec de la vegetation ? Pas de culture au bord de l'eau." },
      { code: 'REST4', name: 'Valorisation residus agricoles', hint: "Les dechets de recolte sont-ils reutilises comme compost au lieu d'etre brules ?" },
    ],
  },
  {
    id: 'tracabilite',
    title: 'Tracabilite',
    color: '#7c3aed',
    practices: [
      { code: 'TRAC1', name: 'GPS parcelles', hint: "Les parcelles ont-elles ete cartographiees avec un GPS ? Les polygones sont-ils enregistres ?" },
      { code: 'TRAC2', name: 'Safeguards sociaux', hint: "Pas de travail d'enfants ni travail force. Conditions de travail correctes pour tous." },
      { code: 'TRAC3', name: 'Monitoring MRV', hint: "Participe-t-il au suivi regulier (Mesure, Reporting, Verification) de ses pratiques ?" },
      { code: 'TRAC4', name: 'Certification ARS 1000', hint: "Est-il certifie ou en cours de certification ARS 1000 (norme africaine cacao durable) ?" },
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
    // No longer used - kept for compatibility
  };

  const setStatus = (code, status) => {
    setPracticeStatuses(prev => {
      if (prev[code] === status) return { ...prev, [code]: undefined };
      return { ...prev, [code]: status };
    });
  };

  const getStatusIcon = (code) => {
    const status = practiceStatuses[code];
    if (status === 'conforme') return { icon: 'checkmark-circle', color: '#10b981' };
    if (status === 'partiellement') return { icon: 'alert-circle', color: '#f59e0b' };
    if (status === 'non_conforme') return { icon: 'close-circle', color: '#ef4444' };
    if (status === 'non_applicable') return { icon: 'remove-circle', color: '#64748b' };
    return { icon: 'ellipse-outline', color: '#64748b' };
  };

  const getStatusLabel = (code) => {
    const status = practiceStatuses[code];
    if (status === 'conforme') return 'Conforme';
    if (status === 'partiellement') return 'Partiellement';
    if (status === 'non_conforme') return 'Non conforme';
    if (status === 'non_applicable') return 'N/A';
    return 'Non evalue';
  };

  const computeSummary = () => {
    let conforme = 0, partiel = 0, nonConforme = 0;
    Object.values(practiceStatuses).forEach(s => {
      if (s === 'conforme') conforme++;
      else if (s === 'partiellement') partiel++;
      else if (s === 'non_conforme') nonConforme++;
    });
    const total = conforme + partiel + nonConforme;
    return { conforme, partiel, nonConforme, total, pct: total > 0 ? Math.round((conforme + partiel * 0.5) / total * 100) : 0 };
  };

  const saveVisit = async () => {
    if (!selectedFarmer && !farmerName) {
      Alert.alert('Erreur', 'Veuillez selectionner un producteur');
      return;
    }

    const evaluated = Object.entries(practiceStatuses).filter(([_, s]) => s && s !== 'non_applicable');
    if (evaluated.length === 0) {
      Alert.alert('Erreur', 'Veuillez evaluer au moins une pratique');
      return;
    }

    setLoading(true);

    const practices_verified = [];
    for (const cat of REDD_CATEGORIES) {
      for (const p of cat.practices) {
        const status = practiceStatuses[p.code];
        if (status && status !== 'non_applicable') {
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

        {/* Legend */}
        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Conforme</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>Partiel</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Non conf.</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#64748b' }]} /><Text style={styles.legendText}>N/A</Text></View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.conforme}</Text>
              <Text style={styles.summaryLabel}>Conformes</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{summary.partiel}</Text>
              <Text style={styles.summaryLabel}>Partiels</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{summary.nonConforme}</Text>
              <Text style={styles.summaryLabel}>Non conf.</Text>
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
              const status = practiceStatuses[practice.code];
              return (
                <View
                  key={practice.code}
                  style={[
                    styles.practiceItem,
                    status === 'conforme' && styles.practiceItemConforme,
                    status === 'partiellement' && styles.practiceItemPartiel,
                    status === 'non_conforme' && styles.practiceItemNonConforme,
                    status === 'non_applicable' && styles.practiceItemNA,
                  ]}
                >
                  <View style={styles.practiceTopRow}>
                    <Ionicons name={icon} size={20} color={color} />
                    <View style={styles.practiceInfo}>
                      <Text style={styles.practiceName}>{practice.name}</Text>
                      {practice.hint && <Text style={styles.practiceHint}>{practice.hint}</Text>}
                    </View>
                    <Text style={styles.practiceCode}>{practice.code}</Text>
                  </View>
                  <View style={styles.statusButtons}>
                    <TouchableOpacity
                      style={[styles.statusBtn, status === 'conforme' && styles.statusBtnConforme]}
                      onPress={() => setStatus(practice.code, 'conforme')}
                    >
                      <Text style={[styles.statusBtnText, status === 'conforme' && styles.statusBtnTextActive]}>Conforme</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, status === 'partiellement' && styles.statusBtnPartiel]}
                      onPress={() => setStatus(practice.code, 'partiellement')}
                    >
                      <Text style={[styles.statusBtnText, status === 'partiellement' && styles.statusBtnTextActive]}>Partiel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, status === 'non_conforme' && styles.statusBtnNonConforme]}
                      onPress={() => setStatus(practice.code, 'non_conforme')}
                    >
                      <Text style={[styles.statusBtnText, status === 'non_conforme' && styles.statusBtnTextActive]}>Non conf.</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, status === 'non_applicable' && styles.statusBtnNA]}
                      onPress={() => setStatus(practice.code, 'non_applicable')}
                    >
                      <Text style={[styles.statusBtnText, status === 'non_applicable' && styles.statusBtnTextActive]}>N/A</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  practiceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  practiceItemConforme: { backgroundColor: '#064e3b' },
  practiceItemPartiel: { backgroundColor: '#422006' },
  practiceItemNonConforme: { backgroundColor: '#450a0a' },
  practiceItemNA: { backgroundColor: '#1e293b', opacity: 0.6 },
  practiceInfo: { flex: 1, marginLeft: 10 },
  practiceName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  practiceHint: { color: '#94a3b8', fontSize: 11, marginTop: 2, lineHeight: 15 },
  practiceStatus: { fontSize: 11, marginTop: 1 },
  practiceCode: { color: '#475569', fontSize: 10, fontWeight: '600' },
  statusButtons: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
    marginLeft: 30,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  statusBtnConforme: { backgroundColor: '#059669' },
  statusBtnPartiel: { backgroundColor: '#d97706' },
  statusBtnNonConforme: { backgroundColor: '#dc2626' },
  statusBtnNA: { backgroundColor: '#475569' },
  statusBtnText: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  statusBtnTextActive: { color: '#fff' },
  legendCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: { color: '#94a3b8', fontSize: 11 },
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
