// Formulaire de visite SSRTE avec support offline
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
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';

const OFFLINE_VISITS_KEY = 'offline_ssrte_visits';

const DANGEROUS_TASKS = [
  { code: 'TD1', name: 'Port de charges lourdes (>20kg)', severity: 'elevee' },
  { code: 'TD2', name: 'Utilisation outils tranchants', severity: 'elevee' },
  { code: 'TD3', name: 'Manipulation pesticides', severity: 'critique' },
  { code: 'TD4', name: 'Longues heures de travail (>6h)', severity: 'elevee' },
  { code: 'TD5', name: 'Travail de nuit', severity: 'modere' },
  { code: 'TD6', name: 'Brûlage des champs', severity: 'elevee' },
  { code: 'TD7', name: 'Grimpée arbres sans protection', severity: 'elevee' },
  { code: 'TD8', name: 'Transport charges avec animaux', severity: 'modere' },
];

const SUPPORT_TYPES = [
  'Kit scolaire distribué',
  'Certificat de naissance aidé',
  'Inscription école facilitée',
  'Formation professionnelle',
  'Sensibilisation famille',
  'Suivi psychosocial',
  'Aide alimentaire',
  'Référencement services sociaux',
];

const RISK_LEVELS = [
  { value: 'faible', label: 'Faible', color: '#10b981' },
  { value: 'modere', label: 'Modéré', color: '#f59e0b' },
  { value: 'eleve', label: 'Élevé', color: '#f97316' },
  { value: 'critique', label: 'Critique', color: '#ef4444' },
];

const CONDITIONS_VIE = [
  { value: 'precaires', label: 'Precaires' },
  { value: 'moyennes', label: 'Moyennes' },
  { value: 'bonnes', label: 'Bonnes' },
  { value: 'tres_bonnes', label: 'Tres bonnes' },
];

