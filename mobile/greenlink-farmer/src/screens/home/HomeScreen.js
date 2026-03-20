import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { MenuItem, InfoCard, NetworkStatus, Loader } from '../../components/UI';
import { MainLayout } from '../../components/navigation';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING, MESSAGES } from '../../config';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Rediriger les agents terrain vers leur dashboard dédié
    if (user?.user_type === 'field_agent' || user?.user_type === 'agent_terrain') {
      navigation.replace('FieldAgentDashboard');
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Essayer d'abord le cache si offline
      if (!isOnline) {
        const cached = await getCachedData('dashboard');
        if (cached) {
          setDashboard(cached);
          setLoading(false);
          return;
        }
      }

      const response = await farmerApi.getDashboard();
      setDashboard(response.data);
      await cacheData('dashboard', response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Fallback au cache
      const cached = await getCachedData('dashboard');
      if (cached) setDashboard(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return <Loader message="Chargement du tableau de bord..." />;
  }

  const userType = user?.user_type === 'cooperative' ? 'cooperative' : 
                   (user?.user_type === 'field_agent' || user?.user_type === 'agent_terrain') ? 'field_agent' : 'farmer';

  return (
    <MainLayout userType={userType}>
      <ScrollView 
        style={styles.container}
        refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Producteur'}</Text>
          </View>
          <NetworkStatus isOnline={isOnline} />
        </View>
        
        {/* Score carbone */}
        <View style={styles.carbonScore}>
          <Text style={styles.carbonLabel}>Score Carbone</Text>
          <Text style={styles.carbonValue}>
            {dashboard?.carbon_score || 0}/10
          </Text>
          <Text style={styles.carbonHint}>
            {dashboard?.carbon_score >= 7 
              ? '✓ Éligible aux primes' 
              : 'Améliorez vos pratiques'}
          </Text>
        </View>
      </View>

      {/* Stats rapides */}
      <View style={styles.statsContainer}>
        <InfoCard
          title="Parcelles"
          value={dashboard?.total_parcels || 0}
          icon="🌳"
          color={COLORS.primary}
        />
        <InfoCard
          title="Surface totale"
          value={dashboard?.total_area || 0}
          unit="ha"
          icon="📐"
          color={COLORS.success}
        />
        <InfoCard
          title="Prime estimée"
          value={(dashboard?.estimated_premium || 0).toLocaleString()}
          unit="XOF"
          icon="💰"
          color={COLORS.secondary}
        />
      </View>

      {/* Menu principal style USSD */}
      <View style={styles.menuContainer}>
        <Text style={styles.menuTitle}>{MESSAGES.selectOption}</Text>
        
        <MenuItem
          number="1"
          title="Mes Parcelles"
          subtitle={`${dashboard?.total_parcels || 0} parcelle(s) déclarée(s)`}
          icon="🌳"
          onPress={() => navigation.navigate('Parcels')}
        />
        
        <MenuItem
          number="2"
          title="Déclarer une Récolte"
          subtitle="Enregistrez votre production"
          iconImage="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=64&h=64&fit=crop"
          onPress={() => navigation.navigate('Harvest')}
        />
        
        <MenuItem
          number="3"
          title="Marketplace Intrants"
          subtitle="Achetez intrants & équipements"
          icon="🛒"
          onPress={() => navigation.navigate('Marketplace')}
          highlight={true}
        />
        
        <MenuItem
          number="4"
          title="Mon Score Carbone"
          subtitle={`Score: ${dashboard?.average_carbon_score?.toFixed(1) || '0'}/10`}
          icon="🌱"
          onPress={() => navigation.navigate('MyCarbonScore')}
        />
        
        <MenuItem
          number="5"
          title="Mes Commandes"
          subtitle="Suivez vos achats"
          icon="📦"
          onPress={() => navigation.navigate('Orders')}
        />
        
        <MenuItem
          number="6"
          title="Mes Paiements"
          subtitle="Primes et historique"
          icon="💳"
          onPress={() => navigation.navigate('Payments')}
        />
        
        <MenuItem
          number="7"
          title="Notifications"
          subtitle={`${dashboard?.unread_notifications || 0} non lue(s)`}
          icon="🔔"
          onPress={() => navigation.navigate('Notifications')}
        />
        
        <MenuItem
          number="8"
          title="*144*88# Prime Carbone"
          subtitle="Calculez votre prime en 60s"
          icon="📞"
          onPress={() => navigation.navigate('USSDCarbon')}
          highlight={true}
        />
        
        <MenuItem
          number="*"
          title="Mon Profil"
          subtitle="Gérer mon compte"
          icon="👤"
          onPress={() => navigation.navigate('Profile')}
        />
        
        <MenuItem
          number="0"
          title="Déconnexion"
          subtitle="Quitter l'application"
          icon="🚪"
          onPress={logout}
        />
      </View>

      {/* Aide rapide */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>Besoin d'aide ?</Text>
        <Text style={styles.helpText}>
          Appelez le {'\n'}
          <Text style={styles.helpPhone}>+225 07 87 76 10 23</Text>
        </Text>
      </View>
      
      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.8,
  },
  userName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  carbonScore: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
  },
  carbonLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING.xs,
  },
  carbonValue: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  carbonHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
  statsContainer: {
    padding: SPACING.md,
    marginTop: -SPACING.lg,
  },
  menuContainer: {
    padding: SPACING.md,
  },
  menuTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: SPACING.md,
  },
  helpContainer: {
    margin: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: SPACING.sm,
  },
  helpText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  helpPhone: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default HomeScreen;
