import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useOffline } from '../../context/OfflineContext';
import { Button, InfoCard, Loader, EmptyState } from '../../components/UI';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const ParcelsScreen = ({ navigation }) => {
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Rafraîchir automatiquement quand l'écran revient au focus
  useFocusEffect(
    useCallback(() => {
      loadParcels();
    }, [])
  );

  const loadParcels = async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('parcels');
        if (cached) {
          setParcels(cached);
          setLoading(false);
          return;
        }
      }

      const response = await farmerApi.getParcels();
      setParcels(response.data);
      await cacheData('parcels', response.data);
    } catch (error) {
      console.error('Error loading parcels:', error);
      const cached = await getCachedData('parcels');
      if (cached) setParcels(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadParcels();
  };

  if (loading) {
    return <Loader message="Chargement des parcelles..." />;
  }

  const totalArea = parcels.reduce((sum, p) => sum + (p.area_hectares || p.size || 0), 0);
  const avgScore = parcels.length > 0 
    ? (parcels.reduce((sum, p) => sum + (p.carbon_score || 0), 0) / parcels.length).toFixed(1)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mes Parcelles</Text>
        <Text style={styles.subtitle}>
          {parcels.length} parcelle(s) • {totalArea} ha
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{parcels.length}</Text>
          <Text style={styles.statLabel}>Parcelles</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalArea}</Text>
          <Text style={styles.statLabel}>Hectares</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgScore}</Text>
          <Text style={styles.statLabel}>Score moyen</Text>
        </View>
      </View>

      {/* Liste */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {parcels.length === 0 ? (
          <EmptyState 
            message="Aucune parcelle déclarée. Ajoutez votre première parcelle !" 
            icon="🌱"
          />
        ) : (
          parcels.map((parcel, index) => (
            <TouchableOpacity 
              key={parcel._id || index}
              style={styles.parcelCard}
              onPress={() => Alert.alert(
                parcel.location || 'Parcelle',
                `Surface: ${parcel.area_hectares || parcel.size || 0} ha\nType: ${parcel.crop_type || 'Non défini'}\nScore: ${parcel.carbon_score || 0}/10`
              )}
            >
              <View style={styles.parcelIcon}>
                <Text style={styles.parcelEmoji}>🌳</Text>
              </View>
              <View style={styles.parcelInfo}>
                <Text style={styles.parcelLocation}>{parcel.location || 'Parcelle'}</Text>
                <Text style={styles.parcelDetails}>
                  {parcel.area_hectares || parcel.size || 0} ha • {parcel.crop_type || 'Culture mixte'}
                </Text>
              </View>
              <View style={[
                styles.scoreContainer,
                { backgroundColor: (parcel.carbon_score || 0) >= 7 ? COLORS.success : COLORS.warning }
              ]}>
                <Text style={styles.scoreText}>{parcel.carbon_score || 0}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Bouton ajouter */}
      <View style={styles.footer}>
        <Button
          title="+ Ajouter une parcelle"
          onPress={() => navigation.navigate('AddParcel')}
        />
      </View>
    </View>
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
  },
  backButton: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.md,
    borderRadius: 12,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: SPACING.xs,
  },
  listContainer: {
    flex: 1,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  parcelCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  parcelIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  parcelEmoji: {
    fontSize: 24,
  },
  parcelInfo: {
    flex: 1,
  },
  parcelLocation: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  parcelDetails: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  scoreContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: FONTS.sizes.md,
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
});

export default ParcelsScreen;
