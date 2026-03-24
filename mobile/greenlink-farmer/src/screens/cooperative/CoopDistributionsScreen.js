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

const STATUS_MAP = {
  completed: { label: 'Distribue', color: '#4CAF50', bg: '#E8F5E9', icon: 'checkmark-circle' },
  pending: { label: 'En attente', color: '#FF9800', bg: '#FFF3E0', icon: 'time' },
  in_progress: { label: 'En cours', color: '#2196F3', bg: '#E3F2FD', icon: 'sync' },
};

export default function CoopDistributionsScreen({ navigation }) {
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDistributions = useCallback(async () => {
    try {
      const data = await cooperativeApi.getDistributions();
      // API returns array directly or {distributions: [...]}
      setDistributions(Array.isArray(data) ? data : (data.distributions || []));
    } catch (error) {
      console.error('Error fetching distributions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDistributions();
    }, [fetchDistributions])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDistributions();
  };

  const renderDistribution = ({ item }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {item.lot_name || `Distribution #${(item.id || item._id || '').substring(0, 6)}`}
            </Text>
            <Text style={styles.cardDate}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}> {status.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {(item.total_amount || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricLabel}>XOF Total</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{item.member_count || 0}</Text>
              <Text style={styles.metricLabel}>Beneficiaires</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {(item.total_kg || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricLabel}>kg</Text>
            </View>
          </View>
        </View>

        {item.commission_rate !== undefined && (
          <View style={styles.commissionRow}>
            <Text style={styles.commissionLabel}>Commission cooperative</Text>
            <Text style={styles.commissionValue}>{item.commission_rate}%</Text>
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
          <Text style={styles.headerTitle}>Distributions</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
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
        <Text style={styles.headerTitle}>Distributions</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={distributions}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        renderItem={renderDistribution}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucune distribution</Text>
            <Text style={styles.emptySubtext}>
              Les distributions apparaitront ici apres la vente d'un lot
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
  listContent: { padding: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  cardDate: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { marginTop: 14 },
  metricRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12,
  },
  metric: { alignItems: 'center' },
  metricValue: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  metricLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  metricDivider: { width: 1, height: 30, backgroundColor: '#e0e0e0' },
  commissionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  commissionLabel: { fontSize: 13, color: COLORS.gray },
  commissionValue: { fontSize: 14, fontWeight: '600', color: '#FF9800' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#bbb', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});
