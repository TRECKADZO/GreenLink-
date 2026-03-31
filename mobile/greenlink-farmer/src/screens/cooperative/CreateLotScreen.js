import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS, FONTS, SPACING } from '../../config';

const PRODUCT_TYPES = [
  { key: 'cacao', label: 'Cacao' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'anacarde', label: 'Anacarde' },
  { key: 'hevea', label: 'Hevea' },
];

const CERTIFICATIONS = [
  { key: '', label: 'Aucune' },
  { key: 'ARS 1000-1', label: 'Cacao Durable Niveau 1' },
  { key: 'ARS 1000-2', label: 'Cacao Durable Niveau 2' },
  { key: 'ARS 1000-3', label: 'Cacao Durable Niveau 3' },
  { key: 'fairtrade', label: 'Fairtrade' },
  { key: 'rainforest', label: 'Rainforest Alliance' },
  { key: 'utz', label: 'UTZ' },
  { key: 'bio', label: 'Bio / Organique' },
];

export default function CreateLotScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');

  // Step 1 form
  const [form, setForm] = useState({
    lot_name: '',
    target_tonnage: '',
    product_type: 'cacao',
    certification: '',
    min_carbon_score: '6',
    description: '',
  });

  // Step 2 — contributors: { memberId: { selected, name, tonnage_kg } }
  const [contributors, setContributors] = useState({});

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const goToStep2 = async () => {
    if (!form.lot_name.trim()) {
      Alert.alert('Erreur', 'Le nom du lot est obligatoire');
      return;
    }
    if (!form.target_tonnage || parseFloat(form.target_tonnage) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un tonnage cible valide');
      return;
    }

    setLoading(true);
    try {
      const data = await cooperativeApi.getMembers();
      const list = Array.isArray(data) ? data : (data.members || []);
      setMembers(list.filter(m => m.status === 'active' || m.is_active));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les membres');
    } finally {
      setLoading(false);
    }
    setStep(2);
  };

  const toggleContributor = (member) => {
    const id = member.id;
    setContributors(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        selected: !prev[id]?.selected,
        name: member.full_name,
        tonnage_kg: prev[id]?.tonnage_kg || '',
      }
    }));
  };

  const setTonnage = (memberId, value) => {
    setContributors(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], tonnage_kg: value }
    }));
  };

  const selectedCount = Object.values(contributors).filter(c => c.selected).length;
  const totalTonnage = Object.values(contributors)
    .filter(c => c.selected && c.tonnage_kg)
    .reduce((sum, c) => sum + parseFloat(c.tonnage_kg || 0), 0);

  const filteredMembers = members.filter(m =>
    !search || (m.full_name || '').toLowerCase().includes(search.toLowerCase())
      || (m.village || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    const contribList = Object.entries(contributors)
      .filter(([_, v]) => v.selected && v.tonnage_kg && parseFloat(v.tonnage_kg) > 0)
      .map(([id, v]) => ({
        farmer_id: id,
        farmer_name: v.name,
        tonnage_kg: parseFloat(v.tonnage_kg),
      }));

    if (contribList.length === 0) {
      Alert.alert('Erreur', 'Selectionnez au moins un agriculteur avec un tonnage');
      return;
    }

    setSubmitting(true);
    try {
      const result = await cooperativeApi.createLot({
        lot_name: form.lot_name.trim(),
        target_tonnage: parseFloat(form.target_tonnage),
        product_type: form.product_type,
        certification: form.certification || null,
        min_carbon_score: parseFloat(form.min_carbon_score || 6),
        description: form.description.trim() || null,
        contributors: contribList,
      });

      Alert.alert(
        'Lot cree',
        `Le lot "${form.lot_name}" a ete cree avec ${contribList.length} contributeur(s) pour un total de ${Math.round(totalTonnage)} kg.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erreur lors de la creation du lot';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ========= STEP 1 =========
  const renderStep1 = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={styles.stepDot} />
      </View>
      <Text style={styles.stepLabel}>Etape 1/2 — Informations du lot</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Nom du lot *</Text>
        <TextInput
          style={styles.input}
          value={form.lot_name}
          onChangeText={v => updateForm('lot_name', v)}
          placeholder="Ex: Lot Cacao Premium Mars 2026"
          placeholderTextColor={COLORS.gray[400]}
          data-testid="input-lot-name"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tonnage cible (kg) *</Text>
        <TextInput
          style={styles.input}
          value={form.target_tonnage}
          onChangeText={v => updateForm('target_tonnage', v)}
          placeholder="Ex: 5000"
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="numeric"
          data-testid="input-tonnage"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Type de produit</Text>
        <View style={styles.chipRow}>
          {PRODUCT_TYPES.map(pt => (
            <TouchableOpacity
              key={pt.key}
              style={[styles.chip, form.product_type === pt.key && styles.chipActive]}
              onPress={() => updateForm('product_type', pt.key)}
            >
              <Text style={[styles.chipText, form.product_type === pt.key && styles.chipTextActive]}>
                {pt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Certification</Text>
        <View style={styles.chipRow}>
          {CERTIFICATIONS.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, form.certification === c.key && styles.chipActive]}
              onPress={() => updateForm('certification', c.key)}
            >
              <Text style={[styles.chipText, form.certification === c.key && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Score carbone minimum</Text>
        <TextInput
          style={styles.input}
          value={form.min_carbon_score}
          onChangeText={v => updateForm('min_carbon_score', v)}
          placeholder="6"
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="numeric"
          data-testid="input-carbon-score"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
          value={form.description}
          onChangeText={v => updateForm('description', v)}
          placeholder="Notes supplementaires..."
          placeholderTextColor={COLORS.gray[400]}
          multiline
          data-testid="input-description"
        />
      </View>

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={goToStep2}
        disabled={loading}
        data-testid="next-step-button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.nextBtnText}>Suivant — Selectionner les agriculteurs</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // ========= STEP 2 =========
  const renderMemberItem = ({ item }) => {
    const c = contributors[item.id];
    const isSelected = c?.selected;

    return (
      <View style={[styles.memberCard, isSelected && styles.memberCardSelected]}>
        <TouchableOpacity
          style={styles.memberRow}
          onPress={() => toggleContributor(item)}
        >
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{item.full_name}</Text>
            <Text style={styles.memberVillage}>{item.village || 'Village inconnu'}</Text>
          </View>
        </TouchableOpacity>
        {isSelected && (
          <View style={styles.tonnageRow}>
            <Text style={styles.tonnageLabel}>Tonnage (kg):</Text>
            <TextInput
              style={styles.tonnageInput}
              value={c?.tonnage_kg?.toString() || ''}
              onChangeText={v => setTonnage(item.id, v)}
              placeholder="0"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="numeric"
            />
          </View>
        )}
      </View>
    );
  };

  const renderStep2 = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.step2Header}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>
        <Text style={styles.stepLabel}>Etape 2/2 — Agriculteurs contributeurs</Text>

        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{selectedCount}</Text>
            <Text style={styles.summaryLabel}>selectionnes</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{Math.round(totalTonnage).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>kg total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, totalTonnage >= parseFloat(form.target_tonnage || 0) ? { color: '#16a34a' } : { color: '#dc2626' }]}>
              {form.target_tonnage}
            </Text>
            <Text style={styles.summaryLabel}>kg cible</Text>
          </View>
        </View>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un agriculteur..."
          placeholderTextColor={COLORS.gray[400]}
        />
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={item => item.id}
        renderItem={renderMemberItem}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="people-outline" size={40} color={COLORS.gray[300]} />
            <Text style={{ color: COLORS.gray[400], marginTop: 8 }}>Aucun membre actif trouve</Text>
          </View>
        }
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
          <Text style={styles.backStepText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          data-testid="create-lot-button"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Creer le lot</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} data-testid="create-lot-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau lot de vente</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {step === 1 ? renderStep1() : renderStep2()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  content: { padding: SPACING.md, paddingBottom: 40 },

  // Step indicator
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.gray[300] },
  stepDotActive: { backgroundColor: COLORS.primary, width: 14, height: 14, borderRadius: 7 },
  stepDotDone: { backgroundColor: '#16a34a' },
  stepLine: { width: 40, height: 2, backgroundColor: COLORS.gray[300], marginHorizontal: 6 },
  stepLineDone: { backgroundColor: '#16a34a' },
  stepLabel: { fontSize: FONTS.sizes.sm, color: COLORS.gray[500], textAlign: 'center', marginBottom: SPACING.md },

  // Fields
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.gray[700], marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.gray[300],
    borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONTS.sizes.md, color: '#333',
  },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  chipActive: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.gray[600] },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },

  // Next button
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, marginTop: SPACING.lg,
  },
  nextBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  // Step 2
  step2Header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, backgroundColor: '#fff', paddingBottom: SPACING.sm },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#f0fdf4', borderRadius: 10, paddingVertical: 10, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  summaryLabel: { fontSize: 10, color: COLORS.gray[500] },
  summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.gray[200] },
  searchInput: {
    backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: SPACING.md,
    paddingVertical: 10, fontSize: FONTS.sizes.sm, color: '#333',
  },

  // Member cards
  memberCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: SPACING.md,
    marginBottom: 8, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  memberCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.gray[300],
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  memberName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: '#333' },
  memberVillage: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400] },
  tonnageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  tonnageLabel: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500] },
  tonnageInput: {
    flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: COLORS.gray[300],
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: FONTS.sizes.sm, color: '#333', textAlign: 'right',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  backStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 16 },
  backStepText: { color: COLORS.primary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
  },
  createBtnText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
