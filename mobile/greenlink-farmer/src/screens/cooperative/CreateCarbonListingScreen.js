import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const CREDIT_TYPES = [
  { key: 'Agroforesterie', label: 'Agroforesterie', desc: 'Arbres + cultures', icon: 'leaf' },
  { key: 'Reforestation', label: 'Reforestation', desc: 'Nouvelles forets', icon: 'earth' },
  { key: 'Agriculture Regenerative', label: 'Agriculture Regenerative', desc: 'Regeneration des sols', icon: 'flower' },
  { key: 'Conservation', label: 'Conservation', desc: 'Protection REDD+', icon: 'shield' },
];

const STANDARDS = [
  { key: 'Verra VCS', label: 'Verra VCS', desc: 'Le plus utilise mondialement' },
  { key: 'Gold Standard', label: 'Gold Standard', desc: 'Co-benefices sociaux' },
  { key: 'Plan Vivo', label: 'Plan Vivo', desc: 'Communautes rurales' },
];

const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzope', 'Agboville',
  'Bouafle', 'Bouake', 'Daloa', 'Dimbokro', 'Divo',
  'Gagnoa', 'Guiglo', 'Issia', 'Lakota', 'Man',
  'San-Pedro', 'Sassandra', 'Soubre', 'Tabou', 'Yamoussoukro',
];

export default function CreateCarbonListingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    credit_type: '',
    verification_standard: '',
    project_name: '',
    project_description: '',
    quantity_tonnes_co2: '',
    vintage_year: new Date().getFullYear().toString(),
    region: 'Cote d\'Ivoire',
    department: '',
    area_hectares: '',
    trees_planted: '',
    farmers_involved: '',
    methodology: '',
  });

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // ============ STEP 1 ============
  const renderStep1 = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <StepHeader current={1} total={3} label="Type de credit et standard" />

      <Text style={styles.sectionTitle}>Type de credit carbone *</Text>
      {CREDIT_TYPES.map(ct => (
        <TouchableOpacity
          key={ct.key}
          style={[styles.optionCard, form.credit_type === ct.key && styles.optionCardActive]}
          onPress={() => updateForm('credit_type', ct.key)}
        >
          <View style={[styles.optionIcon, form.credit_type === ct.key && styles.optionIconActive]}>
            <Ionicons name={ct.icon} size={20} color={form.credit_type === ct.key ? '#fff' : COLORS.gray[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionName, form.credit_type === ct.key && styles.optionNameActive]}>{ct.label}</Text>
            <Text style={styles.optionDesc}>{ct.desc}</Text>
          </View>
          {form.credit_type === ct.key && <Ionicons name="checkmark-circle" size={22} color="#059669" />}
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Standard de verification *</Text>
      {STANDARDS.map(s => (
        <TouchableOpacity
          key={s.key}
          style={[styles.optionCard, form.verification_standard === s.key && styles.optionCardActive]}
          onPress={() => updateForm('verification_standard', s.key)}
        >
          <View style={[styles.optionIcon, form.verification_standard === s.key && styles.optionIconActive]}>
            <Ionicons name="shield-checkmark" size={20} color={form.verification_standard === s.key ? '#fff' : COLORS.gray[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionName, form.verification_standard === s.key && styles.optionNameActive]}>{s.label}</Text>
            <Text style={styles.optionDesc}>{s.desc}</Text>
          </View>
          {form.verification_standard === s.key && <Ionicons name="checkmark-circle" size={22} color="#059669" />}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.nextBtn, (!form.credit_type || !form.verification_standard) && styles.nextBtnDisabled]}
        onPress={() => {
          if (!form.credit_type) return Alert.alert('Erreur', 'Selectionnez un type de credit');
          if (!form.verification_standard) return Alert.alert('Erreur', 'Selectionnez un standard');
          setStep(2);
        }}
        disabled={!form.credit_type || !form.verification_standard}
      >
        <Text style={styles.nextBtnText}>Suivant</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );

  // ============ STEP 2 ============
  const renderStep2 = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <StepHeader current={2} total={3} label="Details du projet" />

      <Field label="Nom du projet *" value={form.project_name}
        onChange={v => updateForm('project_name', v)} placeholder="Ex: Agroforesterie Cacao Durable Soubre" testId="input-project-name" />

      <Field label="Description du projet *" value={form.project_description}
        onChange={v => updateForm('project_description', v)}
        placeholder="Decrivez votre projet carbone, les activites realisees..."
        multiline testId="input-description" />

      <Field label="Quantite (tonnes CO2) *" value={form.quantity_tonnes_co2}
        onChange={v => updateForm('quantity_tonnes_co2', v)} placeholder="Ex: 500" numeric testId="input-quantity" />

      <Field label="Annee du vintage *" value={form.vintage_year}
        onChange={v => updateForm('vintage_year', v)} placeholder="2026" numeric testId="input-year" />

      <Text style={styles.label}>Departement</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
        <View style={styles.chipRow}>
          {DEPARTMENTS.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, form.department === d && styles.chipActive]}
              onPress={() => updateForm('department', d)}
            >
              <Text style={[styles.chipText, form.department === d && styles.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Field label="Methodologie (optionnel)" value={form.methodology}
        onChange={v => updateForm('methodology', v)} placeholder="Ex: VM0015 - REDD+ Methodology" testId="input-methodology" />

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { flex: 1 }]}
          onPress={() => {
            if (!form.project_name.trim()) return Alert.alert('Erreur', 'Le nom du projet est obligatoire');
            if (!form.project_description.trim()) return Alert.alert('Erreur', 'La description est obligatoire');
            if (!form.quantity_tonnes_co2 || parseFloat(form.quantity_tonnes_co2) <= 0)
              return Alert.alert('Erreur', 'Veuillez entrer une quantite valide');
            setStep(3);
          }}
        >
          <Text style={styles.nextBtnText}>Suivant</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ============ STEP 3 ============
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        credit_type: form.credit_type,
        project_name: form.project_name.trim(),
        project_description: form.project_description.trim(),
        verification_standard: form.verification_standard,
        quantity_tonnes_co2: parseFloat(form.quantity_tonnes_co2),
        vintage_year: parseInt(form.vintage_year),
        region: form.region || 'Cote d\'Ivoire',
        department: form.department,
        methodology: form.methodology || null,
        area_hectares: form.area_hectares ? parseFloat(form.area_hectares) : null,
        trees_planted: form.trees_planted ? parseInt(form.trees_planted) : null,
        farmers_involved: form.farmers_involved ? parseInt(form.farmers_involved) : null,
      };

      await api.post('/carbon-listings/submit', payload);

      Alert.alert(
        'Soumission envoyee',
        'Vos credits carbone ont ete soumis pour validation par le Super Admin. Vous serez notifie de la decision.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erreur lors de la soumission';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStep3 = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <StepHeader current={3} total={3} label="Impact et soumission" />

      <Field label="Surface couverte (hectares)" value={form.area_hectares}
        onChange={v => updateForm('area_hectares', v)} placeholder="Ex: 150" numeric testId="input-area" />

      <Field label="Nombre d'arbres plantes" value={form.trees_planted}
        onChange={v => updateForm('trees_planted', v)} placeholder="Ex: 10000" numeric testId="input-trees" />

      <Field label="Nombre de producteurs impliques" value={form.farmers_involved}
        onChange={v => updateForm('farmers_involved', v)} placeholder="Ex: 200" numeric testId="input-farmers" />

      {/* Recap */}
      <View style={styles.recapCard}>
        <Text style={styles.recapTitle}>Recapitulatif</Text>
        <RecapRow label="Type" value={form.credit_type} />
        <RecapRow label="Standard" value={form.verification_standard} />
        <RecapRow label="Projet" value={form.project_name} />
        <RecapRow label="Quantite" value={`${form.quantity_tonnes_co2} t CO2`} />
        <RecapRow label="Annee" value={form.vintage_year} />
        {form.department ? <RecapRow label="Departement" value={form.department} /> : null}
        {form.area_hectares ? <RecapRow label="Surface" value={`${form.area_hectares} ha`} /> : null}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color="#0ea5e9" />
        <Text style={styles.infoBoxText}>
          Le Super Admin fixera le prix par tonne apres validation. La repartition : 70% agriculteurs, 25% GreenLink, 5% cooperative (sur le montant net apres 30% de frais).
        </Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
          data-testid="submit-carbon-listing"
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Soumettre pour validation</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} data-testid="create-carbon-listing-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau credit carbone</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ REUSABLE COMPONENTS ============

const StepHeader = ({ current, total, label }) => (
  <View style={{ marginBottom: SPACING.lg }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={[styles.dot, i < current ? styles.dotActive : null, i < current - 1 ? styles.dotDone : null]} />
          {i < total - 1 && <View style={[styles.line, i < current - 1 ? styles.lineDone : null]} />}
        </React.Fragment>
      ))}
    </View>
    <Text style={styles.stepLabel}>Etape {current}/{total} — {label}</Text>
  </View>
);

