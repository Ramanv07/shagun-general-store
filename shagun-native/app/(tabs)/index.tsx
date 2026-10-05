import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Image, StyleSheet, Dimensions, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Product } from '../../types';
import { ADMIN_WHATSAPP, CATEGORIES } from '../../constants';
import ProductCard from '../../components/ProductCard';

const { width } = Dimensions.get('window');

const HERO_BANNERS = [
  { id: '1', title: 'Fresh Arrivals', subtitle: 'Curated picks just for you', bg: '#7c1f3e' },
  { id: '2', title: 'Bridal Lehenga', subtitle: 'Book a trial via WhatsApp', bg: '#4a0f22' },
  { id: '3', title: 'Beauty Parlor', subtitle: 'Appointments available', bg: '#2d1a3e' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const bestsellers = products.filter(p => p.isBestseller);

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${ADMIN_WHATSAPP}?text=Hello%20Shagun%20Store!`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Hero Banner ── */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.heroBannerScroll}
      >
        {HERO_BANNERS.map(banner => (
          <View key={banner.id} style={[styles.heroBanner, { backgroundColor: banner.bg, width }]}>
            <Text style={styles.heroTitle}>{banner.title}</Text>
            <Text style={styles.heroSubtitle}>{banner.subtitle}</Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/shop')}>
              <Text style={styles.heroBtnText}>Shop Now →</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* ── Quick Actions ── */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/beauty-parlor')}>
          <Ionicons name="sparkles" size={28} color="#d4a853" />
          <Text style={styles.quickActionText}>Beauty Parlor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/bridal-lehenga')}>
          <Ionicons name="heart" size={28} color="#d4a853" />
          <Text style={styles.quickActionText}>Bridal Lehenga</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} onPress={openWhatsApp}>
          <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
          <Text style={styles.quickActionText}>WhatsApp Us</Text>
        </TouchableOpacity>
      </View>

      {/* ── Categories ── */}
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {CATEGORIES.filter(c => c !== 'All').map(cat => (
          <TouchableOpacity
            key={cat}
            style={styles.categoryChip}
            onPress={() => router.push({ pathname: '/shop', params: { category: cat } })}
          >
            <Text style={styles.categoryChipText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Bestsellers ── */}
      <Text style={styles.sectionTitle}>⭐ Bestsellers</Text>
      {loading ? (
        <ActivityIndicator color="#d4a853" size="large" style={{ marginVertical: 32 }} />
      ) : (
        <FlatList
          data={bestsellers}
          keyExtractor={item => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={{ width: width * 0.62 }}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}

      {/* ── Reviews ── */}
      <Text style={styles.sectionTitle}>💬 Customer Reviews</Text>
      <View style={styles.reviewsContainer}>
        {[
          { user: 'Rahul Sharma', rating: 5, comment: 'Amazing quality and fast delivery!' },
          { user: 'Priya Singh', rating: 4, comment: 'Loved the packaging. Very premium.' },
          { user: 'Amit Patel', rating: 5, comment: 'Best store in town. App is super smooth.' },
        ].map((r, i) => (
          <View key={i} style={styles.reviewCard}>
            <Text style={styles.reviewUser}>{r.user}</Text>
            <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
            <Text style={styles.reviewComment}>{r.comment}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  heroBannerScroll: { height: 200 },
  heroBanner: {
    height: 200, justifyContent: 'center', paddingHorizontal: 24,
  },
  heroTitle: { color: '#f5ede8', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { color: '#d4a853', fontSize: 14, marginBottom: 16 },
  heroBtn: {
    backgroundColor: '#d4a853', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24, alignSelf: 'flex-start',
  },
  heroBtnText: { color: '#1a0a12', fontWeight: '700', fontSize: 14 },
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 20, paddingHorizontal: 12, backgroundColor: '#fff',
    marginBottom: 8,
  },
  quickActionCard: { alignItems: 'center', gap: 6 },
  quickActionText: { fontSize: 11, color: '#7c1f3e', fontWeight: '600' },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#7c1f3e',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  categoryScroll: { marginBottom: 8 },
  categoryChip: {
    backgroundColor: '#7c1f3e', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginRight: 8,
  },
  categoryChipText: { color: '#f5ede8', fontSize: 12, fontWeight: '600' },
  reviewsContainer: { paddingHorizontal: 16, gap: 12 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  reviewUser: { fontWeight: '700', color: '#7c1f3e', marginBottom: 2 },
  reviewStars: { color: '#d4a853', fontSize: 14, marginBottom: 4 },
  reviewComment: { color: '#555', fontSize: 13 },
});
