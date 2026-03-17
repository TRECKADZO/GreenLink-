import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { carbonApi } from '../../services/carbon';
import { COLORS, FONTS, SPACING } from '../../config';

const MyCarbonPurchasesScreen = ({ navigation }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPurchases = useCallback(async () => {
    try {
      const response = await carbonApi.getMyCarbonPurchases();
      setPurchases(response.data || []);
    } catch (error) {
      console.error('Error fetching carbon purchases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPurchases();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return COLORS.gray[500];
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Validé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const renderPurchase = ({ item }) => (
    <View style={styles.purchaseCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.projectName}>{item.project_name || 'Projet Carbone'}</Text>
          <Text style={styles.purchaseDate}>
            {new Date(item.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.purchaseDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🌱 Quantité:</Text>
          <Text style={styles.detailValue}>{item.quantity_tonnes} tonnes CO₂</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>💰 Montant:</Text>
          <Text style={styles.detailValue}>{item.total_price?.toLocaleString()} XOF</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📜 Standard:</Text>
          <Text style={styles.detailValue}>{item.certification_standard || 'Verra VCS'}</Text>
        </View>
      </View>

      {item.status === 'completed' && (
        <View style={styles.certificateSection}>
          <Text style={styles.certificateIcon}>🏆</Text>
          <View style={styles.certificateInfo}>
            <Text style={styles.certificateTitle}>Certificat disponible</Text>
            <Text style={styles.certificateSubtitle}>
              Certificat #{item._id?.slice(-8) || 'N/A'}
            </Text>
          </View>
          <TouchableOpacity style={styles.downloadButton}>
            <Text style={styles.downloadText}>📥</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Impact */}
      <View style={styles.impactSection}>
        <Text style={styles.impactTitle}>Impact équivalent</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactItem}>
            <Text style={styles.impactEmoji}>🌳</Text>
            <Text style={styles.impactValue}>{Math.round(item.quantity_tonnes * 50)}</Text>
            <Text style={styles.impactLabel}>arbres</Text>
          </View>
          <View style={styles.impactItem}>
            <Text style={styles.impactEmoji}>🚗</Text>
            <Text style={styles.impactValue}>{Math.round(item.quantity_tonnes * 4000)}</Text>
            <Text style={styles.impactLabel}>km évités</Text>
          </View>
          <View style={styles.impactItem}>
            <Text style={styles.impactEmoji}>👨‍🌾</Text>
            <Text style={styles.impactValue}>{Math.round(item.quantity_tonnes * 2)}</Text>
            <Text style={styles.impactLabel}>agriculteurs</Text>
          </View>
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Mes Achats Carbone</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Summary */}
      {purchases.length > 0 && (
        <View style={styles.statsSummary}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {purchases.reduce((sum, p) => sum + (p.quantity_tonnes || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>tonnes CO₂</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {purchases.filter(p => p.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>certificats</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {purchases.reduce((sum, p) => sum + (p.total_price || 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>XOF investis</Text>
          </View>
        </View>
      )}

      {purchases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌍</Text>
          <Text style={styles.emptyText}>Aucun achat de crédit carbone</Text>
          <Text style={styles.emptySubtext}>
            Les achats de credits carbone sont reserves aux entreprises RSE
          </Text>
        </View>
      ) : (
        <FlatList
          data={purchases}
          renderItem={renderPurchase}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.purchasesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  statsSummary: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    padding: SPACING.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: '#065f46',
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: '#047857',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  browseButton: {
    backgroundColor: '#065f46',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  purchasesList: {
    padding: SPACING.md,
  },
  purchaseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  projectName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  purchaseDate: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  purchaseDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  detailValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  certificateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  certificateIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  certificateInfo: {
    flex: 1,
  },
  certificateTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: '#166534',
  },
  certificateSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: '#15803d',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadText: {
    fontSize: 18,
  },
  impactSection: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: SPACING.sm,
  },
  impactTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
    color: COLORS.gray[500],
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactItem: {
    alignItems: 'center',
  },
  impactEmoji: {
    fontSize: 20,
  },
  impactValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  impactLabel: {
    fontSize: 10,
    color: COLORS.gray[500],
  },
});

export default MyCarbonPurchasesScreen;
