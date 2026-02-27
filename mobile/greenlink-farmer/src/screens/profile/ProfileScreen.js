import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { Button, NetworkStatus } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../config';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile } = useAuth();
  const { isOnline, pendingActions } = useOffline();
  const [loading, setLoading] = useState(false);

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

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0) || 'P'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'Producteur'}</Text>
          <Text style={styles.userType}>Producteur</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.content}>
        {/* Status */}
        <View style={styles.statusCard}>
          <NetworkStatus isOnline={isOnline} />
          {pendingActions.length > 0 && (
            <Text style={styles.pendingText}>
              {pendingActions.length} action(s) en attente de sync
            </Text>
          )}
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
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Localisation</Text>
            <Text style={styles.infoValue}>
              {user?.farm_location || 'Non renseigné'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Surface totale</Text>
            <Text style={styles.infoValue}>
              {user?.farm_size ? `${user.farm_size} ha` : 'Non renseigné'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Compte</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Modifier mes informations</Text>
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
        <Text style={styles.version}>GreenLink Farmer v1.0.0</Text>
      </View>
    </ScrollView>
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
  pendingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
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
