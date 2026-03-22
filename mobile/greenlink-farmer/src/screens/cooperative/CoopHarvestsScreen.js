import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import cooperativeApi from '../../services/cooperativeApi';
import { COLORS, FONTS, SPACING } from '../../config';

const CoopHarvestsScreen = ({ navigation }) => {
  const [harvests, setHarvests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null); // null = all, en_attente, validee, rejetee
  const [actionLoading, setActionLoading] = useState(null);

  const fetchHarvests = useCallback(async () => {
    try {
      const data = await cooperativeApi.getHarvests(filter);
      setHarvests(data.harvests || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching harvests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchHarvests();
    }, [fetchHarvests])
  );

  const handleValidate = (harvest) => {
    Alert.alert(
      'Valider la récolte',
      `Confirmer la validation de ${harvest.quantity_kg} kg de ${harvest.farmer_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider', style: 'default',
          onPress: async () => {
            setActionLoading(harvest.id);
            try {
              await cooperativeApi.validateHarvest(harvest.id);
              Alert.alert('Succès', 'Récolte validée');
              fetchHarvests();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de valider la récolte');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleReject = (harvest) => {
    Alert.prompt(
      'Rejeter la récolte',
      'Motif du rejet (optionnel) :',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter', style: 'destructive',
          onPress: async (reason) => {
            setActionLoading(harvest.id);
            try {
              await cooperativeApi.rejectHarvest(harvest.id, reason || '');
              Alert.alert('Succès', 'Récolte rejetée');
              fetchHarvests();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de rejeter la récolte');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleRejectAndroid = (harvest) => {
    Alert.alert(
      'Rejeter la récolte',
      `Rejeter la récolte de ${harvest.quantity_kg} kg de ${harvest.farmer_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter', style: 'destructive',
          onPress: async () => {
            setActionLoading(harvest.id);
            try {
              await cooperativeApi.rejectHarvest(harvest.id, '');
              Alert.alert('Succès', 'Récolte rejetée');
              fetchHarvests();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de rejeter la récolte');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const getStatusStyle = (statut) => {
    switch (statut) {
      case 'validee': return { bg: '#dcfce7', text: '#16a34a', label: 'Validée' };
      case 'rejetee': return { bg: '#fef2f2', text: '#dc2626', label: 'Rejetée' };
      default: return { bg: '#fef3c7', text: '#d97706', label: 'En attente' };
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderHarvest = ({ item }) => {
    const status = getStatusStyle(item.statut);
    const isProcessing = actionLoading === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.farmerName}>{item.farmer_name || 'Producteur'}</Text>
            <Text style={styles.date}>{formatDate(item.harvest_date)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="scale-outline" size={16} color={COLORS.gray[500]} />
              <Text style={styles.infoValue}>{item.quantity_kg} kg</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="star-outline" size={16} color={COLORS.gray[500]} />
              <Text style={styles.infoValue}>Grade {item.quality_grade}</Text>
            </View>
            {item.unit && item.unit !== 'kg' && (
              <View style={styles.infoItem}>
                <Ionicons name="cube-outline" size={16} color={COLORS.gray[500]} />
                <Text style={styles.infoValue}>{item.unit}</Text>
              </View>
            )}
          </View>
          {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          {item.rejection_reason ? (
            <Text style={styles.rejectionReason}>Motif: {item.rejection_reason}</Text>
          ) : null}
        </View>

        {item.statut === 'en_attente' && (
          <View style={styles.actions}>
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.validateBtn]}
                  onPress={() => handleValidate(item)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Valider</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleRejectAndroid(item)}
                >
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Rejeter</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const filters = [
    { key: null, label: 'Toutes', count: stats.total || 0 },
    { key: 'en_attente', label: 'En attente', count: stats.en_attente || 0 },
    { key: 'validee', label: 'Validées', count: stats.validees || 0 },
    { key: 'rejetee', label: 'Rejetées', count: stats.rejetees || 0 },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Récoltes des membres</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_kg_attente || 0}</Text>
          <Text style={styles.statLabel}>kg en attente</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.total_kg_valide || 0}</Text>
          <Text style={styles.statLabel}>kg validés</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key || 'all'}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => { setFilter(f.key); setLoading(true); }}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={harvests}
        keyExtractor={(item) => item.id}
        renderItem={renderHarvest}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHarvests(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color={COLORS.gray[300]} />
            <Text style={styles.emptyText}>Aucune récolte</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray[200] },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  statsRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: SPACING.md, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#d97706' },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500], marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.xs },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.gray[200] },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sizes.xs, color: COLORS.gray[600] },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: SPACING.sm, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  farmerName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  cardBody: { padding: SPACING.md },
  infoRow: { flexDirection: 'row', gap: SPACING.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoValue: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: '500' },
  notes: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500], marginTop: SPACING.xs, fontStyle: 'italic' },
  rejectionReason: { fontSize: FONTS.sizes.xs, color: '#dc2626', marginTop: SPACING.xs },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.gray[100] },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  validateBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: FONTS.sizes.sm },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.gray[400] },
});

export default CoopHarvestsScreen;
