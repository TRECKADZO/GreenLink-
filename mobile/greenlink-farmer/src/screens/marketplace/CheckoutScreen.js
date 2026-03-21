import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { marketplaceApi } from '../../services/marketplace';
import { COLORS, FONTS, SPACING, CONFIG } from '../../config';

const CheckoutScreen = ({ route, navigation }) => {
  const { items, total, deliveryFees: initialFees, totalWithDelivery: initialTotal } = route.params;
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [selectedZone, setSelectedZone] = useState('national');
  const [deliveryFees, setDeliveryFees] = useState(initialFees || { supplier_fees: [], total_delivery: 0 });
  const [loadingFees, setLoadingFees] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
  });

  const zones = [
    { id: 'meme_ville', name: 'Même ville', desc: 'Livraison locale' },
    { id: 'meme_region', name: 'Même région', desc: 'Région voisine' },
    { id: 'national', name: 'National', desc: 'Autre région' },
  ];

  const fetchDeliveryFees = async (zone) => {
    setLoadingFees(true);
    try {
      const response = await marketplaceApi.getDeliveryFees(zone);
      if (response.data) {
        setDeliveryFees(response.data);
      }
    } catch (error) {
      console.error('Error fetching delivery fees:', error);
    } finally {
      setLoadingFees(false);
    }
  };

  const handleZoneChange = (zone) => {
    setSelectedZone(zone);
    fetchDeliveryFees(zone);
  };

  const currentTotal = total + (deliveryFees?.total_delivery || 0);

  const paymentMethods = [
    { id: 'orange_money', name: 'Orange Money', icon: '📱', color: '#ff6600' },
    { id: 'mtn_money', name: 'MTN Money', icon: '📱', color: '#ffcc00' },
    { id: 'cash_delivery', name: 'Cash à la livraison', icon: '💵', color: '#22c55e' },
  ];

  const handleCheckout = async () => {
    // Validation
    if (!deliveryAddress.name || !deliveryAddress.phone || !deliveryAddress.address || !deliveryAddress.city) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const response = await marketplaceApi.checkout({
        payment_method: paymentMethod,
        delivery_address: `${deliveryAddress.address}, ${deliveryAddress.city}`,
        delivery_phone: deliveryAddress.phone,
        delivery_city: deliveryAddress.city,
        delivery_zone: selectedZone,
        notes: deliveryAddress.notes || '',
      });

      if (response.data?.success || response.data?.order_id) {
        Alert.alert(
          'Commande confirmée! 🎉',
          `Votre commande #${response.data.order_id || 'N/A'} a été passée avec succès.\n\nVous recevrez un SMS de confirmation.`,
          [
            {
              text: 'Voir mes commandes',
              onPress: () => navigation.navigate('Orders'),
            },
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de finaliser la commande'
      );
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Finaliser la commande</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.summaryCard}>
            {items.map((item) => {
              const imageUri = item.product_image
                ? (item.product_image.startsWith('http') ? item.product_image : `${CONFIG.API_URL}${item.product_image}`)
                : null;
              return (
                <View key={item.product_id} style={styles.summaryItemRow}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.summaryItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.summaryItemImagePlaceholder}>
                      <Text style={{ fontSize: 16 }}>📦</Text>
                    </View>
                  )}
                  <View style={styles.summaryItemInfo}>
                    <Text style={styles.summaryItemName} numberOfLines={2}>
                      {item.quantity}x {item.product_name}
                    </Text>
                    {item.supplier_name ? (
                      <Text style={styles.summaryItemSupplier} numberOfLines={1}>{item.supplier_name}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.summaryItemPrice}>
                    {(item.price * item.quantity).toLocaleString()} F
                  </Text>
                </View>
              );
            })}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemName}>Sous-total</Text>
              <Text style={styles.summaryItemPrice}>{total.toLocaleString()} F</Text>
            </View>
            {deliveryFees?.supplier_fees?.length > 0 ? (
              deliveryFees.supplier_fees.map((sf, idx) => (
                <View key={idx} style={styles.summaryItem}>
                  <Text style={styles.summaryItemName} numberOfLines={1}>
                    Livraison{sf.supplier_name ? ` (${sf.supplier_name})` : ''}
                  </Text>
                  <Text style={[styles.summaryItemPrice, sf.livraison?.gratuit && { color: '#22c55e' }]}>
                    {sf.livraison?.gratuit ? 'Gratuit' :
                      sf.livraison?.total > 0 ? `${sf.livraison.total.toLocaleString()} F` : 'Gratuit'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemName}>Livraison</Text>
                <Text style={[styles.summaryItemPrice, { color: '#22c55e' }]}>
                  {loadingFees ? 'Calcul...' : 'Gratuite'}
                </Text>
              </View>
            )}
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>
                {currentTotal.toLocaleString()} XOF
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                value={deliveryAddress.name}
                onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, name: text })}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone *</Text>
              <TextInput
                style={styles.input}
                placeholder="+225 07 00 00 00 00"
                value={deliveryAddress.phone}
                onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresse *</Text>
              <TextInput
                style={styles.input}
                placeholder="Rue, quartier..."
                value={deliveryAddress.address}
                onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, address: text })}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ville *</Text>
              <TextInput
                style={styles.input}
                placeholder="Abidjan, Bouaké..."
                value={deliveryAddress.city}
                onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, city: text })}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instructions (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Instructions pour le livreur..."
                value={deliveryAddress.notes}
                onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, notes: text })}
                multiline
                numberOfLines={2}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>
          </View>
        </View>

        {/* Zone de livraison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zone de livraison</Text>
          <View style={styles.paymentOptions}>
            {zones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.paymentOption,
                  selectedZone === zone.id && styles.paymentOptionActive,
                  selectedZone === zone.id && { borderColor: '#3b82f6' },
                ]}
                onPress={() => handleZoneChange(zone.id)}
              >
                <Text style={styles.paymentName}>{zone.name}</Text>
                <Text style={{ fontSize: 11, color: COLORS.gray[500] }}>{zone.desc}</Text>
                {selectedZone === zone.id && (
                  <Text style={[styles.checkmark, { color: '#3b82f6' }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
          <View style={styles.paymentOptions}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.id && styles.paymentOptionActive,
                  paymentMethod === method.id && { borderColor: method.color },
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <Text
                  style={[
                    styles.paymentName,
                    paymentMethod === method.id && { color: method.color },
                  ]}
                >
                  {method.name}
                </Text>
                {paymentMethod === method.id && (
                  <Text style={[styles.checkmark, { color: method.color }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Vous recevrez un SMS avec les détails de paiement après confirmation de la commande.
          </Text>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.bottomBar}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total à payer</Text>
          <Text style={styles.totalValue}>{currentTotal.toLocaleString()} XOF</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
          data-testid="confirm-order-button"
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.checkoutButtonText}>Confirmer la commande</Text>
          )}
        </TouchableOpacity>
      </View>
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
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: SPACING.sm,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  summaryItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  summaryItemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryItemInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  summaryItemSupplier: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING.xs,
  },
  summaryItemName: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
  },
  summaryItemPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginLeft: SPACING.sm,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  summaryTotalLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  summaryTotalValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  paymentOptions: {
    gap: SPACING.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    marginBottom: SPACING.xs,
  },
  paymentOptionActive: {
    borderWidth: 2,
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  paymentName: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: SPACING.md,
    margin: SPACING.md,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    lineHeight: 20,
  },
  bottomBar: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  totalLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
  },
  totalValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default CheckoutScreen;
