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
  Modal,
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
    pin_code: '',
    hectares: '',
    consent_given: true,
  });
  const [successModal, setSuccessModal] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Erreur', 'Le nom complet est requis');
      return;
    }
    if (!formData.phone_number.trim()) {
      Alert.alert('Erreur', 'Le numero de telephone est requis');
      return;
    }
    if (!formData.village.trim()) {
      Alert.alert('Erreur', 'Le village est requis');
      return;
    }
    if (!formData.pin_code || formData.pin_code.length !== 4 || !/^\d{4}$/.test(formData.pin_code)) {
      Alert.alert('Erreur', 'Le code PIN a 4 chiffres est obligatoire pour le USSD');
      return;
    }
    if (!formData.consent_given) {
      Alert.alert('Erreur', 'Le consentement du membre est requis');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        hectares: formData.hectares ? parseFloat(formData.hectares) : null,
      };
      const result = await cooperativeApi.createMember(payload);
      
      setSuccessModal({
        name: formData.full_name,
        phone: formData.phone_number,
        code_planteur: result.code_planteur,
        pin_configured: result.pin_configured,
      });
    } catch (error) {
      console.error('Error creating member:', error);
      const message = error.response?.data?.detail || 'Impossible de creer le membre. Verifiez votre connexion.';
      Alert.alert('Erreur', typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModal(null);
    navigation.goBack();
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
            <Text style={styles.label}>Numero de telephone *</Text>
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

          {/* PIN Code - OBLIGATOIRE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Code PIN USSD (4 chiffres) *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: 1234"
                value={formData.pin_code}
                onChangeText={(value) => {
                  const clean = value.replace(/\D/g, '').slice(0, 4);
                  handleChange('pin_code', clean);
                }}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
            <Text style={styles.fieldHint}>
              Ce PIN permet au planteur d'utiliser le USSD *144*88#
            </Text>
          </View>

          {/* Hectares */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Superficie approximative (hectares)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="leaf-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Ex: 2.5"
                value={formData.hectares}
                onChangeText={(value) => handleChange('hectares', value)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* CNI Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numero CNI (optionnel)</Text>
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
                  Le membre accepte que ses donnees soient collectees et utilisees conformement
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
              Un Code Planteur unique sera genere automatiquement.
              Le membre pourra utiliser le USSD *144*88# avec son PIN.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Creation...</Text>
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

      {/* Success Modal */}
      <Modal visible={!!successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#4CAF50" />
            </View>
            <Text style={styles.modalTitle}>Membre enregistre !</Text>
            
            {successModal && (
              <>
                <View style={styles.codePlanteurBox}>
                  <Text style={styles.codePlanteurLabel}>Code Planteur</Text>
                  <Text style={styles.codePlanteurValue}>{successModal.code_planteur}</Text>
                  <Text style={styles.codePlanteurHint}>Conservez ce code, il identifie le planteur</Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Nom :</Text>
                  <Text style={styles.modalInfoValue}>{successModal.name}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Telephone :</Text>
                  <Text style={styles.modalInfoValue}>{successModal.phone}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>PIN USSD :</Text>
                  <View style={[styles.pinBadge, { backgroundColor: successModal.pin_configured ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Text style={{ color: successModal.pin_configured ? '#2E7D32' : '#E65100', fontSize: 13, fontWeight: '600' }}>
                      {successModal.pin_configured ? 'Configure' : 'Non configure'}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.modalButton} onPress={handleCloseSuccess}>
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  fieldHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    marginLeft: 4,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 16,
  },
  codePlanteurBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  codePlanteurLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  codePlanteurValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: 2,
  },
  codePlanteurHint: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 6,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  modalInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    width: 100,
  },
  modalInfoValue: {
    fontSize: 14,
    color: COLORS.dark,
    flex: 1,
  },
  pinBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
