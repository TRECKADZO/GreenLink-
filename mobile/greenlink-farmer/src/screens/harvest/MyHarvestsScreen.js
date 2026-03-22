import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const MyHarvestsScreen = ({ navigation }) => {
  const [harvests, setHarvests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null);

  const fetchHarvests = useCallback(async () => {
    try {
      const params = filter ? `?statut=${filter}` : '';
      const response = await farmerApi.getHarvests(params);
      const data = response.data || response;
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
      setLoading(true);
      fetchHarvests();
    }, [fetchHarvests])
  );

  const getStatusStyle = (statut) => {
    switch (statut) {
      case 'validee': return { bg: '#dcfce7', text: '#16a34a', label: 'Validee', icon: 'checkmark-circle' };
      case 'rejetee': return { bg: '#fef2f2', text: '#dc2626', label: 'Rejetee', icon: 'close-circle' };
      default: return { bg: '#fef3c7', text: '#d97706', label: 'En attente', icon: 'time' };
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderHarvest = ({ item }) => {
    const status = getStatusStyle(item.statut);

    return (
      <View style={styles.card} data-testid={`harvest-card-${item.id}`}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, { backgroundColor: status.text }]} />
            <View>
              <Text style={styles.quantityText}>{item.quantity_display || `${item.quantity_kg} kg`}</Text>
              <Text style={styles.date}>{formatDate(item.harvest_date)}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.text} />
            <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="leaf-outline" size={15} color={COLORS.gray[400]} />
              <Text style={styles.infoLabel}>Qualite</Text>
              <Text style={styles.infoValue}>Grade {item.quality_grade || '-'}</Text>
            </View>
            {item.coop_name ? (
              <View style={styles.infoItem}>
                <Ionicons name="people-outline" size={15} color={COLORS.gray[400]} />
                <Text style={styles.infoLabel}>Cooperative</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{item.coop_name}</Text>
              </View>
            ) : null}
            {item.total_amount > 0 ? (
              <View style={styles.infoItem}>
                <Ionicons name="cash-outline" size={15} color={COLORS.gray[400]} />
                <Text style={styles.infoLabel}>Montant</Text>
                <Text style={styles.infoValue}>{item.total_amount.toLocaleString()} XOF</Text>
              </View>
            ) : null}
            {item.carbon_premium > 0 ? (
              <View style={styles.infoItem}>
                <Ionicons name="sparkles-outline" size={15} color={COLORS.secondary} />
                <Text style={styles.infoLabel}>Prime carbone</Text>
                <Text style={[styles.infoValue, { color: COLORS.secondary }]}>{item.carbon_premium.toLocaleString()} XOF</Text>
              </View>
            ) : null}
          </View>
          {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          {item.rejection_reason ? (
            <View style={styles.rejectionBox}>
              <Ionicons name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.rejectionText}>Motif: {item.rejection_reason}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const filters = [
    { key: null, label: 'Toutes', count: stats.total || 0 },
    { key: 'en_attente', label: 'En attente', count: stats.en_attente || 0 },
    { key: 'validee', label: 'Validees', count: stats.validees || 0 },
    { key: 'rejetee', label: 'Rejetees', count: stats.rejetees || 0 },
  ];

  if (loading && harvests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} data-testid="my-harvests-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Recoltes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Harvest')} data-testid="add-harvest-button">
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.total || 0}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#d97706' }]}>{stats.en_attente || 0}</Text>
          <Text style={styles.summaryLabel}>En attente</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{stats.validees || 0}</Text>
          <Text style={styles.summaryLabel}>Validees</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{stats.rejetees || 0}</Text>
          <Text style={styles.summaryLabel}>Rejetees</Text>
        </View>
      </View>

      {/* Total kg */}
      <View style={styles.totalBar}>
        <Ionicons name="scale-outline" size={16} color={COLORS.primary} />
        <Text style={styles.totalText}>
          Total: <Text style={styles.totalBold}>{(stats.total_kg || 0).toLocaleString()} kg</Text>
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key || 'all'}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
            data-testid={`filter-${f.key || 'all'}`}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Harvest List */}
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
            <Ionicons name="leaf-outline" size={56} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>Aucune recolte</Text>
            <Text style={styles.emptyText}>Declarez votre premiere recolte</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Harvest')}
              data-testid="empty-add-harvest-button"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Declarer une recolte</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  summaryRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.sm, paddingTop: SPACING.md, gap: SPACING.xs,
  },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: SPACING.sm,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  summaryValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  summaryLabel: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500], marginTop: 2 },
  totalBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm,
    backgroundColor: '#e0f2e9', borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  totalText: { fontSize: FONTS.sizes.sm, color: COLORS.primary },
  totalBold: { fontWeight: '700' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.gray[200],
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sizes.xs, color: COLORS.gray[600] },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: SPACING.sm,
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  quantityText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  cardBody: { padding: SPACING.md },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoLabel: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400] },
  infoValue: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: '500' },
  notes: {
    fontSize: FONTS.sizes.xs, color: COLORS.gray[500],
    marginTop: SPACING.sm, fontStyle: 'italic',
  },
  rejectionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: SPACING.sm, backgroundColor: '#fef2f2',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: 6,
  },
  rejectionText: { fontSize: FONTS.sizes.xs, color: '#dc2626', flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.gray[500] },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[400] },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: 24,
  },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: FONTS.sizes.sm },
});

export default MyHarvestsScreen;
