import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FALLBACK_IMAGE } from '../../constants';

export default function CartScreen() {
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to proceed to checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }

    const outOfStock = cart.find(i => typeof i.stock === 'number' && i.stock <= 0);
    if (outOfStock) {
      Alert.alert('Out of Stock', `"${outOfStock.name}" is currently out of stock. Please remove it from your cart.`);
      return;
    }

    const exceeded = cart.find(i => typeof i.stock === 'number' && i.quantity > i.stock);
    if (exceeded) {
      Alert.alert('Stock Limit', `Only ${exceeded.stock} available for "${exceeded.name}". Please reduce the quantity.`);
      return;
    }

    router.push('/checkout');
  };

  if (cart.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bag-outline" size={80} color="#d4b5a0" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add items from the shop to get started</Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => router.push('/shop')}
          accessibilityRole="button"
          accessibilityLabel="Browse Shop to add products"
        >
          <Text style={styles.shopBtnText}>Browse Shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <Image
              source={{ uri: item.image || FALLBACK_IMAGE }}
              style={styles.itemImage}
              defaultSource={{ uri: FALLBACK_IMAGE }}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</Text>

              {typeof item.stock === 'number' && item.stock <= 0 ? (
                <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                  Out of Stock — remove to checkout
                </Text>
              ) : typeof item.stock === 'number' && item.quantity >= item.stock ? (
                <Text style={{ color: '#d97706', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                  Max stock reached ({item.stock} in stock)
                </Text>
              ) : null}

              {/* Quantity Control */}
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => item.quantity <= 1 ? removeFromCart(item._id) : updateQuantity(item._id, item.quantity - 1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={item.quantity <= 1 ? `Remove ${item.name} from cart` : `Decrease quantity of ${item.name}`}
                >
                  <Ionicons name={item.quantity <= 1 ? 'trash-outline' : 'remove'} size={16} color="#7c1f3e" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    typeof item.stock === 'number' && (item.stock <= 0 || item.quantity >= item.stock) && { opacity: 0.4 }
                  ]}
                  onPress={() => updateQuantity(item._id, item.quantity + 1)}
                  disabled={typeof item.stock === 'number' && (item.stock <= 0 || item.quantity >= item.stock)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase quantity of ${item.name}`}
                >
                  <Ionicons name="add" size={16} color="#7c1f3e" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={() => (
          <TouchableOpacity
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear all items from cart"
            onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearCart },
            ])}
          >
            <Text style={styles.clearBtnText}>Clear Cart</Text>
          </TouchableOpacity>
        )}
      />

      {/* Checkout Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>
            Total {totalPrice >= 399 ? '(Free Delivery)' : '(+₹30 Delivery)'}
          </Text>
          <Text style={styles.totalAmount}>
            ₹{(totalPrice + (totalPrice >= 399 ? 0 : 30)).toLocaleString('en-IN')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          accessibilityRole="button"
          accessibilityLabel="Proceed to checkout"
        >
          <Text style={styles.checkoutBtnText}>Checkout →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#7c1f3e' },
  emptySubtitle: { color: '#9c7a8a', fontSize: 14, textAlign: 'center' },
  shopBtn: { backgroundColor: '#7c1f3e', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  shopBtnText: { color: '#f5ede8', fontWeight: '700', fontSize: 15 },
  cartItem: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  itemImage: { width: 100, height: 100, resizeMode: 'cover' },
  itemInfo: { flex: 1, padding: 12, gap: 3 },
  itemName: { fontWeight: '700', color: '#1a0a12', fontSize: 14 },
  itemCategory: { fontSize: 11, color: '#9c7a8a' },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#7c1f3e' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f5ede8',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d4b5a0',
  },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#1a0a12', minWidth: 24, textAlign: 'center' },
  clearBtn: { alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  clearBtnText: { color: '#9c7a8a', fontSize: 13, textDecorationLine: 'underline' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#e8d5c4',
  },
  totalLabel: { fontSize: 12, color: '#9c7a8a' },
  totalAmount: { fontSize: 22, fontWeight: '800', color: '#7c1f3e' },
  checkoutBtn: { backgroundColor: '#d4a853', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28 },
  checkoutBtnText: { color: '#1a0a12', fontWeight: '800', fontSize: 15 },
});
