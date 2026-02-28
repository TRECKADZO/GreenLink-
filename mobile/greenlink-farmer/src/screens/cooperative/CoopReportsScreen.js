import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';
import { Loader } from '../../components/UI';

const StatBox = ({ value, label, icon, color }) => (
  <View style={styles.statBox}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ReportButton = ({ title, description, icon, onPress, loading, color = COLORS.primary }) => (
  <TouchableOpacity
    style={styles.reportButton}
    onPress={onPress}
    disabled={loading}
  >
    <View style={[styles.reportIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <View style={styles.reportContent}>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.reportDescription}>{description}</Text>
    </View>
    <View style={styles.reportAction}>
      {loading ? (
        <Text style={styles.loadingText}>...</Text>
      ) : (
        <Ionicons name="download-outline" size={22} color={color} />
      )}
    </View>
  </TouchableOpacity>
);

export default function CoopReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eudrReport, setEudrReport] = useState(null);
  const [villageStats, setVillageStats] = useState([]);
  const [downloadingEUDR, setDownloadingEUDR] = useState(false);
  const [downloadingCarbon, setDownloadingCarbon] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [report, villages] = await Promise.all([
        cooperativeApi.getEUDRReport(),
        cooperativeApi.getVillageStats(),
      ]);
      setEudrReport(report);
      setVillageStats(villages);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleDownloadEUDR = async () => {
    try {
      setDownloadingEUDR(true);
      await cooperativeApi.downloadEUDRPdf();
      Alert.alert('Succès', 'Rapport EUDR téléchargé');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de télécharger le rapport');
    } finally {
      setDownloadingEUDR(false);
    }
  };

  const handleDownloadCarbon = async () => {
    try {
      setDownloadingCarbon(true);
      await cooperativeApi.downloadCarbonPdf();
      Alert.alert('Succès', 'Rapport Carbone téléchargé');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de télécharger le rapport');
    } finally {
      setDownloadingCarbon(false);
    }
  };

  if (loading) {
    return <Loader message="Chargement des rapports..." />;
  }

  const { cooperative, compliance, statistics } = eudrReport || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rapports & Conformité</Text>
        <View style={{ width: 40 }} />
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
        {/* Cooperative Info */}
        <View style={styles.coopCard}>
          <View style={styles.coopHeader}>
            <Ionicons name="business" size={24} color={COLORS.primary} />
            <View style={styles.coopInfo}>
              <Text style={styles.coopName}>{cooperative?.name || 'Coopérative'}</Text>
              <Text style={styles.coopCode}>Code: {cooperative?.code || 'N/A'}</Text>
            </View>
          </View>
          {cooperative?.certifications?.length > 0 && (
            <View style={styles.certifications}>
              {cooperative.certifications.map((cert, index) => (
                <View key={index} style={styles.certBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#4CAF50" />
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Compliance Status */}
        <View style={styles.complianceCard}>
          <Text style={styles.sectionTitle}>Conformité EUDR</Text>
          
          <View style={styles.complianceScore}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{compliance?.compliance_rate || 0}%</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>Taux de conformité</Text>
              <View style={[
                styles.statusBadge,
                (compliance?.compliance_rate || 0) >= 90 ? styles.statusGood : styles.statusWarning
              ]}>
                <Ionicons
                  name={(compliance?.compliance_rate || 0) >= 90 ? 'checkmark-circle' : 'warning'}
                  size={14}
                  color={(compliance?.compliance_rate || 0) >= 90 ? '#4CAF50' : '#FF9800'}
                />
                <Text style={[
                  styles.statusText,
                  (compliance?.compliance_rate || 0) >= 90 ? styles.statusTextGood : styles.statusTextWarning
                ]}>
                  {(compliance?.compliance_rate || 0) >= 90 ? 'Conforme' : 'À améliorer'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.complianceDetails}>
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Géolocalisation</Text>
              <Text style={styles.complianceValue}>{compliance?.geolocation_rate || 0}%</Text>
            </View>
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Parcelles</Text>
              <Text style={styles.complianceValue}>
                {compliance?.geolocated_parcels || 0} / {compliance?.total_parcels || 0}
              </Text>
            </View>
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Alertes</Text>
              <Text style={[
                styles.complianceValue,
                (compliance?.deforestation_alerts || 0) === 0 ? styles.valueGood : styles.valueWarning
              ]}>
                {compliance?.deforestation_alerts || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Statistiques Globales</Text>
          <View style={styles.statsGrid}>
            <StatBox
              icon="people"
              value={statistics?.total_members || 0}
              label="Membres"
              color="#2196F3"
            />
            <StatBox
              icon="map"
              value={statistics?.total_hectares || 0}
              label="Hectares"
              color="#4CAF50"
            />
            <StatBox
              icon="cloud"
              value={statistics?.total_co2_tonnes || 0}
              label="Tonnes CO₂"
              color="#00BCD4"
            />
            <StatBox
              icon="star"
              value={`${statistics?.average_carbon_score || 0}/10`}
              label="Score"
              color="#FF9800"
            />
          </View>
        </View>

        {/* Download Reports */}
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>Télécharger les Rapports</Text>
          
          <ReportButton
            title="Rapport EUDR"
            description="Conformité réglementation européenne"
            icon="document-text"
            onPress={handleDownloadEUDR}
            loading={downloadingEUDR}
            color="#9C27B0"
          />
          
          <ReportButton
            title="Rapport Carbone"
            description="Impact environnemental et durabilité"
            icon="leaf"
            onPress={handleDownloadCarbon}
            loading={downloadingCarbon}
            color="#4CAF50"
          />
        </View>

        {/* Village Stats */}
        {villageStats.length > 0 && (
          <View style={styles.villagesCard}>
            <Text style={styles.sectionTitle}>Répartition par Village</Text>
            {villageStats.map((village, index) => (
              <View key={index} style={styles.villageRow}>
                <View style={styles.villageInfo}>
                  <Ionicons name="location" size={16} color={COLORS.gray} />
                  <Text style={styles.villageName}>{village.village || 'Non spécifié'}</Text>
                </View>
                <View style={styles.villageStats}>
                  <Text style={styles.villageCount}>{village.members_count} membres</Text>
                  <Text style={styles.villageActive}>{village.active_count} actifs</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            Les rapports PDF sont conformes aux exigences EUDR et peuvent être
            présentés aux auditeurs et acheteurs internationaux.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  coopCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  coopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coopInfo: {
    marginLeft: 12,
  },
  coopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  coopCode: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  certifications: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  certText: {
    fontSize: 11,
    color: '#2E7D32',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  complianceCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  complianceScore: {
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
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scoreInfo: {
    marginLeft: 16,
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusGood: {
    backgroundColor: '#E8F5E9',
  },
  statusWarning: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusTextGood: {
    color: '#4CAF50',
  },
  statusTextWarning: {
    color: '#FF9800',
  },
  complianceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  complianceItem: {
    alignItems: 'center',
  },
  complianceLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  complianceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  valueGood: {
    color: '#4CAF50',
  },
  valueWarning: {
    color: '#FF9800',
  },
  statsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  reportsSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportContent: {
    flex: 1,
    marginLeft: 14,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  reportDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  reportAction: {
    padding: 8,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  villagesCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  villageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  villageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  villageName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  villageStats: {
    alignItems: 'flex-end',
  },
  villageCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  villageActive: {
    fontSize: 11,
    color: COLORS.gray,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
