import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const FORMS = [
  { id: 'ici', label: 'Visite ICI', desc: 'Fiche famille, enfants, education, pratiques', icon: 'document-text', color: '#8b5cf6', bg: '#8b5cf620', screen: 'FarmerICIForm' },
  { id: 'ssrte', label: 'Visite SSRTE', desc: 'Suivi et remediation travail des enfants', icon: 'clipboard', color: '#06b6d4', bg: '#06b6d420', screen: 'SSRTEVisitForm' },
  { id: 'parcels', label: 'Declaration parcelles', desc: 'GPS, superficie, type de culture', icon: 'map', color: '#f59e0b', bg: '#f59e0b20', screen: 'ParcelVerification' },
  { id: 'photos', label: 'Photos geolocalisees', desc: 'Photos terrain avec position GPS', icon: 'camera', color: '#ec4899', bg: '#ec489920', screen: 'GeoPhoto' },
  { id: 'register', label: 'Enregistrement membre', desc: 'Inscrire comme membre cooperative', icon: 'person-add', color: '#10b981', bg: '#10b98120', screen: 'AddCoopMember' },
];

const FarmerProfileScreen = ({ navigation, route }) => {
  const { farmer } = route.params || {};
  const { token } = useAuth();
  const [farmerData, setFarmerData] = useState(farmer);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh farmer data on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (farmer?.id) refreshFarmerData();
    });
    return unsubscribe;
  }, [navigation, farmer]);

  const refreshFarmerData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_URL}/api/field-agent/my-farmers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const updated = (data.farmers || []).find(f => f.id === farmer.id);
        if (updated) setFarmerData(updated);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  if (!farmer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Aucun agriculteur selectionne</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const f = farmerData || farmer;
  const formsStatus = f.forms_status || {};
  const completion = f.completion || { completed: 0, total: 5, percentage: 0 };
  const isComplete = completion.percentage === 100;
  const pctColor = isComplete ? '#059669' : completion.percentage >= 40 ? '#f59e0b' : '#94a3b8';

  const handleOpenForm = (form) => {
    navigation.navigate(form.screen, { farmerId: f.id, farmerName: f.full_name });
  };

  const completedCount = FORMS.filter(form => formsStatus[form.id]?.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isComplete && { backgroundColor: '#047857' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{f.full_name}</Text>
          <Text style={styles.headerSubtitle}>
            {f.village || ''} {f.phone_number ? `| ${f.phone_number}` : ''}
          </Text>
        </View>
        {isComplete && (
          <View style={styles.headerCompleteBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.headerCompleteText}>Valide</Text>
          </View>
        )}
        {refreshing && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{f.parcels_count || 0}</Text>
          <Text style={styles.infoLabel}>Parcelles</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{f.zone || '-'}</Text>
          <Text style={styles.infoLabel}>Zone</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Ionicons name={f.is_active !== false ? 'checkmark-circle' : 'close-circle'} size={20} color={f.is_active !== false ? '#10b981' : '#ef4444'} />
          <Text style={styles.infoLabel}>{f.is_active !== false ? 'Actif' : 'Inactif'}</Text>
        </View>
      </View>

      {/* Progression Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>Progression des fiches</Text>
            <Text style={styles.progressSubtext}>{completedCount} sur {FORMS.length} fiches completees</Text>
          </View>
          <View style={[styles.percentCircle, { borderColor: pctColor }]}>
            <Text style={[styles.percentText, { color: pctColor }]}>{completion.percentage}%</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${completion.percentage}%`, backgroundColor: pctColor }]} />
        </View>

        {/* Mini form status icons row */}
        <View style={styles.formStatusRow}>
          {FORMS.map(form => {
            const isDone = formsStatus[form.id]?.completed;
            return (
              <View key={form.id} style={styles.formStatusItem}>
                <View style={[styles.formStatusDot, isDone ? { backgroundColor: '#059669' } : { backgroundColor: '#e2e8f0' }]}>
                  <Ionicons name={isDone ? 'checkmark' : form.icon} size={12} color={isDone ? '#fff' : '#94a3b8'} />
                </View>
                <Text style={[styles.formStatusLabel, isDone && { color: '#059669' }]} numberOfLines={1}>
                  {form.id.toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Validation Banner */}
      {isComplete && (
        <View style={styles.validationBanner}>
          <Ionicons name="ribbon" size={24} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={styles.validationTitle}>Toutes les fiches sont completes !</Text>
            <Text style={styles.validationDesc}>
              Cet agriculteur est entierement documente. Les donnees sont pretes pour verification.
            </Text>
          </View>
        </View>
      )}

      {/* Forms List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Fiches a remplir</Text>
        {FORMS.map((form, index) => {
          const status = formsStatus[form.id];
          const isDone = status?.completed;
          return (
            <TouchableOpacity
              key={form.id}
              style={[styles.formCard, isDone && styles.formCardDone]}
              onPress={() => handleOpenForm(form)}
              activeOpacity={0.7}
            >
              {/* Step number */}
              <View style={[styles.stepNumber, isDone ? { backgroundColor: '#059669' } : { backgroundColor: '#e2e8f0' }]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumberText, !isDone && { color: '#94a3b8' }]}>{index + 1}</Text>
                )}
              </View>

              {/* Icon */}
              <View style={[styles.formIcon, { backgroundColor: isDone ? '#d1fae5' : form.bg }]}>
                <Ionicons name={isDone ? 'checkmark-circle' : form.icon} size={24} color={isDone ? '#059669' : form.color} />
              </View>

              {/* Info */}
              <View style={styles.formInfo}>
                <View style={styles.formLabelRow}>
                  <Text style={[styles.formLabel, isDone && { color: '#059669' }]}>{form.label}</Text>
                  {isDone && (
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneBadgeText}>Complete</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.formDesc}>{form.desc}</Text>
                {status?.count > 0 && (
                  <Text style={styles.formCount}>{status.count} enregistrement(s)</Text>
                )}
              </View>

              {/* Arrow */}
              {isDone ? (
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Parcels info */}
        {f.parcels?.length > 0 && (
          <View style={styles.parcelsCard}>
            <Text style={styles.sectionTitle}>Parcelles ({f.parcels.length})</Text>
            {f.parcels.map((p, i) => (
              <View key={i} style={styles.parcelRow}>
                <Ionicons name="leaf" size={16} color="#059669" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.parcelName}>{p.village || p.location || 'Parcelle ' + (i + 1)}</Text>
                  <Text style={styles.parcelInfo}>{p.area_hectares} ha - {p.crop_type || 'cacao'}</Text>
                </View>
                {p.carbon_score > 0 && (
                  <View style={styles.carbonBadge}>
                    <Text style={styles.carbonText}>C:{p.carbon_score}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  headerBack: { marginRight: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  headerCompleteBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, gap: 4,
  },
  headerCompleteText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  infoBar: {
    flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', justifyContent: 'space-around', alignItems: 'center',
  },
  infoItem: { alignItems: 'center', gap: 2 },
  infoValue: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  infoLabel: { fontSize: 11, color: '#64748b' },
  infoDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },

  progressSection: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  progressSubtext: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  percentCircle: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  percentText: { fontSize: 14, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },

  formStatusRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  formStatusItem: { alignItems: 'center', gap: 3 },
  formStatusDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  formStatusLabel: { fontSize: 8, fontWeight: '700', color: '#94a3b8' },

  validationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf5', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#a7f3d0',
  },
  validationTitle: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  validationDesc: { fontSize: 12, color: '#047857', marginTop: 2, lineHeight: 17 },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },

  formCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 10,
  },
  formCardDone: { borderWidth: 1.5, borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' },

  stepNumber: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  formIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formInfo: { flex: 1 },
  formLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  formDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  formCount: { fontSize: 10, color: '#059669', fontWeight: '500', marginTop: 2 },
  doneBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  doneBadgeText: { fontSize: 9, fontWeight: '700', color: '#059669' },

  parcelsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  parcelRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  parcelName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  parcelInfo: { fontSize: 11, color: '#64748b', marginTop: 1 },
  carbonBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  carbonText: { fontSize: 10, fontWeight: '600', color: '#059669' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 16, color: '#64748b', marginTop: 12 },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#059669', borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
});

export default FarmerProfileScreen;
