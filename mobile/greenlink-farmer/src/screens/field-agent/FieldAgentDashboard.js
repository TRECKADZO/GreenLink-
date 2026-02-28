import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { Loader } from '../../components/UI';
import { COLORS, FONTS, SPACING, API_URL } from '../../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FieldAgentDashboard = ({ navigation }) => {
  const { token, user } = useAuth();
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('field_agent_dashboard');
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_URL}/api/field-agent/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
        await cacheData('field_agent_dashboard', result);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      const cached = await getCachedData('field_agent_dashboard');
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

  const getRiskColor = (level) => {
    switch (level) {
      case 'critique': return '#ef4444';
      case 'eleve': return '#f97316';
      case 'modere': return '#f59e0b';
      case 'faible': return '#10b981';
      default: return COLORS.gray[400];
    }
  };

  if (loading) {
    return <Loader message="Chargement du tableau de bord..." />;
  }

  const { agent_info, performance, statistics, risk_distribution, recent_activities, achievements } = data || {};

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
          <View style={styles.avatarContainer}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.agentName}>{agent_info?.name || user?.full_name}</Text>
          <Text style={styles.agentZone}>{agent_info?.zone || 'Agent Terrain'}</Text>
          
          {/* Performance Badge */}
          <View style={[styles.performanceBadge, { backgroundColor: performance?.badge_color || '#6b7280' }]}>
            <Ionicons name="star" size={14} color={COLORS.white} />
            <Text style={styles.performanceText}>
              {performance?.level || 'Débutant'} • {performance?.score || 0}%
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#06b6d4' }]}
            onPress={() => navigation.navigate('SSRTEVisitForm')}
          >
            <Ionicons name="clipboard" size={28} color={COLORS.white} />
            <Text style={styles.statValue}>{statistics?.ssrte_visits?.total || 0}</Text>
            <Text style={styles.statLabel}>Visites SSRTE</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${statistics?.ssrte_visits?.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>{statistics?.ssrte_visits?.this_month || 0}/{statistics?.ssrte_visits?.target || 20} ce mois</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#10b981' }]}
            onPress={() => navigation.navigate('AddCoopMember')}
          >
            <Ionicons name="people" size={28} color={COLORS.white} />
            <Text style={styles.statValue}>{statistics?.members_onboarded?.total || 0}</Text>
            <Text style={styles.statLabel}>Membres inscrits</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${statistics?.members_onboarded?.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>Objectif: {statistics?.members_onboarded?.target || 10}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#8b5cf6' }]}
            onPress={() => navigation.navigate('GeoPhoto')}
          >
            <Ionicons name="camera" size={28} color={COLORS.white} />
            <Text style={styles.statValue}>{statistics?.geotagged_photos?.total || 0}</Text>
            <Text style={styles.statLabel}>Photos géo</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${statistics?.geotagged_photos?.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>Objectif: {statistics?.geotagged_photos?.target || 30}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: '#f59e0b' }]}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Ionicons name="qr-code" size={28} color={COLORS.white} />
            <Text style={styles.statValue}>{statistics?.qr_scans || 0}</Text>
            <Text style={styles.statLabel}>QR Scannés</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.progressText}>Scanner un producteur</Text>
          </TouchableOpacity>
        </View>

        {/* Children Identified Alert */}
        {statistics?.children_identified > 0 && (
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={24} color="#ef4444" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{statistics.children_identified} enfants identifiés</Text>
              <Text style={styles.alertText}>En situation de travail dangereux</Text>
            </View>
          </View>
        )}

        {/* Risk Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Répartition des Risques</Text>
          <View style={styles.riskGrid}>
            {Object.entries(risk_distribution || {}).map(([level, count]) => (
              <View key={level} style={styles.riskItem}>
                <View style={[styles.riskDot, { backgroundColor: getRiskColor(level) }]} />
                <Text style={styles.riskCount}>{count}</Text>
                <Text style={styles.riskLabel}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dernières Activités</Text>
          {recent_activities?.length > 0 ? (
            recent_activities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: getRiskColor(activity.risk_level) }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityName}>{activity.farmer_name}</Text>
                  <Text style={styles.activityMeta}>
                    {activity.children_count} enfant(s) • Risque {activity.risk_level}
                  </Text>
                </View>
                <Text style={styles.activityDate}>
                  {activity.date ? new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune activité récente</Text>
          )}
        </View>

        {/* Achievements */}
        {achievements?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Badges Débloqués</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {achievements.map((badge, index) => (
                <View key={index} style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <Ionicons name={badge.icon} size={20} color="#06b6d4" />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('SSRTEVisitForm')}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.white} />
            <Text style={styles.actionText}>Nouvelle Visite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Ionicons name="qr-code" size={24} color={COLORS.white} />
            <Text style={styles.actionText}>Scanner QR</Text>
          </TouchableOpacity>
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
    backgroundColor: '#06b6d4',
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
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  agentName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  agentZone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  performanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: SPACING.sm,
  },
  performanceText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
    marginTop: -SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    width: (SCREEN_WIDTH - SPACING.md * 3) / 2,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  alertText: {
    fontSize: 13,
    color: '#991b1b',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: SPACING.md,
  },
  riskGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  riskItem: {
    alignItems: 'center',
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  riskCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  riskLabel: {
    fontSize: 11,
    color: COLORS.gray[500],
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  activityMeta: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  activityDate: {
    fontSize: 11,
    color: COLORS.gray[400],
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray[400],
    paddingVertical: SPACING.lg,
  },
  badge: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 70,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#06b6d420',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 10,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#06b6d4',
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  actionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default FieldAgentDashboard;