const Field = ({ label, value, onChange, placeholder, multiline, numeric, testId }) => (
  <View style={{ marginBottom: SPACING.md }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.gray[400]}
      multiline={multiline}
      keyboardType={numeric ? 'numeric' : 'default'}
      data-testid={testId}
    />
  </View>
);

const RecapRow = ({ label, value }) => (
  <View style={styles.recapRow}>
    <Text style={styles.recapLabel}>{label}</Text>
    <Text style={styles.recapValue}>{value}</Text>
  </View>
);

// ============ STYLES ============

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: '#059669',
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  content: { padding: SPACING.md, paddingBottom: 40 },

  // Step indicator
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.gray[300] },
  dotActive: { backgroundColor: '#059669', width: 14, height: 14, borderRadius: 7 },
  dotDone: { backgroundColor: '#16a34a' },
  line: { width: 30, height: 2, backgroundColor: COLORS.gray[300], marginHorizontal: 4 },
  lineDone: { backgroundColor: '#16a34a' },
  stepLabel: { fontSize: FONTS.sizes.sm, color: COLORS.gray[500], textAlign: 'center' },

  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#333', marginBottom: 10 },

  // Option cards
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  optionCardActive: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
  optionIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  optionIconActive: { backgroundColor: '#059669' },
  optionName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: '#333' },
  optionNameActive: { color: '#059669' },
  optionDesc: { fontSize: 11, color: COLORS.gray[400] },

  // Fields
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.gray[700], marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.gray[300],
    borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONTS.sizes.md, color: '#333',
  },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0',
  },
  chipActive: { backgroundColor: '#059669' + '20', borderColor: '#059669' },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.gray[600] },
  chipTextActive: { color: '#059669', fontWeight: '600' },

  // Recap
  recapCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: '#d1fae5', marginBottom: SPACING.md,
  },
  recapTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#059669', marginBottom: 10 },
  recapRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  recapLabel: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500] },
  recapValue: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: '#333', maxWidth: '60%', textAlign: 'right' },

  // Info box
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#e0f2fe', borderRadius: 10, padding: SPACING.md, marginBottom: SPACING.md,
  },
  infoBoxText: { flex: 1, fontSize: 11, color: '#0369a1', lineHeight: 16 },

  // Buttons
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SPACING.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 16 },
  backBtnText: { color: COLORS.primary, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, marginTop: SPACING.md,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },
  submitBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14,
  },
  submitBtnText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
