import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../config';
import { api } from '../../services/api';

const AuditorMissionScreen = ({ navigation, route }) => {
  const { missionId } = route.params;
  const { user } = useAuth();
  const [mission, setMission] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMissionParcels();
  }, [missionId]);

  const fetchMissionParcels = async () => {
    try {
      const response = await api.get(`/carbon-auditor/mission/${missionId}/parcels`);
      setMission(response.data);
      setParcels(response.data.parcels || []);
    } catch (error) {
      console.error('Error fetching mission:', error);
      Alert.alert('Erreur', 'Impossible de charger la mission');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (parcel) => {
    if (parcel.audit_status === 'completed') {
      if (parcel.audit_result === 'approved') return styles.statusApproved;
      if (parcel.audit_result === 'rejected') return styles.statusRejected;
      return styles.statusReview;
    }
    return styles.statusPending;
  };

  const getStatusText = (parcel) => {
    if (parcel.audit_status === 'completed') {
      if (parcel.audit_result === 'approved') return '✅ Approuvé';
      if (parcel.audit_result === 'rejected') return '❌ Rejeté';
      return '⚠️ À revoir';
    }
    return '⏳ En attente';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const completedCount = parcels.filter(p => p.audit_status === 'completed').length;
  const progressPercent = parcels.length > 0 ? (completedCount / parcels.length) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Mission d'Audit</Text>
            <Text style={styles.headerSubtitle}>{mission?.cooperative_name}</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{completedCount}/{parcels.length}</Text>
            <Text style={styles.progressLabel}>auditées</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
        </View>
      </View>

      {/* Parcels List */}
      <ScrollView style={styles.content}>
        {parcels.map((parcel) => (
          <TouchableOpacity
            key={parcel.id}
            style={[
              styles.parcelCard,
              parcel.audit_status === 'completed' && styles.parcelCardCompleted
            ]}
            onPress={() => navigation.navigate('AuditForm', { 
              missionId, 
              parcelId: parcel.id,
              parcel 
            })}
          >
            <View style={styles.parcelHeader}>
              <View style={[styles.parcelIcon, 
                parcel.audit_status === 'completed' 
                  ? parcel.audit_result === 'approved' 
                    ? styles.iconApproved 
                    : styles.iconRejected
                  : styles.iconPending
              ]}>
                <Text style={styles.parcelIconText}>
                  {parcel.audit_status === 'completed' 
                    ? parcel.audit_result === 'approved' ? '✓' : '✗'
                    : '🌱'}
                </Text>
              </View>
              <View style={styles.parcelInfo}>
                <Text style={styles.parcelTitle}>{parcel.location}</Text>
                <Text style={styles.parcelFarmer}>👤 {parcel.farmer_name}</Text>
              </View>
              <View style={[styles.statusBadge, getStatusStyle(parcel)]}>
                <Text style={styles.statusText}>{getStatusText(parcel)}</Text>
              </View>
            </View>

            <View style={styles.parcelDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{parcel.village}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📐</Text>
                <Text style={styles.detailText}>{parcel.area_hectares} ha</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🌿</Text>
                <Text style={styles.detailText}>{parcel.crop_type}</Text>
              </View>
            </View>

            {parcel.carbon_score && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Score déclaré:</Text>
                <Text style={styles.scoreValue}>{parcel.carbon_score}/10</Text>
              </View>
            )}

            {parcel.gps_lat && parcel.gps_lng && (
              <View style={styles.gpsInfo}>
                <Text style={styles.gpsText}>🛰️ GPS: {parcel.gps_lat.toFixed(4)}, {parcel.gps_lng.toFixed(4)}</Text>
              </View>
            )}

            <View style={styles.parcelAction}>
              <Text style={styles.actionText}>
                {parcel.audit_status === 'completed' ? 'Voir l\'audit →' : 'Auditer →'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {parcels.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>Aucune parcelle</Text>
            <Text style={styles.emptyText}>Les parcelles à auditer apparaîtront ici</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
    padding: SPACING.md,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    marginBottom: SPACING.sm,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  progressBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    width: 35,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  parcelCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  parcelCardCompleted: {
    opacity: 0.8,
  },
  parcelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  parcelIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPending: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  iconApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  iconRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  parcelIconText: {
    fontSize: 20,
  },
  parcelInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  parcelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  parcelFarmer: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPending: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusReview: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  parcelDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SPACING.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailIcon: {
    fontSize: 12,
  },
  detailText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginRight: 6,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  gpsInfo: {
    marginBottom: SPACING.sm,
  },
  gpsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  parcelAction: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  actionText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl * 2,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default AuditorMissionScreen;
