/**
 * HarvestMarketplaceScreen - Bourse des Récoltes Mobile
 * Marketplace pour acheteurs et vendeurs de récoltes agricoles
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { messagingApi } from '../../services/messaging';
import { COLORS } from '../../config';

const HarvestMarketplaceScreen = () => {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [showMyListings, setShowMyListings] = useState(false);

  const cropTypes = [
    { id: 'all', name: 'Tous', icon: '📦' },
    { id: 'cacao', name: 'Cacao', icon: '🍫' },
    { id: 'cafe', name: 'Café', icon: '☕' },
    { id: 'anacarde', name: 'Anacarde', icon: '🥜' },
  ];

  const loadListings = useCallback(async () => {
    try {
      const params = {};
      if (selectedCrop !== 'all') params.crop_type = selectedCrop;
      if (showMyListings && user?._id) params.seller_id = user._id;
      
      const response = await api.get('/harvest-marketplace/listings', { params });
      setListings(response.data);
    } catch (error) {
      console.error('Error loading listings:', error);
      Alert.alert('Erreur', 'Impossible de charger les annonces');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCrop, showMyListings, user]);

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const handleContactSeller = async (listing) => {
    if (!token) {
      Alert.alert('Connexion requise', 'Connectez-vous pour contacter le vendeur');
      return;
    }

    if (listing.seller_id === user?._id) {
      Alert.alert('Information', 'C\'est votre propre annonce');
      return;
    }

    try {
      // Create or get conversation
      const response = await messagingApi.createConversation(
        listing.listing_id,
        listing.seller_id,
        `Bonjour, je suis intéressé par votre ${listing.crop_type} (${listing.quantity_kg?.toLocaleString()} kg à ${listing.price_per_kg?.toLocaleString()} FCFA/kg).`
      );
      
      // Navigate to chat
      navigation.navigate('Chat', { 
        conversationId: response.data.conversation_id 
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Erreur', 'Impossible de contacter le vendeur');
    }
  };

  const handleRequestQuote = async (listing) => {
    if (!token) {
      Alert.alert('Connexion requise', 'Connectez-vous pour demander un devis');
      return;
    }

    Alert.prompt(
      'Demander un devis',
      'Ajoutez un message pour le vendeur (optionnel):',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async (message) => {
            try {
              await api.post(`/harvest-marketplace/listings/${listing.listing_id}/quote-request`, {
                message: message || `Intéressé par votre lot de ${listing.crop_type}`,
                requested_quantity_kg: listing.quantity_kg,
              });
              Alert.alert('Succès', 'Votre demande de devis a été envoyée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'envoyer la demande');
            }
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  const getCropEmoji = (cropType) => {
    const crop = cropTypes.find(c => c.id === cropType?.toLowerCase());
    return crop?.icon || '🌾';
  };

  const filteredListings = listings.filter(l =>
    l.crop_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderListing = ({ item }) => {
    const isMyListing = item.seller_id === user?._id;
    
    return (
      <TouchableOpacity
        style={styles.listingCard}
        onPress={() => navigation.navigate('ListingDetail', { listing: item })}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.listingHeader}>
          <View style={styles.cropBadge}>
            <Text style={styles.cropEmoji}>{getCropEmoji(item.crop_type)}</Text>
            <Text style={styles.cropName}>{item.crop_type}</Text>
          </View>
          {item.eudr_compliant && (
            <View style={styles.eudrBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.eudrText}>EUDR</Text>
            </View>
          )}
        </View>

        {/* Image */}
        {item.photos?.[0] && (
          <Image 
            source={{ uri: item.photos[0] }} 
            style={styles.listingImage}
            resizeMode="cover"
          />
        )}

        {/* Content */}
        <View style={styles.listingContent}>
          <Text style={styles.grade}>{item.grade || 'Standard'}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(item.price_per_kg)} FCFA/kg</Text>
            <Text style={styles.quantity}>{formatPrice(item.quantity_kg)} kg</Text>
          </View>

          {/* Certifications */}
          {item.certifications?.length > 0 && (
            <View style={styles.certifications}>
              {item.certifications.slice(0, 3).map((cert, idx) => (
                <View key={idx} style={styles.certBadge}>
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quality Metrics */}
          {item.quality_metrics && (
            <View style={styles.qualityRow}>
              {item.quality_metrics.humidity_percent && (
                <Text style={styles.qualityItem}>
                  💧 {item.quality_metrics.humidity_percent}%
                </Text>
              )}
              {item.quality_metrics.bean_count && (
                <Text style={styles.qualityItem}>
                  🫘 {item.quality_metrics.bean_count}
                </Text>
              )}
            </View>
          )}

          {/* Seller Info */}
          <View style={styles.sellerRow}>
            <Ionicons name="business" size={14} color={COLORS.textSecondary} />
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.seller_name}
            </Text>
            <Text style={styles.location}>• {item.department}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {!isMyListing ? (
              <>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContactSeller(item)}
                >
                  <Ionicons name="chatbubble" size={16} color={COLORS.primary} />
                  <Text style={styles.contactButtonText}>Contacter</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quoteButton}
                  onPress={() => handleRequestQuote(item)}
                >
                  <Ionicons name="document-text" size={16} color={COLORS.white} />
                  <Text style={styles.quoteButtonText}>Devis</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.myListingBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                <Text style={styles.myListingText}>Mon annonce</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Aucune annonce</Text>
      <Text style={styles.emptySubtitle}>
        {showMyListings 
          ? 'Vous n\'avez pas encore publié d\'annonce' 
          : 'Aucune récolte disponible pour le moment'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Bourse des Récoltes</Text>
          <Text style={styles.headerSubtitle}>{listings.length} annonces actives</Text>
        </View>
        <TouchableOpacity 
          style={styles.messagesButton}
          onPress={() => navigation.navigate('Messaging')}
        >
          <Ionicons name="chatbubbles" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher produit, vendeur..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Crop Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {cropTypes.map((crop) => (
          <TouchableOpacity
            key={crop.id}
            style={[
              styles.filterChip,
              selectedCrop === crop.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCrop(crop.id)}
          >
            <Text style={styles.filterIcon}>{crop.icon}</Text>
            <Text
              style={[
                styles.filterText,
                selectedCrop === crop.id && styles.filterTextActive,
              ]}
            >
              {crop.name}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* My Listings Toggle */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            styles.myListingsChip,
            showMyListings && styles.filterChipActive,
          ]}
          onPress={() => setShowMyListings(!showMyListings)}
        >
          <Ionicons 
            name={showMyListings ? 'person' : 'person-outline'} 
            size={16} 
            color={showMyListings ? COLORS.white : COLORS.primary} 
          />
          <Text
            style={[
              styles.filterText,
              showMyListings && styles.filterTextActive,
            ]}
          >
            Mes annonces
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderListing}
          keyExtractor={(item) => item.listing_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  messagesButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    backgroundColor: COLORS.surface,
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  myListingsChip: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  filterIcon: {
    fontSize: 16,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cropEmoji: {
    fontSize: 20,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  eudrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  eudrText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  listingImage: {
    width: '100%',
    height: 150,
  },
  listingContent: {
    padding: 12,
  },
  grade: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  quantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  certifications: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  certBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  certText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  qualityItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  sellerName: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  location: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  quoteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  quoteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  myListingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 10,
    gap: 6,
  },
  myListingText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default HarvestMarketplaceScreen;
