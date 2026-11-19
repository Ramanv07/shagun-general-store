import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView, Image, SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../../constants/theme';
import { ChevronLeft, Search, Bell, ArrowRight, X, Tag } from 'lucide-react-native';
import { api } from '../../services/api';
import { Product } from '../../types';
import { CATEGORIES, FALLBACK_IMAGE } from '../../constants';
import ProductCard from '../../components/ProductCard';
import NotificationModal from '../../components/NotificationModal';
import { useBackToHome } from '../../components/useAndroidBackHandler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_TILES = [
  { id: 'Makeup', name: 'Makeup', image: require('../../assets/images/cat-beauty.jpg') },
  { id: 'Skin Care', name: 'Skin Care', image: require('../../assets/images/cat-personal-care.jpg') },
  { id: 'Hair care', name: 'Hair Care', image: require('../../assets/images/cat-household.jpg') },
  { id: 'Personal Care', name: 'Personal Care', image: require('../../assets/images/cat-toys.jpg') },
  { id: 'Fragrances', name: 'Fragrance', image: require('../../assets/images/cat-bangles.jpg') },
  { id: 'Cleaning essentials', name: 'Home Care', image: require('../../assets/images/cat-household.jpg') },
];

export default function ShopScreen() {
  useBackToHome();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; brand?: string; q?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'All');
  const [selectedBrand, setSelectedBrand] = useState(params.brand || '');
  const [search, setSearch] = useState(params.q || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notif, setNotif] = useState(false);
  const [activeTrendingDot, setActiveTrendingDot] = useState(0);

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

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

  useEffect(() => {
    if (params.brand) {
      setSelectedBrand(params.brand);
    }
  }, [params.brand]);

  useEffect(() => {
    if (params.q !== undefined) {
      setSearch(params.q);
    }
  }, [params.q]);

  const handleSearchSubmit = () => {
    const term = search.trim();
    if (term) {
      setIsSearchFocused(false);
      router.push({
        pathname: '/search',
        params: { q: term },
      });
    }
  };

  const suggestions = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return { matchingProducts: [], matchingCategories: [] };
    const matchingProducts = products.filter(p =>
      (p.name || '').toLowerCase().includes(trimmed) ||
      (p.category && p.category.toLowerCase().includes(trimmed)) ||
      (p.description && p.description.toLowerCase().includes(trimmed))
    ).slice(0, 5);
    const matchingCategories = CATEGORIES.filter(c =>
      c !== 'All' && c.toLowerCase().includes(trimmed)
    ).slice(0, 3);
    return { matchingProducts, matchingCategories };
  }, [search, products]);

  const filtered = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const searchTerms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchSearch = searchTerms.length === 0 || searchTerms.every(term => {
      const full = `${p.name} ${p.category || ''} ${p.description || ''}`.toLowerCase();
      return full.includes(term);
    });
    const matchBrand = !selectedBrand || selectedBrand === 'All' ||
      (typeof p.brand_id === 'object' && p.brand_id ? (p.brand_id.slug === selectedBrand || p.brand_id._id === selectedBrand) : false) ||
      (typeof p.brand_id === 'string' && p.brand_id === selectedBrand) ||
      (typeof (p as any).brand === 'object' && (p as any).brand ? ((p as any).brand.slug === selectedBrand || (p as any).brand._id === selectedBrand) : false) ||
      (typeof (p as any).brand === 'string' && ((p as any).brand === selectedBrand || (p as any).brand.toLowerCase() === selectedBrand.toLowerCase())) ||
      p.name.toLowerCase().includes(selectedBrand.toLowerCase().replace(/-/g, ' '));
    return matchCat && matchSearch && matchBrand;
  });

  const trendingProducts = products.slice(0, 6);

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
            onPress={() => setNotif(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={22} color={THEME.colors.ink900} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Input ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={18} color={THEME.colors.ink500} strokeWidth={1.8} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={THEME.colors.ink500}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setIsSearchFocused(true)}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            onKeyPress={(e: any) => {
              if (e?.key === 'Enter' || e?.nativeEvent?.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              style={styles.clearIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={THEME.colors.ink500} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {search.trim().length > 0 && (
            <TouchableOpacity
              style={styles.searchGoPill}
              onPress={handleSearchSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.searchGoText}>Search</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Relative Suggestions Dropdown ── */}
      {isSearchFocused && search.trim().length > 0 && (
        <View style={styles.dropdownCard}>
          <TouchableOpacity
            style={styles.suggestionActionRow}
            onPress={handleSearchSubmit}
            activeOpacity={0.7}
          >
            <Search size={15} color={THEME.colors.maroon700} strokeWidth={2} />
            <Text style={styles.suggestionActionText} numberOfLines={1}>
              Search for "<Text style={{ fontWeight: '700' }}>{search.trim()}</Text>" in new page
            </Text>
            <ArrowRight size={13} color={THEME.colors.maroon700} />
          </TouchableOpacity>

          {suggestions.matchingCategories.length > 0 && (
            <View style={styles.suggestionBlock}>
              <Text style={styles.suggestionLabel}>MATCHING CATEGORIES</Text>
              <View style={styles.chipsRow}>
                {suggestions.matchingCategories.map((cat: string) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.catChip}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setIsSearchFocused(false);
                    }}
                  >
                    <Tag size={12} color={THEME.colors.maroon700} />
                    <Text style={styles.catChipText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {suggestions.matchingProducts.length > 0 && (
            <View style={styles.suggestionBlock}>
              <Text style={styles.suggestionLabel}>RELATIVE PRODUCTS</Text>
              {suggestions.matchingProducts.map((p: Product) => {
                const imgUri = p.images && p.images[0] ? p.images[0] : FALLBACK_IMAGE;
                return (
                  <TouchableOpacity
                    key={p._id}
                    style={styles.productSuggestionItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setIsSearchFocused(false);
                      router.push({
                        pathname: '/product-details' as any,
                        params: {
                          id: p._id,
                          productJson: JSON.stringify(p),
                        },
                      });
                    }}
                  >
                    <Image source={{ uri: imgUri }} style={styles.suggestionThumb} resizeMode="cover" />
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>{p.name}</Text>
                      <View style={styles.suggestionMeta}>
                        <Text style={styles.suggestionCatBadge}>{p.category}</Text>
                        <Text style={styles.suggestionPrice}>₹{p.price}</Text>
                      </View>
                    </View>
                    <ArrowRight size={13} color={THEME.colors.ink500} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Banners & Trending: ONLY show when search is empty ── */}
        {search.trim().length === 0 && (
          <>
            {/* ── Shop by Category Section ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedCategory('All')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTilesTrack}
            >
              {CATEGORY_TILES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryTile, isSelected && styles.categoryTileSelected]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedCategory(isSelected ? 'All' : cat.id)}
                  >
                    <View style={styles.categoryTileImgContainer}>
                      <Image source={cat.image} style={styles.categoryTileImg} resizeMode="cover" />
                    </View>
                    <Text
                      style={[styles.categoryTileName, isSelected && styles.categoryTileNameSelected]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Category Filter Chips ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsTrack}
              style={styles.filterChipsScroll}
            >
              {CATEGORIES.map(cat => {
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Daily Care Promo Card Banner ── */}
            <TouchableOpacity
              style={styles.promoBanner}
              activeOpacity={0.9}
              onPress={() => setSelectedCategory('Personal Care')}
            >
              <View style={styles.promoBannerLeft}>
                <Text style={styles.promoBannerTitle}>Daily Care{'\n'}Essentials{'\n'}for Your Home</Text>
                <View style={styles.promoBannerBtn}>
                  <Text style={styles.promoBannerBtnText}>Explore Now</Text>
                  <ArrowRight size={12} color={THEME.colors.maroon900} strokeWidth={2} />
                </View>
              </View>
              <View style={styles.promoBannerRight}>
                <Image
                  source={require('../../assets/images/promo-essentials.jpg')}
                  style={styles.promoBannerImg}
                  resizeMode="cover"
                />
              </View>
            </TouchableOpacity>

            {/* ── Trending Products Section (Horizontal) ── */}
            {trendingProducts.length > 0 && (
              <View style={styles.trendingSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.trendingTitleRow}>
                    <Text style={styles.sectionTitle}>Trending Products</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSelectedCategory('All')}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingListTrack}
                  onScroll={e => {
                    const off = e.nativeEvent.contentOffset.x;
                    const i = Math.round(off / 170);
                    setActiveTrendingDot(Math.min(i, 2));
                  }}
                  scrollEventThrottle={16}
                >
                  {trendingProducts.map(item => (
                    <ProductCard key={item._id} product={item} horizontal />
                  ))}
                </ScrollView>

                {/* Pagination indicator dots */}
                <View style={styles.dotsTrack}>
                  <View style={[styles.dot, activeTrendingDot === 0 && styles.dotActive]} />
                  <View style={[styles.dot, activeTrendingDot === 1 && styles.dotActive]} />
                  <View style={[styles.dot, activeTrendingDot === 2 && styles.dotActive]} />
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Active Search Banner: Shown when user typed a query ── */}
        {search.trim().length > 0 && (
          <View style={styles.searchBannerRow}>
            <View style={styles.searchBannerInfo}>
              <Text style={styles.searchBannerTitle}>
                Search Results ({filtered.length})
              </Text>
              <Text style={styles.searchBannerQuery}>
                for "{search}"
              </Text>
            </View>
            <View style={styles.searchBannerBtns}>
              <TouchableOpacity
                style={styles.openPageBtn}
                onPress={handleSearchSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.openPageBtnText}>Open Page</Text>
                <ArrowRight size={12} color={THEME.colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearch('')}
                activeOpacity={0.7}
              >
                <Text style={styles.clearSearchBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── All / Filtered Products Grid ── */}
        <View style={styles.allProductsSection}>
          <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginBottom: 12 }]}>
            {search.trim().length > 0 ? 'Matching Items' : (selectedCategory === 'All' ? 'All Products' : selectedCategory)}
          </Text>

          {loading ? (
            <ActivityIndicator color={THEME.colors.maroon700} size="large" style={{ marginVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filtered.map(item => (
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
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
    ...THEME.shadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.ink900,
    paddingVertical: 0,
  },
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  trendingTitleRow: {
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
  categoryTilesTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6,
  },
  categoryTile: {
    width: 78,
    alignItems: 'center',
  },
  categoryTileSelected: {
    opacity: 0.85,
  },
  categoryTileImgContainer: {
    width: 74,
    height: 74,
    borderRadius: THEME.radius.card,
    overflow: 'hidden',
    backgroundColor: THEME.colors.blushCard,
    borderWidth: 1,
    borderColor: THEME.colors.blush200,
    ...THEME.shadow,
  },
  categoryTileImg: {
    width: '100%',
    height: '100%',
  },
  categoryTileName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.ink900,
    marginTop: 6,
    textAlign: 'center',
  },
  categoryTileNameSelected: {
    color: THEME.colors.maroon700,
    fontWeight: '700',
  },
  filterChipsScroll: {
    marginVertical: 10,
  },
  filterChipsTrack: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.maroon700,
    borderColor: THEME.colors.maroon700,
  },
  filterChipText: {
    fontSize: 11.5,
    color: THEME.colors.ink500,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: THEME.colors.white,
    fontWeight: '700',
  },
  promoBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: THEME.radius.card,
    backgroundColor: THEME.colors.maroon900,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 130,
    ...THEME.shadow,
  },
  promoBannerLeft: {
    flex: 1.1,
    padding: 16,
    justifyContent: 'center',
  },
  promoBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.cream50,
    lineHeight: 22,
  },
  promoBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.cream50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  promoBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.maroon900,
  },
  promoBannerRight: {
    width: '42%',
  },
  promoBannerImg: {
    width: '100%',
    height: '100%',
  },
  trendingSection: {
    marginTop: 10,
  },
  trendingListTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 6,
  },
  dotsTrack: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.blush200,
  },
  dotActive: {
    width: 18,
    backgroundColor: THEME.colors.maroon700,
  },
  allProductsSection: {
    marginTop: 18,
  },
  productsGrid: {
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
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: THEME.colors.ink500,
  },
  clearIconBtn: {
    padding: 4,
    marginRight: 6,
  },
  searchGoPill: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  searchGoText: {
    color: THEME.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownCard: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 10,
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingVertical: 10,
    ...THEME.shadow,
    elevation: 4,
  },
  suggestionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.blush50,
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  suggestionActionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: THEME.colors.maroon900,
  },
  suggestionBlock: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
  },
  suggestionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.ink500,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.blushCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.maroon900,
  },
  productSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5eeec',
  },
  suggestionThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#eee',
    marginRight: 10,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.ink900,
    marginBottom: 2,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionCatBadge: {
    fontSize: 10.5,
    color: THEME.colors.ink500,
    backgroundColor: THEME.colors.blush50,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  suggestionPrice: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.maroon700,
  },
  searchBannerRow: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...THEME.shadow,
    elevation: 2,
  },
  searchBannerInfo: {
    flex: 1,
  },
  searchBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  searchBannerQuery: {
    fontSize: 12,
    color: THEME.colors.maroon700,
    fontStyle: 'italic',
    marginTop: 2,
  },
  searchBannerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  openPageBtnText: {
    color: THEME.colors.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
  clearSearchBtn: {
    backgroundColor: THEME.colors.blush200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  clearSearchBtnText: {
    color: THEME.colors.maroon900,
    fontSize: 11.5,
    fontWeight: '600',
  },
});
