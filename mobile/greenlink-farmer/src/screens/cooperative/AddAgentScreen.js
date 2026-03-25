import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS, FONTS, SPACING } from '../../config';

const AddAgentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    zone: '',
    village_coverage: '',
  });

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      Alert.alert('Erreur', 'Le nom complet est obligatoire');
      return;
    }
    if (!form.phone_number.trim() || form.phone_number.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numero de telephone valide');
      return;
    }
    if (!form.zone.trim()) {
      Alert.alert('Erreur', 'La zone est obligatoire');
      return;
    }

    setLoading(true);
    try {
      const agentData = {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        email: form.email.trim() || null,
        zone: form.zone.trim(),
        village_coverage: form.village_coverage
          ? form.village_coverage.split(',').map(v => v.trim()).filter(v => v)
          : [],
      };

      const result = await cooperativeApi.createAgent(agentData);

      Alert.alert(
        'Agent cree',
        `${form.full_name} a ete ajoute comme agent terrain.\n\nIl peut maintenant activer son compte via l'application mobile avec le numero ${form.phone_number}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const msg = error.response?.data?.detail || 'Erreur lors de la creation de l\'agent';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} data-testid="add-agent-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouvel agent terrain</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#0ea5e9" />
            <Text style={styles.infoText}>
              Creez un agent terrain pour votre cooperative. L'agent pourra ensuite activer son compte avec son numero de telephone.
            </Text>
          </View>

          {/* Nom complet */}
          <View style={styles.field}>
            <Text style={styles.label}>Nom complet *</Text>
            <TextInput
              style={styles.input}
              value={form.full_name}
              onChangeText={(v) => updateField('full_name', v)}
              placeholder="Ex: Kouame Jean"
              placeholderTextColor={COLORS.gray[400]}
              data-testid="input-full-name"
            />
          </View>

          {/* Telephone */}
          <View style={styles.field}>
            <Text style={styles.label}>Telephone *</Text>
            <TextInput
              style={styles.input}
              value={form.phone_number}
              onChangeText={(v) => updateField('phone_number', v)}
              placeholder="+225 07 XX XX XX XX"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="phone-pad"
              data-testid="input-phone"
            />
          </View>

          {/* Zone */}
          <View style={styles.field}>
            <Text style={styles.label}>Zone / Region *</Text>
            <TextInput
              style={styles.input}
              value={form.zone}
              onChangeText={(v) => updateField('zone', v)}
              placeholder="Ex: Gagnoa, Soubre"
              placeholderTextColor={COLORS.gray[400]}
              data-testid="input-zone"
            />
          </View>

          {/* Email (optionnel) */}
          <View style={styles.field}>
            <Text style={styles.label}>Email (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              placeholder="agent@email.com"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              data-testid="input-email"
            />
          </View>

          {/* Villages couverts */}
          <View style={styles.field}>
            <Text style={styles.label}>Villages couverts (optionnel)</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={form.village_coverage}
              onChangeText={(v) => updateField('village_coverage', v)}
              placeholder="Separez par des virgules: Village1, Village2"
              placeholderTextColor={COLORS.gray[400]}
              multiline
              data-testid="input-villages"
            />
            <Text style={styles.hint}>Separez les villages par des virgules</Text>
          </View>

          {/* Bouton Creer */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            data-testid="submit-agent-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Creer l'agent terrain</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info attribution */}
          <View style={styles.attributionInfo}>
            <Ionicons name="people" size={18} color={COLORS.primary} />
            <Text style={styles.attributionText}>
              Apres la creation, vous pourrez lui attribuer des planteurs depuis la liste des agents.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  content: { padding: SPACING.md, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#e0f2fe', borderRadius: 10, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: '#7dd3fc',
  },
  infoText: { flex: 1, fontSize: FONTS.sizes.xs, color: '#0369a1', lineHeight: 18 },
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.gray[700], marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.gray[300],
    borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONTS.sizes.md, color: '#333',
  },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], marginTop: 4 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, marginTop: SPACING.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },
  attributionInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: SPACING.lg, backgroundColor: '#e0f2e9',
    borderRadius: 10, padding: SPACING.md,
  },
  attributionText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.primary, lineHeight: 18 },
});

export default AddAgentScreen;
