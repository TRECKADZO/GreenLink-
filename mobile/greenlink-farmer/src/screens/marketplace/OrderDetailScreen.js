import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: '#f59e0b', icon: 'time' },
  confirmed: { label: 'Confirmee', color: '#3b82f6', icon: 'checkmark-circle' },
  processing: { label: 'En preparation', color: '#6366f1', icon: 'construct' },
  shipped: { label: 'Expediee', color: '#8b5cf6', icon: 'car' },
  delivered: { label: 'Livree', color: '#059669', icon: 'checkmark-done-circle' },
  cancelled: { label: 'Annulee', color: '#ef4444', icon: 'close-circle' },
};

const OrderDetailScreen = ({ route, navigation }) => {
  const order = route.params?.order;

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Commande introuvable</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const createdDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commande #{order._id?.slice(-6)}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: status.color }]}>
          <Ionicons name={status.icon} size={28} color={status.color} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            <Text style={styles.statusDate}>{createdDate}</Text>
          </View>
        </View>

        {/* Order Number */}
        {order.order_number && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reference</Text>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({order.items?.length || 0})</Text>
          {order.items?.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemQty}>
                <Text style={styles.itemQtyText}>{item.quantity}x</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                {item.unit && <Text style={styles.itemUnit}>{item.unit}</Text>}
              </View>
              <Text style={styles.itemPrice}>{(item.total || item.unit_price * item.quantity)?.toLocaleString()} XOF</Text>
            </View>
          ))}
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recapitulatif</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Sous-total</Text>
              <Text style={styles.priceValue}>{(order.subtotal || 0).toLocaleString()} XOF</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Frais de livraison</Text>
              <Text style={styles.priceValue}>
                {order.frais_livraison > 0 ? `${order.frais_livraison.toLocaleString()} XOF` : 'Gratuit'}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{(order.total_amount || 0).toLocaleString()} XOF</Text>
            </View>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Livraison</Text>
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryRow}>
              <Ionicons name="location" size={16} color="#64748b" />
              <Text style={styles.deliveryText}>{order.delivery_address || order.delivery_city || 'Non renseigne'}</Text>
            </View>
            {order.delivery_phone && (
              <View style={styles.deliveryRow}>
                <Ionicons name="call" size={16} color="#64748b" />
                <Text style={styles.deliveryText}>{order.delivery_phone}</Text>
              </View>
            )}
            {order.payment_method && (
              <View style={styles.deliveryRow}>
                <Ionicons name="card" size={16} color="#64748b" />
                <Text style={styles.deliveryText}>
                  {order.payment_method === 'cash_delivery' ? 'Paiement a la livraison' :
                   order.payment_method === 'orange_money' ? 'Orange Money' :
                   order.payment_method === 'mobile_money' ? 'Mobile Money' : order.payment_method}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Supplier Info */}
        {order.supplier_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fournisseur</Text>
            <View style={styles.supplierCard}>
              <Ionicons name="storefront" size={20} color="#059669" />
              <Text style={styles.supplierName}>{order.supplier_name}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {order.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#065f46' },
  headerBack: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 16 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#64748b', marginBottom: 16 },
  backButton: { backgroundColor: '#065f46', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backButtonText: { color: '#fff', fontWeight: '700' },

  // Status
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, gap: 12 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  statusDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderNumber: { fontSize: 14, color: '#1e293b', fontWeight: '600', backgroundColor: '#fff', padding: 12, borderRadius: 10 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 6 },
  itemQty: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 10 },
  itemQtyText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  itemInfo: { flex: 1, marginRight: 8 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  itemUnit: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#1e293b' },

  // Prices
  priceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 13, color: '#64748b' },
  priceValue: { fontSize: 13, color: '#1e293b' },
  priceDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  totalValue: { fontSize: 17, fontWeight: '800', color: '#065f46' },

  // Delivery
  deliveryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliveryText: { fontSize: 13, color: '#475569' },

  // Supplier
  supplierCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  supplierName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

  // Notes
  notesText: { fontSize: 13, color: '#64748b', backgroundColor: '#fff', padding: 12, borderRadius: 10 },
});

export default OrderDetailScreen;
