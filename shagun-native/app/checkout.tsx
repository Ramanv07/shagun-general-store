import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Address } from '../types';

const PAYMENT_METHODS = ['COD', 'UPI', 'Online'] as const;

export default function CheckoutScreen() {
  const { cart, totalPrice, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Login Required',
        'Please log in to your account to proceed with checkout.',
        [
          { text: 'Cancel', onPress: () => router.back(), style: 'cancel' },
          { text: 'Log In', onPress: () => router.replace('/login') }
        ]
      );
    }
  }, [isAuthenticated, user]);

  // Use first saved address as default
  const defaultAddr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0];

  const [address, setAddress] = useState<Omit<Address, '_id' | 'isDefault'>>({
    fullName: defaultAddr?.fullName || user?.name || '',
    mobile: defaultAddr?.mobile || user?.phone || '',
    houseNo: defaultAddr?.houseNo || '',
    street: defaultAddr?.street || '',
    city: defaultAddr?.city || '',
    state: defaultAddr?.state || '',
    pinCode: defaultAddr?.pinCode || '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'Online'>('COD');
  const [loading, setLoading] = useState(false);

  const updateAddr = (field: keyof typeof address, value: string) =>
    setAddress(prev => ({ ...prev, [field]: value }));

  const placeOrder = async () => {
    if (!isAuthenticated || !user || !user.token) {
      Alert.alert(
        'Login Required',
        'You must be logged in to place an order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    const { fullName, mobile, houseNo, street, city, state, pinCode } = address;
    if (!fullName || !mobile || !houseNo || !street || !city || !state || !pinCode) {
      Alert.alert('Incomplete', 'Please fill in all address fields.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Add items to your cart first.');
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

    setLoading(true);
    try {
      await addOrder({
        user: user?._id as any, // backend expects the user's ObjectId, not the full object
        items: cart.map(item => ({ product: item._id as any, name: item.name, quantity: item.quantity, price: item.price })),
        totalAmount: totalPrice + (totalPrice >= 399 ? 0 : 30),
        shippingAddress: address,
        paymentMethod,
        paymentStatus: 'Pending',
      });
      clearCart();
      Alert.alert('✅ Order Placed!', 'Your order has been confirmed.', [
        { text: 'View Orders', onPress: () => router.replace('/orders') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        {(['fullName', 'mobile', 'houseNo', 'street', 'city', 'state', 'pinCode'] as const).map(field => (
          <TextInput
            key={field}
            style={styles.input}
            placeholder={
              { fullName: 'Full Name *', mobile: 'Mobile *', houseNo: 'House / Flat No. *', street: 'Street *', city: 'City *', state: 'State *', pinCode: 'Pin Code *' }[field]
            }
            placeholderTextColor="#9c7a8a"
            value={address[field]}
            onChangeText={v => updateAddr(field, v)}
            keyboardType={field === 'mobile' || field === 'pinCode' ? 'phone-pad' : 'default'}
          />
        ))}
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method}
              style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod(method)}
            >
              <Ionicons
                name={method === 'COD' ? 'cash-outline' : method === 'UPI' ? 'phone-portrait-outline' : 'card-outline'}
                size={20}
                color={paymentMethod === method ? '#f5ede8' : '#7c1f3e'}
              />
              <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {cart.map(item => (
          <View key={item._id} style={styles.summaryRow}>
            <Text style={styles.summaryName} numberOfLines={1}>{item.name} ×{item.quantity}</Text>
            <Text style={styles.summaryPrice}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={{ fontSize: 13, color: '#666' }}>Subtotal</Text>
          <Text style={{ fontSize: 13, color: '#666' }}>₹{totalPrice.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ fontSize: 13, color: '#666' }}>Delivery</Text>
          <Text style={{ fontSize: 13, color: totalPrice >= 399 ? '#1b8a4b' : '#7c1f3e', fontWeight: '600' }}>
            {totalPrice >= 399 ? 'FREE' : '₹30'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>₹{(totalPrice + (totalPrice >= 399 ? 0 : 30)).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Place Order */}
      <TouchableOpacity style={styles.orderBtn} onPress={placeOrder} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#1a0a12" />
          : <Text style={styles.orderBtnText}>Place Order (₹{(totalPrice + (totalPrice >= 399 ? 0 : 30)).toLocaleString('en-IN')}) →</Text>
        }
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  section: {
    backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#7c1f3e', marginBottom: 14 },
  input: {
    borderWidth: 1, borderColor: '#e8d5c4', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 11, fontSize: 14, color: '#1a0a12', backgroundColor: '#f5ede8', marginBottom: 10,
  },
  paymentRow: { flexDirection: 'row', gap: 10 },
  paymentOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#7c1f3e',
  },
  paymentOptionActive: { backgroundColor: '#7c1f3e' },
  paymentOptionText: { fontWeight: '700', color: '#7c1f3e', fontSize: 13 },
  paymentOptionTextActive: { color: '#f5ede8' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryName: { flex: 1, color: '#333', fontSize: 13 },
  summaryPrice: { fontWeight: '600', color: '#7c1f3e', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#f0e4da', marginVertical: 8 },
  totalLabel: { fontWeight: '800', fontSize: 16, color: '#1a0a12' },
  totalValue: { fontWeight: '800', fontSize: 18, color: '#7c1f3e' },
  orderBtn: {
    backgroundColor: '#d4a853', marginHorizontal: 12, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  orderBtnText: { color: '#1a0a12', fontWeight: '800', fontSize: 17 },
});
