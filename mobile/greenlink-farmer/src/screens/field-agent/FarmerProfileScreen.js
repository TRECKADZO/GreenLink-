import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const FORMS = [
  { id: 'ici', label: 'Visite ICI', desc: 'Fiche famille, enfants, education, pratiques', icon: 'document-text', color: '#8b5cf6', bg: '#8b5cf620', screen: 'FarmerICIForm' },
  { id: 'ssrte', label: 'Visite SSRTE', desc: 'Suivi et remediation travail des enfants', icon: 'clipboard', color: '#06b6d4', bg: '#06b6d420', screen: 'SSRTEVisitForm' },
  { id: 'parcels', label: 'Declaration parcelles', desc: 'GPS, superficie, type de culture', icon: 'map', color: '#f59e0b', bg: '#f59e0b20', screen: 'ParcelVerification' },
  { id: 'photos', label: 'Photos geolocalisees', desc: 'Photos terrain avec position GPS', icon: 'camera', color: '#ec4899', bg: '#ec489920', screen: 'GeoPhoto' },
  { id: 'register', label: 'Enregistrement membre', desc: 'Inscrire comme membre cooperative', icon: 'person-add', color: '#10b981', bg: '#10b98120', screen: 'AddCoopMember' },
];

const FarmerProfileScreen = ({ navigation, route }) => {
  const { farmer } = route.params || {};

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

  const formsStatus = farmer.forms_status || {};
  const completion = farmer.completion || { completed: 0, total: 5, percentage: 0 };

  const handleOpenForm = (form) => {
    navigation.navigate(form.screen, { farmerId: farmer.id, farmerName: farmer.full_name });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{farmer.full_name}</Text>
          <Text style={styles.headerSubtitle}>{farmer.village || ''} {farmer.phone_number ? `| ${farmer.phone_number}` : ''}</Text>
        </View>
        {completion.percentage === 100 && (
          <View style={styles.completeBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.completeBadgeText}>Complet</Text>
          </View>
        )}
      </View>

      {/* Farmer Info */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{farmer.parcels_count || 0}</Text>
          <Text style={styles.infoLabel}>Parcelles</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{farmer.zone || '-'}</Text>
          <Text style={styles.infoLabel}>Zone</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Ionicons name={farmer.is_active !== false ? 'checkmark-circle' : 'close-circle'} size={20} color={farmer.is_active !== false ? '#10b981' : '#ef4444'} />
          <Text style={styles.infoLabel}>{farmer.is_active !== false ? 'Actif' : 'Inactif'}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Progression</Text>
          <Text style={[styles.progressPercent, completion.percentage === 100 ? { color: '#059669' } : {}]}>
            {completion.percentage}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[
            styles.progressBarFill,
            { width: `${completion.percentage}%` },
            completion.percentage >= 80 ? { backgroundColor: '#059669' } :
            completion.percentage >= 40 ? { backgroundColor: '#f59e0b' } : {}
          ]} />
        </View>
        <Text style={styles.progressSubtext}>{completion.completed} / {completion.total} fiches completees</Text>
      </View>

      {/* Forms List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Fiches a remplir</Text>
        {FORMS.map(form => {
          const status = formsStatus[form.id];
          const isDone = status?.completed;
          return (
          <TouchableOpacity
            key={form.id}
            style={[styles.formCard, isDone && styles.formCardDone]}
            onPress={() => handleOpenForm(form)}
            activeOpacity={0.7}
          >
            <View style={[styles.formIcon, { backgroundColor: isDone ? '#d1fae5' : form.bg }]}>
              <Ionicons name={isDone ? 'checkmark-circle' : form.icon} size={24} color={isDone ? '#059669' : form.color} />
            </View>
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
            {isDone ? (
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            )}
          </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 16 },
  headerBack: { marginRight: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  completeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  completeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  infoBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', justifyContent: 'space-around', alignItems: 'center' },
  infoItem: { alignItems: 'center', gap: 2 },
  infoValue: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  infoLabel: { fontSize: 11, color: '#64748b' },
  infoDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  progressSection: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: { fontSize: 13, fontWeight: '600', color: '#475569' },
  progressPercent: { fontSize: 14, fontWeight: '700', color: '#f59e0b' },
  progressBarBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: '#94a3b8', borderRadius: 3 },
  progressSubtext: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },
  formCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12 },
  formCardDone: { borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' },
  formIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formInfo: { flex: 1 },
  formLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  formDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  formCount: { fontSize: 11, color: '#059669', fontWeight: '500', marginTop: 2 },
  doneBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  doneBadgeText: { fontSize: 10, fontWeight: '600', color: '#059669' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 16, color: '#64748b', marginTop: 12 },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#059669', borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
});

export default FarmerProfileScreen;
