import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../config';

const USER_TYPES = [
  { id: 'producteur', label: 'Producteur', icon: '🌱', description: 'Je cultive et vends mes récoltes' },
  { id: 'cooperative', label: 'Coopérative', icon: '🤝', description: 'Je gère une coopérative agricole' },
];

const RegisterScreen = ({ navigation, route }) => {
  const { register } = useAuth();
  // Get userType from route params if provided (from Welcome screen)
  const initialUserType = route?.params?.userType || 'producteur';
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: initialUserType,
    coopName: '',
    coopCode: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!formData.fullName || !formData.phone || !formData.password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!acceptTerms) {
      Alert.alert('Erreur', 'Vous devez accepter les conditions d\'utilisation');
      return;
    }

    // Validation spécifique coopérative
    if (formData.userType === 'cooperative') {
      if (!formData.coopName) {
        Alert.alert('Erreur', 'Veuillez entrer le nom de la coopérative');
        return;
      }
      if (!formData.email) {
        Alert.alert('Erreur', 'L\'email est obligatoire pour les coopératives');
        return;
      }
    }

    setLoading(true);
    
    const registerData = {
      full_name: formData.fullName,
      phone_number: formData.phone,
      password: formData.password,
      user_type: formData.userType,
    };

    // Ajouter les champs email et coopérative si nécessaire
    if (formData.email) {
      registerData.email = formData.email;
    }
    if (formData.userType === 'cooperative') {
      registerData.coop_name = formData.coopName;
      registerData.coop_code = formData.coopCode || `COOP-${Date.now().toString().slice(-6)}`;
    }

    const result = await register(registerData);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erreur', result.error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoignez GreenLink</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* User Type Selection */}
        <Text style={styles.sectionTitle}>Type de compte *</Text>
        <View style={styles.userTypeContainer}>
          {USER_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.userTypeCard,
                formData.userType === type.id && styles.userTypeCardSelected,
              ]}
              onPress={() => setFormData({ ...formData, userType: type.id })}
            >
              <Text style={styles.userTypeIcon}>{type.icon}</Text>
              <Text style={[
                styles.userTypeLabel,
                formData.userType === type.id && styles.userTypeLabelSelected,
              ]}>
                {type.label}
              </Text>
              <Text style={styles.userTypeDescription}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom complet *</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="Jean Kouadio"
            placeholderTextColor={COLORS.gray[400]}
          />
        </View>

        {/* Cooperative specific fields */}
        {formData.userType === 'cooperative' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom de la Coopérative *</Text>
              <TextInput
                style={styles.input}
                value={formData.coopName}
                onChangeText={(text) => setFormData({ ...formData, coopName: text })}
                placeholder="Coopérative Agricole de..."
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Code Coopérative (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={formData.coopCode}
                onChangeText={(text) => setFormData({ ...formData, coopCode: text })}
                placeholder="Ex: CI-GAG-001"
                placeholderTextColor={COLORS.gray[400]}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="contact@cooperative.ci"
                placeholderTextColor={COLORS.gray[400]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Numéro de téléphone *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="+225 07 XX XX XX XX"
            placeholderTextColor={COLORS.gray[400]}
            keyboardType="phone-pad"
          />
          <Text style={styles.hint}>Format: +225XXXXXXXXXX</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mot de passe *</Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            placeholder="Minimum 6 caractères"
            placeholderTextColor={COLORS.gray[400]}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirmer le mot de passe *</Text>
          <TextInput
            style={styles.input}
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            placeholder="Confirmez votre mot de passe"
            placeholderTextColor={COLORS.gray[400]}
            secureTextEntry
          />
        </View>

        {/* Terms checkbox */}
        <TouchableOpacity 
          style={styles.termsContainer}
          onPress={() => setAcceptTerms(!acceptTerms)}
        >
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
            {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            J'accepte les conditions d'utilisation et la politique de confidentialité
          </Text>
        </TouchableOpacity>

        <Button
          title="Créer mon compte"
          onPress={handleRegister}
          loading={loading}
          style={styles.registerButton}
        />

        <Text style={styles.loginText}>
          Déjà inscrit ?{' '}
          <Text 
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            Se connecter
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 60,
  },
  backButton: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
  },
  form: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: SPACING.md,
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  userTypeCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
  },
  userTypeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  userTypeIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  userTypeLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: 4,
  },
  userTypeLabelSelected: {
    color: COLORS.primary,
  },
  userTypeDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    textAlign: 'center',
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
  hint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: SPACING.xs,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: SPACING.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.gray[400],
    borderRadius: 4,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  registerButton: {
    marginBottom: SPACING.lg,
  },
  loginText: {
    textAlign: 'center',
    color: COLORS.gray[600],
    fontSize: FONTS.sizes.md,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
