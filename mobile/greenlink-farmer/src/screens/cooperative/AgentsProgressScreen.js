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

export default function AgentsProgressScreen({ navigation }) {
  const [data, setData] = useState({ agents: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await cooperativeApi.getAgentsProgress();
      setData(result);
    } catch (error) {
      console.error('Error fetching agents progress:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const summary = data.summary || {};

  const getProgressColor = (pct) => {
    if (pct >= 80) return '#4CAF50';
    if (pct >= 50) return '#FF9800';
    return '#F44336';
  };

  const renderAgent = ({ item }) => {
    const pct = item.progress_percent || 0;
    const color = getProgressColor(pct);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.agentAvatar}>
            <Text style={styles.avatarText}>{item.full_name?.charAt(0) || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>{item.full_name}</Text>
            <Text style={styles.agentZone}>{item.zone || 'Zone non definie'}</Text>
            <Text style={styles.agentPhone}>{item.phone_number}</Text>
          </View>
          <View style={[styles.progressCircle, { borderColor: color }]}>
            <Text style={[styles.progressText, { color }]}>{Math.round(pct)}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
        </View>

        {/* Farmer Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people" size={16} color="#2196F3" />
            <Text style={styles.statValue}>{item.assigned_count || 0}</Text>
            <Text style={styles.statLabel}>Assignes</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
            <Text style={styles.statValue}>{item.farmers_5_5 || 0}</Text>
            <Text style={styles.statLabel}>Complets (5/5)</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time" size={16} color="#FF9800" />
            <Text style={styles.statValue}>{(item.assigned_count || 0) - (item.farmers_5_5 || 0)}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
        </View>

        {/* Farmer Details */}
        {item.farmers?.length > 0 && (
          <View style={styles.farmerList}>
            <Text style={styles.farmerListTitle}>Producteurs assignes</Text>
            {item.farmers.map((f, idx) => (
              <View key={idx} style={styles.farmerRow}>
                <Text style={styles.farmerName}>{f.full_name || f.name}</Text>
                <View style={styles.farmerProgress}>
                  <View style={[
                    styles.farmerProgressDot,
                    { backgroundColor: (f.completed_steps || f.progress || 0) >= 5 ? '#4CAF50' : '#FF9800' }
                  ]} />
                  <Text style={styles.farmerProgressText}>
                    {f.completed_steps || f.progress || 0}/5
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
          <Text style={styles.headerTitle}>Suivi Agents</Text>
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
        <Text style={styles.headerTitle}>Suivi Agents</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={data.agents || []}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderAgent}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.total_agents || 0}</Text>
                <Text style={styles.summaryLabel}>Agents</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.total_farmers || 0}</Text>
                <Text style={styles.summaryLabel}>Producteurs</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.farmers_5_5 || 0}</Text>
                <Text style={styles.summaryLabel}>Complets</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: getProgressColor(summary.average_progress || 0) }]}>
                  {summary.average_progress || 0}%
                </Text>
                <Text style={styles.summaryLabel}>Moyenne</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aucun agent terrain</Text>
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
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: COLORS.dark },
  summaryLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  summaryDivider: { width: 1, height: 35, backgroundColor: '#e0e0e0' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  agentAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  agentName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  agentZone: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  agentPhone: { fontSize: 11, color: COLORS.gray },
  progressCircle: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  progressText: { fontSize: 13, fontWeight: '700' },
  progressBarBg: {
    height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginTop: 12, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginTop: 2 },
  statLabel: { fontSize: 10, color: COLORS.gray, marginTop: 1 },
  farmerList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  farmerListTitle: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 6 },
  farmerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  farmerName: { fontSize: 13, color: COLORS.dark },
  farmerProgress: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  farmerProgressDot: { width: 8, height: 8, borderRadius: 4 },
  farmerProgressText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
});
