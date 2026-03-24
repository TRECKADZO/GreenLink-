import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';

const VERIFICATION_STATUS = {
  verified: { label: 'Verifiee', color: '#4CAF50', bg: '#E8F5E9' },
  pending: { label: 'En attente', color: '#FF9800', bg: '#FFF3E0' },
  rejected: { label: 'Rejetee', color: '#F44336', bg: '#FFEBEE' },
  non_verifiee: { label: 'Non verifiee', color: '#9E9E9E', bg: '#F5F5F5' },
};

export default function CoopParcelsScreen({ navigation }) {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null);

  const fetchParcels = useCallback(async () => {
    try {
      const data = await cooperativeApi.getAllParcels(filter);
      // API returns { total, compteurs_statut, parcelles: [...] }
      setParcels(data.parcelles || data.parcels || []);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchParcels();
    }, [fetchParcels])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchParcels();
  };

  const filters = [
    { key: null, label: 'Toutes' },
    { key: 'verified', label: 'Verifiees' },
    { key: 'pending', label: 'En attente' },
    { key: 'non_verifiee', label: 'Non verifiees' },
  ];

  const renderParcel = ({ item }) => {
    const status = VERIFICATION_STATUS[item.verification_status || item.statut_verification] || VERIFICATION_STATUS.non_verifiee;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.localisation || item.location || item.name || 'Parcelle'}</Text>
            <Text style={styles.cardSubtitle}>{item.village || ''}</Text>
            {(item.nom_producteur || item.farmer_name) && (
              <Text style={styles.farmerName}>{item.nom_producteur || item.farmer_name}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="resize-outline" size={16} color={COLORS.gray} />
            <Text style={styles.metricText}>{item.superficie || item.area_hectares || 0} ha</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="leaf-outline" size={16} color={COLORS.gray} />
            <Text style={styles.metricText}>{item.type_culture || item.crop_type || 'cacao'}</Text>
          </View>
          {(item.score_carbone || item.carbon_score) !== undefined && (
            <View style={styles.metricItem}>
              <Ionicons name="analytics-outline" size={16} color={COLORS.gray} />
              <Text style={styles.metricText}>Score: {item.score_carbone || item.carbon_score}/10</Text>
            </View>
          )}
          {(item.co2_capture || item.co2_captured_tonnes) !== undefined && (
            <View style={styles.metricItem}>
              <Ionicons name="cloud-outline" size={16} color={COLORS.gray} />
              <Text style={styles.metricText}>{item.co2_capture || item.co2_captured_tonnes}t CO2</Text>
            </View>
          )}
        </View>

        {item.certification && (
          <View style={styles.certRow}>
            <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
            <Text style={styles.certText}>{item.certification}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parcelles</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddMemberParcel', {})} style={styles.addButton}>
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>Parcelles</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddMemberParcel', {})} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
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
        data={parcels}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        renderItem={renderParcel}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucune parcelle</Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate('AddMemberParcel', {})}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyActionText}>Ajouter une parcelle</Text>
            </TouchableOpacity>
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
  addButton: { padding: 4 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0',
  },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 12, color: '#666' },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  listContent: { padding: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  cardSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  farmerName: { fontSize: 13, color: COLORS.primary, fontWeight: '500', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  metricsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { fontSize: 13, color: '#555' },
  certRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
  },
  certText: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  emptyActionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
