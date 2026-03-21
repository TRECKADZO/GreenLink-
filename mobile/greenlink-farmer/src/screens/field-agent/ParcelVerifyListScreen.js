import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const STATUS_TABS = [
  { id: 'pending', label: 'A verifier', color: '#f59e0b' },
  { id: 'needs_correction', label: 'A corriger', color: '#ef4444' },
  { id: 'verified', label: 'Verifiees', color: '#059669' },
  { id: 'all', label: 'Toutes', color: '#6366f1' },
];

const STATUS_BADGES = {
  pending: { label: 'En attente', bg: '#fef3c7', color: '#92400e', icon: 'time-outline' },
  needs_correction: { label: 'A corriger', bg: '#fee2e2', color: '#991b1b', icon: 'alert-circle-outline' },
  verified: { label: 'Verifiee', bg: '#d1fae5', color: '#065f46', icon: 'checkmark-circle' },
  rejected: { label: 'Rejetee', bg: '#fce4ec', color: '#b71c1c', icon: 'close-circle' },
};

const ParcelVerifyListScreen = ({ navigation }) => {
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [stats, setStats] = useState({ pending: 0, needs_correction: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchParcels = useCallback(async () => {
    try {
      const statusParam = activeTab === 'all' ? 'all' : activeTab;
      const res = await fetch(
        `${API_URL}/api/field-agent/parcels-to-verify?status_filter=${statusParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setParcels(data.parcels || []);
        setStats(data.stats || {});
      }
    } catch (e) {
      console.warn('Fetch parcels error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab]);

  useEffect(() => { fetchParcels(); }, [fetchParcels]);

  const onRefresh = () => { setRefreshing(true); fetchParcels(); };

  const handleParcelPress = (parcel) => {
    navigation.navigate('ParcelVerifyForm', { parcel, onVerified: fetchParcels });
  };

  const renderStatusBadge = (status) => {
    const badge = STATUS_BADGES[status] || STATUS_BADGES.pending;
    return (
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Ionicons name={badge.icon} size={12} color={badge.color} />
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Verification parcelles</Text>
          <Text style={styles.headerSub}>
            {stats.pending} en attente | {stats.needs_correction} a corriger
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.statCard, activeTab === tab.id && { borderColor: tab.color, borderWidth: 2 }]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.statCount, { color: tab.color }]}>
              {tab.id === 'all'
                ? (stats.pending || 0) + (stats.needs_correction || 0) + (stats.verified || 0) + (stats.rejected || 0)
                : stats[tab.id] || 0}
            </Text>
            <Text style={styles.statLabel}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Parcels List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
        ) : parcels.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={56} color="#d1fae5" />
            <Text style={styles.emptyTitle}>Aucune parcelle</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'Toutes les parcelles ont ete verifiees' : 'Aucun resultat'}
            </Text>
          </View>
        ) : (
          parcels.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.parcelCard}
              onPress={() => handleParcelPress(p)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <Ionicons name="map" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.farmerName}>{p.nom_producteur}</Text>
                  <Text style={styles.village}>
                    <Ionicons name="location-outline" size={12} color="#94a3b8" />
                    {' '}{p.village || p.location || 'Non specifie'}
                  </Text>
                </View>
                {renderStatusBadge(p.verification_status)}
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="resize-outline" size={14} color="#64748b" />
                  <Text style={styles.detailText}>{p.superficie} ha</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="leaf-outline" size={14} color="#64748b" />
                  <Text style={styles.detailText}>{p.type_culture || 'cacao'}</Text>
                </View>
                {p.coordonnees_gps && (
                  <View style={styles.detailItem}>
                    <Ionicons name="navigate-outline" size={14} color="#059669" />
                    <Text style={[styles.detailText, { color: '#059669' }]}>GPS</Text>
                  </View>
                )}
                {p.score_carbone > 0 && (
                  <View style={styles.detailItem}>
                    <Ionicons name="analytics-outline" size={14} color="#6366f1" />
                    <Text style={[styles.detailText, { color: '#6366f1' }]}>Score: {p.score_carbone}</Text>
                  </View>
                )}
              </View>

              {p.statut_verification !== 'verified' && (
                <View style={styles.cardAction}>
                  <Ionicons name="arrow-forward" size={16} color="#059669" />
                  <Text style={styles.actionText}>Verifier sur le terrain</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statCount: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 2, textAlign: 'center' },
  list: { flex: 1, paddingHorizontal: 12 },
  parcelCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  farmerName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  village: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#64748b' },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
});

export default ParcelVerifyListScreen;
