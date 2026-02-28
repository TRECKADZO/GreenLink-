import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../config';

const USER_TYPES = [
  { id: 'producteur', label: 'Producteur', icon: '🌱', description: 'Je cultive et vends mes récoltes' },
  { id: 'cooperative', label: 'Coopérative', icon: '🤝', description: 'Je gère une coopérative agricole' },
];

// Terms of Service content
const TERMS_CONTENT = `CONDITIONS GÉNÉRALES D'UTILISATION

Dernière mise à jour : Février 2026

1. OBJET
Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application mobile GreenLink et de tous les services associés.

2. INSCRIPTION
- L'inscription est gratuite pour les producteurs et coopératives
- Les informations fournies doivent être exactes et à jour
- Chaque utilisateur est responsable de la confidentialité de ses identifiants

3. SERVICES PROPOSÉS
- Gestion des parcelles agricoles
- Déclaration des récoltes
- Suivi des primes carbone
- Marketplace d'intrants agricoles
- Marketplace de crédits carbone RSE

4. DONNÉES PERSONNELLES
Les données collectées sont utilisées uniquement dans le cadre des services GreenLink et ne sont jamais vendues à des tiers.

5. PROPRIÉTÉ INTELLECTUELLE
Tous les contenus de l'application sont la propriété exclusive de GreenLink Agritech.

6. RESPONSABILITÉS
- GreenLink s'engage à fournir un service de qualité
- L'utilisateur s'engage à utiliser l'application de manière légale
- GreenLink ne peut être tenu responsable des pertes de données

7. MODIFICATION DES CGU
GreenLink se réserve le droit de modifier ces CGU à tout moment. Les utilisateurs seront informés des modifications.

8. LOI APPLICABLE
Les présentes CGU sont régies par le droit ivoirien.

Contact : support@greenlink.ci
Téléphone : +225 07 87 76 10 23`;

const PRIVACY_CONTENT = `POLITIQUE DE CONFIDENTIALITÉ

Dernière mise à jour : Février 2026

1. INTRODUCTION
GreenLink Agritech s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique comment nous collectons, utilisons et protégeons vos données.

2. DONNÉES COLLECTÉES
Nous collectons :
- Informations d'identification (nom, téléphone, email)
- Données de localisation des parcelles
- Informations sur les récoltes et productions
- Données de transaction

3. UTILISATION DES DONNÉES
Vos données sont utilisées pour :
- Fournir nos services de traçabilité
- Calculer et verser les primes carbone
- Améliorer nos services
- Communiquer avec vous

4. PARTAGE DES DONNÉES
Nous ne vendons JAMAIS vos données. Elles peuvent être partagées avec :
- Les coopératives (pour les membres)
- Les acheteurs certifiés (données de traçabilité)
- Les autorités compétentes (si requis par la loi)

5. SÉCURITÉ
- Chiffrement des données sensibles
- Serveurs sécurisés en Côte d'Ivoire
- Accès restreint aux données

6. VOS DROITS
Vous avez le droit de :
- Accéder à vos données
- Les corriger ou supprimer
- Retirer votre consentement
- Demander la portabilité

7. CONSERVATION
Les données sont conservées pendant la durée de votre inscription, puis 5 ans après la clôture du compte.

8. COOKIES ET TRACEURS
L'application mobile utilise des identifiants techniques pour son fonctionnement.

9. CONTACT
Pour toute question sur vos données :
Email : privacy@greenlink.ci
Téléphone : +225 07 87 76 10 23

10. MODIFICATIONS
Cette politique peut être mise à jour. Vous serez notifié des changements importants.`;

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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
          <Text style={styles.backButton}>← Accueil</Text>
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
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="Minimum 6 caractères"
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirmer le mot de passe *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              placeholder="Confirmez votre mot de passe"
              placeholderTextColor={COLORS.gray[400]}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Terms checkbox */}
        <TouchableOpacity 
          style={styles.termsContainer}
          onPress={() => setAcceptTerms(!acceptTerms)}
        >
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
            {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.termsTextContainer}>
            <Text style={styles.termsText}>J'accepte les </Text>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={styles.termsLink}>conditions d'utilisation</Text>
            </TouchableOpacity>
            <Text style={styles.termsText}> et la </Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
              <Text style={styles.termsLink}>politique de confidentialité</Text>
            </TouchableOpacity>
          </View>
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

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Conditions d'utilisation</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalText}>{TERMS_CONTENT}</Text>
          </ScrollView>
          <TouchableOpacity 
            style={styles.modalAcceptButton}
            onPress={() => {
              setShowTermsModal(false);
            }}
          >
            <Text style={styles.modalAcceptText}>J'ai compris</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Politique de confidentialité</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalText}>{PRIVACY_CONTENT}</Text>
          </ScrollView>
          <TouchableOpacity 
            style={styles.modalAcceptButton}
            onPress={() => {
              setShowPrivacyModal(false);
            }}
          >
            <Text style={styles.modalAcceptText}>J'ai compris</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsLink: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: 60,
    backgroundColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  modalText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[700],
    lineHeight: 24,
  },
  modalAcceptButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalAcceptText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default RegisterScreen;
