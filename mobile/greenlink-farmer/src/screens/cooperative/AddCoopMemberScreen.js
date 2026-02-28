import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';

export default function AddCoopMemberScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    village: '',
    cni_number: '',
    consent_given: true,
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.full_name.trim()) {
      Alert.alert('Erreur', 'Le nom complet est requis');
      return;
    }
    if (!formData.phone_number.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
      return;
    }
    if (!formData.village.trim()) {
      Alert.alert('Erreur', 'Le village est requis');
      return;
    }
    if (!formData.consent_given) {
      Alert.alert('Erreur', 'Le consentement du membre est requis');
      return;
    }

    try {
      setLoading(true);
      const result = await cooperativeApi.createMember(formData);
      Alert.alert(
        'Succès',
        'Membre ajouté avec succès',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating member:', error);
      const message = error.response?.data?.detail || 'Impossible de créer le membre';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau Membre</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Kouassi Jean-Baptiste"
                value={formData.full_name}
                onChangeText={(value) => handleChange('full_name', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de téléphone *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: +225 07 12 34 56 78"
                value={formData.phone_number}
                onChangeText={(value) => handleChange('phone_number', value)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Village */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Village *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Issia, Gagnoa, Daloa..."
                value={formData.village}
                onChangeText={(value) => handleChange('village', value)}
              />
            </View>
          </View>

          {/* CNI Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro CNI (optionnel)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: CI-001234567"
                value={formData.cni_number}
                onChangeText={(value) => handleChange('cni_number', value)}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Consent */}
          <View style={styles.consentContainer}>
            <View style={styles.consentInfo}>
              <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
              <View style={styles.consentTextContainer}>
                <Text style={styles.consentTitle}>Consentement RGPD</Text>
                <Text style={styles.consentDescription}>
                  Le membre accepte que ses données soient collectées et utilisées conformément
                  aux exigences EUDR
                </Text>
              </View>
            </View>
            <Switch
              value={formData.consent_given}
              onValueChange={(value) => handleChange('consent_given', value)}
              trackColor={{ false: '#e0e0e0', true: COLORS.primary + '60' }}
              thumbColor={formData.consent_given ? COLORS.primary : '#f4f3f4'}
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              Le membre sera créé avec le statut "En attente de validation".
              Vous pourrez le valider depuis la fiche du membre.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Création...</Text>
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Ajouter le membre</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#333',
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  consentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  consentTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  consentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  consentDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
