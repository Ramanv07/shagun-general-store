import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { Product } from '../../types';
import { CATEGORIES } from '../../constants';
import ProductCard from '../../components/ProductCard';

export default function ShopScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'All');
  const [search, setSearch] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, []);

  const filtered = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9c7a8a"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
          >
            <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      {loading ? (
        <ActivityIndicator color="#d4a853" size="large" style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 12 }}
          contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
          renderItem={({ item }) => <ProductCard product={item} style={{ flex: 1 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  searchContainer: { padding: 12, backgroundColor: '#fff' },
  searchInput: {
    backgroundColor: '#f5ede8', borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 14, color: '#1a0a12',
    borderWidth: 1, borderColor: '#e8d5c4',
  },
  categoryScroll: { paddingVertical: 10, backgroundColor: '#fff', maxHeight: 52 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f5ede8', borderWidth: 1, borderColor: '#d4b5a0',
  },
  catChipActive: { backgroundColor: '#7c1f3e', borderColor: '#7c1f3e' },
  catChipText: { fontSize: 12, color: '#7c1f3e', fontWeight: '600' },
  catChipTextActive: { color: '#f5ede8' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9c7a8a', fontSize: 16 },
});
