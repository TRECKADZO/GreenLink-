import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';

const STATUS_LABELS = {
  open: { label: 'Ouvert', color: '#2196F3', bg: '#E3F2FD' },
  ouvert: { label: 'Ouvert', color: '#2196F3', bg: '#E3F2FD' },
  en_cours: { label: 'En cours', color: '#FF9800', bg: '#FFF3E0' },
  in_progress: { label: 'En cours', color: '#FF9800', bg: '#FFF3E0' },
  sold: { label: 'Vendu', color: '#4CAF50', bg: '#E8F5E9' },
  vendu: { label: 'Vendu', color: '#4CAF50', bg: '#E8F5E9' },
  closed: { label: 'Ferme', color: '#9E9E9E', bg: '#F5F5F5' },
  ferme: { label: 'Ferme', color: '#9E9E9E', bg: '#F5F5F5' },
};

export default function CoopLotsScreen({ navigation }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null);

  const fetchLots = useCallback(async () => {
    try {
      const data = await cooperativeApi.getLots(filter);
      // API returns array directly or {lots: [...]}
      setLots(Array.isArray(data) ? data : (data.lots || []));
    } catch (error) {
      console.error('Error fetching lots:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchLots();
    }, [fetchLots])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLots();
  };

  const filters = [
    { key: null, label: 'Tous' },
    { key: 'ouvert', label: 'Ouverts' },
    { key: 'en_cours', label: 'En cours' },
    { key: 'vendu', label: 'Vendus' },
  ];

  const renderLotItem = ({ item }) => {
    const status = STATUS_LABELS[item.status] || STATUS_LABELS.open;
    return (
      <TouchableOpacity style={styles.lotCard}>
        <View style={styles.lotHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lotName}>{item.lot_name || item.name || `Lot #${(item.id || '').substring(0, 6)}`}</Text>
            <Text style={styles.lotDate}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.lotDetails}>
          <View style={styles.lotDetailItem}>
            <Ionicons name="people-outline" size={16} color={COLORS.gray} />
            <Text style={styles.lotDetailText}>
              {item.contributors_count || item.farmer_count || 0} producteurs
            </Text>
          </View>
          <View style={styles.lotDetailItem}>
            <Ionicons name="cube-outline" size={16} color={COLORS.gray} />
            <Text style={styles.lotDetailText}>
              {item.actual_tonnage || item.total_quantity_kg ? `${Math.round(item.actual_tonnage || item.total_quantity_kg || 0).toLocaleString()} kg` : `Objectif: ${item.target_tonnage || 0} t`}
            </Text>
          </View>
          {(item.price_per_kg || item.sale_price_per_kg) ? (
            <View style={styles.lotDetailItem}>
              <Ionicons name="cash-outline" size={16} color={COLORS.gray} />
              <Text style={styles.lotDetailText}>
                {(item.price_per_kg || item.sale_price_per_kg || 0).toLocaleString()} XOF/kg
              </Text>
            </View>
          ) : null}
        </View>
        {(item.total_value || item.total_amount) ? (
          <View style={styles.lotTotal}>
            <Text style={styles.lotTotalLabel}>Montant total</Text>
            <Text style={styles.lotTotalValue}>{(item.total_value || item.total_amount || 0).toLocaleString()} XOF</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lots de Vente</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des lots...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lots de Vente</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key || 'all'}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={lots}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        renderItem={renderLotItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucun lot de vente</Text>
            <Text style={styles.emptySubtext}>
              Les lots seront affiches ici une fois crees depuis la version web
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 13, color: '#666' },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  listContent: { padding: 12 },
  lotCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  lotHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  lotName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  lotDate: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  lotDetails: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  lotDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lotDetailText: { fontSize: 13, color: '#555' },
  lotTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  lotTotalLabel: { fontSize: 13, color: COLORS.gray },
  lotTotalValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#bbb', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});
