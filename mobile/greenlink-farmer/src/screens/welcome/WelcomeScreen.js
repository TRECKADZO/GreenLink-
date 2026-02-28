import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING } from '../../config';

const { width, height } = Dimensions.get('window');

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
      title: 'Producteurs',
      description: 'Gérez vos parcelles, déclarez vos récoltes et recevez vos primes carbone',
    },
    {
      icon: '🤝',
      title: 'Coopératives',
      description: 'Suivez vos membres, générez des rapports et gérez les certifications',
    },
    {
      icon: '🌍',
      title: 'Impact Carbone',
      description: 'Compensez votre empreinte et accédez au marché des crédits carbone',
    },
    {
      icon: '📱',
      title: 'Mode Hors-ligne',
      description: 'Travaillez même sans connexion, synchronisation automatique',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark, '#1a3530']}
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
                <Text style={styles.logoSubtext}>Agriculture durable</Text>
              </View>
            </View>
          </Animated.View>

          {/* Hero Section */}
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
              <Text style={styles.badgeText}>🏆 #1 en Côte d'Ivoire</Text>
            </View>
            
            <Text style={styles.heroTitle}>
              Du planteur au chocolatier,{'\n'}
              <Text style={styles.heroHighlight}>100% traçable</Text>
            </Text>
            
            <Text style={styles.heroSubtitle}>
              Marketplace B2B, crédits carbone vérifiés et analytics avancés pour les producteurs et coopératives
            </Text>
          </Animated.View>

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Pourquoi GreenLink ?</Text>
            
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
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
                    Gérez vos parcelles et recevez vos primes
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
                colors={[COLORS.secondary, '#b8956a']}
                style={styles.userTypeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.userTypeIcon}>🏢</Text>
                <View style={styles.userTypeContent}>
                  <Text style={styles.userTypeTitleDark}>Je suis Coopérative</Text>
                  <Text style={styles.userTypeDescriptionDark}>
                    Gérez vos membres et certifications
                  </Text>
                </View>
                <Text style={styles.userTypeArrowDark}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Créer mon compte</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>J'ai déjà un compte</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    lineHeight: 40,
    marginBottom: SPACING.md,
  },
  heroHighlight: {
    color: COLORS.secondary,
  },
  heroSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    marginBottom: SPACING.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },
  featuresContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.8,
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
    fontSize: 40,
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
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  userTypeDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  userTypeDescriptionDark: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primaryDark,
    opacity: 0.8,
  },
  userTypeArrow: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  userTypeArrowDark: {
    fontSize: 24,
    color: COLORS.primaryDark,
    fontWeight: 'bold',
  },
  ctaContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
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
    color: COLORS.primaryDark,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.white,
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
});

export default WelcomeScreen;
