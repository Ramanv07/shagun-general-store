import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, StatusBar, Dimensions, ActivityIndicator,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { ChevronLeft, Search, Bell, ArrowRight, Tag, Truck, Gift } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Product, Brand } from '../../types';
import ProductCard from '../../components/ProductCard';
import NotificationModal from '../../components/NotificationModal';
import { useBackToHome } from '../../components/useAndroidBackHandler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OFFERS_DATA = [
  {
    id: 'off-1',
    title: 'Up to\n60% OFF',
    subtitle: 'on Beauty Products',
    icon: Gift,
    category: 'Beauty',
    image: require('../../assets/images/cat-beauty.jpg'),
  },
  {
    id: 'off-2',
    title: 'Flat\n₹100 OFF',
    subtitle: 'on orders above ₹599',
    icon: Tag,
    category: 'Personal Care',
    image: require('../../assets/images/promo-essentials.jpg'),
  },
  {
    id: 'off-3',
    title: 'Free\nDelivery',
    subtitle: 'above ₹399',
    icon: Truck,
    category: 'All',
    image: require('../../assets/images/cat-household.jpg'),
  },
];

export default function OffersScreen() {
  useBackToHome();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [prodData, brandData] = await Promise.all([
        api.getProducts(),
        api.getBrands().catch(() => [] as Brand[]),
      ]);
      setProducts(prodData);
      setBrands(brandData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const newArrivals = products.slice(-6).reverse();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.brandContainer}>
          <Image source={require('../../assets/icon.png')} style={styles.brandIcon} resizeMode="cover" />
          <Text style={styles.brandTitle}>Shagun Mart</Text>
        </View>

        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/shop')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={20} color={THEME.colors.ink900} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={() => setNotif(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={22} color={THEME.colors.ink900} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brands You Love Section ── */}
        {brands.length > 0 && (
          <View style={styles.brandsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Brands You Love</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/shop')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.brandsTrack}
            >
              {brands.map(brand => {
                const isVaseline = brand.slug === 'vaseline';
                return (
                  <TouchableOpacity
                    key={brand._id || brand.slug}
                    style={[styles.brandCard, isVaseline && styles.vaselineCard]}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(tabs)/shop', params: { brand: brand.slug } } as any)}
                  >
                    <Text
                      style={[
                        styles.brandCardText,
                        isVaseline && styles.vaselineText,
                        brand.slug === 'mamaearth' && styles.mamaearthText,
                        brand.slug === 'ponds' && styles.pondsText,
                        brand.slug === 'dove' && styles.doveText,
                      ]}
                      numberOfLines={1}
                    >
                      {brand.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Skin Care Favourites Banner ── */}
        <TouchableOpacity
          style={styles.heroBanner}
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/(tabs)/shop', params: { category: 'Skin Care' } } as any)}
        >
          <View style={styles.heroBannerLeft}>
            <Text style={styles.heroBannerTitle}>Skin Care{'\n'}Favourites</Text>
            <Text style={styles.heroBannerSubtitle}>Cleanse • Nourish • Glow</Text>
            <View style={styles.heroBannerBtn}>
              <Text style={styles.heroBannerBtnText}>Shop Skin Care</Text>
              <ArrowRight size={12} color={THEME.colors.white} strokeWidth={2} />
            </View>
          </View>
          <View style={styles.heroBannerRight}>
            <Image
              source={require('../../assets/images/hero-vanity.jpg')}
              style={styles.heroBannerImg}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

        {/* ── Offers for You Section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.titleWithIcon}>
            <Tag size={18} color={THEME.colors.maroon700} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Offers for You</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/shop')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offersTrack}
        >
          {OFFERS_DATA.map(offer => (
            <TouchableOpacity
              key={offer.id}
              style={styles.offerCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(tabs)/shop', params: { category: offer.category } } as any)}
            >
              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerSubtitle}>{offer.subtitle}</Text>
              <View style={styles.offerImgContainer}>
                <Image source={offer.image} style={styles.offerImg} resizeMode="cover" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── New Arrivals Section (2-up grid) ── */}
        <View style={styles.newArrivalsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/shop')}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={THEME.colors.maroon700} size="large" style={{ marginVertical: 30 }} />
          ) : newArrivals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No new arrivals at this time</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {newArrivals.map(item => (
                <View key={item._id} style={styles.gridItemWrapper}>
                  <ProductCard product={item} />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <NotificationModal visible={notif} onClose={() => setNotif(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.colors.blush50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.colors.blush50,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.maroon700,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingBottom: 32,
  },
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: THEME.radius.card,
    backgroundColor: THEME.colors.blushCard,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 140,
    ...THEME.shadow,
  },
  heroBannerLeft: {
    flex: 1.2,
    padding: 16,
    justifyContent: 'center',
  },
  heroBannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.maroon900,
    lineHeight: 24,
  },
  heroBannerSubtitle: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 4,
  },
  heroBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  heroBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.white,
  },
  heroBannerRight: {
    width: '40%',
  },
  heroBannerImg: {
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.maroon900,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.maroon700,
  },
  offersTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 10,
  },
  offerCard: {
    width: 130,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    ...THEME.shadow,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.maroon900,
    lineHeight: 18,
  },
  offerSubtitle: {
    fontSize: 10,
    color: THEME.colors.ink500,
    marginTop: 2,
    marginBottom: 8,
    lineHeight: 13,
  },
  offerImgContainer: {
    width: '100%',
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: THEME.colors.blush50,
  },
  offerImg: {
    width: '100%',
    height: '100%',
  },
  newArrivalsSection: {
    marginTop: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    justifyContent: 'space-between',
  },
  gridItemWrapper: {
    width: '48.5%',
    marginBottom: 10,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: THEME.colors.ink500,
  },
  brandsSection: {
    marginTop: 6,
    marginBottom: 4,
  },
  brandsTrack: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  brandCard: {
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: THEME.colors.white,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EADBD7',
    ...THEME.shadow,
  },
  brandCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.ink900,
    letterSpacing: 0.3,
  },
  vaselineCard: {
    backgroundColor: '#0F4C81',
    borderColor: '#0F4C81',
  },
  vaselineText: {
    color: THEME.colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  mamaearthText: {
    color: '#00A896',
    fontWeight: '800',
  },
  pondsText: {
    fontWeight: '900',
    letterSpacing: 1,
    color: '#1C1C1E',
  },
  doveText: {
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#0D3B66',
  },
});
