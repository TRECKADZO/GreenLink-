import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Rediriger les agents terrain vers leur dashboard dédié
    if (user?.user_type === 'field_agent' || user?.user_type === 'agent_terrain') {
      setRedirecting(true);
      setTimeout(() => navigation.replace('FieldAgentDashboard'), 100);
      return;
    }
    // Rediriger les coopératives vers leur dashboard dédié
    if (user?.user_type === 'cooperative') {
      setRedirecting(true);
      setTimeout(() => navigation.replace('CoopDashboard'), 100);
      return;
    }
  }, [user]);

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

  // Rafraîchir automatiquement quand l'écran revient au focus
  useFocusEffect(
    useCallback(() => {
      if (user?.user_type !== 'field_agent' && user?.user_type !== 'agent_terrain' && user?.user_type !== 'cooperative') {
        loadDashboard();
      }
    }, [])
  );

  // Bloquer le rendu pendant la redirection
  if (redirecting || user?.user_type === 'cooperative' || user?.user_type === 'field_agent' || user?.user_type === 'agent_terrain') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

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
        <TouchableOpacity 
          style={styles.carbonScore}
          onPress={() => navigation.navigate('MyCarbonScore')}
          activeOpacity={0.85}
        >
          <View style={styles.carbonScoreRow}>
            <View style={styles.carbonGaugeMini}>
              <View style={[styles.carbonGaugeRing, { 
                borderColor: (dashboard?.score_carbone_moyen || 0) >= 7 ? '#22c55e' 
                  : (dashboard?.score_carbone_moyen || 0) >= 5 ? '#f59e0b' : '#ef4444' 
              }]}>
                <Text style={[styles.carbonGaugeNum, { 
                  color: (dashboard?.score_carbone_moyen || 0) >= 7 ? '#22c55e' 
                    : (dashboard?.score_carbone_moyen || 0) >= 5 ? '#f59e0b' : '#ef4444' 
                }]}>
                  {(dashboard?.score_carbone_moyen || 0).toFixed(1)}
                </Text>
              </View>
            </View>
            <View style={styles.carbonInfo}>
              <Text style={styles.carbonLabel}>Score Carbone</Text>
              <Text style={styles.carbonHint}>
                {(dashboard?.score_carbone_moyen || 0) >= 7 
                  ? 'Eligible aux primes' 
                  : 'Ameliorez vos pratiques'}
              </Text>
              <View style={styles.carbonBarBg}>
                <View style={[styles.carbonBarFill, { 
                  width: `${Math.min((dashboard?.score_carbone_moyen || 0) * 10, 100)}%`,
                  backgroundColor: (dashboard?.score_carbone_moyen || 0) >= 7 ? '#22c55e' 
                    : (dashboard?.score_carbone_moyen || 0) >= 5 ? '#f59e0b' : '#ef4444'
                }]} />
              </View>
            </View>
            <View style={styles.carbonArrow}>
              <Text style={{ color: '#94a3b8', fontSize: 18 }}>{'>'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Score REDD+ */}
        <TouchableOpacity 
          style={styles.reddScore}
          onPress={() => navigation.navigate('USSDCarbon')}
          activeOpacity={0.85}
        >
          <View style={styles.reddScoreRow}>
            <View style={styles.reddIcon}>
              <Text style={{ fontSize: 20 }}>{'🌿'}</Text>
            </View>
            <View style={styles.reddInfo}>
              <Text style={styles.reddLabel}>Score REDD+</Text>
              <Text style={styles.reddHint}>
                21 pratiques evaluees - Programme Tai / BMC
              </Text>
            </View>
            <View style={styles.reddBadge}>
              <Text style={styles.reddBadgeText}>Nouveau</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats rapides */}
      <View style={styles.statsContainer}>
        <InfoCard
          title="Parcelles"
          value={dashboard?.total_parcelles || 0}
          icon="🌳"
          color={COLORS.primary}
        />
        <InfoCard
          title="Surface totale"
          value={dashboard?.superficie_totale || 0}
          unit="ha"
          icon="📐"
          color={COLORS.success}
        />
        <InfoCard
          title="Prime estimée"
          value={(dashboard?.prime_carbone || 0).toLocaleString()}
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
          subtitle={`${dashboard?.total_parcelles || 0} parcelle(s) déclarée(s)`}
          icon="🌳"
          onPress={() => navigation.navigate('Parcels')}
        />
        
        <MenuItem
          number="2"
          title="Mes Récoltes"
          subtitle="Suivez vos déclarations"
          icon="📋"
          onPress={() => navigation.navigate('MyHarvests')}
        />
        
        <MenuItem
          number="3"
          title="Déclarer une Récolte"
          subtitle="Enregistrez votre production"
          iconImage="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=64&h=64&fit=crop"
          onPress={() => navigation.navigate('Harvest')}
        />
        
        <MenuItem
          number="4"
          title="Marketplace Intrants"
          subtitle="Achetez intrants & équipements"
          icon="🛒"
          onPress={() => navigation.navigate('Marketplace')}
          highlight={true}
        />
        
        <MenuItem
          number="5"
          title="Mon Score Carbone"
          subtitle={`Score: ${dashboard?.score_carbone_moyen?.toFixed(1) || '0'}/10`}
          icon="🌱"
          onPress={() => navigation.navigate('MyCarbonScore')}
        />
        
        <MenuItem
          number="5b"
          title="Pratiques REDD+"
          subtitle="Guide des 21 pratiques eligibles"
          icon="🌿"
          onPress={() => navigation.navigate('USSDFullSimulator')}
          highlight={true}
        />
        
        <MenuItem
          number="6"
          title="Mes Commandes"
          subtitle="Suivez vos achats"
          icon="📦"
          onPress={() => navigation.navigate('Orders')}
        />
        
        <MenuItem
          number="7"
          title="Mes Paiements"
          subtitle="Primes et historique"
          icon="💳"
          onPress={() => navigation.navigate('Payments')}
        />
        
        <MenuItem
          number="8"
          title="Notifications"
          subtitle={`${dashboard?.unread_notifications || 0} non lue(s)`}
          icon="🔔"
          onPress={() => navigation.navigate('Notifications')}
        />
        
        <MenuItem
          number="9"
          title="*144*99# Prime Carbone"
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
  },
  carbonScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carbonGaugeMini: {
    marginRight: SPACING.md,
  },
  carbonGaugeRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  carbonGaugeNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  carbonInfo: {
    flex: 1,
  },
  carbonLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  carbonHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginBottom: SPACING.xs,
  },
  carbonBarBg: {
    height: 6,
    backgroundColor: COLORS.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  carbonBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  carbonArrow: {
    marginLeft: SPACING.sm,
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
  // REDD+ Score Card
  reddScore: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  reddScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reddIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  reddInfo: {
    flex: 1,
  },
  reddLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: '#064e3b',
    marginBottom: 2,
  },
  reddHint: {
    fontSize: FONTS.sizes.xs,
    color: '#6b7280',
  },
  reddBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reddBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default HomeScreen;
