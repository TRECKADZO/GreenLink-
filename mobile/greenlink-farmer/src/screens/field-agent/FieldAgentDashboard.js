// Écran principal des agents de terrain avec SSRTE et fonctionnalités offline
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';

const OFFLINE_VISITS_KEY = 'offline_ssrte_visits';
const OFFLINE_PHOTOS_KEY = 'offline_photos';

const FieldAgentDashboard = ({ navigation }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingVisits, setPendingVisits] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);

  useEffect(() => {
    loadData();
    
    // Écouter les changements de connexion
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        syncOfflineData();
      }
    });
    
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les données offline
      await loadOfflineData();
      
      // Charger les stats si en ligne
      if (isOnline) {
        const response = await cooperativeApi.getDashboard(token);
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineData = async () => {
    try {
      const visitsJson = await AsyncStorage.getItem(OFFLINE_VISITS_KEY);
      const photosJson = await AsyncStorage.getItem(OFFLINE_PHOTOS_KEY);
      
      if (visitsJson) setPendingVisits(JSON.parse(visitsJson));
      if (photosJson) setPendingPhotos(JSON.parse(photosJson));
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const syncOfflineData = async () => {
    if (pendingVisits.length === 0 && pendingPhotos.length === 0) return;
    
    Alert.alert(
      'Données hors ligne détectées',
      `${pendingVisits.length} visite(s) et ${pendingPhotos.length} photo(s) en attente de synchronisation.`,
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Synchroniser', onPress: performSync }
      ]
    );
  };

  const performSync = async () => {
    setLoading(true);
    try {
      // Synchroniser les visites
      for (const visit of pendingVisits) {
        await cooperativeApi.createSSRTEVisit(token, visit);
      }
      
      // Synchroniser les photos (à implémenter avec le backend)
      // Pour l'instant, les photos sont stockées localement
      
      // Nettoyer le stockage local
      await AsyncStorage.removeItem(OFFLINE_VISITS_KEY);
      setPendingVisits([]);
      
      Alert.alert('Succès', 'Données synchronisées avec succès!');
      loadData();
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la synchronisation. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, []);

  const QuickActionCard = ({ icon, title, subtitle, color, onPress, badge }) => (
    <TouchableOpacity style={[styles.quickAction, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.quickActionContent}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.quickActionText}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {badge > 0 && (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Agent de Terrain</Text>
            <Text style={styles.userName}>{user?.full_name || 'Agent'}</Text>
          </View>
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
            <Text style={[styles.statusText, { color: isOnline ? '#10b981' : '#ef4444' }]}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>
        </View>

        {/* Offline Alert */}
        {!isOnline && (
          <View style={styles.offlineAlert}>
            <Ionicons name="cloud-offline" size={20} color="#f59e0b" />
            <Text style={styles.offlineText}>
              Mode hors ligne actif. Les données seront synchronisées automatiquement.
            </Text>
          </View>
        )}

        {/* Pending Sync Banner */}
        {(pendingVisits.length > 0 || pendingPhotos.length > 0) && (
          <TouchableOpacity style={styles.syncBanner} onPress={performSync} disabled={!isOnline}>
            <View style={styles.syncBannerContent}>
              <Ionicons name="sync" size={24} color="#3b82f6" />
              <View style={styles.syncBannerText}>
                <Text style={styles.syncBannerTitle}>Données en attente</Text>
                <Text style={styles.syncBannerSubtitle}>
                  {pendingVisits.length} visite(s) • {pendingPhotos.length} photo(s)
                </Text>
              </View>
            </View>
            <Text style={[styles.syncButton, { opacity: isOnline ? 1 : 0.5 }]}>
              {isOnline ? 'Synchroniser' : 'Attente connexion'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total_members || 0}</Text>
            <Text style={styles.statLabel}>Producteurs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats?.total_parcels || 0}</Text>
            <Text style={styles.statLabel}>Parcelles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{pendingVisits.length}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        
        <QuickActionCard
          icon="qr-code"
          title="Scanner QR Code"
          subtitle="Identifier un producteur rapidement"
          color="#8b5cf6"
          onPress={() => navigation.navigate('QRScanner')}
        />
        
        <QuickActionCard
          icon="clipboard-outline"
          title="Nouvelle visite SSRTE"
          subtitle="Enregistrer une visite de suivi"
          color="#10b981"
          onPress={() => navigation.navigate('SSRTEVisitForm')}
          badge={pendingVisits.length}
        />
        
        <QuickActionCard
          icon="camera"
          title="Capture géolocalisée"
          subtitle="Prendre une photo avec GPS"
          color="#3b82f6"
          onPress={() => navigation.navigate('GeoPhoto')}
          badge={pendingPhotos.length}
        />
        
        <QuickActionCard
          icon="people"
          title="Liste des producteurs"
          subtitle="Voir tous les membres"
          color="#f59e0b"
          onPress={() => navigation.navigate('CoopMembers')}
        />
        
        <QuickActionCard
          icon="document-text"
          title="Mes visites"
          subtitle="Historique des visites SSRTE"
          color="#ec4899"
          onPress={() => navigation.navigate('VisitsHistory')}
        />

        <QuickActionCard
          icon="download"
          title="Données offline"
          subtitle="Télécharger pour travail hors ligne"
          color="#6366f1"
          onPress={() => navigation.navigate('OfflineData')}
        />

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  greeting: {
    color: '#94a3b8',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  offlineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  offlineText: {
    color: '#fcd34d',
    marginLeft: 10,
    flex: 1,
    fontSize: 13,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e3a5f',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncBannerText: {
    marginLeft: 12,
  },
  syncBannerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  syncBannerSubtitle: {
    color: '#93c5fd',
    fontSize: 12,
  },
  syncButton: {
    color: '#60a5fa',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    marginLeft: 12,
    flex: 1,
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  footer: {
    height: 30,
  },
});

export default FieldAgentDashboard;
