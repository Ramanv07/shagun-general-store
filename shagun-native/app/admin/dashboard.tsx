import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Order, OrderStatus, Product } from '../../types';

type Tab = 'orders' | 'products' | 'users';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { router.replace('/'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [o, p, u] = await Promise.all([api.getOrders(), api.getProducts(), api.getUsers()]);
      setOrders(o);
      setProducts(p);
      setUsers(u);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_OPTIONS = Object.values(OrderStatus);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
      Alert.alert('✅ Updated', `Order status set to ${status}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const deleteProduct = (id: string, name: string) => {
    Alert.alert('Delete Product', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await api.deleteProduct(id);
          setProducts(prev => prev.filter(p => p._id !== id));
        }
      }
    ]);
  };

  const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'orders', label: 'Orders', icon: 'receipt-outline' },
    { key: 'products', label: 'Products', icon: 'cube-outline' },
    { key: 'users', label: 'Users', icon: 'people-outline' },
  ];

  if (loading) {
    return <ActivityIndicator color="#d4a853" size="large" style={{ flex: 1, marginTop: 60 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
        {[
          { label: 'Orders', value: orders.length, icon: 'receipt', color: '#f59e0b' },
          { label: 'Products', value: products.length, icon: 'cube', color: '#3b82f6' },
          { label: 'Users', value: users.length, icon: 'people', color: '#10b981' },
          { label: 'Revenue', value: `₹${orders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}`, icon: 'cash', color: '#8b5cf6' },
        ].map(stat => (
          <View key={stat.label} style={[styles.statCard, { borderLeftColor: stat.color }]}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={18} color={tab === t.key ? '#d4a853' : '#9c7a8a'} />
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        onRefresh={loadData}
        refreshing={loading}
        data={tab === 'orders' ? orders : tab === 'products' ? products : users}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }: { item: any }) => {
          if (tab === 'orders') {
            const order = item as Order;
            return (
              <View style={styles.listCard}>
                <Text style={styles.listCardTitle}>#{order._id.slice(-8).toUpperCase()}</Text>
                <Text style={styles.listCardSub}>{order.user?.name || 'Guest'} • ₹{order.totalAmount.toLocaleString('en-IN')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 6 }}>
                  {STATUS_OPTIONS.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusPill, order.status === s && styles.statusPillActive]}
                      onPress={() => updateStatus(order._id, s)}
                    >
                      <Text style={[styles.statusPillText, order.status === s && styles.statusPillTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          }
          if (tab === 'products') {
            const product = item as Product;
            return (
              <View style={styles.listCard}>
                <View style={styles.listCardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardTitle}>{product.name}</Text>
                    <Text style={styles.listCardSub}>{product.category} • ₹{product.price.toLocaleString('en-IN')} • Stock: {product.stock}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteProduct(product._id, product.name)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
          // Users
          return (
            <View style={styles.listCard}>
              <Text style={styles.listCardTitle}>{item.name}</Text>
              <Text style={styles.listCardSub}>{item.email} • {item.role}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  statsScroll: { maxHeight: 90, paddingVertical: 12 },
  statCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, minWidth: 120,
    borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#9c7a8a', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8d5c4' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#d4a853' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#9c7a8a' },
  tabBtnTextActive: { color: '#d4a853' },
  listCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  listCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listCardTitle: { fontWeight: '700', color: '#1a0a12', fontSize: 14 },
  listCardSub: { color: '#9c7a8a', fontSize: 12, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#d4b5a0',
  },
  statusPillActive: { backgroundColor: '#7c1f3e', borderColor: '#7c1f3e' },
  statusPillText: { fontSize: 11, fontWeight: '600', color: '#9c7a8a' },
  statusPillTextActive: { color: '#f5ede8' },
});
