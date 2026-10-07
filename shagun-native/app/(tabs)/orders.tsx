import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Order, OrderStatus } from '../../types';

const STATUS_COLOR: Record<OrderStatus, string> = {
  [OrderStatus.PROCESSING]: '#f59e0b',
  [OrderStatus.PACKED]: '#3b82f6',
  [OrderStatus.OUT_FOR_DELIVERY]: '#8b5cf6',
  [OrderStatus.DELIVERED]: '#10b981',
  [OrderStatus.CANCELLED]: '#ef4444',
};

const STATUS_ICON: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
  [OrderStatus.PROCESSING]: 'time-outline',
  [OrderStatus.PACKED]: 'cube-outline',
  [OrderStatus.OUT_FOR_DELIVERY]: 'bicycle-outline',
  [OrderStatus.DELIVERED]: 'checkmark-circle-outline',
  [OrderStatus.CANCELLED]: 'close-circle-outline',
};

function OrderCard({ order }: { order: Order }) {
  const color = STATUS_COLOR[order.status] || '#9c7a8a';
  const icon = STATUS_ICON[order.status] || 'help-circle-outline';
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{order._id.slice(-8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={12} color={color} />
          <Text style={[styles.statusText, { color }]}>{order.status}</Text>
        </View>
      </View>

      <Text style={styles.orderDate}>
        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>

      <View style={styles.divider} />

      {order.items.map((item, i) => (
        <View key={i} style={styles.orderItem}>
          <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.orderItemQty}>×{item.quantity}</Text>
          <Text style={styles.orderItemPrice}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</Text>
        </View>
      ))}

      <View style={styles.divider} />
      <View style={styles.orderFooter}>
        <Text style={styles.paymentMethod}>{order.paymentMethod || 'COD'}</Text>
        <Text style={styles.totalAmount}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const { orders, refreshOrders } = useOrders();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={72} color="#d4b5a0" />
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptySubtitle}>Login to see your order history</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userOrders = orders.filter(o =>
    o.user?._id === user?._id ||
    o.user?.email === user?.email ||
    o.user === user?._id ||
    (o as any).legacyUserId === user?._id
  )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <FlatList
      data={userOrders}
      keyExtractor={item => item._id}
      contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
      onRefresh={refreshOrders}
      refreshing={false}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={72} color="#d4b5a0" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/shop')}>
            <Text style={styles.loginBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      )}
      renderItem={({ item }) => <OrderCard order={item} />}
      style={{ backgroundColor: '#f5ede8' }}
    />
  );
}

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontWeight: '800', color: '#1a0a12', fontSize: 15 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDate: { color: '#9c7a8a', fontSize: 12, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#f0e4da', marginVertical: 10 },
  orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  orderItemName: { flex: 1, fontSize: 13, color: '#333' },
  orderItemQty: { fontSize: 13, color: '#9c7a8a', marginHorizontal: 8 },
  orderItemPrice: { fontWeight: '700', color: '#7c1f3e', fontSize: 13 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentMethod: { fontSize: 12, color: '#9c7a8a', fontWeight: '600' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#7c1f3e' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, minHeight: 400 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#7c1f3e' },
  emptySubtitle: { color: '#9c7a8a', textAlign: 'center' },
  loginBtn: { backgroundColor: '#7c1f3e', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  loginBtnText: { color: '#f5ede8', fontWeight: '700', fontSize: 15 },
});
