import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { Button, Loader, EmptyState } from '../../components/UI';
import { COLORS, FONTS, SPACING, API_URL } from '../../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CarbonPaymentsDashboard = ({ navigation }) => {
  const { token, user } = useAuth();
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('carbon_payments_dashboard');
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_URL}/api/carbon-payments/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
        await cacheData('carbon_payments_dashboard', result);
      }
    } catch (error) {
      console.error('Error fetching carbon dashboard:', error);
      const cached = await getCachedData('carbon_payments_dashboard');
      if (cached) setData(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isOnline]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleRequestPayment = async () => {
    Alert.alert(
      'Demande de versement',
      'Voulez-vous demander le versement de vos primes carbone ? Le paiement sera traité via votre coopérative.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: async () => {
            setRequestingPayment(true);
            try {
              const response = await fetch(`${API_URL}/api/carbon-payments/request-payment`, {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const result = await response.json();
                Alert.alert('Succès', result.message);
                fetchDashboard();
              } else {
                Alert.alert('Erreur', 'Impossible de créer la demande');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Erreur de connexion');
            } finally {
              setRequestingPayment(false);
            }
          }
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'processing': return '#3b82f6';
      case 'scheduled': return '#8b5cf6';
      default: return COLORS.gray[500];
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Payé';
      case 'pending': return 'En attente';
      case 'processing': return 'En cours';
      case 'scheduled': return 'Programmé';
      default: return status;
    }
  };

  if (loading) {
    return <Loader message="Chargement du tableau de bord..." />;
  }

  const { carbon_score, earnings, monthly_history, recent_payments, distribution_model } = data || {};

  // Calculer la hauteur max du graphique
  const maxAmount = Math.max(...(monthly_history?.map(m => m.amount_xof) || [1]));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="leaf" size={28} color={COLORS.white} />
          </View>
          <Text style={styles.title}>Mes Revenus Carbone</Text>
          <Text style={styles.subtitle}>Primes et versements en temps réel</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="wallet" size={24} color={COLORS.white} />
            <Text style={styles.statValue}>{formatCurrency(earnings?.total_received_xof)}</Text>
            <Text style={styles.statLabel}>XOF reçus</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardSecondary]}>
            <Ionicons name="time" size={24} color={COLORS.white} />
            <Text style={styles.statValue}>{formatCurrency(earnings?.pending_xof)}</Text>
            <Text style={styles.statLabel}>XOF en attente</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardTertiary]}>
            <Ionicons name="trending-up" size={24} color={COLORS.white} />
            <Text style={styles.statValue}>{formatCurrency(earnings?.annual_projection_xof)}</Text>
            <Text style={styles.statLabel}>Projection annuelle</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardQuaternary]}>
            <Ionicons name="pricetag" size={24} color={COLORS.white} />
            <Text style={styles.statValue}>{earnings?.premium_per_kg_xof || 0}</Text>
            <Text style={styles.statLabel}>XOF/kg cacao</Text>
          </View>
        </View>

        {/* Carbon Score Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Mon Score Carbone</Text>
          </View>
          
          <View style={styles.scoreGrid}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{carbon_score?.total_tonnes_co2_year || 0}</Text>
              <Text style={styles.scoreLabel}>tonnes CO2/an</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{carbon_score?.total_hectares || 0}</Text>
              <Text style={styles.scoreLabel}>hectares</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{carbon_score?.parcels_count || 0}</Text>
              <Text style={styles.scoreLabel}>parcelles</Text>
            </View>
          </View>
        </View>

        {/* Monthly Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Historique 12 mois</Text>
          </View>
          
          <View style={styles.chartContainer}>
            {monthly_history?.map((month, idx) => {
              const height = month.amount_xof > 0 
                ? (month.amount_xof / maxAmount) * 80 
                : 4;
              
              return (
                <View key={idx} style={styles.chartBar}>
                  <View 
                    style={[
                      styles.chartBarFill,
                      { 
                        height,
                        backgroundColor: month.amount_xof > 0 ? COLORS.primary : COLORS.gray[300]
                      }
                    ]} 
                  />
                  <Text style={styles.chartLabel}>{month.month.slice(0, 3)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Request Payment Button */}
        <View style={styles.requestCard}>
          <View style={styles.requestCardContent}>
            <Text style={styles.requestTitle}>Demander un versement</Text>
            <Text style={styles.requestSubtitle}>
              Via votre coopérative sur Orange Money
            </Text>
          </View>
          <Button
            title={requestingPayment ? "Envoi..." : "Demander"}
            variant="orange"
            onPress={handleRequestPayment}
            disabled={requestingPayment}
            style={styles.requestButton}
          />
        </View>

        {/* Distribution Model */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Modèle de distribution</Text>
          </View>
          
          <View style={styles.distributionRow}>
            <Text style={styles.distributionLabel}>Votre part</Text>
            <Text style={styles.distributionValue}>{distribution_model?.farmer_share_rate}</Text>
          </View>
          <View style={styles.distributionRow}>
            <Text style={styles.distributionLabel}>Part coopérative</Text>
            <Text style={styles.distributionValue}>{distribution_model?.cooperative_share_rate}</Text>
          </View>
          <View style={styles.distributionRow}>
            <Text style={styles.distributionLabel}>Fréquence</Text>
            <Text style={styles.distributionValue}>{distribution_model?.payment_frequency}</Text>
          </View>
        </View>

        {/* Recent Payments */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Derniers versements</Text>
          </View>
          
          {recent_payments?.length > 0 ? (
            recent_payments.slice(0, 5).map((payment, idx) => (
              <View key={idx} style={styles.paymentItem}>
                <View>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.amount_xof)} XOF
                  </Text>
                  <Text style={styles.paymentDate}>
                    {payment.payment_date 
                      ? new Date(payment.payment_date).toLocaleDateString('fr-FR')
                      : 'En attente'
                    }
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(payment.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {getStatusLabel(payment.status)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyState 
              message="Aucun versement pour le moment" 
              icon="💰"
            />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    marginBottom: SPACING.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
    marginTop: -SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: '#10b981',
  },
  statCardSecondary: {
    backgroundColor: '#f59e0b',
  },
  statCardTertiary: {
    backgroundColor: '#3b82f6',
  },
  statCardQuaternary: {
    backgroundColor: '#8b5cf6',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginLeft: SPACING.sm,
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: COLORS.gray[200],
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingTop: SPACING.sm,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBarFill: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 9,
    color: COLORS.gray[400],
    marginTop: 4,
    transform: [{ rotate: '45deg' }],
  },
  requestCard: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  requestCardContent: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  requestSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  requestButton: {
    minWidth: 100,
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  distributionLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  distributionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default CarbonPaymentsDashboard;
