import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { FALLBACK_IMAGE } from '../constants';

interface Props {
  product: Product;
  style?: ViewStyle;
}

export default function ProductCard({ product, style }: Props) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <View style={[styles.card, style]}>
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imgError ? FALLBACK_IMAGE : (product.image || FALLBACK_IMAGE) }}
          style={styles.image}
          onError={() => setImgError(true)}
          resizeMode="cover"
        />

        {/* Badges */}
        <View style={styles.badgesLeft}>

          {product.stock <= 10 && product.stock > 0 && (
            <View style={styles.badgeMaroon}>
              <Text style={styles.badgeMaroonText}>Only {product.stock} left</Text>
            </View>
          )}
        </View>

        <View style={styles.badgeRight}>
          <Text style={styles.badgeCategoryText}>{product.category}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        {/* Rating */}
        {product.rating != null && (
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}</Text>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.reviewsText}>({product.reviews})</Text>
          </View>
        )}

        {/* Price + Add */}
        <View style={styles.footer}>
          <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
          <TouchableOpacity
            style={[styles.addBtn, added && styles.addBtnAdded]}
            onPress={handleAdd}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={added ? '#1a0a12' : '#f5ede8'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  imageContainer: { position: 'relative', height: 150 },
  image: { width: '100%', height: 150 },
  badgesLeft: { position: 'absolute', top: 8, left: 8, gap: 4 },
  badgeGold: { backgroundColor: '#d4a853', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGoldText: { color: '#1a0a12', fontSize: 9, fontWeight: '700' },
  badgeMaroon: { backgroundColor: '#7c1f3e', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeMaroonText: { color: '#f5ede8', fontSize: 9, fontWeight: '700' },
  badgeRight: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(245,237,232,0.9)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeCategoryText: { color: '#7c1f3e', fontSize: 9, fontWeight: '600' },
  content: { padding: 10, gap: 4 },
  name: { fontSize: 13, fontWeight: '700', color: '#1a0a12', lineHeight: 18 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stars: { color: '#d4a853', fontSize: 11 },
  ratingText: { fontSize: 11, color: '#555' },
  reviewsText: { fontSize: 10, color: '#9c7a8a' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price: { fontSize: 16, fontWeight: '800', color: '#7c1f3e' },
  addBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#7c1f3e',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnAdded: { backgroundColor: '#d4a853' },
});
