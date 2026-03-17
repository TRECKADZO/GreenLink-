import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { carbonApi } from '../../services/carbon';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../../config';

const standards = [
  { value: '', label: 'Tous' },
  { value: 'Verra VCS', label: 'Verra VCS' },
  { value: 'Gold Standard', label: 'Gold Standard' },
  { value: 'Plan Vivo', label: 'Plan Vivo' },
];

const CarbonMarketplaceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [purchasingId, setPurchasingId] = useState(null);

  // Access guard: Only RSE enterprises can access this screen
  useEffect(() => {
    if (user && !['entreprise_rse', 'admin'].includes(user.user_type)) {
      Alert.alert(
        'Acces restreint',
        'Le Marche Carbone est reserve aux entreprises RSE.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [user]);

  const fetchCredits = useCallback(async () => {
    try {
      const params = {};
      if (selectedStandard) params.standard = selectedStandard;
      const response = await carbonApi.getCarbonCredits(params);
      setCredits(response.data || []);
    } catch (error) {
      console.error('Error fetching carbon credits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStandard]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCredits();
  };

  const handlePurchase = async (credit) => {
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour acheter des crédits carbone');
      return;
    }

    if (user.user_type !== 'entreprise_rse') {
      Alert.alert(
        'Accès limité',
        'Seules les entreprises RSE peuvent acheter des crédits carbone.\n\nContactez-nous pour devenir partenaire RSE.'
      );
      return;
    }

    Alert.alert(
      'Confirmer l\'achat',
      `Voulez-vous acheter ${credit.quantity_tonnes_co2} tonnes de CO₂ pour ${(credit.quantity_tonnes_co2 * credit.price_per_tonne).toLocaleString()} XOF ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setPurchasingId(credit._id);
            try {
              await carbonApi.purchaseCarbonCredits({
                credit_id: credit._id,
                quantity_tonnes: credit.quantity_tonnes_co2,
                total_price: credit.quantity_tonnes_co2 * credit.price_per_tonne,
                retirement_requested: false,
              });
              
              Alert.alert(
                'Achat réussi! 🎉',
                `Vous avez acquis ${credit.quantity_tonnes_co2} tonnes de crédits carbone.\n\nVous recevrez votre certificat par email.`
              );
              
              fetchCredits();
            } catch (error) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de finaliser l\'achat');
            } finally {
              setPurchasingId(null);
            }
          },
        },
      ]
    );
  };

  const filteredCredits = credits.filter(credit =>
    credit.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    credit.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStandardColor = (standard) => {
    switch (standard) {
      case 'Verra VCS':
        return '#3b82f6';
      case 'Gold Standard':
        return '#f59e0b';
      case 'Plan Vivo':
        return '#10b981';
      default:
        return COLORS.primary;
    }
  };

  const renderCreditCard = ({ item }) => (
    <View style={styles.creditCard} data-testid={`carbon-credit-${item._id}`}>
      {/* Header with badges */}
      <View style={styles.cardHeader}>
        <View style={[styles.standardBadge, { backgroundColor: getStandardColor(item.certification_standard) + '20' }]}>
          <Text style={[styles.standardText, { color: getStandardColor(item.certification_standard) }]}>
            {item.certification_standard}
          </Text>
        </View>
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Vérifié</Text>
          </View>
        )}
      </View>

      {/* Project Info */}
      <Text style={styles.projectName}>{item.project_name}</Text>
      <Text style={styles.projectDescription} numberOfLines={2}>
        {item.description || 'Projet de séquestration carbone certifié'}
      </Text>

      {/* Details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{item.location || 'Côte d\'Ivoire'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{item.vintage_year || '2024'}</Text>
        </View>
      </View>

      {/* Carbon Stats */}
      <View style={styles.carbonStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.quantity_tonnes_co2}</Text>
          <Text style={styles.statLabel}>tonnes CO₂</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.price_per_tonne?.toLocaleString()}</Text>
          <Text style={styles.statLabel}>XOF/tonne</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.totalPrice]}>
            {(item.quantity_tonnes_co2 * item.price_per_tonne).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>XOF total</Text>
        </View>
      </View>

      {/* Impact Section */}
      <View style={styles.impactSection}>
        <Text style={styles.impactTitle}>🌱 Impact équivalent</Text>
        <View style={styles.impactRow}>
          <View style={styles.impactItem}>
            <Text style={styles.impactIcon}>🌳</Text>
            <Text style={styles.impactValue}>{Math.round(item.quantity_tonnes_co2 * 50)}</Text>
            <Text style={styles.impactLabel}>arbres plantés</Text>
          </View>
          <View style={styles.impactItem}>
            <Text style={styles.impactIcon}>🚗</Text>
            <Text style={styles.impactValue}>{Math.round(item.quantity_tonnes_co2 * 4000)}</Text>
            <Text style={styles.impactLabel}>km en voiture</Text>
          </View>
        </View>
      </View>

      {/* Purchase Button */}
      <TouchableOpacity
        style={[
          styles.purchaseButton,
          purchasingId === item._id && styles.purchaseButtonDisabled,
        ]}
        onPress={() => handlePurchase(item)}
        disabled={purchasingId === item._id}
      >
        {purchasingId === item._id ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Text style={styles.purchaseButtonText}>
            🛒 Acheter ces crédits
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🌱 Crédits Carbone</Text>
          <Text style={styles.headerSubtitle}>Marketplace RSE</Text>
        </View>
        <TouchableOpacity
          style={styles.myPurchasesButton}
          onPress={() => navigation.navigate('MyCarbonPurchases')}
        >
          <Text style={styles.myPurchasesText}>📋</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Compensez votre empreinte carbone en soutenant des projets agricoles durables en Côte d'Ivoire
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un projet..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor={COLORS.gray[400]}
        />
      </View>

      {/* Standards Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {standards.map((standard) => (
          <TouchableOpacity
            key={standard.value}
            style={[
              styles.filterButton,
              selectedStandard === standard.value && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedStandard(standard.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedStandard === standard.value && styles.filterButtonTextActive,
              ]}
            >
              {standard.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredCredits.length} crédit(s) disponible(s)
        </Text>
      </View>

      {/* Credits List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des crédits...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCredits}
          renderItem={renderCreditCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.creditsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌍</Text>
              <Text style={styles.emptyText}>Aucun crédit carbone disponible</Text>
              <Text style={styles.emptySubtext}>
                De nouveaux projets seront bientôt disponibles
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#065f46',
  },
  backButton: {
    padding: SPACING.xs,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: '#a7f3d0',
  },
  myPurchasesButton: {
    padding: SPACING.xs,
  },
  myPurchasesText: {
    fontSize: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    padding: SPACING.md,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: '#065f46',
    lineHeight: 18,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  filtersContainer: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: SPACING.md,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginRight: SPACING.xs,
  },
  filterButtonActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46',
  },
  filterButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
  },
  filterButtonTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  resultsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  resultsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
  },
  creditsList: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  creditCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  standardBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  standardText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
    color: '#166534',
  },
  projectName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.xs,
  },
  projectDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
  },
  carbonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: '#065f46',
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  totalPrice: {
    color: '#065f46',
  },
  impactSection: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  impactTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactItem: {
    alignItems: 'center',
  },
  impactIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  impactValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  impactLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  purchaseButton: {
    backgroundColor: '#10b981',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
});

export default CarbonMarketplaceScreen;
