import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle,
} from 'react-native';
import { Heart, Plus, Check, Ban } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { FALLBACK_IMAGE } from '../constants';
import { THEME } from '../constants/theme';
import { api } from '../services/api';

interface Props {
  product: Product;
  style?: ViewStyle;
  horizontal?: boolean;
}

export default function ProductCard({ product, style, horizontal }: Props) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleToggleWishlist = async () => {
    const next = !isWishlisted;
    setIsWishlisted(next);
    const ok = next
      ? await api.addToWishlist(product._id)
      : await api.removeFromWishlist(product._id);
    if (!ok) {
      setIsWishlisted(!next); // rollback on failure
    }
  };

  const isOutOfStock = product.stock <= 0;

  const handleOpenDetails = () => {
    router.push({
      pathname: '/product-details' as any,
      params: {
        id: product._id,
        productJson: JSON.stringify(product),
      },
    });
  };

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const effMrp = product.mrp && product.mrp > product.price ? product.mrp : null;
  const disc = effMrp ? Math.round(((effMrp - product.price) / effMrp) * 100) : 0;

  const cardStyle = horizontal ? [styles.card, styles.cardHorizontal, style] : [styles.card, style];

  return (
    <TouchableOpacity
      style={cardStyle}
      activeOpacity={0.88}
      onPress={handleOpenDetails}
    >
      {/* Image */}
      <View style={horizontal ? styles.imageContainerHorizontal : styles.imageContainer}>
        <Image
          source={{ uri: imgError ? FALLBACK_IMAGE : (product.image || FALLBACK_IMAGE) }}
          style={styles.image}
          onError={() => setImgError(true)}
          resizeMode="cover"
        />

        {/* Heart (Phase D: Wishlist toggle with optimistic update) */}
        <TouchableOpacity
          style={styles.heartBtn}
          activeOpacity={0.7}
          onPress={handleToggleWishlist}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart
            size={16}
            color={isWishlisted ? THEME.colors.error : THEME.colors.ink500}
            fill={isWishlisted ? THEME.colors.error : 'none'}
            strokeWidth={1.5}
          />
        </TouchableOpacity>

        {/* Stock badges */}
        {isOutOfStock ? (
          <View style={[styles.stockBadge, { backgroundColor: THEME.colors.error }]}>
            <Text style={styles.stockBadgeText}>Out of Stock</Text>
          </View>
        ) : product.stock <= 5 ? (
          <View style={[styles.stockBadge, { backgroundColor: '#d97706' }]}>
            <Text style={styles.stockBadgeText}>Only {product.stock} left!</Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        {/* Rating */}
        {product.rating != null && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            {product.reviews != null && (
              <Text style={styles.reviewsText}>({product.reviews >= 1000 ? `${(product.reviews / 1000).toFixed(1)}k` : product.reviews})</Text>
            )}
          </View>
        )}

        {/* Price + Add */}
        <View style={styles.footer}>
          <View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
              {effMrp != null && (
                <Text style={styles.mrp}>₹{effMrp.toLocaleString('en-IN')}</Text>
              )}
            </View>
            {disc > 0 && (
              <View style={styles.offChip}>
                <Text style={styles.offChipText}>{disc}% OFF</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.addBtn,
              added && styles.addBtnAdded,
              isOutOfStock && styles.addBtnDisabled,
            ]}
            onPress={handleAdd}
            disabled={isOutOfStock}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
          >
            {isOutOfStock ? (
              <Ban size={18} color={THEME.colors.white} strokeWidth={1.5} />
            ) : added ? (
              <Check size={18} color={THEME.colors.white} strokeWidth={2} />
            ) : (
              <Plus size={18} color={THEME.colors.white} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadow,
  },
  cardHorizontal: {
    width: 160,
  },
  imageContainer: {
    position: 'relative',
    height: 150,
    backgroundColor: THEME.colors.blush50,
  },
  imageContainerHorizontal: {
    position: 'relative',
    height: 140,
    backgroundColor: THEME.colors.blush50,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadow,
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stockBadgeText: {
    color: THEME.colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  content: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.ink900,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingStar: {
    color: THEME.colors.gold500,
    fontSize: 12,
  },
  ratingText: {
    fontSize: 11,
    color: THEME.colors.ink500,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 10,
    color: THEME.colors.ink500,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.black,
  },
  mrp: {
    fontSize: 11,
    color: THEME.colors.ink500,
    textDecorationLine: 'line-through',
  },
  offChip: {
    backgroundColor: THEME.colors.success,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  offChipText: {
    color: THEME.colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.maroon700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnAdded: {
    backgroundColor: THEME.colors.success,
  },
  addBtnDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
});
