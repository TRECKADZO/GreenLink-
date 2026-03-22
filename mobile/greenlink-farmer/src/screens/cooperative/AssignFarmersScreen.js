import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS, FONTS, SPACING } from '../../config';

const AssignFarmersScreen = ({ navigation, route }) => {
  const { agentId, agentName } = route?.params || {};
  const [members, setMembers] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [membersData, assignedData] = await Promise.all([
        cooperativeApi.getMembers(),
        agentId ? cooperativeApi.getAssignedFarmers(agentId) : { farmers: [] },
      ]);
      const membersList = membersData.members || membersData || [];
      setMembers(membersList);
      const currentAssigned = (assignedData.farmers || []).map(f => f.id);
      setAssignedIds(currentAssigned);
      setSelectedIds(currentAssigned);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId]);

  useFocusEffect(
    useCallback(() => { fetchData(); }, [fetchData])
  );

  const toggleSelect = (memberId) => {
    setSelectedIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      const result = await cooperativeApi.assignFarmersToAgent(agentId, selectedIds);
      Alert.alert('Succes', result.message || 'Attribution mise a jour');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Echec de l\'attribution');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...assignedIds].sort());

  const renderMember = ({ item }) => {
    const memberId = item.id || item._id;
    const isSelected = selectedIds.includes(memberId);
    const wasAssigned = assignedIds.includes(memberId);

    return (
      <TouchableOpacity
        style={[styles.memberCard, isSelected && styles.memberCardSelected]}
        onPress={() => toggleSelect(memberId)}
        data-testid={`member-${memberId}`}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.full_name || 'Membre'}</Text>
          <Text style={styles.memberPhone}>{item.phone_number || ''}</Text>
          {item.village ? <Text style={styles.memberVillage}>{item.village}</Text> : null}
        </View>
        <View style={styles.memberMeta}>
          {item.nombre_parcelles > 0 || item.parcels_count > 0 ? (
            <Text style={styles.parcelsCount}>{item.nombre_parcelles || item.parcels_count} parcelle(s)</Text>
          ) : null}
          {wasAssigned && !isSelected ? (
            <Text style={styles.removedTag}>Retirer</Text>
          ) : !wasAssigned && isSelected ? (
            <Text style={styles.addedTag}>Nouveau</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} data-testid="assign-farmers-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Attribuer des planteurs</Text>
          <Text style={styles.subtitle}>{agentName || 'Agent terrain'}</Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {selectedIds.length} selectionne(s) sur {members.length} membres
        </Text>
        {hasChanges && (
          <TouchableOpacity
            style={styles.selectAllBtn}
            onPress={() => setSelectedIds(selectedIds.length === members.length ? [] : members.map(m => m.id || m._id))}
          >
            <Text style={styles.selectAllText}>
              {selectedIds.length === members.length ? 'Tout deselectionner' : 'Tout selectionner'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        renderItem={renderMember}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={COLORS.gray[300]} />
            <Text style={styles.emptyText}>Aucun membre dans la cooperative</Text>
          </View>
        }
      />

      {hasChanges && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            data-testid="save-assignment-button"
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Enregistrer l'attribution</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#e0f2e9', borderBottomWidth: 1, borderBottomColor: '#c6f6d5',
  },
  statsText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  selectAllBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: COLORS.primary },
  selectAllText: { fontSize: FONTS.sizes.xs, color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 100 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: SPACING.md, marginBottom: SPACING.xs,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  memberCardSelected: { borderColor: COLORS.primary, backgroundColor: '#f0fdf4' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: '#333' },
  memberPhone: { fontSize: FONTS.sizes.xs, color: COLORS.gray[500], marginTop: 2 },
  memberVillage: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400], marginTop: 1 },
  memberMeta: { alignItems: 'flex-end' },
  parcelsCount: { fontSize: FONTS.sizes.xs, color: COLORS.gray[400] },
  removedTag: { fontSize: 10, color: '#dc2626', fontWeight: '600', marginTop: 4 },
  addedTag: { fontSize: 10, color: '#059669', fontWeight: '600', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.gray[400] },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12,
  },
  saveBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '600' },
});

export default AssignFarmersScreen;
