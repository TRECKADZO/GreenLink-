import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions, TextInput, ActivityIndicator, Alert, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { Loader } from '../../components/UI';
import { MainLayout } from '../../components/navigation';
import { COLORS, SPACING, API_URL } from '../../config';

const { width: SW } = Dimensions.get('window');

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { id: 'farmers', label: 'Agriculteurs', icon: 'people-outline' },
  { id: 'search', label: 'Recherche', icon: 'search-outline' },
];

const FieldAgentDashboard = ({ navigation }) => {
  const { token, user } = useAuth();
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myFarmers, setMyFarmers] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [farmerSearch, setFarmerSearch] = useState('');
  // Phone search
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('field_agent_dashboard');
        if (cached) { setData(cached); setLoading(false); return; }
      }
      const res = await fetch(`${API_URL}/api/field-agent/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        await cacheData('field_agent_dashboard', result);
      }
    } catch (e) {
      const cached = await getCachedData('field_agent_dashboard');
      if (cached) setData(cached);
    } finally { setLoading(false); setRefreshing(false); }
  }, [token, isOnline]);

  const fetchMyFarmers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/field-agent/my-farmers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setMyFarmers(result.farmers || []);
      }
    } catch (e) { console.error('Error fetching farmers:', e); }
  }, [token]);

  useEffect(() => { fetchDashboard(); fetchMyFarmers(); }, [fetchDashboard, fetchMyFarmers]);

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); fetchMyFarmers(); };

  const handlePhoneSearch = async () => {
    if (!phone.trim()) { Alert.alert('Erreur', 'Saisissez un numero de telephone'); return; }
    Keyboard.dismiss();
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`${API_URL}/api/agent/search?phone=${encodeURIComponent(phone.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.found) { setSearchResult(d.farmer); }
      else { Alert.alert('Non trouve', 'Aucun planteur avec ce numero'); }
    } catch { Alert.alert('Erreur', 'Erreur reseau'); }
    setSearching(false);
  };

  const openFarmerProfile = (farmer) => {
    navigation.navigate('FarmerProfile', { farmer });
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critique': return '#ef4444';
      case 'eleve': return '#f97316';
      case 'modere': return '#f59e0b';
      case 'faible': return '#10b981';
      default: return '#94a3b8';
    }
  };

  if (loading) return <Loader message="Chargement du tableau de bord..." />;

  const { agent_info, performance, statistics, risk_distribution, recent_activities, achievements } = data || {};

  const filteredFarmers = myFarmers.filter(f => {
    if (!farmerSearch) return true;
    const s = farmerSearch.toLowerCase();
    return f.full_name?.toLowerCase().includes(s) || f.phone_number?.includes(s) || f.village?.toLowerCase().includes(s);
  });

  const score = performance?.score || 0;

  return (
    <MainLayout userType="field_agent">
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <Ionicons name="shield-checkmark" size={28} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>{agent_info?.name || user?.full_name}</Text>
            <Text style={styles.agentZone}>{agent_info?.zone || 'Agent Terrain'}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{score}%</Text>
            <Text style={styles.scoreLabel}>Perf.</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabItem, tab === t.id && styles.tabItemActive]}
              onPress={() => setTab(t.id)}
            >
              <Ionicons name={t.icon} size={18} color={tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ====== DASHBOARD TAB ====== */}
        {tab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#06b6d4' }]}>
                <Ionicons name="clipboard" size={24} color={COLORS.white} />
                <Text style={styles.statValue}>{statistics?.ssrte_visits?.total || 0}</Text>
                <Text style={styles.statLabel}>Visites SSRTE</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${statistics?.ssrte_visits?.progress || 0}%` }]} />
                </View>
                <Text style={styles.progressText}>{statistics?.ssrte_visits?.this_month || 0}/{statistics?.ssrte_visits?.target || 20} ce mois</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
                <Ionicons name="people" size={24} color={COLORS.white} />
                <Text style={styles.statValue}>{statistics?.members_onboarded?.total || 0}</Text>
                <Text style={styles.statLabel}>Membres inscrits</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${statistics?.members_onboarded?.progress || 0}%` }]} />
                </View>
                <Text style={styles.progressText}>Obj: {statistics?.members_onboarded?.target || 10}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="camera" size={24} color={COLORS.white} />
                <Text style={styles.statValue}>{statistics?.geotagged_photos?.total || 0}</Text>
                <Text style={styles.statLabel}>Photos geo</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${statistics?.geotagged_photos?.progress || 0}%` }]} />
                </View>
                <Text style={styles.progressText}>Obj: {statistics?.geotagged_photos?.target || 30}</Text>
              </View>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: '#f59e0b' }]}
                onPress={() => setTab('farmers')}
              >
                <Ionicons name="person" size={24} color={COLORS.white} />
                <Text style={styles.statValue}>{myFarmers.length}</Text>
                <Text style={styles.statLabel}>Mes Fermiers</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '100%' }]} />
                </View>
                <Text style={styles.progressText}>Voir la liste</Text>
              </TouchableOpacity>
            </View>

            {/* Children Alert */}
            {statistics?.children_identified > 0 && (
              <View style={styles.alertCard}>
                <Ionicons name="warning" size={24} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{statistics.children_identified} enfants identifies</Text>
                  <Text style={styles.alertText}>En situation de travail dangereux</Text>
                </View>
              </View>
            )}

            {/* CTA: Verification parcelles */}
            <TouchableOpacity style={[styles.ctaCard, { borderColor: '#d1fae5' }]} onPress={() => navigation.navigate('ParcelVerifyList')}>
              <View style={[styles.ctaIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="shield-checkmark" size={28} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Verification parcelles</Text>
                <Text style={styles.ctaDesc}>
                  Verifiez les parcelles sur le terrain (GPS, photos, surface)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#059669" />
            </TouchableOpacity>

            {/* CTA: Select a farmer */}
            <TouchableOpacity style={styles.ctaCard} onPress={() => setTab('farmers')}>
              <View style={styles.ctaIcon}>
                <Ionicons name="person-add" size={28} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Selectionnez un agriculteur</Text>
                <Text style={styles.ctaDesc}>
                  Choisissez un fermier pour acceder a ses fiches (ICI, SSRTE, Parcelles...)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#059669" />
            </TouchableOpacity>

            {/* Risk Distribution */}
            {risk_distribution && Object.keys(risk_distribution).length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Repartition des Risques</Text>
                <View style={styles.riskGrid}>
                  {Object.entries(risk_distribution).map(([level, count]) => (
                    <View key={level} style={styles.riskItem}>
                      <View style={[styles.riskDot, { backgroundColor: getRiskColor(level) }]} />
                      <Text style={styles.riskCount}>{count}</Text>
                      <Text style={styles.riskLabel}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Activities */}
            {recent_activities?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Dernieres Activites</Text>
                {recent_activities.slice(0, 5).map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={[styles.activityDot, { backgroundColor: getRiskColor(activity.risk_level) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityName}>{activity.farmer_name}</Text>
                      <Text style={styles.activityMeta}>{activity.children_count} enfant(s) - Risque {activity.risk_level}</Text>
                    </View>
                    <Text style={styles.activityDate}>
                      {activity.date ? new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Achievements */}
            {achievements?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Badges Debloques</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {achievements.map((badge, i) => (
                    <View key={i} style={styles.badge}>
                      <View style={styles.badgeIcon}>
                        <Ionicons name={badge.icon} size={20} color="#06b6d4" />
                      </View>
                      <Text style={styles.badgeName}>{badge.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* ====== FARMERS TAB ====== */}
        {tab === 'farmers' && (
          <>
            <View style={styles.farmersHeader}>
              <Text style={styles.farmersTitle}>Mes Agriculteurs ({myFarmers.length})</Text>
            </View>

            {/* Search filter */}
            <View style={styles.filterRow}>
              <View style={styles.filterInputWrap}>
                <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.filterInput}
                  placeholder="Nom, telephone, village..."
                  placeholderTextColor="#94a3b8"
                  value={farmerSearch}
                  onChangeText={setFarmerSearch}
                />
                {farmerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setFarmerSearch('')}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={18} color="#0ea5e9" />
              <Text style={styles.infoBannerText}>
                Selectionnez un agriculteur pour acceder a toutes ses fiches et formulaires.
              </Text>
            </View>

            {/* Farmer List */}
            {filteredFarmers.length > 0 ? (
              filteredFarmers.map(f => {
                const comp = f.completion || { completed: 0, total: 5, percentage: 0 };
                const pColor = comp.percentage >= 80 ? '#059669' : comp.percentage >= 40 ? '#f59e0b' : '#94a3b8';
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.farmerCard}
                    onPress={() => openFarmerProfile(f)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.farmerAvatar, comp.percentage === 100 && { borderWidth: 2, borderColor: '#059669' }]}>
                      {comp.percentage === 100 ? (
                        <Ionicons name="checkmark-circle" size={22} color="#059669" />
                      ) : (
                        <Ionicons name="person" size={22} color="#059669" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.farmerName}>{f.full_name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        {f.phone_number && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Ionicons name="call-outline" size={10} color="#94a3b8" />
                            <Text style={styles.farmerMeta}>{f.phone_number}</Text>
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons name="location-outline" size={10} color="#94a3b8" />
                          <Text style={styles.farmerMeta}>{f.village || 'N/A'}</Text>
                        </View>
                      </View>
                      {/* Progress bar */}
                      <View style={styles.farmerProgressRow}>
                        <View style={styles.farmerProgressBg}>
                          <View style={[styles.farmerProgressFill, { width: `${comp.percentage}%`, backgroundColor: pColor }]} />
                        </View>
                        <Text style={[styles.farmerProgressText, { color: pColor }]}>{comp.completed}/{comp.total}</Text>
                        {comp.percentage === 100 && (
                          <View style={styles.completeBadge}>
                            <Text style={styles.completeBadgeText}>Complet</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.farmerParcels}>{f.parcels_count || 0}</Text>
                      <Text style={styles.farmerParcelsLabel}>parcelle(s)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>
                  {farmerSearch ? 'Aucun resultat' : 'Aucun fermier assigne'}
                </Text>
                <Text style={styles.emptyDesc}>
                  {farmerSearch ? 'Modifiez votre recherche' : 'Contactez votre cooperative pour l\'attribution.'}
                </Text>
              </View>
            )}
          </>
        )}

        {/* ====== SEARCH TAB ====== */}
        {tab === 'search' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rechercher par numero de telephone</Text>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="call" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Ex: 0701234567"
                    placeholderTextColor="#9ca3af"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="search"
                    onSubmitEditing={handlePhoneSearch}
                  />
                  {phone.length > 0 && (
                    <TouchableOpacity onPress={() => setPhone('')}>
                      <Ionicons name="close-circle" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.searchBtn, searching && { opacity: 0.6 }]}
                  onPress={handlePhoneSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="search" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Result */}
            {searchResult && (
              <TouchableOpacity
                style={styles.searchResultCard}
                onPress={() => openFarmerProfile(searchResult)}
                activeOpacity={0.7}
              >
                <View style={styles.searchResultAvatar}>
                  <Ionicons name="person" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultName}>{searchResult.full_name}</Text>
                  <Text style={styles.searchResultInfo}>
                    {searchResult.phone_number} - {searchResult.village || 'N/A'}
                  </Text>
                  <Text style={styles.searchResultCoop}>{searchResult.cooperative_name || ''}</Text>
                </View>
                <View style={styles.openProfileBtn}>
                  <Ionicons name="folder-open" size={16} color="#059669" />
                  <Text style={styles.openProfileText}>Fiches</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Hint */}
            <View style={styles.hintCard}>
              <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
              <Text style={styles.hintText}>
                Recherchez un planteur par son numero pour acceder directement a ses fiches.
                Vous pouvez aussi le retrouver dans l'onglet "Agriculteurs".
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#059669', paddingTop: 50, paddingBottom: 0, paddingHorizontal: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarContainer: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  agentName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  agentZone: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  scoreBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
  },
  scoreValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  tabBar: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12, marginBottom: -12, padding: 3,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  tabItemActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  tabLabelActive: { color: '#fff' },

  content: { flex: 1, padding: SPACING.md, paddingTop: SPACING.lg },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard: {
    width: (SW - SPACING.md * 2 - 10) / 2, borderRadius: 16, padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  progressBar: {
    width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginTop: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  progressText: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // Alert
  alertCard: {
    backgroundColor: '#fef2f2', borderRadius: 12, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#ef4444',
  },
  alertTitle: { fontSize: 15, fontWeight: 'bold', color: '#dc2626' },
  alertText: { fontSize: 12, color: '#991b1b', marginTop: 2 },

  // CTA
  ctaCard: {
    backgroundColor: '#ecfdf5', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#a7f3d0', borderStyle: 'dashed',
  },
  ctaIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#d1fae5',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaTitle: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  ctaDesc: { fontSize: 12, color: '#047857', marginTop: 3, lineHeight: 17 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: SPACING.md, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 12 },

  // Risk
  riskGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  riskItem: { alignItems: 'center' },
  riskDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 4 },
  riskCount: { fontSize: 20, fontWeight: 'bold', color: '#334155' },
  riskLabel: { fontSize: 11, color: '#94a3b8' },

  // Activities
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  activityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  activityName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  activityMeta: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  activityDate: { fontSize: 11, color: '#cbd5e1' },

  // Badges
  badge: { alignItems: 'center', marginRight: 14, width: 70 },
  badgeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#06b6d420', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  badgeName: { fontSize: 10, color: '#64748b', textAlign: 'center' },

  // Farmers tab
  farmersHeader: { marginBottom: 10 },
  farmersTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  filterRow: { marginBottom: 10 },
  filterInputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 14, height: 46,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  filterInput: { flex: 1, fontSize: 14, color: '#1e293b' },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0f9ff', borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#bae6fd',
  },
  infoBannerText: { flex: 1, fontSize: 12, color: '#0369a1', lineHeight: 17 },

  farmerCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  farmerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  farmerName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  farmerMeta: { fontSize: 11, color: '#94a3b8' },
  farmerProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  farmerProgressBg: { flex: 1, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', maxWidth: 110 },
  farmerProgressFill: { height: 5, borderRadius: 3 },
  farmerProgressText: { fontSize: 10, fontWeight: '700' },
  completeBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  completeBadgeText: { fontSize: 9, fontWeight: '700', color: '#059669' },
  farmerParcels: { fontSize: 16, fontWeight: '700', color: '#059669' },
  farmerParcelsLabel: { fontSize: 9, color: '#94a3b8' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },

  // Search tab
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14, height: 50,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' },
  searchBtn: {
    width: 50, height: 50, borderRadius: 12, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },

  searchResultCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#059669',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchResultAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  searchResultName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  searchResultInfo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  searchResultCoop: { fontSize: 11, color: '#059669', fontWeight: '500', marginTop: 2 },
  openProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  openProfileText: { fontSize: 12, fontWeight: '600', color: '#059669' },

  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#fde68a',
  },
  hintText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },
});

export default FieldAgentDashboard;
