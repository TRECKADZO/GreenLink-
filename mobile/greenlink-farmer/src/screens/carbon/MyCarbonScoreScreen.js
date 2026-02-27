import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { carbonApi } from '../../services/carbon';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../../config';

const MyCarbonScoreScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScore = async () => {
    try {
      const response = await carbonApi.getMyCarbonScore();
      setScoreData(response.data);
    } catch (error) {
      console.error('Error fetching carbon score:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchScore();
  };

  const getScoreColor = (score) => {
    if (score >= 7) return '#22c55e';
    if (score >= 5) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 7) return 'Très bien';
    if (score >= 5) return 'Bien';
    if (score >= 3) return 'À améliorer';
    return 'Faible';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#065f46" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const score = scoreData?.average_score || 0;
  const totalCredits = scoreData?.total_credits || 0;
  const totalPremium = scoreData?.total_premium || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Score Carbone</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Main Score */}
        <View style={styles.scoreCard}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(score) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
              {score.toFixed(1)}
            </Text>
            <Text style={styles.scoreMax}>/10</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: getScoreColor(score) }]}>
            {getScoreLabel(score)}
          </Text>
          <Text style={styles.scoreDescription}>
            {score >= 7 
              ? '🎉 Félicitations ! Vous êtes éligible aux primes carbone'
              : '💡 Améliorez vos pratiques pour bénéficier des primes'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🌳</Text>
            <Text style={styles.statValue}>{totalCredits.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Crédits carbone générés (tCO₂)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={styles.statValue}>{totalPremium.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Primes carbone (FCFA)</Text>
          </View>
        </View>

        {/* Tips to Improve */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Comment améliorer votre score ?</Text>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>🌿</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Agroforesterie</Text>
              <Text style={styles.tipDescription}>
                Plantez des arbres dans vos parcelles de cacao pour séquestrer plus de carbone
              </Text>
            </View>
            <Text style={styles.tipBonus}>+2 pts</Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>♻️</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Agriculture biologique</Text>
              <Text style={styles.tipDescription}>
                Réduisez l'utilisation de pesticides et engrais chimiques
              </Text>
            </View>
            <Text style={styles.tipBonus}>+1.5 pts</Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>🌱</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Cultures de couverture</Text>
              <Text style={styles.tipDescription}>
                Utilisez des plantes de couverture pour protéger et enrichir le sol
              </Text>
            </View>
            <Text style={styles.tipBonus}>+1 pt</Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💧</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Gestion de l'eau</Text>
              <Text style={styles.tipDescription}>
                Optimisez votre irrigation et récupérez l'eau de pluie
              </Text>
            </View>
            <Text style={styles.tipBonus}>+0.5 pt</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('AddParcel')}
          >
            <Text style={styles.ctaButtonText}>
              ➕ Déclarer une nouvelle parcelle
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('CarbonMarketplace')}
          >
            <Text style={styles.secondaryButtonText}>
              🌍 Voir le marketplace carbone
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#065f46',
  },
  backButton: {
    padding: SPACING.xs,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
  },
  content: {
    flex: 1,
  },
  scoreCard: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.gray[400],
  },
  scoreLabel: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  scoreDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: '#065f46',
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  tipsSection: {
    padding: SPACING.md,
  },
  tipsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.md,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  tipIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  tipDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  tipBonus: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: '#22c55e',
    backgroundColor: '#dcfce7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  ctaSection: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  ctaButton: {
    backgroundColor: '#065f46',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ctaButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  secondaryButton: {
    backgroundColor: '#ecfdf5',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#065f46',
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: '#065f46',
  },
});

export default MyCarbonScoreScreen;
