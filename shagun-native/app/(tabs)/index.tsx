import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, SafeAreaView, StatusBar, Dimensions,
  AppState, AccessibilityInfo, Platform,
  NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { THEME } from '../../constants/theme';
import {
  Bell, MapPin, ChevronDown, Search, ArrowRight,
  Zap, Bike,
} from 'lucide-react-native';
import NotificationModal from '../../components/NotificationModal';
import { useDoubleBackToExit } from '../../components/useAndroidBackHandler';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ProductCard from '../../components/ProductCard';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ── Banner data (existing promo image assets – no new data) ── */
const BANNERS = [
  {
    id: 'beauty-essentials',
    title: 'Beauty &\nMakeup\nCollection',
    sub: 'Lipsticks, foundation & makeup essentials',
    buttonText: 'Shop Makeup',
    image: require('../../assets/images/cat-beauty.jpg'),
    route: '/(tabs)/shop',
  },
  {
    id: 'daily-essentials',
    title: 'Daily Care\nEssentials for\nYour Home',
    sub: 'Personal care & household needs',
    buttonText: 'Explore Now',
    image: require('../../assets/images/cat-personal-care.jpg'),
    route: '/(tabs)/shop',
  },
  {
    id: 'bridal-special',
    title: 'Rent Your\nBridal Look\nToday',
    sub: 'Premium bridal lehenga collection',
    buttonText: 'View Collection',
    image: require('../../assets/images/cat-lehenga.jpg'),
    route: '/bridal-lehenga',
  },
  {
    id: 'beauty-parlor',
    title: 'Beauty Parlour\nAppointments\nAvailable',
    sub: 'Skincare, hairstyling & makeover',
    buttonText: 'Book Now',
    image: require('../../assets/images/cat-parlour.jpg'),
    route: '/beauty-parlor',
  },
];

/* ── 4×2 Category grid with existing images in place of icons ── */
const HOME_CATEGORIES = [
  {
    id: 'beauty-makeup',
    name: 'Beauty &\nMakeup',
    image: require('../../assets/images/cat-beauty.jpg'),
    filter: 'Beauty',
  },
  {
    id: 'personal-care',
    name: 'Personal\nCare',
    image: require('../../assets/images/cat-personal-care.jpg'),
    filter: 'Personal Care',
  },
  {
    id: 'hair-care',
    name: 'Hair\nCare',
    image: require('../../assets/images/cat-household.jpg'),
    filter: 'Hair care',
  },
  {
    id: 'skin-care',
    name: 'Skin\nCare',
    image: require('../../assets/images/cat-skincare.jpg'),
    filter: 'Skin Care',
  },
  {
    id: 'fragrance',
    name: 'Fragrance',
    image: require('../../assets/images/cat-bangles.jpg'),
    filter: 'Fragrances',
  },
  {
    id: 'bridal',
    name: 'Bridal\nLehenga',
    image: require('../../assets/images/cat-lehenga.jpg'),
    filter: 'Bridal Lehenga',
    route: '/bridal-lehenga',
  },
  {
    id: 'home-lifestyle',
    name: 'Home &\nLifestyle',
    image: require('../../assets/images/promo-essentials.jpg'),
    filter: 'General Use',
  },
  {
    id: 'beauty-parlor',
    name: 'Beauty\nParlour',
    image: require('../../assets/images/cat-parlour.jpg'),
    filter: 'Beauty Parlour',
    route: '/beauty-parlor',
  },
];

