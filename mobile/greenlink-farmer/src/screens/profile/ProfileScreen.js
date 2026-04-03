import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';
import { useOffline } from '../../context/OfflineContext';
import { Button, NetworkStatus } from '../../components/UI';
import { MainLayout } from '../../components/navigation';
import { syncService } from '../../services/sync';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile } = useAuth();
  const { isOnline } = useConnectivity();
  const { pendingActions } = useOffline();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [parcelStats, setParcelStats] = useState({ localisation: null, surface: 0 });

  useFocusEffect(
    useCallback(() => {
      loadSyncStatus();
      loadParcelStats();
    }, [])
  );

  const loadParcelStats = async () => {
    try {
      const resp = await farmerApi.getParcels();
      const parcels = resp.data || [];
      if (parcels.length > 0) {
        const totalArea = parcels.reduce((sum, p) => sum + (p.superficie || p.area_hectares || p.size || 0), 0);
        const villages = [...new Set(parcels.map(p => p.village || p.localisation || p.location).filter(Boolean))];
        setParcelStats({
          localisation: villages.join(', ') || null,
          surface: Math.round(totalArea * 100) / 100,
        });
      }
    } catch (e) {
      // silencieux
    }
  };

  const loadSyncStatus = async () => {
    const status = await syncService.getSyncStatus();
    setSyncStatus(status);
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert('Hors ligne', 'Vous devez être connecté pour synchroniser');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncService.syncNow();
      if (result.success) {
        if (result.synced > 0) {
          Alert.alert(
            'Synchronisation terminée',
            `${result.synced} élément(s) synchronisé(s)${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}`
          );
        } else {
          Alert.alert('À jour', 'Rien à synchroniser');
        }
      } else {
        Alert.alert('Erreur', result.error || 'Échec de la synchronisation');
      }
      await loadSyncStatus();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de synchroniser');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Oui', onPress: logout },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirmation',
              'Tapez SUPPRIMER pour confirmer',
              (text) => {
                if (text === 'SUPPRIMER') {
                  // Call delete API
                  Alert.alert('Compte supprimé');
                  logout();
                } else {
                  Alert.alert('Erreur', 'Confirmation incorrecte');
                }
              }
            );
          }
        },
      ]
    );
  };

  const isFieldAgent = user?.user_type === 'field_agent' || user?.user_type === 'agent_terrain';
  const userType = user?.user_type === 'cooperative' ? 'cooperative' : isFieldAgent ? 'field_agent' : 'farmer';
  const userTypeLabel = user?.user_type === 'cooperative' ? 'Coopérative' : isFieldAgent ? 'Agent Terrain' : 'Producteur';

  return (
    <MainLayout userType={userType}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
        
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, isFieldAgent && { backgroundColor: '#06b6d4' }]}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0) || 'P'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'Utilisateur'}</Text>
          <Text style={styles.userType}>{userTypeLabel}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.content}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <NetworkStatus isOnline={isOnline} />
            {pendingActions.length > 0 && (
              <Text style={styles.pendingText}>
                {pendingActions.length} action(s) en attente
              </Text>
            )}
            {syncStatus?.lastSync && (
              <Text style={styles.lastSyncText}>
                Dernière sync: {new Date(syncStatus.lastSync).toLocaleTimeString('fr-FR')}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleManualSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.syncButtonText}>🔄 Sync</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>
              {user?.phone_number || 'Non renseigné'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>
              {user?.email || 'Non renseigné'}
            </Text>
          </View>
          
          {isFieldAgent ? (
            <>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Zone</Text>
                <Text style={styles.infoValue}>
                  {user?.zone || 'Non renseigné'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Coopérative</Text>
                <Text style={styles.infoValue}>
                  {user?.cooperative_name || 'Non renseigné'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Localisation</Text>
                <Text style={styles.infoValue}>
                  {user?.farm_location || parcelStats.localisation || user?.village || 'Non renseigné'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Surface totale</Text>
                <Text style={styles.infoValue}>
                  {parcelStats.surface > 0 ? `${parcelStats.surface} ha` : user?.farm_size ? `${user.farm_size} ha` : 'Non renseigné'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Compte</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Modifier mes informations</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Text style={styles.actionIcon}>🔔</Text>
            <Text style={styles.actionText}>Préférences notifications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>📜</Text>
            <Text style={styles.actionText}>Conditions d'utilisation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionText}>Confidentialité</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>❓</Text>
            <Text style={styles.actionText}>Aide et support</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <Button
          title="Se déconnecter"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        />

        {/* Delete Account */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteText}>Supprimer mon compte</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>GreenLink Agritech v1.1.0</Text>
        
        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 60,
  },
  backButton: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.lg,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userType: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  content: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    minHeight: 500,
  },
  statusCard: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flex: 1,
  },
  pendingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    marginTop: SPACING.xs,
  },
  lastSyncText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  infoSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  infoLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
  },
  infoValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  actionsSection: {
    marginBottom: SPACING.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  actionIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  actionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[800],
  },
  logoutButton: {
    marginTop: SPACING.lg,
  },
  deleteButton: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  deleteText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.error,
  },
  version: {
    textAlign: 'center',
    color: COLORS.gray[400],
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
});

export default ProfileScreen;
