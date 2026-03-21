import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { marketplaceApi } from '../../services/marketplace';
import { COLORS, FONTS, SPACING, CONFIG } from '../../config';

const ProductDetailScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchReviews();
    checkWishlist();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await marketplaceApi.getProductReviews(product._id);
      setReviews(response.data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkWishlist = async () => {
    try {
      const response = await marketplaceApi.getWishlist();
      const wishlistIds = (response.data || []).map(item => item.product_id);
      setIsInWishlist(wishlistIds.includes(product._id));
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const handleAddToCart = async () => {
    try {
      await marketplaceApi.addToCart(product._id, quantity);
      Alert.alert('Succès', `${quantity} ${product.name} ajouté(s) au panier`, [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Voir panier', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter au panier');
    }
  };

  const toggleWishlist = async () => {
    try {
      if (isInWishlist) {
        await marketplaceApi.removeFromWishlist(product._id);
        setIsInWishlist(false);
      } else {
        await marketplaceApi.addToWishlist(product._id);
        setIsInWishlist(true);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire');
      return;
    }

    setSubmitting(true);
    try {
      await marketplaceApi.addProductReview(product._id, newReview);
      Alert.alert('Merci !', 'Votre avis a été ajouté');
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible d\'ajouter l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onPress = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => interactive && onPress && onPress(i)}
          disabled={!interactive}
        >
          <Text style={[styles.star, i <= rating && styles.starFilled]}>
            {i <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

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
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={toggleWishlist}
        >
          <Text style={styles.wishlistIcon}>
            {isInWishlist ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.images?.length > 0 ? (
            <Image
              source={{ uri: product.images[0].startsWith('http') ? product.images[0] : `${CONFIG.API_URL}${product.images[0]}` }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>📦</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>

          <View style={styles.ratingRow}>
            {renderStars(product.rating || 0)}
            <Text style={styles.reviewCount}>
              ({product.reviews_count || 0} avis)
            </Text>
          </View>

          <Text style={styles.price}>
            {product.price?.toLocaleString()} XOF
            <Text style={styles.unit}> / {product.unit}</Text>
          </Text>

          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fournisseur:</Text>
            <Text style={styles.infoValue}>{product.supplier_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Stock disponible:</Text>
            <Text style={styles.infoValue}>{product.stock_quantity} {product.unit}</Text>
          </View>
        </View>

        {/* Quantity Selector */}
        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Quantité:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.totalPrice}>
            Total: {(product.price * quantity).toLocaleString()} XOF
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
              Détails
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
              Avis ({reviews.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'details' ? (
            <View>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.detailText}>{product.description}</Text>
              
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Spécifications</Text>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <View key={key} style={styles.specRow}>
                      <Text style={styles.specKey}>{key}:</Text>
                      <Text style={styles.specValue}>{value}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          ) : (
            <View>
              {/* Add Review Form */}
              <View style={styles.reviewForm}>
                <Text style={styles.sectionTitle}>Laisser un avis</Text>
                <View style={styles.ratingSelector}>
                  <Text style={styles.ratingLabel}>Note:</Text>
                  {renderStars(newReview.rating, true, (rating) => 
                    setNewReview({ ...newReview, rating })
                  )}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Votre commentaire..."
                  value={newReview.comment}
                  onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={COLORS.gray[400]}
                />
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitReview}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? 'Envoi...' : 'Publier l\'avis'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <Text style={styles.emptyText}>Aucun avis pour ce produit</Text>
                  <Text style={styles.emptySubtext}>Soyez le premier à donner votre avis!</Text>
                </View>
              ) : (
                reviews.map((review) => (
                  <View key={review._id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewUser}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.avatarText}>
                            {review.user_name?.charAt(0) || 'U'}
                          </Text>
                        </View>
                        <Text style={styles.userName}>{review.user_name}</Text>
                      </View>
                      {renderStars(review.rating)}
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Add to Cart Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          data-testid="add-to-cart-button"
        >
          <Text style={styles.addToCartText}>
            🛒 Ajouter au panier - {(product.price * quantity).toLocaleString()} F
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginHorizontal: SPACING.sm,
  },
  wishlistButton: {
    padding: SPACING.xs,
  },
  wishlistIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    height: 250,
    backgroundColor: COLORS.gray[100],
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 80,
  },
  infoSection: {
    padding: SPACING.md,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  categoryText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 20,
    color: COLORS.gray[300],
  },
  starFilled: {
    color: '#fbbf24',
  },
  reviewCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginLeft: SPACING.xs,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  unit: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'normal',
    color: COLORS.gray[500],
  },
  description: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  infoValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
  },
  quantityLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  quantityValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginHorizontal: SPACING.md,
    minWidth: 30,
    textAlign: 'center',
  },
  totalPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.sm,
  },
  detailText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
  },
  specKey: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginRight: SPACING.xs,
  },
  specValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
  },
  reviewForm: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  ratingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ratingLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginRight: SPACING.sm,
  },
  reviewInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.sm,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  reviewCard: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  avatarText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  reviewComment: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginBottom: SPACING.xs,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.gray[400],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  addToCartButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default ProductDetailScreen;
