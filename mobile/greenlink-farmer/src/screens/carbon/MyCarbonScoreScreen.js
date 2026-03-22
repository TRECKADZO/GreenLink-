import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { carbonApi } from '../../services/carbon';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../../config';

const SCORE_THRESHOLDS = [
  { min: 8, label: 'Excellent', color: '#059669', bg: '#ecfdf5' },
  { min: 7, label: 'Tres bien', color: '#22c55e', bg: '#f0fdf4' },
  { min: 5, label: 'Bien', color: '#f59e0b', bg: '#fefce8' },
  { min: 3, label: 'A ameliorer', color: '#f97316', bg: '#fff7ed' },
  { min: 0, label: 'Faible', color: '#ef4444', bg: '#fef2f2' },
];

const PRACTICE_ICONS = {
  compostage: 'leaf',
  absence_pesticides: 'shield-checkmark',
  gestion_dechets: 'trash',
  protection_cours_eau: 'water',
  agroforesterie: 'flower',
};

const PRACTICE_LABELS = {
  compostage: 'Compostage',
  absence_pesticides: 'Sans pesticides',
  gestion_dechets: 'Gestion dechets',
  protection_cours_eau: 'Protection eau',
  agroforesterie: 'Agroforesterie',
};

const ProgressBar = ({ value, max, color, label, sublabel }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={pStyles.row}>
      <View style={pStyles.labelCol}>
        <Text style={pStyles.label}>{label}</Text>
        {sublabel && <Text style={pStyles.sublabel}>{sublabel}</Text>}
      </View>
      <View style={pStyles.barCol}>
        <View style={pStyles.barBg}>
          <View style={[pStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[pStyles.pts, { color }]}>{value}/{max}</Text>
    </View>
  );
};

const pStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  labelCol: { width: 90 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569' },
  sublabel: { fontSize: 10, color: '#94a3b8' },
  barCol: { flex: 1, marginHorizontal: 10 },
  barBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  pts: { fontSize: 12, fontWeight: '700', width: 38, textAlign: 'right' },
});

const MyCarbonScoreScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gaugeAnim] = useState(new Animated.Value(0));

  const fetchScore = async () => {
    try {
      const response = await carbonApi.getMyCarbonScore();
      setScoreData(response.data);
      // Animate gauge
      const score = response.data?.average_score || 0;
      Animated.timing(gaugeAnim, {
        toValue: score / 10,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error('Error fetching carbon score:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchScore(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    gaugeAnim.setValue(0);
    fetchScore();
  };

  const getThreshold = (score) => {
    return SCORE_THRESHOLDS.find(t => score >= t.min) || SCORE_THRESHOLDS[SCORE_THRESHOLDS.length - 1];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#065f46" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const score = scoreData?.average_score || 0;
  const totalCredits = scoreData?.total_credits || 0;
  const totalPremium = scoreData?.total_premium || 0;
  const breakdown = scoreData?.breakdown || { base: 3, arbres: 0, ombrage: 0, pratiques: 0, surface: 0 };
  const recommendations = scoreData?.recommendations || [];
  const parcels = scoreData?.parcels || [];
  const threshold = getThreshold(score);

  const gaugeColor = gaugeAnim.interpolate({
    inputRange: [0, 0.3, 0.5, 0.7, 1],
    outputRange: ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#059669'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Score Carbone</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Score Gauge Card */}
        <View style={styles.gaugeCard}>
          <View style={styles.gaugeOuter}>
            <Animated.View style={[styles.gaugeRing, { borderColor: gaugeColor }]}>
              <Text style={[styles.gaugeScore, { color: threshold.color }]}>
                {score.toFixed(1)}
              </Text>
              <Text style={styles.gaugeMax}>/10</Text>
            </Animated.View>
          </View>
          <View style={[styles.labelBadge, { backgroundColor: threshold.bg }]}>
            <Text style={[styles.labelText, { color: threshold.color }]}>{threshold.label}</Text>
          </View>
          <Text style={styles.gaugeHint}>
            {score >= 7
              ? 'Eligible aux primes carbone'
              : `+${(7 - score).toFixed(1)} pts pour etre eligible`}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="leaf" size={20} color="#059669" />
            <Text style={styles.statVal}>{totalCredits.toFixed(1)}</Text>
            <Text style={styles.statLbl}>tCO2 generees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="cash" size={20} color="#f59e0b" />
            <Text style={styles.statVal}>{totalPremium.toLocaleString()}</Text>
            <Text style={styles.statLbl}>XOF primes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="map" size={20} color="#6366f1" />
            <Text style={styles.statVal}>{scoreData?.parcels_count || 0}</Text>
            <Text style={styles.statLbl}>Parcelles</Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Decomposition du score</Text>
          <View style={styles.breakdownCard}>
            <ProgressBar value={breakdown.base} max={3} color="#94a3b8" label="Base" sublabel="Score initial" />
            <ProgressBar value={breakdown.arbres} max={2} color="#059669" label="Arbres" sublabel={`${scoreData?.total_trees || 0} arbres`} />
            <ProgressBar value={breakdown.ombrage} max={2} color="#22c55e" label="Ombrage" sublabel={`${scoreData?.avg_shade_cover || 0}%`} />
            <ProgressBar value={breakdown.pratiques} max={2.5} color="#6366f1" label="Pratiques" sublabel={`${scoreData?.practices_count || 0}/5`} />
            <ProgressBar value={breakdown.surface} max={0.5} color="#f59e0b" label="Surface" sublabel={`${scoreData?.total_area || 0} ha`} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalValue, { color: threshold.color }]}>{score.toFixed(1)} / 10</Text>
            </View>
          </View>
        </View>

        {/* Active Practices */}
        {(scoreData?.practices_list?.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pratiques actives</Text>
            <View style={styles.practicesGrid}>
              {scoreData.practices_list.map(p => (
                <View key={p} style={styles.practiceChip}>
                  <Ionicons name={PRACTICE_ICONS[p] || 'leaf'} size={14} color="#059669" />
                  <Text style={styles.practiceChipText}>{PRACTICE_LABELS[p] || p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommandations</Text>
            {recommendations.map((rec, idx) => (
              <View key={idx} style={styles.recCard}>
                <View style={styles.recLeft}>
                  <Ionicons
                    name={rec.type === 'arbres' ? 'leaf' : rec.type === 'ombrage' ? 'sunny' : 'checkmark-circle'}
                    size={24}
                    color={rec.priority === 'haute' ? '#f59e0b' : rec.priority === 'moyenne' ? '#6366f1' : '#94a3b8'}
                  />
                </View>
                <View style={styles.recContent}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recDesc}>{rec.description}</Text>
                </View>
                <View style={styles.recGain}>
                  <Text style={styles.recGainVal}>+{rec.potential_gain}</Text>
                  <Text style={styles.recGainUnit}>pts</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Parcels Detail */}
        {parcels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scores par parcelle</Text>
            {parcels.map((p, idx) => {
              const pThreshold = getThreshold(p.carbon_score);
              return (
                <View key={p.id || idx} style={styles.parcelRow}>
                  <View style={[styles.parcelDot, { backgroundColor: pThreshold.color }]} />
                  <View style={styles.parcelInfo}>
                    <Text style={styles.parcelName}>{p.village || `Parcelle ${idx + 1}`}</Text>
                    <Text style={styles.parcelMeta}>
                      {p.area_hectares} ha
                      {p.nombre_arbres > 0 ? ` | ${p.nombre_arbres} arbres` : ''}
                      {p.couverture_ombragee > 0 ? ` | ${p.couverture_ombragee}% ombre` : ''}
                    </Text>
                  </View>
                  <View style={[styles.parcelScoreBadge, { backgroundColor: pThreshold.bg }]}>
                    <Text style={[styles.parcelScoreText, { color: pThreshold.color }]}>
                      {(p.carbon_score || 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Parcels')}>
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>Voir mes parcelles</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#065f46' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, color: '#64748b' },
  content: { flex: 1 },

  // Gauge
  gaugeCard: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  gaugeOuter: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gaugeRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  gaugeScore: { fontSize: 44, fontWeight: '800' },
  gaugeMax: { fontSize: 16, color: '#94a3b8', marginTop: -4 },
  labelBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  labelText: { fontSize: 14, fontWeight: '700' },
  gaugeHint: { fontSize: 13, color: '#64748b', textAlign: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  statLbl: { fontSize: 10, color: '#94a3b8', textAlign: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0' },

  // Sections
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10 },

  // Breakdown
  breakdownCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },
  totalValue: { fontSize: 16, fontWeight: '800' },

  // Practices
  practicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  practiceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  practiceChipText: { fontSize: 12, fontWeight: '600', color: '#059669' },

  // Recommendations
  recCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, alignItems: 'center' },
  recLeft: { width: 40, alignItems: 'center' },
  recContent: { flex: 1, marginRight: 8 },
  recTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  recDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  recGain: { alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  recGainVal: { fontSize: 14, fontWeight: '800', color: '#059669' },
  recGainUnit: { fontSize: 9, color: '#059669' },

  // Parcels
  parcelRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6 },
  parcelDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  parcelInfo: { flex: 1 },
  parcelName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  parcelMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  parcelScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  parcelScoreText: { fontSize: 14, fontWeight: '800' },

  // CTA
  ctaSection: { padding: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#065f46', paddingVertical: 14, borderRadius: 12 },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default MyCarbonScoreScreen;
