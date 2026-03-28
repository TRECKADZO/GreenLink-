import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRealConnectionStatus } from '../../hooks/useRealConnectionStatus';
import { Button, Divider } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../config';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const { checkNow } = useRealConnectionStatus();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    // 1. Pre-check connectivite via vrai HEAD ping (pas NetInfo seul)
    const connectivity = await checkNow();
    if (!connectivity.isOnline) {
      setLoading(false);
      Alert.alert(
        'Pas de connexion',
        'Pas de connexion internet. Verifiez votre WiFi ou donnees mobiles.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (!connectivity.isServerReachable) {
      setLoading(false);
      Alert.alert(
        'Serveur indisponible',
        'Le serveur est temporairement indisponible. Reessayez dans quelques instants.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Reessayer', onPress: () => handleLogin() },
        ]
      );
      return;
    }

    // 2. Tenter le login
    const result = await login(identifier.trim(), password);
    setLoading(false);

    if (!result.success) {
      const title = result.isServerError ? 'Connexion impossible' : 'Erreur';
      const buttons = result.isServerError
        ? [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Reessayer', onPress: () => handleLogin() },
          ]
        : [{ text: 'OK' }];

      Alert.alert(title, result.error, buttons);
    }
  }, [identifier, password, login, checkNow]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Welcome')}
          data-testid="login-back-button"
        >
          <Text style={styles.backButtonText}>← Accueil</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>GreenLink Agritech</Text>
          <Text style={styles.subtitle}>Agriculture durable</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.welcome}>Bienvenue !</Text>
          <Text style={styles.instruction}>
            Entrez votre numero de telephone ou email pour vous connecter.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telephone ou Email</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="+225 XX XX XX XX XX"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              data-testid="login-identifier-input"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.gray[400]}
                secureTextEntry={!showPassword}
                data-testid="login-password-input"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                data-testid="login-toggle-password"
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
            data-testid="login-forgot-password"
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublie ?</Text>
          </TouchableOpacity>

          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
            data-testid="login-submit-button"
          />

          <Divider />

          <Text style={styles.noAccount}>Pas encore de compte ?</Text>
          <Button
            title="Creer un compte"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
            data-testid="login-register-button"
          />

          <TouchableOpacity
            style={styles.memberActivationButton}
            onPress={() => navigation.navigate('MemberActivation')}
            data-testid="login-member-activation"
          >
            <Text style={styles.memberActivationText}>
              Inscrit par une cooperative ?{' '}
              <Text style={styles.memberActivationLink}>Activer mon acces</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.agentActivationButton}
            onPress={() => navigation.navigate('AgentActivation')}
            data-testid="login-agent-activation"
          >
            <Text style={styles.agentActivationText}>
              Agent terrain ?{' '}
              <Text style={styles.agentActivationLink}>Activer mon acces agent</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Agriculture durable en Cote d'Ivoire
          </Text>
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
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  logo: {
    fontSize: 64,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  form: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  welcome: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: SPACING.sm,
  },
  instruction: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONTS.sizes.lg,
    backgroundColor: COLORS.gray[50],
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    backgroundColor: COLORS.gray[50],
  },
  passwordInput: {
    flex: 1,
    padding: SPACING.md,
    fontSize: FONTS.sizes.lg,
  },
  eyeButton: {
    padding: SPACING.md,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  noAccount: {
    textAlign: 'center',
    color: COLORS.gray[600],
    marginBottom: SPACING.md,
    fontSize: FONTS.sizes.md,
  },
  memberActivationButton: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    alignItems: 'center',
  },
  memberActivationText: {
    color: COLORS.gray[600],
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  memberActivationLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  agentActivationButton: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#06b6d410',
    borderRadius: 12,
    alignItems: 'center',
  },
  agentActivationText: {
    color: COLORS.gray[600],
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  agentActivationLink: {
    color: '#06b6d4',
    fontWeight: '700',
  },
  footer: {
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  footerText: {
    color: COLORS.gray[500],
    fontSize: FONTS.sizes.sm,
  },
});

export default LoginScreen;