const SSRTEVisitFormScreen = ({ navigation, route }) => {
  const { farmerId: paramFarmerId, farmerData: paramFarmerData, farmerName: paramFarmerName } = route.params || {};
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(paramFarmerId || '');
  const [farmerName, setFarmerName] = useState(paramFarmerData?.full_name || paramFarmerData?.name || paramFarmerName || '');
  
  // Menage fields
  const [tailleMenage, setTailleMenage] = useState(0);
  const [nombreEnfants, setNombreEnfants] = useState(0);
  const [listeEnfants, setListeEnfants] = useState([]);
  
  // Conditions de vie
  const [conditionsVie, setConditionsVie] = useState('moyennes');
  const [eauCourante, setEauCourante] = useState(false);
  const [electricite, setElectricite] = useState(false);
  const [distanceEcole, setDistanceEcole] = useState('');
  
  // Form fields
  const [enfantsObserves, setEnfantsObserves] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedSupport, setSelectedSupport] = useState([]);
  const [riskLevel, setRiskLevel] = useState('faible');
  const [recommendations, setRecommendations] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [notes, setNotes] = useState('');

  const addChild = () => {
    setListeEnfants([...listeEnfants, { prenom: '', sexe: 'Garcon', age: 0, scolarise: false, travaille_exploitation: false }]);
  };

  const updateChild = (index, field, value) => {
    const updated = [...listeEnfants];
    updated[index] = { ...updated[index], [field]: value };
    setListeEnfants(updated);
  };

  const removeChild = (index) => {
    setListeEnfants(listeEnfants.filter((_, i) => i !== index));
  };

  // Auto-sync enfantsObserves from liste_enfants children marked as working
  useEffect(() => {
    const workingFromList = listeEnfants.filter(e => e.travaille_exploitation).length;
    if (workingFromList > enfantsObserves) {
      setEnfantsObserves(workingFromList);
    }
  }, [listeEnfants]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    
    loadMembers();
    
    return () => unsubscribe();
  }, []);

  const loadMembers = async () => {
    try {
      // Essayer de charger depuis le cache local d'abord
      const cachedMembers = await AsyncStorage.getItem('cached_members');
      if (cachedMembers) {
        setMembers(JSON.parse(cachedMembers));
      }
      
      // Si en ligne, charger depuis l'API
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

  const toggleTask = (taskCode) => {
    setSelectedTasks(prev => 
      prev.includes(taskCode)
        ? prev.filter(t => t !== taskCode)
        : [...prev, taskCode]
    );
  };

  const toggleSupport = (support) => {
    setSelectedSupport(prev =>
      prev.includes(support)
        ? prev.filter(s => s !== support)
        : [...prev, support]
    );
  };

  // Auto-calculate risk level based on observations
  useEffect(() => {
    let calculatedRisk = 'faible';
    
    if (enfantsObserves > 0) {
      calculatedRisk = 'modere';
    }
    
    if (selectedTasks.length >= 2 || enfantsObserves >= 2) {
      calculatedRisk = 'eleve';
    }
    
    const hasCriticalTask = selectedTasks.some(taskCode => {
      const task = DANGEROUS_TASKS.find(t => t.code === taskCode);
      return task?.severity === 'critique';
    });
    
    if (hasCriticalTask || enfantsObserves >= 3) {
      calculatedRisk = 'critique';
    }
    
    setRiskLevel(calculatedRisk);
  }, [enfantsObserves, selectedTasks]);

  const saveVisit = async () => {
    if (!selectedFarmer) {
      Alert.alert('Erreur', 'Veuillez sélectionner un producteur');
      return;
    }

    setLoading(true);
    
    if (!tailleMenage) {
      Alert.alert('Erreur', 'Veuillez renseigner la taille du menage');
      setLoading(false);
      return;
    }

    // Validation: warn if risk is high but no children observed working
    if ((riskLevel === 'eleve' || riskLevel === 'critique') && enfantsObserves === 0) {
      Alert.alert(
        'Attention',
        'Le niveau de risque est ' + riskLevel + ' mais 0 enfant observe en situation de travail. Voulez-vous continuer ?',
        [
          { text: 'Corriger', onPress: () => setLoading(false) },
          { text: 'Continuer quand meme', onPress: () => doSaveVisit() }
        ]
      );
      return;
    }

    doSaveVisit();
  };

  const doSaveVisit = async () => {
    const visitData = {
      farmer_id: selectedFarmer,
      farmer_name: farmerName || members.find(m => m._id === selectedFarmer)?.full_name,
      date_visite: new Date().toISOString(),
      agent_id: user?._id,
      agent_name: user?.full_name,
      // Menage
      taille_menage: tailleMenage,
      nombre_enfants: nombreEnfants,
      liste_enfants: listeEnfants,
      // Conditions de vie
      conditions_vie: conditionsVie,
      eau_courante: eauCourante,
      electricite: electricite,
      distance_ecole_km: distanceEcole ? parseFloat(distanceEcole) : null,
      // Observations
      enfants_observes_travaillant: enfantsObserves,
      taches_dangereuses_observees: selectedTasks,
      support_fourni: selectedSupport,
      niveau_risque: riskLevel,
      recommandations: recommendations.split('\n').filter(r => r.trim()),
      visite_suivi_requise: followUpRequired,
      observations: notes || null,
      offline_id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      offline_recorded_at: new Date().toISOString(),
    };

    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        // Envoyer directement au serveur
        await cooperativeApi.createSSRTEVisit(token, visitData);
        Alert.alert(
          'Succès',
          'La visite SSRTE a été enregistrée avec succès.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Sauvegarder localement
        const existingVisits = await AsyncStorage.getItem(OFFLINE_VISITS_KEY);
        const visits = existingVisits ? JSON.parse(existingVisits) : [];
        visits.push(visitData);
        await AsyncStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(visits));
        
        Alert.alert(
          'Sauvegardé hors ligne',
          'La visite sera synchronisée automatiquement lorsque vous serez connecté.',
          [
            { text: 'Nouvelle visite', onPress: resetForm },
            { text: 'Terminer', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving visit:', error);
      // En cas d'erreur, sauvegarder localement
      try {
        const existingVisits = await AsyncStorage.getItem(OFFLINE_VISITS_KEY);
        const visits = existingVisits ? JSON.parse(existingVisits) : [];
        visits.push(visitData);
        await AsyncStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(visits));
        
        Alert.alert(
          'Sauvegardé localement',
          'Une erreur s\'est produite mais la visite a été sauvegardée localement.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de sauvegarder la visite.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFarmer('');
    setFarmerName('');
    setTailleMenage(0);
    setNombreEnfants(0);
    setListeEnfants([]);
    setConditionsVie('moyennes');
    setEauCourante(false);
    setElectricite(false);
    setDistanceEcole('');
    setEnfantsObserves(0);
    setSelectedTasks([]);
    setSelectedSupport([]);
    setRiskLevel('faible');
    setRecommendations('');
    setFollowUpRequired(false);
    setNotes('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle visite SSRTE</Text>
        <View style={styles.onlineStatus}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={18} color="#fcd34d" />
            <Text style={styles.offlineBannerText}>
              Mode hors ligne - Les données seront synchronisées plus tard
            </Text>
          </View>
        )}

        {/* Farmer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Producteur</Text>
          {paramFarmerId ? (
            <View style={styles.selectedFarmer}>
              <Ionicons name="person" size={20} color="#10b981" />
              <Text style={styles.selectedFarmerText}>
                {farmerName || paramFarmerId}
              </Text>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedFarmer}
                onValueChange={(value) => {
                  setSelectedFarmer(value);
                  const member = members.find(m => m._id === value);
                  setFarmerName(member?.full_name || member?.name || '');
                }}
                style={styles.picker}
                dropdownIconColor="#94a3b8"
              >
                <Picker.Item label="Sélectionner un producteur..." value="" />
                {members.map((member) => (
                  <Picker.Item 
                    key={member._id} 
                    label={`${member.full_name || member.name} - ${member.village || ''}`} 
                    value={member._id} 
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Taille du menage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du menage</Text>
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Taille du menage *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ex: 6"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={tailleMenage ? String(tailleMenage) : ''}
                onChangeText={v => setTailleMenage(parseInt(v) || 0)}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Nombre d'enfants</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ex: 3"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={nombreEnfants ? String(nombreEnfants) : ''}
                onChangeText={v => setNombreEnfants(parseInt(v) || 0)}
              />
            </View>
          </View>
        </View>

        {/* Details des enfants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Details des enfants</Text>
            <TouchableOpacity style={styles.addChildButton} onPress={addChild}>
              <Ionicons name="add-circle" size={20} color="#10b981" />
              <Text style={styles.addChildText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
          {listeEnfants.length === 0 && (
            <Text style={styles.emptyHint}>Appuyez "Ajouter" pour enregistrer les enfants du menage</Text>
          )}
          {listeEnfants.map((child, i) => (
            <View key={i} style={styles.childCard}>
              <View style={styles.childCardHeader}>
                <Text style={styles.childCardTitle}>Enfant {i + 1}</Text>
                <TouchableOpacity onPress={() => removeChild(i)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.rowFields}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Prenom</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Prenom"
                    placeholderTextColor="#64748b"
                    value={child.prenom}
                    onChangeText={v => updateChild(i, 'prenom', v)}
                  />
                </View>
                <View style={styles.quarterField}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={child.age ? String(child.age) : ''}
                    onChangeText={v => updateChild(i, 'age', parseInt(v) || 0)}
                  />
                </View>
              </View>
              <View style={styles.rowFields}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Sexe</Text>
                  <View style={styles.sexeRow}>
                    <TouchableOpacity
                      style={[styles.sexeBtn, child.sexe === 'Garcon' && styles.sexeBtnActive]}
                      onPress={() => updateChild(i, 'sexe', 'Garcon')}
                    >
                      <Text style={[styles.sexeBtnText, child.sexe === 'Garcon' && styles.sexeBtnTextActive]}>Garcon</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sexeBtn, child.sexe === 'Fille' && styles.sexeBtnActive]}
                      onPress={() => updateChild(i, 'sexe', 'Fille')}
                    >
                      <Text style={[styles.sexeBtnText, child.sexe === 'Fille' && styles.sexeBtnTextActive]}>Fille</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.childSwitchRow}>
                <View style={styles.childSwitchItem}>
                  <Text style={styles.childSwitchLabel}>Scolarise</Text>
                  <Switch
                    value={child.scolarise}
                    onValueChange={v => updateChild(i, 'scolarise', v)}
                    trackColor={{ false: '#334155', true: '#10b981' }}
                    thumbColor={child.scolarise ? '#fff' : '#94a3b8'}
                  />
                </View>
                <View style={styles.childSwitchItem}>
                  <Text style={[styles.childSwitchLabel, { color: child.travaille_exploitation ? '#ef4444' : '#94a3b8' }]}>Travaille</Text>
                  <Switch
                    value={child.travaille_exploitation}
                    onValueChange={v => updateChild(i, 'travaille_exploitation', v)}
                    trackColor={{ false: '#334155', true: '#ef4444' }}
                    thumbColor={child.travaille_exploitation ? '#fff' : '#94a3b8'}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Conditions de vie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions de vie</Text>
          <View style={styles.conditionsRow}>
            {CONDITIONS_VIE.map(c => (
              <TouchableOpacity
                key={c.value}
                style={[styles.conditionBtn, conditionsVie === c.value && styles.conditionBtnActive]}
                onPress={() => setConditionsVie(c.value)}
              >
                <Text style={[styles.conditionBtnText, conditionsVie === c.value && styles.conditionBtnTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Eau courante</Text>
            <Switch
              value={eauCourante}
              onValueChange={setEauCourante}
              trackColor={{ false: '#334155', true: '#10b981' }}
              thumbColor={eauCourante ? '#fff' : '#94a3b8'}
            />
          </View>
          <View style={[styles.switchRow, { marginBottom: 10 }]}>
            <Text style={styles.switchLabel}>Electricite</Text>
            <Switch
              value={electricite}
              onValueChange={setElectricite}
              trackColor={{ false: '#334155', true: '#10b981' }}
              thumbColor={electricite ? '#fff' : '#94a3b8'}
            />
          </View>
          <Text style={styles.fieldLabel}>Distance a l'ecole (km)</Text>
          <TextInput
            style={[styles.inputField, { maxWidth: 200 }]}
            placeholder="Ex: 2.5"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            value={distanceEcole}
            onChangeText={setDistanceEcole}
          />
        </View>

        {/* Enfants observés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enfants observés travaillant</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setEnfantsObserves(Math.max(0, enfantsObserves - 1))}
            >
              <Ionicons name="remove" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{enfantsObserves}</Text>
            <TouchableOpacity 
              style={[styles.counterButton, styles.counterButtonAdd]}
              onPress={() => setEnfantsObserves(enfantsObserves + 1)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tâches dangereuses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tâches dangereuses observées</Text>
          <View style={styles.checkboxGrid}>
            {DANGEROUS_TASKS.map((task) => (
              <TouchableOpacity
                key={task.code}
                style={[
                  styles.checkboxItem,
                  selectedTasks.includes(task.code) && styles.checkboxItemSelected,
                  task.severity === 'critique' && selectedTasks.includes(task.code) && styles.checkboxItemCritical
                ]}
                onPress={() => toggleTask(task.code)}
              >
                <View style={[
                  styles.checkbox,
                  selectedTasks.includes(task.code) && styles.checkboxChecked
                ]}>
                  {selectedTasks.includes(task.code) && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={[
                  styles.checkboxText,
                  selectedTasks.includes(task.code) && styles.checkboxTextSelected
                ]}>
                  {task.name}
                </Text>
                {task.severity === 'critique' && (
                  <View style={styles.criticalBadge}>
                    <Text style={styles.criticalBadgeText}>!</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Niveau de risque */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Niveau de risque évalué</Text>
          <View style={styles.riskLevels}>
            {RISK_LEVELS.map((risk) => (
              <TouchableOpacity
                key={risk.value}
                style={[
                  styles.riskButton,
                  riskLevel === risk.value && { backgroundColor: risk.color }
                ]}
                onPress={() => setRiskLevel(risk.value)}
              >
                <Text style={[
                  styles.riskButtonText,
                  riskLevel === risk.value && styles.riskButtonTextActive
                ]}>
                  {risk.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.riskHint}>
            (Calculé automatiquement selon les observations)
          </Text>
        </View>

        {/* Support fourni */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support fourni</Text>
          <View style={styles.supportGrid}>
            {SUPPORT_TYPES.map((support) => (
              <TouchableOpacity
                key={support}
                style={[
                  styles.supportItem,
                  selectedSupport.includes(support) && styles.supportItemSelected
                ]}
                onPress={() => toggleSupport(support)}
              >
                <Text style={[
                  styles.supportText,
                  selectedSupport.includes(support) && styles.supportTextSelected
                ]}>
                  {support}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommandations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommandations</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Entrez vos recommandations (une par ligne)"
            placeholderTextColor="#64748b"
            value={recommendations}
            onChangeText={setRecommendations}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Suivi requis */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Visite de suivi requise</Text>
          <Switch
            value={followUpRequired}
            onValueChange={setFollowUpRequired}
            trackColor={{ false: '#334155', true: '#10b981' }}
            thumbColor={followUpRequired ? '#fff' : '#94a3b8'}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes additionnelles</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Notes supplémentaires..."
            placeholderTextColor="#64748b"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* Submit Button */}
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
              <Text style={styles.submitButtonText}>
                Enregistrer la visite
              </Text>
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineStatus: {
    padding: 5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  offlineBannerText: {
    color: '#fcd34d',
    marginLeft: 10,
    fontSize: 13,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  selectedFarmer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 10,
  },
  selectedFarmerText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 15,
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#334155',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonAdd: {
    backgroundColor: '#10b981',
  },
  counterValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginHorizontal: 30,
  },
  checkboxGrid: {
    
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkboxItemSelected: {
    backgroundColor: '#134e4a',
  },
  checkboxItemCritical: {
    backgroundColor: '#7f1d1d',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxText: {
    color: '#94a3b8',
    flex: 1,
    fontSize: 14,
  },
  checkboxTextSelected: {
    color: '#fff',
  },
  criticalBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  riskLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  riskButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  riskButtonTextActive: {
    color: '#fff',
  },
  riskHint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  supportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  supportItem: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  supportItemSelected: {
    backgroundColor: '#3b82f6',
  },
  supportText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  supportTextSelected: {
    color: '#fff',
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    textAlignVertical: 'top',
    minHeight: 100,
    fontSize: 14,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  halfField: {
    flex: 1,
  },
  quarterField: {
    flex: 0.4,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addChildText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 15,
  },
  childCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  childCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  childCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sexeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sexeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  sexeBtnActive: {
    backgroundColor: '#10b981',
  },
  sexeBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  sexeBtnTextActive: {
    color: '#fff',
  },
  childSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  childSwitchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childSwitchLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  conditionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  conditionBtnActive: {
    backgroundColor: '#10b981',
  },
  conditionBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  conditionBtnTextActive: {
    color: '#fff',
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
  switchLabel: {
    color: '#fff',
    fontSize: 15,
  },
  footer: {
    height: 20,
  },
  submitContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default SSRTEVisitFormScreen;