/* ═══════════════════ AUTO-SCROLL POSTER ═══════════════════ */
function AutoScrollPoster({ router, focused }: { router: ReturnType<typeof useRouter>; focused: boolean }) {
  const [banners, setBanners] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(SCREEN_WIDTH - 32);
  const isDragging = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getBanners('app_home').then((data) => {
      if (isMounted) {
        if (Array.isArray(data) && data.length > 0) {
          setBanners(data);
        } else {
          setBanners(BANNERS);
        }
        setLoaded(true);
      }
    }).catch(() => {
      if (isMounted) {
        setBanners(BANNERS);
        setLoaded(true);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const count = banners.length;

  // Auto-slide every 3.5 seconds (only when 2 or more banners)
  useEffect(() => {
    if (!focused || count <= 1) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (isDragging.current) return;
      setCurrentIndex(prev => {
        const next = (prev + 1) % count;
        if (ref.current && slideWidth > 0) {
          ref.current.scrollTo({ x: next * slideWidth, animated: true });
        }
        return next;
      });
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [focused, count, slideWidth]);

  if (!loaded || count === 0) return null;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (slideWidth > 0) {
      const idx = Math.round(x / slideWidth);
      if (idx >= 0 && idx < count && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    }
  };

  const handleDotPress = (idx: number) => {
    setCurrentIndex(idx);
    ref.current?.scrollTo({ x: idx * slideWidth, animated: true });
  };

  const handleBannerPress = (b: any) => {
    const target = b.target;
    if (!target || target.type === 'none') {
      if (b.route) router.push(b.route as any);
      return;
    }
    if (target.type === 'category' && target.value) {
      router.push({ pathname: '/(tabs)/shop', params: { category: target.value } } as any);
    } else if (target.type === 'product' && target.value) {
      router.push({ pathname: '/product-details', params: { id: target.value } } as any);
    } else if (target.type === 'offers') {
      router.push('/(tabs)/offers' as any);
    } else if (b.route) {
      router.push(b.route as any);
    }
  };

  return (
    <View
      style={ps.wrap}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - slideWidth) > 2) {
          setSlideWidth(w);
        }
      }}
    >
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled={count > 1}
        scrollEnabled={count > 1}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        style={{ width: slideWidth }}
        contentContainerStyle={{ width: slideWidth * count }}
        onScrollBeginDrag={() => { isDragging.current = true; }}
        onScrollEndDrag={() => {
          setTimeout(() => { isDragging.current = false; }, 1500);
        }}
      >
        {banners.map((b, idx) => {
          const imgSource = typeof b.image === 'number' ? b.image : { uri: b.imageUrl || b.image };
          const isTappable = Boolean(b.route || (b.target && b.target.type !== 'none'));

          return (
            <TouchableOpacity
              key={b._id || b.id || idx}
              style={[ps.slide, { width: slideWidth }]}
              activeOpacity={isTappable ? 0.9 : 1}
              disabled={!isTappable}
              onPress={() => handleBannerPress(b)}
            >
              <View style={ps.left}>
                <Text style={ps.title}>{b.title}</Text>
                <Text style={ps.sub} numberOfLines={2}>{b.sub || ''}</Text>
                {isTappable && (
                  <View style={ps.btn}>
                    <Text style={ps.btnTxt}>{b.buttonText || 'Explore'}</Text>
                    <ArrowRight size={12} color={THEME.colors.white} strokeWidth={2} />
                  </View>
                )}
              </View>
              <View style={ps.right}>
                <Image source={imgSource} style={ps.img} resizeMode="cover" />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dots Indicator */}
      {count > 1 && (
        <View style={ps.dots}>
          {banners.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleDotPress(i)}
              style={[ps.dot, i === currentIndex && ps.dotOn]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/* ═══════════════════ HOME SCREEN ═══════════════════ */
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notif, setNotif] = useState(false);
  const [focused, setFocused] = useState(true);
  const [deliveryConfig, setDeliveryConfig] = useState<{ enabled: boolean; eta_min: number | null; eta_max: number | null } | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) {
      console.error('Failed to load products for home:', e);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useDoubleBackToExit();
  useFocusEffect(useCallback(() => {
    setFocused(true);
    // Fetch live delivery config, unread notifications count, products, and active brands
    api.getDeliveryConfig().then(cfg => setDeliveryConfig(cfg));
    api.getUnreadNotificationCount().then(cnt => setUnreadCount(cnt));
    api.getActiveBrands().then(b => setBrands(Array.isArray(b) ? b : [])).catch(() => setBrands([]));
    loadProducts();
    return () => setFocused(false);
  }, [loadProducts]));

  const addr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0];

  // Group products category-wise
  const categorySections = useMemo(() => {
    const priority = ['Skin Care', 'Personal Care', 'General Use', 'Beauty', 'Makeup', 'Hair care', 'Fragrances'];
    const present = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const sorted = present.sort((a, b) => {
      const ia = priority.indexOf(a);
      const ib = priority.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    return sorted.map(cat => ({
      category: cat,
      items: products.filter(p => p.category === cat),
    }));
  }, [products]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />

      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <View style={s.brandRow}>
          <Image source={require('../../assets/icon.png')} style={s.brandLogo} resizeMode="cover" />
          <View style={s.brandTextGroup}>
            <Text style={s.brandTitle}>Shagun Mart</Text>
            <Text style={s.brandSubtitle}>Beauty • Personal Care • Daily Essentials</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.iconBtn}
          activeOpacity={0.7}
          onPress={async () => {
            setNotif(true);
            if (unreadCount > 0) {
              setUnreadCount(0);
              await api.markAllNotificationsRead();
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bell size={22} color={THEME.colors.ink900} strokeWidth={1.8} />
          {unreadCount > 0 && <View style={s.unreadDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Delivery Row ── */}
      <View style={s.deliveryRow}>
        <MapPin size={16} color={THEME.colors.maroon700} strokeWidth={2} />
        <View style={s.deliveryTextContainer}>
          <Text style={s.deliveryTitle}>Deliver to Home</Text>
          <Text style={s.deliverySubtitle} numberOfLines={1}>
            {addr ? `${addr.city}, ${addr.state} – ${addr.pinCode}` : 'Khajuraho Road, Bamitha – 471105'}
          </Text>
        </View>
        <ChevronDown size={16} color={THEME.colors.ink500} strokeWidth={1.5} />
      </View>

      {/* ── Search Bar Pill ── */}
      <View style={s.searchContainer}>
        <TouchableOpacity
          style={s.searchBar}
          activeOpacity={0.7}
          onPress={() => router.push('/search')}
        >
          <Search size={18} color={THEME.colors.ink500} strokeWidth={1.8} />
          <Text style={s.searchPlaceholder}>Search for beauty, personal care, daily item...</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main Scroll Area ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Auto-scroll Hero Poster */}
        <AutoScrollPoster router={router} focused={focused} />

        {/* 4×2 Category Grid with Existing Images */}
        <View style={s.catGrid}>
          {HOME_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={s.catItem}
              activeOpacity={0.7}
              onPress={() => {
                if (cat.route) {
                  router.push(cat.route as any);
                } else {
                  router.push({ pathname: '/(tabs)/shop', params: { category: cat.filter } } as any);
                }
              }}
            >
              <View style={s.catTile}>
                <Image source={cat.image} style={s.catTileImg} resizeMode="cover" />
              </View>
              <Text style={s.catLabel} numberOfLines={2}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Delivery Promise Strip (Phase A: Un-hidden when config present) ── */}
        {deliveryConfig?.enabled && deliveryConfig?.eta_min && deliveryConfig?.eta_max ? (
          <View style={s.deliveryStrip}>
            <View style={s.deliveryStripLeft}>
              <View style={s.zapIconCircle}>
                <Zap size={16} color={THEME.colors.gold500} fill={THEME.colors.gold500} />
              </View>
              <View>
                <Text style={s.deliveryStripTitle}>
                  Fast Delivery in {deliveryConfig.eta_min}–{deliveryConfig.eta_max} mins
                </Text>
                <Text style={s.deliveryStripSubtitle}>On all orders</Text>
              </View>
            </View>
            <View style={s.deliveryStripRight}>
              <Bike size={26} color={THEME.colors.maroon700} strokeWidth={1.8} />
            </View>
          </View>
        ) : null}

        {/* ── Brands You Love (Phase B3: Un-hidden when active brands with products exist) ── */}
        {brands.length > 0 && (
          <View style={s.brandsSection}>
            <View style={s.sectionHeader}>
              <View style={s.sectionTitleGroup}>
                <Text style={s.sectionTitle}>Brands You Love</Text>
              </View>
              <TouchableOpacity
                style={s.seeAllBtn}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(tabs)/shop' } as any)}
              >
                <Text style={s.seeAllText}>All Brands</Text>
                <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.brandsTrack}
            >
              {brands.map((b: any) => (
                <TouchableOpacity
                  key={b._id}
                  style={s.brandCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/shop',
                      params: { brand: b.slug || b.name || b._id },
                    } as any)
                  }
                >
                  <View style={s.brandLogoWrapper}>
                    {b.logo ? (
                      <Image source={{ uri: b.logo }} style={s.brandLogoImg} resizeMode="contain" />
                    ) : (
                      <Text style={s.brandInitial}>{b.name?.[0] || 'B'}</Text>
                    )}
                  </View>
                  <Text style={s.brandName} numberOfLines={1}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Category-wise Product Sections ── */}
        {loadingProducts ? (
          <ActivityIndicator
            size="small"
            color={THEME.colors.maroon700}
            style={{ marginVertical: 32 }}
          />
        ) : (
          categorySections.map(sec => (
            <View key={sec.category} style={s.categorySection}>
              {/* Section Header */}
              <View style={s.sectionHeader}>
                <View style={s.sectionTitleGroup}>
                  <Text style={s.sectionTitle}>{sec.category}</Text>
                  {user?.role === 'admin' && (
                    <View style={s.countBadge}>
                      <Text style={s.countBadgeText}>{sec.items.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={s.seeAllBtn}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/shop',
                      params: { category: sec.category },
                    } as any)
                  }
                >
                  <Text style={s.seeAllText}>See All</Text>
                  <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Products Horizontal Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.horizontalProductsTrack}
              >
                {sec.items.map(product => (
                  <View key={product._id} style={s.horizontalCardWrapper}>
                    <ProductCard product={product} horizontal />
                  </View>
                ))}

                {/* "View All" card at end of horizontal row */}
                <TouchableOpacity
                  style={s.viewMoreCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/shop',
                      params: { category: sec.category },
                    } as any)
                  }
                >
                  <View style={s.viewMoreCircle}>
                    <ArrowRight size={18} color={THEME.colors.maroon700} strokeWidth={2} />
                  </View>
                  <Text style={s.viewMoreText}>View All{'\n'}{sec.category}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ))
        )}
      </ScrollView>

      {/* Notification Modal */}
      <NotificationModal visible={notif} onClose={() => setNotif(false)} />
    </SafeAreaView>
  );
}

/* ═══════════════════ POSTER STYLES ═══════════════════ */
const ps = StyleSheet.create({
  wrap: {
    marginTop: 14,
    marginHorizontal: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slide: {
    height: 180,
    borderRadius: THEME.radius.card,
    overflow: 'hidden',
    backgroundColor: THEME.colors.blushCard,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.blush200,
  },
  left: {
    flex: 1.1,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.maroon900,
    lineHeight: 22,
  },
  sub: { fontSize: 10.5, color: THEME.colors.ink500, marginTop: 4, lineHeight: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.black,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  btnTxt: { color: THEME.colors.white, fontSize: 11, fontWeight: '700' },
  right: {
    width: '42%' as any,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: THEME.colors.cream50,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.blush200 },
  dotOn: { width: 22, borderRadius: 3, backgroundColor: THEME.colors.maroon700 },
});

/* ═══════════════════ MAIN STYLES ═══════════════════ */
const GRID_ITEM_W = (SCREEN_WIDTH - 32 - (3 * 10)) / 4;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.blush50 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    backgroundColor: THEME.colors.blush50,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.error,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.black,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 9.5,
    color: THEME.colors.ink500,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  deliveryTextContainer: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  deliverySubtitle: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingHorizontal: 14,
    height: 42,
    ...THEME.shadow,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 12.5,
    color: THEME.colors.ink500,
  },
  scroll: {
    flex: 1,
    backgroundColor: THEME.colors.blush50,
  },
  scrollInner: {
    paddingBottom: 28,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 18,
    justifyContent: 'space-between',
    rowGap: 16,
  },
  catItem: {
    width: '23%',
    alignItems: 'center',
  },
  catTile: {
    width: 66,
    height: 66,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: THEME.colors.white,
    borderWidth: 0,
    outlineStyle: 'none' as any,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadow,
    elevation: 3,
  },
  catTileImg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.black,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  deliveryStrip: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    ...THEME.shadow,
  },
  deliveryStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  zapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.blush50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryStripTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.maroon900,
  },
  deliveryStripSubtitle: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 1,
  },
  deliveryStripRight: {
    paddingLeft: 8,
  },
  categorySection: {
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  countBadge: {
    backgroundColor: THEME.colors.blushCard,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.maroon900,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.maroon700,
  },
  horizontalProductsTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6,
  },
  horizontalCardWrapper: {
    width: 160,
  },
  viewMoreCard: {
    width: 120,
    height: 220,
    borderRadius: THEME.radius.card,
    backgroundColor: THEME.colors.blushCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.blush200,
    borderStyle: 'dashed',
    padding: 12,
  },
  viewMoreCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...THEME.shadow,
  },
  viewMoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.maroon900,
    textAlign: 'center',
    lineHeight: 16,
  },
  brandsSection: {
    marginVertical: 12,
  },
  brandsTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6,
  },
  brandCard: {
    width: 96,
    alignItems: 'center',
  },
  brandLogoWrapper: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.blush200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    ...THEME.shadow,
    marginBottom: 6,
  },
  brandLogoImg: {
    width: '100%',
    height: '100%',
  },
  brandInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.maroon700,
  },
  brandName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.ink900,
    textAlign: 'center',
  },
});
