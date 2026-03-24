import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';

const STATUS_MAP = {
  registered: { label: 'Inscrit', color: '#2196F3', bg: '#E3F2FD' },
  pending: { label: 'En attente', color: '#FF9800', bg: '#FFF3E0' },
  activated: { label: 'Active', color: '#4CAF50', bg: '#E8F5E9' },
  rejected: { label: 'Rejete', color: '#F44336', bg: '#FFEBEE' },
};

const SOURCE_MAP = {
  ussd: { label: 'USSD', color: '#9C27B0', icon: 'phone-portrait' },
  web: { label: 'Web', color: '#2196F3', icon: 'globe' },
  mobile: { label: 'Mobile', color: '#4CAF50', icon: 'phone-landscape' },
};

export default function USSDRegistrationsScreen({ navigation }) {
  const [registrations, setRegistrations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const data = await cooperativeApi.getUSSDRegistrations();
      setRegistrations(data.registrations || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching USSD registrations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = search
    ? registrations.filter(r =>
        (r.full_name || r.nom_complet || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.phone_number || '').includes(search) ||
        (r.village || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.code_planteur || '').toLowerCase().includes(search.toLowerCase())
      )
    : registrations;

  const renderRegistration = ({ item }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.registered;
    const source = SOURCE_MAP[item.registered_via] || SOURCE_MAP.ussd;
    const name = item.full_name || item.nom_complet || 'Sans nom';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: source.color + '20' }]}>
            <Ionicons name={source.icon} size={18} color={source.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{name}</Text>
            <Text style={styles.cardPhone}>{item.phone_number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          {item.village ? (
            <View style={styles.detailItem}>
              <Ionicons name="location" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>{item.village}</Text>
            </View>
          ) : null}
          {item.code_planteur ? (
            <View style={styles.detailItem}>
              <Ionicons name="qr-code" size={14} color={COLORS.primary} />
              <Text style={[styles.detailText, { color: COLORS.primary, fontWeight: '600' }]}>
                {item.code_planteur}
              </Text>
            </View>
          ) : null}
          {(item.coop_code || item.cooperative_code) ? (
            <View style={styles.detailItem}>
              <Ionicons name="business" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>{item.coop_code || item.cooperative_code}</Text>
            </View>
          ) : null}
          {item.hectares_approx ? (
            <View style={styles.detailItem}>
              <Ionicons name="resize" size={14} color={COLORS.gray} />
              <Text style={styles.detailText}>{item.hectares_approx} ha</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.sourceBadge, { backgroundColor: source.color + '15' }]}>
            <Ionicons name={source.icon} size={11} color={source.color} />
            <Text style={[styles.sourceText, { color: source.color }]}> {source.label}</Text>
          </View>
          <Text style={styles.dateText}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : ''}
          </Text>
        </View>
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
          <Text style={styles.headerTitle}>Inscriptions</Text>
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
        <Text style={styles.headerTitle}>Inscriptions</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>{total}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, telephone, village..."
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats summary */}
      <View style={styles.summaryRow}>
        {Object.entries(
          filtered.reduce((acc, r) => {
            const via = r.registered_via || 'ussd';
            acc[via] = (acc[via] || 0) + 1;
            return acc;
          }, {})
        ).map(([via, count]) => {
          const s = SOURCE_MAP[via] || SOURCE_MAP.ussd;
          return (
            <View key={via} style={[styles.summaryChip, { backgroundColor: s.color + '15' }]}>
              <Ionicons name={s.icon} size={14} color={s.color} />
              <Text style={[styles.summaryChipText, { color: s.color }]}> {s.label}: {count}</Text>
            </View>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderRegistration}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="phone-portrait-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>
              {search ? 'Aucun resultat' : 'Aucune inscription'}
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
  totalBadge: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  totalBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333', paddingVertical: 2 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 6, marginBottom: 8 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  summaryChipText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  cardName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  cardPhone: { fontSize: 12, color: COLORS.gray },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  cardDetails: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText: { fontSize: 12, color: '#555' },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sourceText: { fontSize: 10, fontWeight: '600' },
  dateText: { fontSize: 11, color: COLORS.gray },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 12 },
});
