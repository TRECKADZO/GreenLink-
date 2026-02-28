import React, { useState } from 'react';
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
import { Button, Divider } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../config';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erreur', result.error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('Welcome')}
        >
          <Text style={styles.backButtonText}>← Accueil</Text>
        </TouchableOpacity>
        
        {/* Logo et titre */}
        <View style={styles.header}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>GreenLink</Text>
          <Text style={styles.subtitle}>Agriculture durable</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.welcome}>Bienvenue !</Text>
          <Text style={styles.instruction}>
            Entrez votre numéro de téléphone ou email pour vous connecter.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone ou Email</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="+225 XX XX XX XX XX"
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
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
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <Divider />

          <Text style={styles.noAccount}>Pas encore de compte ?</Text>
          <Button
            title="Créer un compte"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
          />

          {/* Member Activation Button */}
          <TouchableOpacity 
            style={styles.memberActivationButton}
            onPress={() => navigation.navigate('MemberActivation')}
          >
            <Text style={styles.memberActivationText}>
              Membre d'une coopérative ?{' '}
              <Text style={styles.memberActivationLink}>Activer mon compte</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Agriculture durable en Côte d'Ivoire
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
