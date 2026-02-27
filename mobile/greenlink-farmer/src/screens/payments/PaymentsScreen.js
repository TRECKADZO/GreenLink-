import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useOffline } from '../../context/OfflineContext';
import { Button, Loader, EmptyState } from '../../components/UI';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const PaymentsScreen = ({ navigation }) => {
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('payments');
        if (cached) {
          setPayments(cached);
          setLoading(false);
          return;
        }
      }

      const response = await farmerApi.getPaymentRequests();
      setPayments(response.data || []);
      await cacheData('payments', response.data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      const cached = await getCachedData('payments');
      if (cached) setPayments(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const requestPayment = async () => {
    Alert.alert(
      'Demande de paiement',
      'Voulez-vous demander le versement de vos primes carbone accumulées ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: async () => {
            try {
              await farmerApi.createPaymentRequest({});
              Alert.alert('Succès', 'Votre demande de paiement a été envoyée');
              loadPayments();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de créer la demande');
            }
          }
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'rejected': return COLORS.error;
      default: return COLORS.gray[500];
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Payé';
      case 'pending': return 'En attente';
      case 'rejected': return 'Refusé';
      default: return status;
    }
  };

  if (loading) {
    return <Loader message="Chargement des paiements..." />;
  }

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mes Paiements</Text>
        <Text style={styles.subtitle}>Primes carbone et versements</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>{totalPaid.toLocaleString()}</Text>
          <Text style={styles.statLabel}>FCFA reçus</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏳</Text>
          <Text style={styles.statValue}>{pendingAmount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>FCFA en attente</Text>
        </View>
      </View>

      {/* Bouton demande */}
      <View style={styles.actionContainer}>
        <Button
          title="📱 Demander un paiement Orange Money"
          variant="orange"
          onPress={requestPayment}
        />
      </View>

      {/* Liste */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.listTitle}>Historique</Text>
        
        {payments.length === 0 ? (
          <EmptyState 
            message="Aucun paiement pour le moment" 
            icon="💳"
          />
        ) : (
          payments.map((payment, index) => (
            <View key={payment._id || index} style={styles.paymentCard}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentAmount}>
                  {(payment.amount || 0).toLocaleString()} FCFA
                </Text>
                <Text style={styles.paymentDate}>
                  {new Date(payment.created_at).toLocaleDateString('fr-FR')}
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
        )}
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
    padding: SPACING.lg,
    paddingTop: 60,
  },
  backButton: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    marginTop: -SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  actionContainer: {
    padding: SPACING.md,
  },
  listContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  listTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: SPACING.md,
  },
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLeft: {},
  paymentAmount: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  paymentDate: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
});

export default PaymentsScreen;
