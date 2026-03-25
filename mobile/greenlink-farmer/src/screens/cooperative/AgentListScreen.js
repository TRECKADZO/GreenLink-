import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS, FONTS, SPACING } from '../../config';

const AgentListScreen = ({ navigation, route }) => {
  const selectMode = route?.params?.selectMode || null; // 'assign_farmers' or null
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await cooperativeApi.getAgents();
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { setLoading(true); fetchAgents(); }, [fetchAgents])
  );

  const handleAgentPress = (agent) => {
    if (selectMode === 'assign_farmers') {
      navigation.navigate('AssignFarmers', { agentId: agent.id, agentName: agent.full_name });
    } else {
      navigation.navigate('AssignFarmers', { agentId: agent.id, agentName: agent.full_name });
    }
  };

  const renderAgent = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleAgentPress(item)}
      data-testid={`agent-card-${item.id}`}
    >
      <View style={[styles.avatar, { backgroundColor: item.is_active ? '#dcfce7' : '#fee2e2' }]}>
        <Ionicons name="body" size={24} color={item.is_active ? '#16a34a' : '#dc2626'} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.phone}>{item.phone_number}</Text>
        {item.zone ? <Text style={styles.zone}>{item.zone}</Text> : null}
      </View>
      <View style={styles.meta}>
        <View style={styles.badge}>
          <Ionicons name="people" size={12} color={COLORS.primary} />
          <Text style={styles.badgeText}>{item.assigned_farmers_count || 0}</Text>
        </View>
        <Text style={styles.metaLabel}>planteur(s)</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} data-testid="agent-list-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Agents terrain</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddAgent')} data-testid="add-agent-button">
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBar}>
        <Ionicons name="information-circle" size={16} color="#0ea5e9" />
        <Text style={styles.infoText}>Selectionnez un agent pour lui attribuer des planteurs</Text>
      </View>

      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        renderItem={renderAgent}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgents(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="body-outline" size={48} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>Aucun agent terrain</Text>
            <Text style={styles.emptyText}>Creez un agent terrain pour commencer</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('AddAgent')}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Nouvel agent</Text>
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
  infoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm,
    backgroundColor: '#e0f2fe', borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  infoText: { fontSize: FONTS.sizes.xs, color: '#0369a1', flex: 1 },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: FONTS.sizes.md, fontWeight: '600', color: '#333' },
  phone: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500], marginTop: 2 },
  zone: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], marginTop: 1 },
  meta: { alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e0f2e9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  metaLabel: { fontSize: 10, color: COLORS.gray[400], marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.gray[500] },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[400] },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: FONTS.sizes.sm },
});

export default AgentListScreen;
