import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

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
  { id: 'compostage', label: 'Compostage', icon: 'leaf', hint: 'Utilisation de dechets organiques (feuilles, cabosses) comme engrais naturel sur la parcelle' },
  { id: 'absence_pesticides', label: 'Absence de pesticides chimiques', icon: 'shield-checkmark', hint: 'Aucun produit chimique de synthese (herbicide, insecticide, fongicide) utilise sur la parcelle' },
  { id: 'gestion_dechets', label: 'Gestion des dechets', icon: 'trash', hint: 'Les emballages, plastiques et dechets non organiques sont collectes et evacues hors de la parcelle' },
  { id: 'protection_cours_eau', label: 'Protection des cours d\'eau', icon: 'water', hint: 'Une bande vegetale d\'au moins 5m est maintenue entre la plantation et les rivieres ou marigots' },
  { id: 'agroforesterie', label: 'Agroforesterie', icon: 'flower', hint: 'Presence d\'arbres d\'ombrage diversifies (fruitiers, forestiers) associes aux cacaoyers' },
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

  // Carbon premium fields - Tree height categories
  const [treesPetits, setTreesPetits] = useState('');  // < 8m
  const [treesMoyens, setTreesMoyens] = useState('');  // 8-12m
  const [treesGrands, setTreesGrands] = useState('');  // > 12m
  const [shadeOverride, setShadeOverride] = useState('');
  const [selectedPractices, setSelectedPractices] = useState([]);

  // Total trees from categories
  const totalTrees = (parseInt(treesPetits) || 0) + (parseInt(treesMoyens) || 0) + (parseInt(treesGrands) || 0);

  // Auto-calculate shade cover from tree count and parcel area
  const CANOPY_M2_PER_TREE = 80; // average shade tree canopy ~80m²
  const parcelArea = correctedArea ? parseFloat(correctedArea) : (parcel?.superficie || 0);
  const autoShadeCover = (totalTrees > 0 && parcelArea > 0)
    ? Math.min(((totalTrees * CANOPY_M2_PER_TREE) / (parcelArea * 10000)) * 100, 100)
    : 0;
  const effectiveShadeCover = shadeOverride !== '' ? parseFloat(shadeOverride) : autoShadeCover;

  // Weighted biomass for preview
  const weightedTrees = ((parseInt(treesPetits) || 0) * 0.3) + ((parseInt(treesMoyens) || 0) * 0.7) + ((parseInt(treesGrands) || 0) * 1.0);
  const weightedDensity = parcelArea > 0 ? weightedTrees / parcelArea : 0;

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
        nombre_arbres: totalTrees > 0 ? totalTrees : null,
        arbres_petits: treesPetits ? parseInt(treesPetits) : 0,
        arbres_moyens: treesMoyens ? parseInt(treesMoyens) : 0,
        arbres_grands: treesGrands ? parseInt(treesGrands) : 0,
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

      const res = await api.put(`/field-agent/parcels/${parcel.id}/verify`, body);
      Alert.alert('Verification enregistree', res.data.message, [
        { text: 'OK', onPress: () => {
          if (onVerified) onVerified();
          navigation.goBack();
        }}
      ]);
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
        {/* VALEURS DECLAREES (read-only) */}
        <View style={[styles.infoCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
            <Text style={[styles.infoTitle, { color: '#1d4ed8', marginBottom: 0 }]}>Valeurs declarees</Text>
          </View>
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
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="git-branch-outline" size={16} color="#64748b" />
              <Text style={styles.infoLabel}>Arbres (S3/S2/S1)</Text>
              <Text style={styles.infoValue}>{parcel.arbres_grands || 0}/{parcel.arbres_moyens || 0}/{parcel.arbres_petits || 0} = {(parcel.arbres_grands || 0) + (parcel.arbres_moyens || 0) + (parcel.arbres_petits || 0)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cloudy-outline" size={16} color="#64748b" />
              <Text style={styles.infoLabel}>Couverture</Text>
              <Text style={styles.infoValue}>{parcel.couverture_ombragee || 0}%</Text>
            </View>
          </View>
          {parcel.score_carbone > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Ionicons name="analytics" size={14} color="#059669" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669' }}>Score carbone: {parcel.score_carbone}/10</Text>
            </View>
          )}
          {parcel.coordonnees_gps && (
            <View style={styles.gpsExisting}>
              <Ionicons name="navigate" size={14} color="#6366f1" />
              <Text style={styles.gpsExistingText}>
                GPS declare: {parcel.coordonnees_gps.lat?.toFixed(5)}, {parcel.coordonnees_gps.lng?.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* SECTION: VALEURS MESUREES */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }}>
          <Ionicons name="clipboard-outline" size={16} color="#059669" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valeurs mesurees sur le terrain</Text>
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

          {/* Tree Categories - Height-based */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Inventaire des arbres ombragés par taille</Text>
            <Text style={styles.fieldHint}>
              Classez les arbres selon leur hauteur estimée (méthode allométrique AGB)
            </Text>
            
            {/* Petits < 8m */}
            <View style={styles.treeCategoryRow}>
              <View style={styles.treeCategoryLabel}>
                <View style={[styles.treeCategoryDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.treeCategoryText}>Petits {'<'} 8m</Text>
                <Text style={styles.treeCategoryCoeff}>(x0.3)</Text>
              </View>
              <TextInput
                style={styles.treeCategoryInput}
                value={treesPetits}
                onChangeText={(val) => { setTreesPetits(val); setShadeOverride(''); }}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor="#94a3b8"
                testID="trees-petits-input"
              />
            </View>

            {/* Moyens 8-12m */}
            <View style={styles.treeCategoryRow}>
              <View style={styles.treeCategoryLabel}>
                <View style={[styles.treeCategoryDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.treeCategoryText}>Moyens 8-12m</Text>
                <Text style={styles.treeCategoryCoeff}>(x0.7)</Text>
              </View>
              <TextInput
                style={styles.treeCategoryInput}
                value={treesMoyens}
                onChangeText={(val) => { setTreesMoyens(val); setShadeOverride(''); }}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor="#94a3b8"
                testID="trees-moyens-input"
              />
            </View>

            {/* Grands > 12m */}
            <View style={styles.treeCategoryRow}>
              <View style={styles.treeCategoryLabel}>
                <View style={[styles.treeCategoryDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.treeCategoryText}>Grands {'>'} 12m</Text>
                <Text style={styles.treeCategoryCoeff}>(x1.0)</Text>
              </View>
              <TextInput
                style={styles.treeCategoryInput}
                value={treesGrands}
                onChangeText={(val) => { setTreesGrands(val); setShadeOverride(''); }}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor="#94a3b8"
                testID="trees-grands-input"
              />
            </View>

            {/* Summary */}
            {totalTrees > 0 && parcelArea > 0 && (
              <View style={styles.treeSummaryCard}>
                <View style={styles.treeSummaryRow}>
                  <Text style={styles.treeSummaryLabel}>Total arbres</Text>
                  <Text style={styles.treeSummaryValue}>{totalTrees}</Text>
                </View>
                <View style={styles.treeSummaryRow}>
                  <Text style={styles.treeSummaryLabel}>Biomasse pondérée</Text>
                  <Text style={[styles.treeSummaryValue, { color: '#059669' }]}>
                    {weightedTrees.toFixed(1)} ({weightedDensity.toFixed(0)}/ha)
                  </Text>
                </View>
                <View style={styles.treeSummaryBar}>
                  <View style={[styles.treeSummarySegment, { flex: parseInt(treesPetits) || 0, backgroundColor: '#f59e0b' }]} />
                  <View style={[styles.treeSummarySegment, { flex: parseInt(treesMoyens) || 0, backgroundColor: '#10b981' }]} />
                  <View style={[styles.treeSummarySegment, { flex: parseInt(treesGrands) || 0, backgroundColor: '#059669' }]} />
                </View>
              </View>
            )}
          </View>

          {/* Shade Cover - Auto-calculated */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Couverture ombragée</Text>
            {totalTrees > 0 && parcelArea > 0 ? (
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
                    {totalTrees} arbres x 80m² canopée / {parcelArea} ha
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
                    Valeur ajustée: {parseFloat(shadeOverride).toFixed(1)}% (auto: {autoShadeCover.toFixed(1)}%)
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
                    <View style={styles.practiceTopRow}>
                      <View style={[styles.practiceCheckbox, isSelected && styles.practiceCheckboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Ionicons name={practice.icon} size={16} color={isSelected ? '#059669' : '#94a3b8'} />
                      <Text style={[styles.practiceLabel, isSelected && styles.practiceLabelActive]}>
                        {practice.label}
                      </Text>
                    </View>
                    <Text style={styles.practiceHint}>{practice.hint}</Text>
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
  practiceItem: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  practiceItemActive: { borderColor: '#059669', backgroundColor: '#ecfdf5' },
  practiceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  practiceCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  practiceCheckboxActive: { backgroundColor: '#059669', borderColor: '#059669' },
  practiceLabel: { flex: 1, fontSize: 13, color: '#64748b' },
  practiceLabelActive: { color: '#1e293b', fontWeight: '600' },
  practiceHint: { fontSize: 11, color: '#94a3b8', marginTop: 6, marginLeft: 32, lineHeight: 15, fontStyle: 'italic' },
  practiceCount: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 6 },
  // Tree category styles
  fieldHint: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' },
  treeCategoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6 },
  treeCategoryLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  treeCategoryDot: { width: 10, height: 10, borderRadius: 5 },
  treeCategoryText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  treeCategoryCoeff: { fontSize: 10, color: '#94a3b8' },
  treeCategoryInput: { width: 70, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, fontSize: 14, color: '#1e293b', backgroundColor: '#fff', textAlign: 'center' },
  treeSummaryCard: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#d1fae5' },
  treeSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  treeSummaryLabel: { fontSize: 12, color: '#64748b' },
  treeSummaryValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  treeSummaryBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  treeSummarySegment: { height: '100%' },
});

export default ParcelVerifyFormScreen;
