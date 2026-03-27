import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../config';
import { api } from '../../services/api';

const MemberActivationScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1: Vérification téléphone, 2: Création mot de passe
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [memberInfo, setMemberInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Étape 1: Vérifier le numéro de téléphone
  const handleCheckPhone = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setLoading(true);
    try {
      // Formater le numéro
      let formattedPhone = phoneNumber.replace(/\s/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+225' + formattedPhone;
      }

      const response = await api.get(`/auth/check-member-phone/${encodeURIComponent(formattedPhone)}`);
      const data = response.data;

      if (data.can_activate) {
        setMemberInfo(data);
        setStep(2);
      } else if (data.reason === 'has_account') {
        Alert.alert(
          'Compte existant',
          data.message,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
          ]
        );
      } else {
        Alert.alert('Non trouvé', data.message);
      }
    } catch (error) {
      console.error('Error checking phone:', error);
      Alert.alert('Erreur', 'Impossible de vérifier le numéro. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2: Activer le compte
  const handleActivateAccount = async () => {
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      let formattedPhone = phoneNumber.replace(/\s/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+225' + formattedPhone;
      }

      const response = await api.post('/auth/activate-member-account', {
        phone_number: formattedPhone,
        password: password,
      });
      const data = response.data;

      Alert.alert(
        'Succès!',
        data.message,
        [
          {
            text: 'Continuer',
            onPress: () => {
              // Connexion automatique
              login(data.access_token, data.user);
            },
            },
          ]
        );
    } catch (error) {
      console.error('Error activating account:', error);
      const msg = error.data?.detail || 'Impossible d\'activer le compte. Réessayez.';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => step === 1 ? navigation.goBack() : setStep(1)}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={40} color={COLORS.white} />
          </View>
          
          <Text style={styles.title}>Activation Compte Membre</Text>
          <Text style={styles.subtitle}>
            {step === 1 
              ? 'Entrez le numéro enregistré par votre coopérative'
              : 'Créez votre mot de passe pour activer votre compte'
            }
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
        </View>

        {/* Step 1: Phone Verification */}
        {step === 1 && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.phonePrefix}>+225</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="07 XX XX XX XX"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={12}
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Utilisez le même numéro que celui enregistré par votre coopérative lors de votre adhésion.
              </Text>
            </View>

            <Button
              title="Vérifier mon numéro"
              onPress={handleCheckPhone}
              loading={loading}
              style={styles.button}
            />
          </View>
        )}

        {/* Step 2: Create Password */}
        {step === 2 && memberInfo && (
          <View style={styles.formContainer}>
            {/* Member Info Card */}
            <View style={styles.memberCard}>
              <View style={styles.memberCardHeader}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                <Text style={styles.memberCardTitle}>Profil trouvé!</Text>
              </View>
              <View style={styles.memberCardRow}>
                <Text style={styles.memberCardLabel}>Nom:</Text>
                <Text style={styles.memberCardValue}>{memberInfo.member_name}</Text>
              </View>
              <View style={styles.memberCardRow}>
                <Text style={styles.memberCardLabel}>Coopérative:</Text>
                <Text style={styles.memberCardValue}>{memberInfo.cooperative_name}</Text>
              </View>
              {memberInfo.village && (
                <View style={styles.memberCardRow}>
                  <Text style={styles.memberCardLabel}>Village:</Text>
                  <Text style={styles.memberCardValue}>{memberInfo.village}</Text>
                </View>
              )}
            </View>

            {/* Password Fields */}
            <Text style={styles.label}>Créer un mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mot de passe (6 caractères min.)"
                placeholderTextColor={COLORS.gray[400]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.gray[400]}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="Répétez le mot de passe"
              placeholderTextColor={COLORS.gray[400]}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Button
              title="Activer mon compte"
              onPress={handleActivateAccount}
              loading={loading}
              style={styles.button}
            />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous avez déjà un compte?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl * 2,
    paddingBottom: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: -SPACING.lg,
    padding: SPACING.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: COLORS.white,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: SPACING.xs,
  },
  progressLineActive: {
    backgroundColor: COLORS.white,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.gray[200],
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.gray[800],
  },
  input: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.gray[800],
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.gray[800],
  },
  eyeButton: {
    padding: SPACING.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  memberCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  memberCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  memberCardRow: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  memberCardLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
    width: 100,
  },
  memberCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[800],
    flex: 1,
  },
  button: {
    marginTop: SPACING.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  footerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
});

export default MemberActivationScreen;
