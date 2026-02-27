import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { marketplaceApi } from '../../services/marketplace';
import { COLORS, FONTS, SPACING, CONFIG } from '../../config';

const WishlistScreen = ({ navigation }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await marketplaceApi.getWishlist();
      setWishlist(response.data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWishlist();
  };

  const removeFromWishlist = async (productId) => {
    try {
      await marketplaceApi.removeFromWishlist(productId);
      setWishlist(prev => prev.filter(item => item.product_id !== productId));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer des favoris');
    }
  };

  const addToCart = async (item) => {
    try {
      await marketplaceApi.addToCart(item.product_id, 1);
      Alert.alert('Succès', `${item.product_name} ajouté au panier`, [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Voir panier', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter au panier');
    }
  };

  const renderWishlistItem = ({ item }) => (
    <View style={styles.wishlistItem} data-testid={`wishlist-item-${item.product_id}`}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <View style={styles.itemImageContainer}>
          {item.product_image ? (
            <Image
              source={{ uri: `${CONFIG.API_URL}${item.product_image}` }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>📦</Text>
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
          <Text style={styles.itemSupplier}>{item.supplier_name}</Text>
          <Text style={styles.itemPrice}>
            {item.price?.toLocaleString()} F/{item.unit}
          </Text>
          {item.stock_quantity > 0 ? (
            <Text style={styles.inStock}>En stock</Text>
          ) : (
            <Text style={styles.outOfStock}>Rupture de stock</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromWishlist(item.product_id)}
        >
          <Text style={styles.removeButtonText}>❌</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            item.stock_quantity === 0 && styles.addToCartButtonDisabled,
          ]}
          onPress={() => addToCart(item)}
          disabled={item.stock_quantity === 0}
        >
          <Text style={styles.addToCartText}>🛒</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>❤️ Mes Favoris</Text>
        <View style={{ width: 40 }} />
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={styles.emptyText}>Aucun favori</Text>
          <Text style={styles.emptySubtext}>
            Ajoutez des produits à vos favoris pour les retrouver facilement
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.shopButtonText}>Parcourir les produits</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item.product_id}
          contentContainerStyle={styles.wishlistList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: SPACING.xs,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
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
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  shopButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  shopButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  wishlistList: {
    padding: SPACING.md,
  },
  separator: {
    height: SPACING.sm,
  },
  wishlistItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.gray[100],
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 30,
  },
  itemDetails: {
    flex: 1,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  itemSupplier: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  inStock: {
    fontSize: FONTS.sizes.xs,
    color: '#22c55e',
    fontWeight: '600',
  },
  outOfStock: {
    fontSize: FONTS.sizes.xs,
    color: '#ef4444',
    fontWeight: '600',
  },
  itemActions: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 16,
  },
  addToCartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: COLORS.gray[200],
  },
  addToCartText: {
    fontSize: 16,
  },
});

export default WishlistScreen;
