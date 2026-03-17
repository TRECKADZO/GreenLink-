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
import { COLORS, FONTS, SPACING, API_URL } from '../../config';

const AgentActivationScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agentInfo, setAgentInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleCheckPhone = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setLoading(true);
    try {
      let formattedPhone = phoneNumber.replace(/\s/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+225' + formattedPhone;
      }

      const response = await fetch(`${API_URL}/api/auth/check-agent-phone/${encodeURIComponent(formattedPhone)}`);
      const data = await response.json();

      if (data.can_activate) {
        setAgentInfo(data);
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

      const response = await fetch(`${API_URL}/api/auth/activate-agent-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: formattedPhone,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Compte Activé!',
          data.message,
          [
            {
              text: 'Commencer',
              onPress: () => {
                login(data.access_token, data.user);
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', data.detail || 'Activation échouée');
      }
    } catch (error) {
      console.error('Error activating account:', error);
      Alert.alert('Erreur', 'Impossible d\'activer le compte. Réessayez.');
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
            <Ionicons name="shield-checkmark" size={40} color={COLORS.white} />
          </View>
          
          <Text style={styles.title}>Agent Terrain</Text>
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
              <Ionicons name="shield-checkmark" size={20} color="#06b6d4" />
              <Text style={styles.infoText}>
                Vous devez être enregistré comme agent terrain par votre coopérative pour activer votre compte.
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
        {step === 2 && agentInfo && (
          <View style={styles.formContainer}>
            {/* Agent Info Card */}
            <View style={styles.agentCard}>
              <View style={styles.agentCardHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#06b6d4" />
                <Text style={styles.agentCardTitle}>Profil Agent Trouvé!</Text>
              </View>
              <View style={styles.agentCardRow}>
                <Text style={styles.agentCardLabel}>Nom:</Text>
                <Text style={styles.agentCardValue}>{agentInfo.agent_name}</Text>
              </View>
              <View style={styles.agentCardRow}>
                <Text style={styles.agentCardLabel}>Coopérative:</Text>
                <Text style={styles.agentCardValue}>{agentInfo.cooperative_name}</Text>
              </View>
              {agentInfo.zone && (
                <View style={styles.agentCardRow}>
                  <Text style={styles.agentCardLabel}>Zone:</Text>
                  <Text style={styles.agentCardValue}>{agentInfo.zone}</Text>
                </View>
              )}
              <View style={styles.permissionsBox}>
                <Text style={styles.permissionsTitle}>Vos permissions:</Text>
                <View style={styles.permissionsList}>
                  <View style={styles.permissionItem}>
                    <Ionicons name="stats-chart" size={16} color="#06b6d4" />
                    <Text style={styles.permissionText}>Tableau de bord performance</Text>
                  </View>
                  <View style={styles.permissionItem}>
                    <Ionicons name="clipboard" size={16} color="#06b6d4" />
                    <Text style={styles.permissionText}>Visites SSRTE</Text>
                  </View>
                  <View style={styles.permissionItem}>
                    <Ionicons name="person-add" size={16} color="#06b6d4" />
                    <Text style={styles.permissionText}>Enregistrement membres</Text>
                  </View>
                  <View style={styles.permissionItem}>
                    <Ionicons name="map" size={16} color="#06b6d4" />
                    <Text style={styles.permissionText}>Déclaration parcelles</Text>
                  </View>
                  <View style={styles.permissionItem}>
                    <Ionicons name="camera" size={16} color="#06b6d4" />
                    <Text style={styles.permissionText}>Photos géolocalisées</Text>
                  </View>
                  <View style={styles.permissionItem}>
                    <Ionicons name="shield-checkmark" size={16} color="#06b6d4" />
                    <Text style={styles.permissionText}>Suivi travail des enfants</Text>
                  </View>
                </View>
              </View>
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
              title="Activer mon compte Agent"
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
    backgroundColor: '#06b6d4',
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
    backgroundColor: '#06b6d410',
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
  agentCard: {
    backgroundColor: '#06b6d410',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  agentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  agentCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06b6d4',
    marginLeft: SPACING.sm,
  },
  agentCardRow: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  agentCardLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
    width: 100,
  },
  agentCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[800],
    flex: 1,
  },
  permissionsBox: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#06b6d430',
  },
  permissionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: SPACING.xs,
  },
  permissionText: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginLeft: 4,
  },
  button: {
    marginTop: SPACING.lg,
    backgroundColor: '#06b6d4',
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

export default AgentActivationScreen;
