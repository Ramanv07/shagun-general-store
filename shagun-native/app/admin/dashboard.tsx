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
import { CATEGORIES } from '../../constants';

type Tab = 'orders' | 'products' | 'users';

const ADMIN_CATEGORIES = CATEGORIES.filter(c => c !== 'All');

const emptyProduct = {
  name: '', price: '', mrp: '', category: 'General Use', stock: '', description: '', image: '', images: [] as string[],
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

  // ── Image Picker (Supports multiple images up to 4) ──
  const pickImages = async () => {
    const currentImages = form.images || (form.image ? [form.image] : []);
    const remainingSlots = 4 - currentImages.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can upload up to 4 images per product.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      try {
        const uploadedUrls: string[] = [];
        for (const asset of result.assets) {
          if (asset.base64) {
            const base64Img = `data:image/jpeg;base64,${asset.base64}`;
            const url = await api.uploadImage(base64Img);
            uploadedUrls.push(url);
          } else if (asset.uri) {
            uploadedUrls.push(asset.uri);
          }
        }
        setForm(prev => {
          const prevImgs = prev.images || (prev.image ? [prev.image] : []);
          const combined = [...prevImgs, ...uploadedUrls].slice(0, 4);
          return {
            ...prev,
            images: combined,
            image: combined[0] || '',
          };
        });
      } catch (e: any) {
        Alert.alert('Upload Failed', e.message || 'Failed to upload images');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setForm(prev => {
      const prevImgs = prev.images || (prev.image ? [prev.image] : []);
      const updated = prevImgs.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updated,
        image: updated[0] || '',
      };
    });
  };

  // ── Save product ──
  const handleSaveProduct = async () => {
    const primaryImg = (form.images && form.images[0]) || form.image;
    if (!form.name || !form.price || !form.stock || !form.description || !primaryImg) {
      Alert.alert('Missing Fields', 'Please fill all required fields and upload at least one image.');
      return;
    }
    setSaving(true);
    try {
      const allImages = form.images && form.images.length > 0 ? form.images : [primaryImg];
      const newProduct = await api.saveProduct({
        name: form.name.trim(),
        price: Number(form.price),
        mrp: form.mrp ? Number(form.mrp) : undefined,
        category: form.category,
        stock: Number(form.stock),
        description: form.description.trim(),
        image: primaryImg,
        images: allImages,
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
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Admin Dashboard</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
        {[
          { label: 'Orders', value: orders.filter(o => !o.isTestOrder).length, icon: 'receipt', color: '#f59e0b' },
          { label: 'Products', value: products.length, icon: 'cube', color: '#3b82f6' },
          { label: 'Users', value: users.length, icon: 'people', color: '#10b981' },
          { label: 'Revenue', value: `₹${orders.filter(o => !o.isTestOrder).reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}`, icon: 'cash', color: '#8b5cf6' },
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
                {order.isTestOrder && (
                  <Text style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginVertical: 2 }}>
                    TEST ORDER
                  </Text>
                )}
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
            {/* Image Picker & Multi-Image Gallery */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>Product Images * ({form.images?.length || 0}/4)</Text>
                {(form.images?.length || 0) < 4 && (
                  <TouchableOpacity
                    onPress={pickImages}
                    disabled={uploading}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add-circle" size={18} color="#7c1f3e" />
                    <Text style={{ fontSize: 13, color: '#7c1f3e', fontWeight: '700' }}>Add Images</Text>
                  </TouchableOpacity>
                )}
              </View>

              {form.images && form.images.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {/* Primary Cover Image Preview */}
                  <View style={styles.primaryCoverBox}>
                    <Image source={{ uri: form.images[0] }} style={styles.primaryCoverImg} resizeMode="contain" />
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary Cover</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => removeImage(0)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Thumbnail Strip */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    {form.images.map((imgUrl, idx) => (
                      <View key={`${imgUrl.slice(-10)}_${idx}`} style={styles.thumbWrapper}>
                        <Image source={{ uri: imgUrl }} style={styles.thumbImg} resizeMode="cover" />
                        <TouchableOpacity
                          style={styles.removeThumbBtn}
                          onPress={() => removeImage(idx)}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                        {idx === 0 && (
                          <View style={styles.thumbCoverTag}>
                            <Text style={styles.thumbCoverText}>Cover</Text>
                          </View>
                        )}
                      </View>
                    ))}
                    {form.images.length < 4 && (
                      <TouchableOpacity
                        style={styles.addMoreThumbBtn}
                        onPress={pickImages}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <ActivityIndicator size="small" color="#7c1f3e" />
                        ) : (
                          <>
                            <Ionicons name="camera-outline" size={22} color="#7c1f3e" />
                            <Text style={{ fontSize: 11, color: '#7c1f3e', fontWeight: '600' }}>+ Add</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePicker} onPress={pickImages} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color="#d4a853" size="large" />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera-outline" size={40} color="#9c7a8a" />
                      <Text style={styles.imagePickerText}>Tap to upload images (up to 4)</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

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
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>MRP (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 199"
                  keyboardType="numeric"
                  value={form.mrp}
                  onChangeText={v => setForm(p => ({ ...p, mrp: v }))}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Offer Price *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 149"
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>Category: <Text style={{ color: '#7c1f3e', fontWeight: '800' }}>{form.category}</Text></Text>
                <Text style={{ fontSize: 11, color: '#9c7a8a' }}>({ADMIN_CATEGORIES.length} categories)</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {ADMIN_CATEGORIES.map(cat => (
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#7c1f3e',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
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
  primaryCoverBox: {
    height: 200, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#e8d5c4', overflow: 'hidden', position: 'relative',
    justifyContent: 'center', alignItems: 'center',
  },
  primaryCoverImg: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute', top: 10, left: 10, backgroundColor: '#7c1f3e',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  primaryBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  removeImageBtn: {
    position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.65)',
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  thumbWrapper: {
    position: 'relative', width: 68, height: 68, borderRadius: 8,
    overflow: 'hidden', borderWidth: 1.5, borderColor: '#e8d5c4',
    backgroundColor: '#fff',
  },
  thumbImg: { width: '100%', height: '100%' },
  removeThumbBtn: {
    position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.65)',
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  thumbCoverTag: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(124, 31, 62, 0.9)', alignItems: 'center', paddingVertical: 1,
  },
  thumbCoverText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
  addMoreThumbBtn: {
    width: 68, height: 68, borderRadius: 8, borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: '#7c1f3e', backgroundColor: '#fdf2f4',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
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
