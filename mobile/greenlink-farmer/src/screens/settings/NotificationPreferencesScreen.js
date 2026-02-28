import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../services/notifications';
import { COLORS, FONTS, SPACING } from '../../config';

const NotificationPreferencesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    premium_available: true,
    payment_confirmed: true,
    weekly_reminders: true,
    coop_announcements: true,
    harvest_updates: true,
    marketing: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    
    setSaving(true);
    try {
      await notificationService.updatePreferences(newPrefs);
    } catch (error) {
      // Revert on error
      setPreferences(preferences);
      Alert.alert('Erreur', 'Impossible de sauvegarder les préférences');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
      Alert.alert('Succès', 'Notification de test envoyée!');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification de test');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const PreferenceItem = ({ icon, title, description, value, onToggle }) => (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceLeft}>
        <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '15' }]}>
          <Ionicons name={icon} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.preferenceText}>
          <Text style={styles.preferenceTitle}>{title}</Text>
          <Text style={styles.preferenceDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.gray[300], true: COLORS.primary + '60' }}
        thumbColor={value ? COLORS.primary : COLORS.gray[100]}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Préférences Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Saving indicator */}
      {saving && (
        <View style={styles.savingBanner}>
          <ActivityIndicator size="small" color={COLORS.white} />
          <Text style={styles.savingText}>Sauvegarde...</Text>
        </View>
      )}

      {/* Main Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paiements & Primes</Text>
        
        <PreferenceItem
          icon="cash-outline"
          title="Primes carbone disponibles"
          description="Quand votre prime est prête à être retirée"
          value={preferences.premium_available}
          onToggle={() => handleToggle('premium_available')}
        />
        
        <PreferenceItem
          icon="checkmark-circle-outline"
          title="Confirmations de paiement"
          description="Quand un paiement est effectué avec succès"
          value={preferences.payment_confirmed}
          onToggle={() => handleToggle('payment_confirmed')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rappels</Text>
        
        <PreferenceItem
          icon="notifications-outline"
          title="Rappels hebdomadaires"
          description="Rappels pour les primes non récupérées"
          value={preferences.weekly_reminders}
          onToggle={() => handleToggle('weekly_reminders')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coopérative</Text>
        
        <PreferenceItem
          icon="megaphone-outline"
          title="Annonces de la coopérative"
          description="Messages importants de votre coopérative"
          value={preferences.coop_announcements}
          onToggle={() => handleToggle('coop_announcements')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activités</Text>
        
        <PreferenceItem
          icon="leaf-outline"
          title="Mises à jour parcelles/récoltes"
          description="Quand vos parcelles sont vérifiées ou récoltes confirmées"
          value={preferences.harvest_updates}
          onToggle={() => handleToggle('harvest_updates')}
        />
        
        <PreferenceItem
          icon="mail-outline"
          title="Marketing et actualités"
          description="Offres spéciales et nouvelles fonctionnalités"
          value={preferences.marketing}
          onToggle={() => handleToggle('marketing')}
        />
      </View>

      {/* Test Notification */}
      <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
        <Ionicons name="paper-plane-outline" size={20} color={COLORS.white} />
        <Text style={styles.testButtonText}>Envoyer une notification test</Text>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.gray[500]} />
        <Text style={styles.infoText}>
          Les notifications push vous permettent de rester informé même quand l'application est fermée. 
          Vous pouvez également activer/désactiver les notifications dans les paramètres de votre téléphone.
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.gray[600],
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  savingBanner: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    color: COLORS.white,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    lineHeight: 18,
  },
  testButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
    marginLeft: SPACING.sm,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
});

export default NotificationPreferencesScreen;
