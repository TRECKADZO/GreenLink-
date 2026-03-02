// Dashboard dédié pour les Agents SSRTE
// Affiche les statistiques, les visites récentes et les cas actifs
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';

const OFFLINE_VISITS_KEY = 'offline_ssrte_visits';

const SSRTEAgentDashboard = ({ navigation }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [activeCases, setActiveCases] = useState([]);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        syncOfflineData();
      }
    });
    
    loadData();
    checkPendingSync();
    
    return () => unsubscribe();
  }, []);

  const checkPendingSync = async () => {
    try {
      const offlineVisits = await AsyncStorage.getItem(OFFLINE_VISITS_KEY);
      if (offlineVisits) {
        const visits = JSON.parse(offlineVisits);
        setPendingSync(visits.length);
      }
    } catch (error) {
      console.error('Error checking pending sync:', error);
    }
  };

  const syncOfflineData = async () => {
    try {
      const offlineVisits = await AsyncStorage.getItem(OFFLINE_VISITS_KEY);
      if (!offlineVisits) return;
      
      const visits = JSON.parse(offlineVisits);
      if (visits.length === 0) return;

      let syncedCount = 0;
      const failedVisits = [];

      for (const visit of visits) {
        try {
          await cooperativeApi.createSSRTEVisit(token, visit);
          syncedCount++;
        } catch (error) {
          console.error('Failed to sync visit:', error);
          failedVisits.push(visit);
        }
      }

      if (failedVisits.length > 0) {
        await AsyncStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(failedVisits));
        setPendingSync(failedVisits.length);
      } else {
        await AsyncStorage.removeItem(OFFLINE_VISITS_KEY);
        setPendingSync(0);
      }

      if (syncedCount > 0) {
        Alert.alert(
          'Synchronisation',
          `${syncedCount} visite(s) synchronisée(s) avec succès.`,
          [{ text: 'OK' }]
        );
        loadData();
      }
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les stats SSRTE
      const statsRes = await cooperativeApi.getSSRTEStats(token);
      if (statsRes.data) {
        setStats(statsRes.data);
      }
      
      // Charger les visites récentes
      const visitsRes = await cooperativeApi.getSSRTEVisits(token, { limit: 10 });
      if (visitsRes.data?.visits) {
        setRecentVisits(visitsRes.data.visits);
      }
      
      // Charger les cas actifs
      const casesRes = await cooperativeApi.getSSRTECases(token, { status: 'identified,in_progress' });
      if (casesRes.data?.cases) {
        setActiveCases(casesRes.data.cases.filter(c => c.status !== 'resolved' && c.status !== 'closed'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Charger depuis le cache si hors ligne
      const cachedStats = await AsyncStorage.getItem('ssrte_stats_cache');
      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await checkPendingSync();
    setRefreshing(false);
  }, []);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critique': return '#ef4444';
      case 'eleve': case 'high': return '#f97316';
      case 'modere': case 'moderate': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'identified': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      case 'resolved': return '#10b981';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Agent SSRTE</Text>
          <Text style={styles.headerSubtitle}>{user?.full_name}</Text>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#06b6d4']} />
        }
      >
        {/* Pending Sync Banner */}
        {pendingSync > 0 && (
          <TouchableOpacity style={styles.syncBanner} onPress={isOnline ? syncOfflineData : null}>
            <Ionicons name="cloud-upload" size={20} color="#fcd34d" />
            <Text style={styles.syncBannerText}>
              {pendingSync} visite(s) en attente de synchronisation
            </Text>
            {isOnline && <Ionicons name="chevron-forward" size={20} color="#fcd34d" />}
          </TouchableOpacity>
        )}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="clipboard-outline" size={28} color="#06b6d4" />
            <Text style={styles.statValue}>{stats?.visits?.total || 0}</Text>
            <Text style={styles.statLabel}>Visites Total</Text>
            <Text style={styles.statSub}>Ce mois: {stats?.visits?.monthly || 0}</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardWarning]}>
            <Ionicons name="alert-circle-outline" size={28} color="#f97316" />
            <Text style={styles.statValue}>{stats?.visits?.high_risk || 0}</Text>
            <Text style={styles.statLabel}>Haut Risque</Text>
            <Text style={styles.statSub}>{stats?.visits?.risk_rate || 0}%</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardDanger]}>
            <Ionicons name="people-outline" size={28} color="#ef4444" />
            <Text style={styles.statValue}>{stats?.cases?.total || 0}</Text>
            <Text style={styles.statLabel}>Cas Identifiés</Text>
            <Text style={styles.statSub}>{stats?.cases?.hazardous || 0} dangereux</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#10b981" />
            <Text style={styles.statValue}>{stats?.cases?.resolved || 0}</Text>
            <Text style={styles.statLabel}>Cas Résolus</Text>
            <Text style={styles.statSub}>{stats?.rates?.resolution || 0}%</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('SSRTEVisitForm')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#06b6d4' }]}>
                <Ionicons name="add-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Nouvelle Visite</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="qr-code" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Scanner QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('GeoPhoto')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Photo Géolocalisée</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert('Export', 'Export disponible en ligne')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="download" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Exporter Rapport</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Cases */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cas Actifs</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SSRTECases')}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {activeCases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              <Text style={styles.emptyStateText}>Aucun cas actif</Text>
            </View>
          ) : (
            activeCases.slice(0, 3).map((caseItem) => (
              <TouchableOpacity key={caseItem.id} style={styles.caseCard}>
                <View style={styles.caseHeader}>
                  <View style={styles.caseInfo}>
                    <Text style={styles.caseName}>{caseItem.child_name}</Text>
                    <Text style={styles.caseDetails}>
                      {caseItem.child_age} ans • {caseItem.member_name}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: caseItem.severity_score >= 8 ? '#ef4444' : caseItem.severity_score >= 5 ? '#f97316' : '#f59e0b' }]}>
                    <Text style={styles.severityText}>{caseItem.severity_score}</Text>
                  </View>
                </View>
                <View style={styles.caseFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(caseItem.status) + '30' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(caseItem.status) }]}>
                      {caseItem.status === 'identified' ? 'Identifié' : 
                       caseItem.status === 'in_progress' ? 'En cours' : caseItem.status}
                    </Text>
                  </View>
                  <Text style={styles.caseType}>
                    {caseItem.labor_type === 'hazardous' ? 'Dangereux' :
                     caseItem.labor_type === 'worst_forms' ? 'Pire forme' : caseItem.labor_type}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Recent Visits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visites Récentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SSRTEVisits')}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {recentVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard" size={40} color="#64748b" />
              <Text style={styles.emptyStateText}>Aucune visite récente</Text>
            </View>
          ) : (
            recentVisits.slice(0, 5).map((visit) => (
              <TouchableOpacity key={visit.id} style={styles.visitCard}>
                <View style={[styles.visitRiskIndicator, { backgroundColor: getRiskColor(visit.risk_level) }]} />
                <View style={styles.visitContent}>
                  <Text style={styles.visitName}>{visit.member_name || 'Producteur'}</Text>
                  <Text style={styles.visitDetails}>
                    {visit.children_count || 0} enfants • {visit.household_size || 0} personnes
                  </Text>
                  <Text style={styles.visitDate}>
                    {new Date(visit.visit_date).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.visitStats}>
                  {visit.children_at_risk > 0 && (
                    <View style={styles.riskBadge}>
                      <Ionicons name="warning" size={12} color="#ef4444" />
                      <Text style={styles.riskBadgeText}>{visit.children_at_risk}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Performance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Taux de prévalence</Text>
              <Text style={styles.performanceValue}>{stats?.rates?.prevalence || 0}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(stats?.rates?.prevalence || 0, 100)}%`, backgroundColor: '#ef4444' }]} />
            </View>
            
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Taux de résolution</Text>
              <Text style={[styles.performanceValue, { color: '#10b981' }]}>{stats?.rates?.resolution || 0}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(stats?.rates?.resolution || 0, 100)}%`, backgroundColor: '#10b981' }]} />
            </View>
            
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Remédiations complétées</Text>
              <Text style={[styles.performanceValue, { color: '#3b82f6' }]}>{stats?.remediations?.completion_rate || 0}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(stats?.remediations?.completion_rate || 0, 100)}%`, backgroundColor: '#3b82f6' }]} />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
  },
  onlineIndicator: {
    padding: 5,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  syncBannerText: {
    color: '#fcd34d',
    marginLeft: 10,
    flex: 1,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
  },
  statCardPrimary: {
    borderLeftColor: '#06b6d4',
  },
  statCardWarning: {
    borderLeftColor: '#f97316',
  },
  statCardDanger: {
    borderLeftColor: '#ef4444',
  },
  statCardSuccess: {
    borderLeftColor: '#10b981',
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  statSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  actionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: '23%',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: '#06b6d4',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    marginTop: 10,
  },
  caseCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  caseInfo: {
    flex: 1,
  },
  caseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  caseDetails: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  severityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  caseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  caseType: {
    color: '#64748b',
    fontSize: 12,
  },
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  visitRiskIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  visitContent: {
    flex: 1,
  },
  visitName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  visitDetails: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  visitDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  visitStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  riskBadgeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  performanceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  performanceLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  performanceValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomSpacer: {
    height: 30,
  },
});

export default SSRTEAgentDashboard;
