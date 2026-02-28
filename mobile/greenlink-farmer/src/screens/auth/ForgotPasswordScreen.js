import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { COLORS } from '../../config';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: request, 2: verify code, 3: new password
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [simulationCode, setSimulationCode] = useState(null);

  // Step 1: Request reset code
  const handleRequestCode = async () => {
    if (!identifier.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email ou téléphone');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        identifier: identifier.trim()
      });
      
      // In simulation mode, show the code for testing
      if (response.data.simulation_code) {
        setSimulationCode(response.data.simulation_code);
      }
      
      Alert.alert('Succès', 'Code de réinitialisation envoyé');
      setStep(2);
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code à 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-reset-code', {
        identifier: identifier.trim(),
        code: code.trim()
      });
      
      Alert.alert('Succès', 'Code vérifié');
      setStep(3);
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        identifier: identifier.trim(),
        code: code.trim(),
        new_password: newPassword
      });
      
      Alert.alert(
        'Succès',
        'Mot de passe réinitialisé avec succès!',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressSteps = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[styles.progressStep, s <= step && styles.progressStepActive]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 && 'Mot de passe oublié'}
          {step === 2 && 'Vérification'}
          {step === 3 && 'Nouveau mot de passe'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderProgressSteps()}

          {/* Step 1: Request Code */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.stepTitle}>Réinitialiser votre mot de passe</Text>
              <Text style={styles.stepDescription}>
                Entrez votre email ou numéro de téléphone pour recevoir un code de vérification
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="Email ou téléphone"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRequestCode}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Envoi en cours...' : 'Envoyer le code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              {/* Simulation Notice */}
              {simulationCode && (
                <View style={styles.simulationBox}>
                  <Ionicons name="information-circle" size={20} color="#FF9800" />
                  <View style={styles.simulationContent}>
                    <Text style={styles.simulationTitle}>Mode Simulation</Text>
                    <Text style={styles.simulationText}>
                      Votre code: <Text style={styles.simulationCode}>{simulationCode}</Text>
                    </Text>
                    <Text style={styles.simulationNote}>
                      En production, envoyé par SMS/Email
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.iconContainer}>
                <Ionicons name="key-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.stepTitle}>Entrez le code</Text>
              <Text style={styles.stepDescription}>
                Un code à 6 chiffres a été envoyé à {identifier}
              </Text>

              <View style={styles.codeInputContainer}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  value={code}
                  onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={loading || code.length !== 6}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Vérification...' : 'Vérifier le code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.successText}>Code vérifié</Text>
              </View>

              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.stepTitle}>Nouveau mot de passe</Text>
              <Text style={styles.stepDescription}>
                Créez un nouveau mot de passe sécurisé
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              {confirmPassword && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  (loading || newPassword.length < 6 || newPassword !== confirmPassword) && styles.buttonDisabled
                ]}
                onPress={handleResetPassword}
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Réinitialisation...' : 'Réinitialiser'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Back to login */}
          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
            <Text style={styles.backToLoginText}>Retour à la connexion</Text>
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
  content: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  progressStep: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
  },
  progressStepActive: {
    backgroundColor: COLORS.primary,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 20,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  simulationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  simulationContent: {
    marginLeft: 12,
    flex: 1,
  },
  simulationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  simulationText: {
    fontSize: 14,
    color: '#F57C00',
    marginTop: 4,
  },
  simulationCode: {
    fontWeight: '700',
    fontSize: 18,
  },
  simulationNote: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 4,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 6,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginBottom: 10,
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  backToLoginText: {
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
});
