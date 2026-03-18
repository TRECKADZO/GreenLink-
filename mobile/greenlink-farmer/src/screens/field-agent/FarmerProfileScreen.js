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

  const handleOpenForm = (form) => {
    if (form.screen === 'FarmerICIForm') {
      navigation.navigate(form.screen, { farmerId: farmer.id, farmerName: farmer.full_name });
    } else if (form.screen === 'SSRTEVisitForm') {
      navigation.navigate(form.screen, { farmerId: farmer.id, farmerName: farmer.full_name });
    } else {
      navigation.navigate(form.screen, { farmerId: farmer.id, farmerName: farmer.full_name });
    }
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

      {/* Forms List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Fiches a remplir</Text>
        {FORMS.map(form => (
          <TouchableOpacity key={form.id} style={styles.formCard} onPress={() => handleOpenForm(form)} activeOpacity={0.7}>
            <View style={[styles.formIcon, { backgroundColor: form.bg }]}>
              <Ionicons name={form.icon} size={24} color={form.color} />
            </View>
            <View style={styles.formInfo}>
              <Text style={styles.formLabel}>{form.label}</Text>
              <Text style={styles.formDesc}>{form.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}
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
  infoBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', justifyContent: 'space-around', alignItems: 'center' },
  infoItem: { alignItems: 'center', gap: 2 },
  infoValue: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  infoLabel: { fontSize: 11, color: '#64748b' },
  infoDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },
  formCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 12 },
  formIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formInfo: { flex: 1 },
  formLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  formDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 16, color: '#64748b', marginTop: 12 },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#059669', borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
});

export default FarmerProfileScreen;
