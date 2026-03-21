import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS, FONTS } from '../../config';
import { Loader } from '../../components/UI';
import { MainLayout } from '../../components/navigation';

const StatCard = ({ icon, value, label, color, onPress }) => (
  <TouchableOpacity
    style={[styles.statCard, { borderLeftColor: color }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <Ionicons name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const QuickAction = ({ icon, label, onPress, color = COLORS.primary }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function CoopDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await cooperativeApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <Loader message="Chargement du tableau de bord..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={64} color={COLORS.gray} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { coop_info, members, parcelles, lots, financial } = dashboard || {};

  return (
    <MainLayout userType="cooperative">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.coopName}>{coop_info?.name || 'Coopérative'}</Text>
            <Text style={styles.coopCode}>Code: {coop_info?.code || 'N/A'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle" size={40} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="people"
            value={members?.total || 0}
            label="Membres"
            color="#4CAF50"
            onPress={() => navigation.navigate('CoopMembers')}
          />
          <StatCard
            icon="map"
            value={parcelles?.total || 0}
            label="Parcelles"
            color="#2196F3"
          />
          <StatCard
            icon="leaf"
            value={`${parcelles?.superficie_totale || 0} ha`}
            label="Surface"
            color="#8BC34A"
          />
          <StatCard
            icon="cloud"
            value={`${parcelles?.co2_total || 0}t`}
            label="CO₂"
            color="#00BCD4"
          />
        </View>

        {/* Carbon Score */}
        <View style={styles.carbonScoreCard}>
          <Text style={styles.sectionTitle}>Score Carbone Moyen</Text>
          <View style={styles.carbonScoreContent}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>
                {parcelles?.score_carbone_moyen?.toFixed(1) || '0'}
              </Text>
              <Text style={styles.scoreMax}>/10</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreInfoText}>
                {(parcelles?.score_carbone_moyen || 0) >= 7
                  ? 'Excellent! Vos pratiques sont durables'
                  : 'Continuez à améliorer vos pratiques'}
              </Text>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.financialCard}>
          <Text style={styles.sectionTitle}>Finances</Text>
          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Ionicons name="arrow-down-circle" size={20} color="#4CAF50" />
              <Text style={styles.financialLabel}>Reçu</Text>
              <Text style={styles.financialValue}>
                {(financial?.total_premiums_received || 0).toLocaleString()} XOF
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Ionicons name="arrow-up-circle" size={20} color="#2196F3" />
              <Text style={styles.financialLabel}>Distribué</Text>
              <Text style={styles.financialValue}>
                {(financial?.total_premiums_distributed || 0).toLocaleString()} XOF
              </Text>
            </View>
          </View>
          {financial?.pending_distribution > 0 && (
            <View style={styles.pendingBanner}>
              <Ionicons name="time" size={16} color="#FF9800" />
              <Text style={styles.pendingText}>
                {financial.pending_distribution.toLocaleString()} XOF en attente
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="person-add"
            label="Nouveau Membre"
            onPress={() => navigation.navigate('AddCoopMember')}
            color="#4CAF50"
          />
          <QuickAction
            icon="map"
            label="Ajouter Parcelle"
            onPress={() => navigation.navigate('CoopMembers')}
            color="#2196F3"
          />
          <QuickAction
            icon="document-text"
            label="Rapport EUDR"
            onPress={() => navigation.navigate('CoopReports')}
            color="#9C27B0"
          />
          <QuickAction
            icon="download"
            label="Télécharger PDF"
            onPress={async () => {
              try {
                Alert.alert('Téléchargement', 'Génération du rapport PDF...');
                await cooperativeApi.downloadEUDRPdf();
              } catch (err) {
                Alert.alert('Erreur', 'Impossible de télécharger le PDF');
              }
            }}
            color="#FF5722"
          />
        </View>

        {/* Lots Summary */}
        <View style={styles.lotsCard}>
          <View style={styles.lotsSummary}>
            <Text style={styles.sectionTitle}>Lots de Vente</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CoopLots')}>
              <Text style={styles.viewAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.lotsStats}>
            <View style={styles.lotStatItem}>
              <Text style={styles.lotStatValue}>{lots?.active || 0}</Text>
              <Text style={styles.lotStatLabel}>Actifs</Text>
            </View>
            <View style={styles.lotStatDivider} />
            <View style={styles.lotStatItem}>
              <Text style={styles.lotStatValue}>{lots?.completed || 0}</Text>
              <Text style={styles.lotStatLabel}>Terminés</Text>
            </View>
          </View>
        </View>

        {/* Certifications */}
        {coop_info?.certifications?.length > 0 && (
          <View style={styles.certificationsCard}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            <View style={styles.certificationsList}>
              {coop_info.certifications.map((cert, index) => (
                <View key={index} style={styles.certBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
      </SafeAreaView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  coopName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  coopCode: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.white,
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  carbonScoreCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginLeft: 8,
  },
  carbonScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scoreMax: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  scoreInfo: {
    flex: 1,
    marginLeft: 16,
  },
  scoreInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  financialCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  financialItem: {
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 6,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  quickAction: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  lotsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lotsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  lotsStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  lotStatItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lotStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  lotStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  lotStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  certificationsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  certificationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  certText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 4,
  },
  bottomSpacer: {
    height: 80,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});
