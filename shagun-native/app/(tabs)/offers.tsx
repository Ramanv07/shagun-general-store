import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, StatusBar, Dimensions, ActivityIndicator,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { ChevronLeft, Search, Bell, ArrowRight, Tag, Truck, Gift, Zap, Percent } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Product } from '../../types';
import ProductCard from '../../components/ProductCard';
import NotificationModal from '../../components/NotificationModal';
import { useBackToHome } from '../../components/useAndroidBackHandler';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type OfferFilter = 'all' | '50_plus' | '30_plus' | 'under_199' | 'top_rated';

const HERO_OFFERS = [
  {
    id: 'hero-1',
    filter: '50_plus' as OfferFilter,
    title: 'Up to 55% OFF',
    subtitle: 'Nourishing Lotions & Creams',
    badge: 'MEGA SAVINGS',
    tag: '50%+ OFF',
    icon: Percent,
    image: require('../../assets/images/cat-personal-care.jpg'),
  },
  {
    id: 'hero-2',
    filter: 'under_199' as OfferFilter,
    title: 'Budget Store',
    subtitle: 'Daily Skincare under ₹199',
    badge: 'POCKET FRIENDLY',
    tag: 'UNDER ₹199',
    icon: Tag,
    image: require('../../assets/images/cat-skincare.jpg'),
  },
  {
    id: 'hero-3',
    filter: 'all' as OfferFilter,
    title: 'Free Delivery',
    subtitle: 'On orders above ₹399',
    badge: 'SHAGUN EXPRESS',
    tag: 'FREE SHIPPING',
    icon: Truck,
    image: require('../../assets/images/promo-essentials.jpg'),
  },
];

