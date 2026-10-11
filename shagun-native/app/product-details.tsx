import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { FALLBACK_IMAGE } from '../constants';
import { THEME } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; productJson?: string }>();
  const { addToCart, cartCount } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    loadProductData();
  }, [params.id, params.productJson]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      let current: Product | null = null;

      if (params.productJson) {
        try {
          current = JSON.parse(params.productJson);
        } catch {}
      }

      const allProducts = await api.getProducts();

      if (!current && params.id) {
        current = allProducts.find(p => p._id === params.id || (p as any).id === params.id) || null;
      }

      if (current) {
        setProduct(current);
        setSelectedImgIdx(0);

        // Filter similar products from same category, excluding current
        const similar = allProducts.filter(
          p => p.category === current?.category && p._id !== current?._id
        );
        setSimilarProducts(similar.slice(0, 10));
      }
    } catch (e) {
      console.warn('Failed to load product details', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.name} on Shagun Mart for just ₹${product.price}! https://shagun-general-store.vercel.app`,
      });
    } catch {}
  };

  const handleAddToCart = () => {
    if (!product || product.stock <= 0) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product || product.stock <= 0) return;
    addToCart(product);
    router.push('/checkout');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />
        <ActivityIndicator size="large" color="#7c1f3e" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />
        <Ionicons name="alert-circle-outline" size={60} color="#7c1f3e" />
        <Text style={styles.errorTitle}>Product Not Found</Text>
        <Text style={styles.errorSubtitle}>The product you are looking for may have been removed or is unavailable.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = (product.images && product.images.length > 0)
    ? product.images
    : [product.image || FALLBACK_IMAGE];

  const effMrp = product.mrp && product.mrp > product.price ? product.mrp : Math.round(product.price * 1.25);
  const discount = Math.round(((effMrp - product.price) / effMrp) * 100);
  const isOutOfStock = product.stock <= 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle} numberOfLines={1}>
          {product.category || 'Product Details'}
        </Text>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color="#1f2937" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <Ionicons name="cart-outline" size={24} color="#1f2937" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Body ── */}
      <ScrollView
        style={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Main Image View */}
        <View style={styles.imageGalleryCard}>
          <Image
            source={{ uri: images[selectedImgIdx] || FALLBACK_IMAGE }}
            style={styles.mainImage}
            resizeMode="contain"
          />

          {discount > 0 && (
            <View style={styles.discountFloatingBadge}>
              <Text style={styles.discountFloatingText}>{discount}% OFF</Text>
            </View>
          )}

          {/* Thumbnails if multiple images */}
          {images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
              {images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedImgIdx(idx)}
                  style={[
                    styles.thumbnail,
                    selectedImgIdx === idx && styles.thumbnailSelected,
                  ]}
                >
                  <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info Section */}
        <View style={styles.infoCard}>
          <View style={styles.brandRow}>
            <Text style={styles.categoryBadge}>{product.category}</Text>
            {isOutOfStock ? (
              <Text style={styles.outOfStockTag}>Out of Stock</Text>
            ) : product.stock <= 5 ? (
              <Text style={styles.lowStockTag}>Only {product.stock} left!</Text>
            ) : (
              <Text style={styles.inStockTag}>In Stock</Text>
            )}
          </View>

          <Text style={styles.productTitle}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.starBadge}>
              <Text style={styles.starBadgeText}>
                {(product.rating || 4.5).toFixed(1)} ★
              </Text>
            </View>
            <Text style={styles.ratingCount}>
              {product.reviews ? `${product.reviews} ratings` : 'Verified Buyer Reviews'}
            </Text>
          </View>

          {/* Price Box */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
            {effMrp > product.price && (
              <Text style={styles.mrp}>₹{effMrp.toLocaleString('en-IN')}</Text>
            )}
            {discount > 0 && (
              <Text style={styles.discountText}>{discount}% off</Text>
            )}
          </View>
          <Text style={styles.taxInclusive}>Inclusive of all taxes</Text>
        </View>

        {/* Flipkart-Style Highlights / Trust Badges */}
        <View style={styles.trustGrid}>
          <View style={styles.trustItem}>
            <Ionicons name="flash-outline" size={20} color="#7c1f3e" />
            <Text style={styles.trustTitle}>Fast Delivery</Text>
            <Text style={styles.trustDesc}>Within 24-48 hrs</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#7c1f3e" />
            <Text style={styles.trustTitle}>100% Genuine</Text>
            <Text style={styles.trustDesc}>Direct from Store</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="cash-outline" size={20} color="#7c1f3e" />
            <Text style={styles.trustTitle}>Cash on Delivery</Text>
            <Text style={styles.trustDesc}>Available</Text>
          </View>
        </View>

        {/* Description Section */}
        {product.description ? (
          <View style={styles.descCard}>
            <Text style={styles.sectionHeading}>Product Details</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        ) : null}

        {/* ── Flipkart-Style "Similar Products" Strip ── */}
        {similarProducts.length > 0 && (
          <View style={styles.similarSection}>
            <View style={styles.similarHeader}>
              <Text style={styles.sectionHeading}>Similar Products</Text>
              <Text style={styles.similarSubtitle}>More from {product.category}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
              {similarProducts.map((item) => {
                const sMrp = item.mrp && item.mrp > item.price ? item.mrp : Math.round(item.price * 1.25);
                const sDisc = Math.round(((sMrp - item.price) / sMrp) * 100);

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.similarCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      setProduct(item);
                      setSelectedImgIdx(0);
                    }}
                  >
                    <Image
                      source={{ uri: item.image || FALLBACK_IMAGE }}
                      style={styles.similarImg}
                      resizeMode="cover"
                    />
                    <Text style={styles.similarName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.similarPriceRow}>
                      <Text style={styles.similarPrice}>₹{item.price}</Text>
                      {sDisc > 0 && (
                        <Text style={styles.similarDisc}>{sDisc}% off</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── Fixed Flipkart-Style Sticky Bottom Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.cartActionBtn,
            added && styles.cartActionBtnAdded,
            isOutOfStock && styles.btnDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          activeOpacity={0.8}
        >
          <Ionicons
            name={added ? 'checkmark-circle' : 'cart-outline'}
            size={20}
            color={added ? '#065f46' : '#7c1f3e'}
          />
          <Text style={[styles.cartActionText, added && { color: '#065f46' }]}>
            {added ? 'Added to Cart' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.buyActionBtn,
            isOutOfStock && styles.btnDisabled,
          ]}
          onPress={handleBuyNow}
          disabled={isOutOfStock}
          activeOpacity={0.85}
        >
          <Ionicons name="flash" size={18} color="#FFFFFF" />
          <Text style={styles.buyActionText}>
            {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAF6F0',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#7c1f3e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  /* Top Bar */
  topBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginLeft: 12,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Main Gallery */
  scrollBody: {
    flex: 1,
  },
  imageGalleryCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mainImage: {
    width: width - 32,
    height: width * 0.85,
  },
  discountFloatingBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountFloatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  thumbnailRow: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginRight: 8,
    overflow: 'hidden',
  },
  thumbnailSelected: {
    borderColor: '#7c1f3e',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },

  /* Info Card */
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c1f3e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inStockTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  lowStockTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  outOfStockTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  starBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  mrp: {
    fontSize: 15,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
  },
  taxInclusive: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },

  /* Trust Badges */
  trustGrid: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  trustItem: {
    alignItems: 'center',
    gap: 4,
  },
  trustTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  trustDesc: {
    fontSize: 10,
    color: '#6b7280',
  },

  /* Description Card */
  descCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },

  /* Similar Products */
  similarSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginTop: 8,
  },
  similarHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  similarSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  similarList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  similarCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    marginRight: 6,
  },
  similarImg: {
    width: '100%',
    height: 110,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  similarName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 6,
    lineHeight: 16,
  },
  similarPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  similarPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  similarDisc: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },

  /* Bottom Sticky Action Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cartActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#7c1f3e',
    backgroundColor: '#FFFFFF',
  },
  cartActionBtnAdded: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  cartActionText: {
    color: '#7c1f3e',
    fontSize: 14,
    fontWeight: '700',
  },
  buyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#7c1f3e',
  },
  buyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
  },
});
