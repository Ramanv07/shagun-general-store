import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, TextInput, Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Order, OrderStatus, Product } from '../../types';

type Tab = 'orders' | 'products' | 'users';

const CATEGORIES = ['General Use', 'Skin Care', 'Personal Care', 'Bangle', 'Toy', 'Bridal Lehenga'];

const emptyProduct = {
  name: '', price: '', category: 'General Use', stock: '', description: '', image: '',
};

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Product form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // ── Image Picker ──
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const url = await api.uploadImage(base64Img);
        setForm(prev => ({ ...prev, image: url }));
      } catch (e: any) {
        Alert.alert('Upload Failed', e.message);
      } finally {
        setUploading(false);
      }
    }
  };

  // ── Save product ──
  const handleSaveProduct = async () => {
    if (!form.name || !form.price || !form.stock || !form.description || !form.image) {
      Alert.alert('Missing Fields', 'Please fill all fields and upload an image.');
      return;
    }
    setSaving(true);
    try {
      const newProduct = await api.saveProduct({
        name: form.name,
        price: Number(form.price),
        category: form.category,
        stock: Number(form.stock),
        description: form.description,
        image: form.image,
      });
      setProducts(prev => [newProduct, ...prev]);
      setForm(emptyProduct);
      setShowForm(false);
      Alert.alert('✅ Product Added', `"${newProduct.name}" has been added successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
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

      {/* Add Product Button (only on Products tab) */}
      {tab === 'products' && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add New Product</Text>
        </TouchableOpacity>
      )}

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
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.productThumb} />
                  ) : null}
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

      {/* ── Add Product Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Product</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); setForm(emptyProduct); }}>
              <Ionicons name="close" size={26} color="#7c1f3e" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {/* Image Picker */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color="#d4a853" size="large" />
              ) : form.image ? (
                <Image source={{ uri: form.image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="camera-outline" size={40} color="#9c7a8a" />
                  <Text style={styles.imagePickerText}>Tap to upload image</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))}
              />
            </View>

            {/* Price & Stock */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Price (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={form.price}
                  onChangeText={v => setForm(p => ({ ...p, price: v }))}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Stock *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={form.stock}
                  onChangeText={v => setForm(p => ({ ...p, stock: v }))}
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, form.category === cat && styles.catPillActive]}
                    onPress={() => setForm(p => ({ ...p, category: cat }))}
                  >
                    <Text style={[styles.catPillText, form.category === cat && styles.catPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Enter product description"
                multiline
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveProduct}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Product</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#7c1f3e', marginHorizontal: 12, marginTop: 10, paddingVertical: 12, borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  listCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listCardTitle: { fontWeight: '700', color: '#1a0a12', fontSize: 14 },
  listCardSub: { color: '#9c7a8a', fontSize: 12, marginTop: 2 },
  productThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f0e6de' },
  statusPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#d4b5a0',
  },
  statusPillActive: { backgroundColor: '#7c1f3e', borderColor: '#7c1f3e' },
  statusPillText: { fontSize: 11, fontWeight: '600', color: '#9c7a8a' },
  statusPillTextActive: { color: '#f5ede8' },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#f5ede8' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e8d5c4',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#7c1f3e' },
  imagePicker: {
    height: 180, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2,
    borderColor: '#e8d5c4', borderStyle: 'dashed', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  imagePreview: { width: '100%', height: '100%', borderRadius: 10 },
  imagePickerPlaceholder: { alignItems: 'center', gap: 8 },
  imagePickerText: { color: '#9c7a8a', fontSize: 13, fontWeight: '500' },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#7c1f3e', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e8d5c4', fontSize: 14, color: '#1a0a12',
  },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#d4b5a0', backgroundColor: '#fff',
  },
  catPillActive: { backgroundColor: '#7c1f3e', borderColor: '#7c1f3e' },
  catPillText: { fontSize: 12, fontWeight: '600', color: '#9c7a8a' },
  catPillTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#7c1f3e', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8, marginBottom: 30,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