function OffersScreenInner() {
  useBackToHome();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OfferFilter>('all');
  const [notif, setNotif] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const prodData = await api.getProducts();
      setProducts(prodData || []);
    } catch (e) {
      console.error('Failed to load products for offers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Calculate discount and sort by highest discount first (prioritizing beauty & skincare)
  const sortedDeals = useMemo(() => {
    const list = products.map(p => {
      const effMrp = p.mrp && p.mrp > p.price ? p.mrp : p.price;
      const discountPct = effMrp > p.price ? Math.round(((effMrp - p.price) / effMrp) * 100) : 0;
      const savings = effMrp - p.price;
      return { ...p, discountPct, savings };
    });

    return list.sort((a, b) => {
      const aCat = (a.category || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const aPriority = aCat.includes('skin') || aCat.includes('beauty') || aCat.includes('personal') || aCat.includes('hair');
      const bPriority = bCat.includes('skin') || bCat.includes('beauty') || bCat.includes('personal') || bCat.includes('hair');
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      return b.discountPct - a.discountPct;
    });
  }, [products]);

  // Filter deals based on active pill
  const filteredDeals = useMemo(() => {
    if (activeFilter === '50_plus') {
      return sortedDeals.filter(p => p.discountPct >= 50);
    }
    if (activeFilter === '30_plus') {
      return sortedDeals.filter(p => p.discountPct >= 30);
    }
    if (activeFilter === 'under_199') {
      return sortedDeals.filter(p => p.price <= 199);
    }
    if (activeFilter === 'top_rated') {
      return sortedDeals.filter(p => (p.rating || 0) >= 4.5);
    }
    return sortedDeals;
  }, [sortedDeals, activeFilter]);

  const filterCounts = useMemo(() => {
    return {
      all: sortedDeals.length,
      '50_plus': sortedDeals.filter(p => p.discountPct >= 50).length,
      '30_plus': sortedDeals.filter(p => p.discountPct >= 30).length,
      under_199: sortedDeals.filter(p => p.price <= 199).length,
      top_rated: sortedDeals.filter(p => (p.rating || 0) >= 4.5).length,
    };
  }, [sortedDeals]);

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
          <Text style={styles.brandTitle}>Offers & Deals</Text>
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
        {/* ── Offer Highlights Strip ── */}
        <View style={styles.highlightStrip}>
          <Zap size={16} color={THEME.colors.gold500} fill={THEME.colors.gold500} />
          <Text style={styles.highlightText}>
            Special Daily Discounts • Up to <Text style={{ fontWeight: '800' }}>55% OFF</Text> on Essentials
          </Text>
        </View>

        {/* ── Hero Offers Carousel ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Featured Deals for You</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.heroTrack}
        >
          {HERO_OFFERS.map(offer => {
            const isSelected = activeFilter === offer.filter;
            return (
              <TouchableOpacity
                key={offer.id}
                style={[styles.heroCard, isSelected && styles.heroCardActive]}
                activeOpacity={0.85}
                onPress={() => setActiveFilter(offer.filter)}
              >
                <View style={styles.heroCardLeft}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{offer.badge}</Text>
                  </View>
                  <Text style={styles.heroTitle} numberOfLines={1}>{offer.title}</Text>
                  <Text style={styles.heroSubtitle} numberOfLines={1}>{offer.subtitle}</Text>
                  <View style={styles.heroActionRow}>
                    <Text style={styles.heroTagText}>{offer.tag}</Text>
                    <ArrowRight size={12} color="#059669" strokeWidth={2.5} />
                  </View>
                </View>
                <View style={styles.heroImgContainer}>
                  <Image source={offer.image} style={styles.heroImg} resizeMode="cover" />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Filter Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsTrack}
          style={styles.filterPillsScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
              All Deals ({filterCounts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === '50_plus' && styles.filterPillActive]}
            onPress={() => setActiveFilter('50_plus')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === '50_plus' && styles.filterPillTextActive]}>
              50%+ OFF ({filterCounts['50_plus']})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === '30_plus' && styles.filterPillActive]}
            onPress={() => setActiveFilter('30_plus')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === '30_plus' && styles.filterPillTextActive]}>
              30%+ OFF ({filterCounts['30_plus']})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'under_199' && styles.filterPillActive]}
            onPress={() => setActiveFilter('under_199')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === 'under_199' && styles.filterPillTextActive]}>
              Under ₹199 ({filterCounts.under_199})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'top_rated' && styles.filterPillActive]}
            onPress={() => setActiveFilter('top_rated')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === 'top_rated' && styles.filterPillTextActive]}>
              Top Rated ({filterCounts.top_rated})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Products Deals Grid ── */}
        <View style={styles.dealsSection}>
          <View style={styles.dealsHeaderRow}>
            <View>
              <Text style={styles.dealsHeaderTitle}>
                {activeFilter === '50_plus' ? 'Mega Savings (50%+ OFF)' :
                  activeFilter === '30_plus' ? 'Super Deals (30%+ OFF)' :
                    activeFilter === 'under_199' ? 'Budget Deals Under ₹199' :
                      activeFilter === 'top_rated' ? 'Top Rated Favourites' : 'All Active Offers'}
              </Text>
              <Text style={styles.dealsHeaderSub}>
                Verified prices with instant delivery
              </Text>
            </View>
            <Text style={styles.dealsCountBadge}>
              {filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={THEME.colors.maroon700} size="large" style={{ marginVertical: 32 }} />
          ) : filteredDeals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No deals in this filter</Text>
              <Text style={styles.emptyText}>Showing all available store discounts instead:</Text>
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => setActiveFilter('all')}
              >
                <Text style={styles.resetFilterBtnText}>View All Deals</Text>
              </TouchableOpacity>
              <View style={styles.gridContainer}>
                {sortedDeals.map(item => (
                  <View key={item._id} style={styles.gridItemWrapper}>
                    <ProductCard product={item} />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredDeals.map(item => (
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

export default function OffersScreen() {
  return (
    <ErrorBoundary fallbackTitle="Offers Error">
      <OffersScreenInner />
    </ErrorBoundary>
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
    paddingVertical: 10,
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
    width: 26,
    height: 26,
    borderRadius: 7,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingBottom: 28,
  },
  highlightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 12,
    color: THEME.colors.maroon900,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  heroTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 6,
  },
  heroCard: {
    width: 270,
    height: 124,
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...THEME.shadow,
    elevation: 2,
  },
  heroCardActive: {
    borderColor: THEME.colors.line,
    borderWidth: 1,
    backgroundColor: THEME.colors.white,
    transform: [{ scale: 1.05 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    outlineStyle: 'none' as any,
  },
  heroCardLeft: {
    flex: 1,
    height: '100%',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  heroBadgeText: {
    color: '#047857',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.black,
    lineHeight: 20,
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 11,
    color: THEME.colors.ink500,
    lineHeight: 14,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  heroImgContainer: {
    width: 86,
    height: 86,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  filterPillsScroll: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterPillsTrack: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  filterPillActive: {
    backgroundColor: THEME.colors.white,
    borderColor: THEME.colors.line,
    borderWidth: 1,
    transform: [{ scale: 1.05 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    outlineStyle: 'none' as any,
  },
  filterPillText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#09090B',
    fontWeight: '900',
  },
  dealsSection: {
    marginTop: 14,
  },
  dealsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dealsHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  dealsHeaderSub: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 1,
  },
  dealsCountBadge: {
    fontSize: 12,
    color: THEME.colors.ink500,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  gridItemWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.maroon900,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.ink500,
    textAlign: 'center',
    marginBottom: 14,
  },
  resetFilterBtn: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    marginBottom: 16,
  },
  resetFilterBtnText: {
    color: THEME.colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
