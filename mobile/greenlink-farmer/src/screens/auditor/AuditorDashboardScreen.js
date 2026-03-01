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
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../../config';
import axios from 'axios';
import { API_URL } from '../../config';

const AuditorDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/carbon-auditor/dashboard/${user?.id}`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching auditor dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDashboard();
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>🛡️</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{dashboard?.auditor?.full_name || 'Auditeur'}</Text>
            <Text style={styles.role}>Auditeur Carbone GreenLink</Text>
          </View>
        </View>
        
        {/* Certifications */}
        {dashboard?.auditor?.certifications?.length > 0 && (
          <View style={styles.certifications}>
            {dashboard.auditor.certifications.map((cert, i) => (
              <View key={i} style={styles.certBadge}>
                <Text style={styles.certText}>{cert}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statValue}>{dashboard?.stats?.total_audits || 0}</Text>
            <Text style={styles.statLabel}>Audits totaux</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={styles.statValue}>{dashboard?.stats?.approved || 0}</Text>
            <Text style={styles.statLabel}>Approuvés</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardDanger]}>
            <Text style={styles.statValue}>{dashboard?.stats?.rejected || 0}</Text>
            <Text style={styles.statLabel}>Rejetés</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWarning]}>
            <Text style={styles.statValue}>{dashboard?.stats?.approval_rate || 0}%</Text>
            <Text style={styles.statLabel}>Taux approbation</Text>
          </View>
        </View>
      </View>

      {/* Monthly Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Progression ce mois</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Audits effectués</Text>
            <Text style={styles.progressValue}>{dashboard?.stats?.monthly_audits || 0} / 20</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(((dashboard?.stats?.monthly_audits || 0) / 20) * 100, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressHint}>Objectif mensuel: 20 audits</Text>
        </View>
      </View>

      {/* Pending Missions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎯 Missions en cours</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{dashboard?.missions_count || 0}</Text>
          </View>
        </View>

        {dashboard?.pending_missions?.length > 0 ? (
          dashboard.pending_missions.map((mission) => (
            <TouchableOpacity
              key={mission.id}
              style={styles.missionCard}
              onPress={() => navigation.navigate('AuditorMission', { missionId: mission.id })}
            >
              <View style={styles.missionHeader}>
                <Text style={styles.missionTitle}>{mission.cooperative_name}</Text>
                <View style={[
                  styles.statusBadge,
                  mission.status === 'pending' ? styles.statusPending :
                  mission.status === 'in_progress' ? styles.statusInProgress :
                  styles.statusCompleted
                ]}>
                  <Text style={styles.statusText}>
                    {mission.status === 'pending' ? 'En attente' :
                     mission.status === 'in_progress' ? 'En cours' : 'Terminé'}
                  </Text>
                </View>
              </View>
              <View style={styles.missionStats}>
                <Text style={styles.missionStat}>📍 {mission.parcels_count} parcelles</Text>
                <Text style={styles.missionStat}>✅ {mission.parcels_audited} auditées</Text>
              </View>
              <View style={styles.missionProgress}>
                <View style={styles.missionProgressBar}>
                  <View 
                    style={[
                      styles.missionProgressFill,
                      { width: `${(mission.parcels_audited / mission.parcels_count) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.missionProgressText}>
                  {Math.round((mission.parcels_audited / mission.parcels_count) * 100)}%
                </Text>
              </View>
              {mission.deadline && (
                <Text style={styles.deadline}>
                  ⏰ Échéance: {new Date(mission.deadline).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Aucune mission en cours</Text>
            <Text style={styles.emptyText}>Les nouvelles missions apparaîtront ici</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('AuditorMissions')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>Mes Missions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('AuditHistory')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Historique</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionLabel}>Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionLabel}>Stats</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>🌱</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Rappel Audit Carbone</Text>
          <Text style={styles.infoText}>
            Vérifiez toujours : superficie réelle, densité des arbres d'ombrage, 
            pratiques durables, et prenez des photos géolocalisées.
          </Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#059669',
    padding: SPACING.lg,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
  },
  headerInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  role: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  certifications: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    gap: 8,
  },
  certBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  certText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    padding: SPACING.md,
    marginTop: -20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statCardSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statCardDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statCardWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  section: {
    padding: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING.sm,
  },
  badge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  progressValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  missionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusInProgress: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  missionStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  missionStat: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  missionProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  missionProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  missionProgressText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    width: 35,
    textAlign: 'right',
  },
  deadline: {
    color: '#F59E0B',
    fontSize: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: '#1F2937',
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '47%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default AuditorDashboardScreen;
