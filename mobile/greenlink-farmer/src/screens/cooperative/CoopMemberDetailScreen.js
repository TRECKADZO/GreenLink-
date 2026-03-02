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

const InfoRow = ({ label, value, icon }) => (
  <View style={styles.infoRow}>
    {icon && <Ionicons name={icon} size={18} color={COLORS.primary} style={styles.infoIcon} />}
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

const ParcelCard = ({ parcel, onDelete }) => (
  <View style={styles.parcelCard}>
    <View style={styles.parcelHeader}>
      <View style={styles.parcelLocation}>
        <Ionicons name="location" size={16} color={COLORS.primary} />
        <Text style={styles.parcelLocationText}>{parcel.location}</Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(parcel.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color="#F44336" />
      </TouchableOpacity>
    </View>
    <View style={styles.parcelStats}>
      <View style={styles.parcelStat}>
        <Text style={styles.parcelStatValue}>{parcel.area_hectares} ha</Text>
        <Text style={styles.parcelStatLabel}>Surface</Text>
      </View>
      <View style={styles.parcelStat}>
        <Text style={[styles.parcelStatValue, { color: COLORS.primary }]}>
          {parcel.carbon_score}/10
        </Text>
        <Text style={styles.parcelStatLabel}>Score</Text>
      </View>
      <View style={styles.parcelStat}>
        <Text style={styles.parcelStatValue}>{parcel.co2_captured_tonnes}t</Text>
        <Text style={styles.parcelStatLabel}>CO₂</Text>
      </View>
    </View>
    {parcel.certification && (
      <View style={styles.certBadge}>
        <Ionicons name="shield-checkmark" size={12} color="#4CAF50" />
        <Text style={styles.certText}>{parcel.certification}</Text>
      </View>
    )}
  </View>
);

export default function CoopMemberDetailScreen({ route, navigation }) {
  const { memberId, memberName } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [member, setMember] = useState(null);
  const [parcelsData, setParcelsData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [memberDetails, parcels] = await Promise.all([
        cooperativeApi.getMemberDetails(memberId),
        cooperativeApi.getMemberParcels(memberId),
      ]);
      setMember(memberDetails);
      setParcelsData(parcels);
    } catch (error) {
      console.error('Error fetching member details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du membre');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleValidate = async () => {
    try {
      await cooperativeApi.validateMember(memberId);
      Alert.alert('Succès', 'Membre validé avec succès');
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de valider le membre');
    }
  };

  const handleAddParcel = () => {
    navigation.navigate('AddMemberParcel', { memberId, memberName });
  };

  const handleDeleteParcel = async (parcelId) => {
    Alert.alert(
      'Confirmer',
      'Voulez-vous vraiment supprimer cette parcelle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await cooperativeApi.deleteMemberParcel(memberId, parcelId);
              Alert.alert('Succès', 'Parcelle supprimée');
              fetchData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la parcelle');
            }
          },
        },
      ]
    );
  };

  const handleDownloadReceipt = async (distributionId) => {
    try {
      Alert.alert('Téléchargement', 'Génération du reçu PDF...');
      await cooperativeApi.downloadMemberReceipt(memberId, distributionId, member?.full_name || 'membre');
      Alert.alert('Succès', 'Reçu téléchargé avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de télécharger le reçu');
    }
  };

  if (loading) {
    return <Loader message="Chargement..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {member?.full_name || memberName}
        </Text>
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
        {/* Member Info Card */}
        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {member?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.memberName}>{member?.full_name}</Text>
              <View style={[
                styles.statusBadge,
                member?.status === 'active' ? styles.statusActive : styles.statusPending
              ]}>
                <Text style={[
                  styles.statusText,
                  member?.status === 'active' ? styles.statusTextActive : styles.statusTextPending
                ]}>
                  {member?.status === 'active' ? 'Actif' : 'En attente'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <InfoRow icon="call" label="Téléphone" value={member?.phone_number} />
          <InfoRow icon="location" label="Village" value={member?.village} />
          <InfoRow icon="card" label="CNI" value={member?.cni_number} />
          <InfoRow
            icon="checkmark-circle"
            label="Consentement"
            value={member?.consent_given ? 'Oui' : 'Non'}
          />

          {member?.status === 'pending_validation' && (
            <TouchableOpacity style={styles.validateButton} onPress={handleValidate}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.validateButtonText}>Valider ce membre</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Summary */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{parcelsData?.total_parcels || 0}</Text>
            <Text style={styles.statBoxLabel}>Parcelles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{parcelsData?.total_hectares || 0}</Text>
            <Text style={styles.statBoxLabel}>Hectares</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{parcelsData?.total_co2 || 0}</Text>
            <Text style={styles.statBoxLabel}>Tonnes CO₂</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statBoxValue, { color: COLORS.primary }]}>
              {parcelsData?.average_carbon_score || 0}
            </Text>
            <Text style={styles.statBoxLabel}>Score</Text>
          </View>
        </View>

        {/* Parcels Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parcelles</Text>
          <TouchableOpacity style={styles.addParcelBtn} onPress={handleAddParcel}>
            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
            <Text style={styles.addParcelText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {parcelsData?.parcels?.length > 0 ? (
          parcelsData.parcels.map((parcel, index) => (
            <ParcelCard
              key={parcel.id || index}
              parcel={parcel}
              onDelete={handleDeleteParcel}
            />
          ))
        ) : (
          <View style={styles.emptyParcels}>
            <Ionicons name="map-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}>Aucune parcelle déclarée</Text>
            <TouchableOpacity style={styles.addFirstParcelBtn} onPress={handleAddParcel}>
              <Text style={styles.addFirstParcelText}>Ajouter une parcelle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment History */}
        {member?.total_premium_earned > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Revenus Carbone</Text>
            <View style={styles.revenueBox}>
              <Ionicons name="cash" size={24} color={COLORS.primary} />
              <Text style={styles.revenueValue}>
                {(member?.total_premium_earned || 0).toLocaleString()} XOF
              </Text>
            </View>
            <TouchableOpacity
              style={styles.downloadReceiptBtn}
              onPress={() => {
                // In a real app, you'd have the distribution_id
                Alert.alert('Info', 'Sélectionnez une distribution pour télécharger le reçu');
              }}
            >
              <Ionicons name="download" size={18} color={COLORS.primary} />
              <Text style={styles.downloadReceiptText}>Télécharger reçu PDF</Text>
            </TouchableOpacity>
          </View>
        )}

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
    flex: 1,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  avatarInfo: {
    marginLeft: 16,
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  statusTextPending: {
    color: '#FF9800',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  validateButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statBoxLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addParcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addParcelText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  parcelCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parcelLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  parcelLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 6,
  },
  deleteBtn: {
    padding: 4,
  },
  parcelStats: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-around',
  },
  parcelStat: {
    alignItems: 'center',
  },
  parcelStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  parcelStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  certText: {
    fontSize: 11,
    color: '#4CAF50',
    marginLeft: 4,
  },
  emptyParcels: {
    alignItems: 'center',
    paddingVertical: 30,
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  addFirstParcelBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
  },
  addFirstParcelText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  revenueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    borderRadius: 10,
  },
  revenueValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 10,
  },
  downloadReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  downloadReceiptText: {
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 6,
  },
});
