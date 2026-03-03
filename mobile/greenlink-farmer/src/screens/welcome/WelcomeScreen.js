import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING } from '../../config';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const features = [
    {
      icon: '🌱',
      title: 'Audits Carbone Certifiés',
      description: 'Auditeurs indépendants évaluent vos parcelles pour la certification carbone',
      badge: 'GreenLink',
      badgeColor: '#10b981',
    },
    {
      icon: '💰',
      title: 'Primes Carbone',
      description: 'Recevez jusqu\'à 60 000 XOF/ha sur Orange Money pour vos bonnes pratiques',
      badge: 'Nouveau',
      badgeColor: '#f59e0b',
    },
    {
      icon: '📱',
      title: 'Accès USSD/SMS',
      description: 'Consultez vos parcelles et primes sans internet via *123*45#',
      badge: 'Offline',
      badgeColor: '#f97316',
    },
    {
      icon: '🛡️',
      title: 'Conformité SSRTE/ICI',
      description: 'Outils de monitoring du travail des enfants selon les standards ICI',
      badge: 'ICI',
      badgeColor: '#3b82f6',
    },
    {
      icon: '🏆',
      title: 'Badges Auditeurs',
      description: 'Gamification pour récompenser les auditeurs : Bronze, Argent, Or',
      badge: 'Gamification',
      badgeColor: '#8b5cf6',
    },
    {
      icon: '📊',
      title: 'Gestion Coopérative',
      description: 'Dashboard complet: membres, parcelles, primes et rapports EUDR',
      badge: 'Pro',
      badgeColor: '#64748b',
    },
  ];

  const quickStats = [
    { icon: '🛡️', label: 'Conforme EUDR', color: '#3b82f6' },
    { icon: '🌿', label: 'Traçabilité Carbone', color: '#10b981' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2d5a4d" />
      
      <LinearGradient
        colors={['#2d5a4d', '#235043', '#1a4038']}
        style={styles.gradient}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Logo */}
          <Animated.View 
            style={[
              styles.headerContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🌿</Text>
              <View>
                <Text style={styles.logoText}>GreenLink</Text>
                <Text style={styles.logoSubtext}>Côte d'Ivoire</Text>
              </View>
            </View>
          </Animated.View>

          {/* Hero Section - Style Web */}
          <Animated.View 
            style={[
              styles.heroSection,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🌱</Text>
              <Text style={styles.badgeText}>Plateforme Carbone & Traçabilité</Text>
            </View>
            
            <Text style={styles.heroTitle}>
              Primes Carbone pour{'\n'}
              <Text style={styles.heroHighlight}>l'Agriculture Durable</Text>
            </Text>
            
            <Text style={styles.heroSubtitle}>
              Coopératives, producteurs et auditeurs : gérez vos parcelles, recevez des primes carbone sur Orange Money et assurez la conformité EUDR & SSRTE/ICI.
            </Text>

            {/* Quick Stats - Style Web */}
            <View style={styles.quickStatsContainer}>
              {quickStats.map((stat, index) => (
                <View key={index} style={styles.quickStat}>
                  <Text style={styles.quickStatIcon}>{stat.icon}</Text>
                  <Text style={styles.quickStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* CTA Buttons - Style Web */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>S'inscrire gratuitement</Text>
              <Text style={styles.primaryButtonArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>J'ai déjà un compte</Text>
            </TouchableOpacity>
          </View>

          {/* Features Section - Style Web Cards */}
          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Une plateforme tout-en-un</Text>
            <Text style={styles.sectionSubtitle}>
              IA, analytics, vérification carbone et outils professionnels
            </Text>
            
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={styles.featureHeader}>
                    <View style={styles.featureIconContainer}>
                      <Text style={styles.featureIcon}>{feature.icon}</Text>
                    </View>
                    <View style={[styles.featureBadge, { backgroundColor: feature.badgeColor + '30' }]}>
                      <Text style={[styles.featureBadgeText, { color: feature.badgeColor }]}>
                        {feature.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* User Type Selection */}
          <View style={styles.userTypeSection}>
            <Text style={styles.sectionTitle}>Choisissez votre profil</Text>
            
            <TouchableOpacity 
              style={styles.userTypeCard}
              onPress={() => navigation.navigate('Register', { userType: 'producteur' })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.userTypeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.userTypeIcon}>👨‍🌾</Text>
                <View style={styles.userTypeContent}>
                  <Text style={styles.userTypeTitle}>Je suis Producteur</Text>
                  <Text style={styles.userTypeDescription}>
                    Gérez vos parcelles et recevez vos primes carbone
                  </Text>
                </View>
                <Text style={styles.userTypeArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.userTypeCard}
              onPress={() => navigation.navigate('Register', { userType: 'cooperative' })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#d4a574', '#c49564']}
                style={styles.userTypeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.userTypeIcon}>🏢</Text>
                <View style={styles.userTypeContent}>
                  <Text style={styles.userTypeTitleDark}>Je suis Coopérative</Text>
                  <Text style={styles.userTypeDescriptionDark}>
                    Gérez vos membres, parcelles et certifications
                  </Text>
                </View>
                <Text style={styles.userTypeArrowDark}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info Agent Terrain */}
          <View style={styles.agentInfoBanner}>
            <Text style={styles.agentInfoIcon}>ℹ️</Text>
            <Text style={styles.agentInfoText}>
              Agent terrain ? Contactez votre coopérative ou l'administrateur pour obtenir vos accès.
            </Text>
          </View>

          {/* USSD Access Banner */}
          <View style={styles.ussdBanner}>
            <Text style={styles.ussdIcon}>📱</Text>
            <View style={styles.ussdContent}>
              <Text style={styles.ussdTitle}>Accès sans internet</Text>
              <Text style={styles.ussdCode}>*123*45# ou SMS au 1234</Text>
              <Text style={styles.ussdSubtitle}>Disponible en français, baoulé et dioula</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              En continuant, vous acceptez nos{' '}
              <Text style={styles.footerLink}>Conditions d'utilisation</Text>
              {' '}et{' '}
              <Text style={styles.footerLink}>Politique de confidentialité</Text>
            </Text>
            
            <View style={styles.contactContainer}>
              <Text style={styles.contactTitle}>Besoin d'aide ?</Text>
              <Text style={styles.contactPhone}>📞 +225 07 87 76 10 23</Text>
            </View>

            <Text style={styles.versionText}>Version 1.13.0</Text>
          </View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 40,
    marginRight: SPACING.sm,
  },
  logoText: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  logoSubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.8,
  },
  heroSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.white,
    lineHeight: 42,
    marginBottom: SPACING.md,
  },
  heroHighlight: {
    color: '#d4a574',
  },
  heroSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickStatIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  quickStatLabel: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  ctaContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: '#d4a574',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: '#2d5a4d',
  },
  primaryButtonArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5a4d',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  featuresContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.7,
    marginBottom: SPACING.lg,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (width - SPACING.lg * 2 - 12) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2d5a4d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 20,
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  featureTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },
  userTypeSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  userTypeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  userTypeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  userTypeIcon: {
    fontSize: 36,
    marginRight: SPACING.md,
  },
  userTypeContent: {
    flex: 1,
  },
  userTypeTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  userTypeTitleDark: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: '#2d5a4d',
    marginBottom: 4,
  },
  userTypeDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  userTypeDescriptionDark: {
    fontSize: FONTS.sizes.sm,
    color: '#2d5a4d',
    opacity: 0.8,
  },
  userTypeArrow: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  userTypeArrowDark: {
    fontSize: 24,
    color: '#2d5a4d',
    fontWeight: 'bold',
  },
  agentInfoBanner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  agentInfoIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  agentInfoText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: '#0369a1',
    fontStyle: 'italic',
  },
  ussdBanner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    backgroundColor: '#f97316',
    borderRadius: 16,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ussdIcon: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  ussdContent: {
    flex: 1,
  },
  ussdTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  ussdCode: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  ussdSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    opacity: 0.9,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
  contactContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  contactTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  versionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    opacity: 0.5,
    marginTop: SPACING.sm,
  },
});

export default WelcomeScreen;
