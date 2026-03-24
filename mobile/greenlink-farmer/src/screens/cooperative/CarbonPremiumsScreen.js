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
  en_attente: { label: 'En attente', color: '#FF9800', bg: '#FFF3E0', icon: 'time' },
  pending: { label: 'En attente', color: '#FF9800', bg: '#FFF3E0', icon: 'time' },
  approuvee: { label: 'Approuvee', color: '#2196F3', bg: '#E3F2FD', icon: 'checkmark' },
  approved: { label: 'Approuvee', color: '#2196F3', bg: '#E3F2FD', icon: 'checkmark' },
  payee: { label: 'Payee', color: '#4CAF50', bg: '#E8F5E9', icon: 'cash' },
  paid: { label: 'Payee', color: '#4CAF50', bg: '#E8F5E9', icon: 'cash' },
  rejetee: { label: 'Rejetee', color: '#F44336', bg: '#FFEBEE', icon: 'close' },
  rejected: { label: 'Rejetee', color: '#F44336', bg: '#FFEBEE', icon: 'close' },
};

export default function CarbonPremiumsScreen({ navigation }) {
  const [data, setData] = useState({ stats: {}, requests: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await cooperativeApi.getCarbonPremiums();
      setData(result);
    } catch (error) {
      console.error('Error fetching carbon premiums:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const stats = data.stats || {};

  const renderStatCard = (label, value, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value || 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderRequest = ({ item }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.en_attente;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.farmer_name || 'Producteur'}</Text>
            <Text style={styles.cardSubtitle}>{item.parcel_location || item.village || ''}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}> {status.label}</Text>
          </View>
        </View>
        <View style={styles.cardMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Score carbone</Text>
            <Text style={styles.metricValue}>{item.carbon_score || item.score_carbone || '-'}/10</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>CO2 capture</Text>
            <Text style={styles.metricValue}>{item.co2_tonnes || item.co2_captured || '-'} t</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Prime</Text>
            <Text style={[styles.metricValue, { color: COLORS.primary }]}>
              {(item.premium_amount || 0).toLocaleString()} XOF
            </Text>
          </View>
        </View>
        {item.created_at && (
          <Text style={styles.cardDate}>
            Soumis le {new Date(item.created_at).toLocaleDateString('fr-FR')}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Primes Carbone</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Primes Carbone</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={data.requests || []}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View>
            <View style={styles.statsGrid}>
              {renderStatCard('En attente', stats.en_attente, 'time', '#FF9800')}
              {renderStatCard('Approuvees', stats.approuvees, 'checkmark-circle', '#2196F3')}
              {renderStatCard('Payees', stats.payees, 'cash', '#4CAF50')}
              {renderStatCard('Admissibles', stats.parcelles_admissibles, 'leaf', '#8BC34A')}
            </View>
            {(stats.total_paye_planteurs > 0) && (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total paye aux planteurs</Text>
                <Text style={styles.totalValue}>{(stats.total_paye_planteurs || 0).toLocaleString()} XOF</Text>
              </View>
            )}
            {data.requests?.length > 0 && (
              <Text style={styles.listTitle}>Demandes de prime</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucune demande de prime</Text>
            <Text style={styles.emptySubtext}>
              Les demandes apparaitront ici lorsque des parcelles seront admissibles a la prime carbone
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  totalCard: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
    marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  totalValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  listTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  cardSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardMetrics: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  metric: { alignItems: 'center' },
  metricLabel: { fontSize: 11, color: COLORS.gray },
  metricValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginTop: 2 },
  cardDate: { fontSize: 11, color: COLORS.gray, marginTop: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#bbb', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});
