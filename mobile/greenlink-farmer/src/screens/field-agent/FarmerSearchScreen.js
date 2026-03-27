/**
 * FarmerSearchScreen - Recherche de planteur par numéro de téléphone
 * Recherche et identification des producteurs
 * Mode offline-first: recherche locale si pas de réseau
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { COLORS, FONTS, SPACING } from '../../config';
import { api } from '../../services/api';

const FarmerSearchScreen = ({ navigation }) => {
  const { token, user } = useAuth();
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [farmer, setFarmer] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cachedFarmers, setCachedFarmers] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  // Charger le cache local au démarrage
  useEffect(() => {
    loadCachedFarmers();
  }, []);

  const loadCachedFarmers = async () => {
    try {
      const cached = await getCachedData('zone_farmers');
      if (cached) {
        setCachedFarmers(cached.farmers || []);
        setLastSync(cached.sync_time);
      }
    } catch (e) {
      console.error('Cache load error:', e);
    }
  };

  // Synchroniser les données de la zone
  const syncZoneData = async () => {
    if (!isOnline) {
      Alert.alert('Hors-ligne', 'Pas de connexion réseau. Utilisation des données en cache.');
      return;
    }
    setSyncing(true);
    try {
      const res = await api.get('/agent/sync/download');
      await cacheData('zone_farmers', {
        farmers: res.data.farmers,
        sync_time: res.data.sync_timestamp,
      });
      setCachedFarmers(res.data.farmers || []);
      setLastSync(res.data.sync_timestamp);
      Alert.alert('Synchronisation', `${res.data.farmers_count} planteurs téléchargés`);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de synchroniser. Réessayez.');
    } finally {
      setSyncing(false);
    }
  };

  // Normaliser le téléphone
  const normalizePhone = (p) => {
    let n = (p || '').replace(/[\s\-\.]/g, '');
    if (n.startsWith('+225')) n = n.slice(4);
    else if (n.startsWith('225')) n = n.slice(3);
    else if (n.startsWith('00225')) n = n.slice(5);
    return n;
  };

  // Recherche locale dans le cache
  const searchLocally = (phoneQuery) => {
    const normalized = normalizePhone(phoneQuery);
    return cachedFarmers.filter((f) => {
      const fp = normalizePhone(f.phone_number || '');
      return fp.includes(normalized) || normalized.includes(fp) ||
        (f.phone_number || '').includes(phoneQuery);
    });
  };

  // Recherche principale
  const handleSearch = async () => {
    if (!phone.trim()) {
      Alert.alert('Erreur', 'Saisissez un numéro de téléphone');
      return;
    }
    Keyboard.dismiss();
    setSearching(true);
    setFarmer(null);
    setNotFound(false);

    if (isOnline) {
      // Recherche en ligne
      try {
        const res = await api.get('/agent/search', { params: { phone: phone.trim() } });
        if (res.data.found) {
          setFarmer(res.data.farmer);
        } else {
          // Fallback: cache local
          const local = searchLocally(phone.trim());
          if (local.length > 0) {
            setFarmer(local[0]);
          } else {
            setNotFound(true);
          }
        }
      } catch (e) {
        if (e.status === 403) {
          Alert.alert('Accès refusé', 'Seuls les agents terrain autorisés peuvent effectuer cette recherche.');
          setSearching(false);
          return;
        }
        // Réseau échoué → cache local
        const local = searchLocally(phone.trim());
        if (local.length > 0) {
          setFarmer(local[0]);
        } else {
          setNotFound(true);
        }
      }
    } else {
      // Mode offline
      const local = searchLocally(phone.trim());
      if (local.length > 0) {
        setFarmer(local[0]);
      } else {
        setNotFound(true);
      }
    }
    setSearching(false);
  };

  // Actions post-recherche - Toujours passer par le profil farmer-centric
  const navigateToAction = (action) => {
    if (!farmer) return;
    // Workflow farmer-centric: toujours ouvrir le profil avec ses fiches
    navigation.navigate('FarmerProfile', { farmer });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#22c55e';
      case 'rejected': return '#ef4444';
      case 'needs_correction': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified': return 'Vérifiée';
      case 'rejected': return 'Rejetée';
      case 'needs_correction': return 'À corriger';
      default: return 'En attente';
    }
  };

  const formatSyncTime = (ts) => {
    if (!ts) return 'Jamais';
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Recherche Planteur</Text>
          <Text style={styles.headerSub}>Identification par téléphone</Text>
        </View>
        <View style={[styles.onlineBadge, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]}>
          <Ionicons name={isOnline ? 'wifi' : 'cloud-offline'} size={14} color="#fff" />
          <Text style={styles.onlineText}>{isOnline ? 'En ligne' : 'Hors-ligne'}</Text>
        </View>
      </View>

      {/* Sync Bar */}
      <View style={styles.syncBar}>
        <View style={styles.syncInfo}>
          <Ionicons name="server" size={14} color="#60a5fa" />
          <Text style={styles.syncText}>{cachedFarmers.length} planteurs en cache</Text>
          <Text style={styles.syncDot}>•</Text>
          <Text style={styles.syncText}>Sync: {formatSyncTime(lastSync)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
          onPress={syncZoneData}
          disabled={syncing || !isOnline}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={COLORS.white} />
              <Text style={styles.syncBtnText}>Sync</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Numéro de téléphone du planteur</Text>
          <View style={styles.searchRow}>
            <View style={styles.inputWrap}>
              <Ionicons name="call" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: 0701234567"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                autoFocus
              />
              {phone.length > 0 && (
                <TouchableOpacity onPress={() => setPhone('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="search" size={22} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
          {!isOnline && cachedFarmers.length > 0 && (
            <View style={styles.offlineHint}>
              <Ionicons name="cloud-offline" size={12} color="#f59e0b" />
              <Text style={styles.offlineHintText}>Recherche dans le cache local ({cachedFarmers.length} planteurs)</Text>
            </View>
          )}
        </View>

        {/* First sync prompt */}
        {cachedFarmers.length === 0 && isOnline && (
          <TouchableOpacity style={styles.firstSyncCard} onPress={syncZoneData}>
            <Ionicons name="cloud-download" size={32} color="#3b82f6" />
            <Text style={styles.firstSyncTitle}>Première synchronisation</Text>
            <Text style={styles.firstSyncText}>
              Téléchargez les planteurs de votre zone pour le mode hors-ligne
            </Text>
          </TouchableOpacity>
        )}

        {/* Not Found */}
        {notFound && (
          <View style={styles.notFoundCard}>
            <Ionicons name="alert-circle" size={40} color="#f59e0b" />
            <Text style={styles.notFoundTitle}>Aucun planteur trouvé</Text>
            <Text style={styles.notFoundText}>
              {isOnline
                ? "Ce numéro n'est pas dans votre périmètre"
                : 'Ce numéro n\'est pas dans le cache. Synchronisez vos données.'}
            </Text>
          </View>
        )}

        {/* Farmer Result */}
        {farmer && (
          <View style={styles.resultCard}>
            {/* Farmer header */}
            <View style={styles.resultHeader}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={28} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.farmerName}>{farmer.full_name}</Text>
                <Text style={styles.farmerCoop}>{farmer.cooperative_name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: farmer.is_active ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[styles.statusText, { color: farmer.is_active ? '#16a34a' : '#dc2626' }]}>
                  {farmer.is_active ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>

            {/* Info grid */}
            <View style={styles.infoGrid}>
              <InfoItem icon="call" label="Téléphone" value={farmer.phone_number} />
              <InfoItem icon="location" label="Village" value={farmer.village || 'N/A'} />
              <InfoItem icon="card" label="CNI" value={farmer.cni_number || 'N/A'} />
              <InfoItem icon="leaf" label="Parcelles" value={`${farmer.parcels_count || 0}`} />
              <InfoItem icon="resize" label="Superficie" value={`${farmer.total_hectares || 0} ha`} />
              <InfoItem icon="checkmark-circle" label="Consentement" value={farmer.consent_given ? 'Oui' : 'Non'} />
            </View>

            {/* Parcels */}
            {farmer.parcels && farmer.parcels.length > 0 && (
              <View style={styles.parcelsSection}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="leaf" size={14} color={COLORS.primary} /> Parcelles ({farmer.parcels.length})
                </Text>
                {farmer.parcels.map((p) => (
                  <View key={p.id} style={styles.parcelRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.parcelName}>{p.village || p.location}</Text>
                      <Text style={styles.parcelInfo}>{p.superficie || p.area_hectares} ha • {p.type_culture || p.crop_type}</Text>
                    </View>
                    <View style={[styles.verifBadge, { backgroundColor: getStatusColor(p.verification_status) + '20' }]}>
                      <View style={[styles.verifDot, { backgroundColor: getStatusColor(p.verification_status) }]} />
                      <Text style={[styles.verifText, { color: getStatusColor(p.verification_status) }]}>
                        {getStatusLabel(p.verification_status)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Button - Go to farmer profile */}
            <Text style={styles.actionsTitle}>Actions</Text>
            <TouchableOpacity
              style={styles.openProfileAction}
              onPress={() => navigateToAction('profile')}
            >
              <Ionicons name="folder-open" size={28} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.openProfileLabel}>Ouvrir les fiches</Text>
                <Text style={styles.openProfileDesc}>
                  Acceder a ICI, SSRTE, Parcelles, Photos...
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#059669" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
    <View style={{ marginLeft: 6 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, gap: 4,
  },
  onlineText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  syncBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 8,
  },
  syncInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  syncText: { color: '#94a3b8', fontSize: 11 },
  syncDot: { color: '#475569', fontSize: 10 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4,
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

  content: { flex: 1, padding: 16 },

  searchCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 10, paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 17, color: COLORS.text, fontWeight: '500' },
  clearBtn: { padding: 4 },
  searchBtn: {
    width: 50, height: 50, borderRadius: 10, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.6 },
  offlineHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
  },
  offlineHintText: { color: '#f59e0b', fontSize: 11 },

  firstSyncCard: {
    alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12,
    padding: 24, marginTop: 16, borderWidth: 1, borderColor: '#bfdbfe', borderStyle: 'dashed',
  },
  firstSyncTitle: { fontSize: 15, fontWeight: '700', color: '#1e40af', marginTop: 8 },
  firstSyncText: { fontSize: 12, color: '#3b82f6', textAlign: 'center', marginTop: 4 },

  notFoundCard: {
    alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: 12, padding: 24, marginTop: 16,
    borderWidth: 1, borderColor: '#fde68a',
  },
  notFoundTitle: { fontSize: 15, fontWeight: '700', color: '#92400e', marginTop: 8 },
  notFoundText: { fontSize: 12, color: '#b45309', textAlign: 'center', marginTop: 4 },

  resultCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  farmerName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  farmerCoop: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },

  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16,
    backgroundColor: '#f8fafc', borderRadius: 8, padding: 12,
  },
  infoItem: {
    flexDirection: 'row', alignItems: 'flex-start', width: '45%',
  },
  infoLabel: { fontSize: 10, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  parcelsSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  parcelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 6,
  },
  parcelName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  parcelInfo: { fontSize: 11, color: COLORS.textSecondary },
  verifBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4,
  },
  verifDot: { width: 6, height: 6, borderRadius: 3 },
  verifText: { fontSize: 10, fontWeight: '600' },

  actionsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  openProfileAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ecfdf5', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#a7f3d0',
  },
  openProfileLabel: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  openProfileDesc: { fontSize: 12, color: '#047857', marginTop: 2 },
});

export default FarmerSearchScreen;
