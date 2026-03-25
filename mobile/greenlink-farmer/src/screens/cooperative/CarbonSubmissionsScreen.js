import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const STATUS_CONFIG = {
  pending_approval: { label: 'En attente', color: '#f59e0b', bg: '#fef3c7', icon: 'time' },
  approved: { label: 'Approuve', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
  rejected: { label: 'Rejete', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
};

export default function CarbonSubmissionsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const response = await api.get('/carbon-listings/my');
      setListings(response.data || []);
    } catch (error) {
      console.error('Error fetching carbon listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchListings(); }, [fetchListings]));

  const pendingCount = listings.filter(l => l.status === 'pending_approval').length;
  const approvedCount = listings.filter(l => l.status === 'approved').length;
  const totalTonnes = listings.reduce((sum, l) => sum + (l.quantity_tonnes_co2 || 0), 0);

  const renderItem = ({ item }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending_approval;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{item.project_name}</Text>
            <Text style={styles.creditType}>{item.credit_type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="leaf" size={14} color={COLORS.primary} />
            <Text style={styles.detailText}>{item.quantity_tonnes_co2} t CO2</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="shield-checkmark" size={14} color="#6366f1" />
            <Text style={styles.detailText}>{item.verification_standard}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={14} color={COLORS.gray[400]} />
            <Text style={styles.detailText}>{item.vintage_year}</Text>
          </View>
        </View>
        {item.status === 'approved' && item.price_per_tonne && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prix fixe par l'admin</Text>
            <Text style={styles.priceValue}>{item.price_per_tonne?.toLocaleString()} XOF/t</Text>
          </View>
        )}
        {item.admin_note ? (
          <View style={styles.noteRow}>
            <Ionicons name="chatbubble-ellipses" size={12} color={COLORS.gray[400]} />
            <Text style={styles.noteText}>{item.admin_note}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Soumissions Carbone</Text>
          <View style={{ width: 28 }} />
        </View>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} data-testid="carbon-submissions-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Soumissions Carbone</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateCarbonListing')} data-testid="new-submission-button">
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{listings.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{approvedCount}</Text>
          <Text style={styles.statLabel}>Approuvees</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#0ea5e9' }]}>{totalTonnes.toFixed(0)}</Text>
          <Text style={styles.statLabel}>t CO2</Text>
        </View>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.listing_id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchListings(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>Aucune soumission</Text>
            <Text style={styles.emptyText}>Soumettez vos premiers credits carbone pour validation par le Super Admin</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateCarbonListing')}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Nouvelle soumission</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: '#059669',
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: 10, color: COLORS.gray[400], marginTop: 2 },
  list: { padding: SPACING.md, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: SPACING.md,
    marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  projectName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: '#333' },
  creditType: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDetails: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: FONTS.sizes.xs, color: '#555' },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  priceLabel: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500] },
  priceValue: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#059669' },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6,
    backgroundColor: '#f9fafb', borderRadius: 6, padding: 8,
  },
  noteText: { fontSize: 11, color: COLORS.gray[500], flex: 1, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.gray[500] },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[400], textAlign: 'center', paddingHorizontal: 30 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md,
    backgroundColor: '#059669', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: FONTS.sizes.sm },
});
