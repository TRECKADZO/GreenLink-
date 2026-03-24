import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { cooperativeApi } from '../../services/cooperativeApi';
import { COLORS } from '../../config';

export default function ActivationStatsScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await cooperativeApi.getActivationStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching activation stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const handleSendReminder = async (member) => {
    setSendingReminder(member.id);
    try {
      await cooperativeApi.sendActivationReminder(member.id);
      Alert.alert('Succes', `Rappel SMS envoye a ${member.full_name}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le rappel');
    } finally {
      setSendingReminder(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Suivi Activation</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const rate = stats?.activation_rate || 0;
  const rateColor = rate >= 70 ? '#4CAF50' : rate >= 40 ? '#FF9800' : '#F44336';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi Activation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Rate Card */}
        <View style={styles.rateCard}>
          <View style={styles.rateCircle}>
            <Text style={[styles.rateValue, { color: rateColor }]}>{Math.round(rate)}%</Text>
            <Text style={styles.rateLabel}>Taux d'activation</Text>
          </View>
          <View style={styles.rateDetails}>
            <View style={styles.rateStat}>
              <Text style={styles.rateStatValue}>{stats?.activated_count || 0}</Text>
              <Text style={styles.rateStatLabel}>Actives</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateStat}>
              <Text style={styles.rateStatValue}>{stats?.pending_count || 0}</Text>
              <Text style={styles.rateStatLabel}>En attente</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateStat}>
              <Text style={styles.rateStatValue}>{stats?.total_members || 0}</Text>
              <Text style={styles.rateStatLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* PIN & Code Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.miniStat, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="key" size={20} color="#4CAF50" />
            <Text style={styles.miniStatValue}>{stats?.pin_configured_count || 0}</Text>
            <Text style={styles.miniStatLabel}>PIN configure</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="key-outline" size={20} color="#FF9800" />
            <Text style={styles.miniStatValue}>{stats?.pin_missing_count || 0}</Text>
            <Text style={styles.miniStatLabel}>PIN manquant</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="qr-code" size={20} color="#2196F3" />
            <Text style={styles.miniStatValue}>{stats?.code_planteur_count || 0}</Text>
            <Text style={styles.miniStatLabel}>Code planteur</Text>
          </View>
        </View>

        {/* Recent Activations */}
        {(stats?.recent_activations?.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activations recentes</Text>
            {stats.recent_activations.map(m => (
              <View key={m.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarText}>{m.full_name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.full_name}</Text>
                  <Text style={styles.memberDetail}>{m.village} - {m.phone_number}</Text>
                  <Text style={styles.memberDate}>
                    Active le {new Date(m.activation_date).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
              </View>
            ))}
          </View>
        )}

        {/* Pending Activations */}
        {(stats?.pending_activation?.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>En attente d'activation ({stats.pending_activation.length})</Text>
            {stats.pending_activation.slice(0, 15).map(m => (
              <View key={m.id} style={styles.memberCard}>
                <View style={[styles.memberAvatar, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.avatarText, { color: '#FF9800' }]}>{m.full_name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.full_name}</Text>
                  <Text style={styles.memberDetail}>{m.village}</Text>
                  <View style={styles.memberBadges}>
                    {m.pin_configured ? (
                      <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={[styles.badgeText, { color: '#4CAF50' }]}>PIN OK</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: '#FFEBEE' }]}>
                        <Text style={[styles.badgeText, { color: '#F44336' }]}>Sans PIN</Text>
                      </View>
                    )}
                    {m.code_planteur ? (
                      <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={[styles.badgeText, { color: '#2196F3' }]}>{m.code_planteur}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.reminderBtn}
                  onPress={() => handleSendReminder(m)}
                  disabled={sendingReminder === m.id}
                >
                  {sendingReminder === m.id ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
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
  rateCard: {
    margin: 12, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  rateCircle: { alignItems: 'center', marginBottom: 16 },
  rateValue: { fontSize: 42, fontWeight: '800' },
  rateLabel: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  rateDetails: { flexDirection: 'row', justifyContent: 'space-around' },
  rateStat: { alignItems: 'center' },
  rateStatValue: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  rateStatLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  rateDivider: { width: 1, height: 35, backgroundColor: '#e0e0e0' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  miniStat: {
    flex: 1, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  miniStatValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 4 },
  miniStatLabel: { fontSize: 10, color: COLORS.gray, marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 10, marginTop: 8 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  memberDetail: { fontSize: 12, color: COLORS.gray, marginTop: 1 },
  memberDate: { fontSize: 11, color: '#4CAF50', marginTop: 2 },
  memberBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  reminderBtn: { padding: 8 },
});
