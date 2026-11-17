import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView, Image, SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../../constants/theme';
import { ChevronLeft, Search, Bell, ArrowRight, X, Tag, Sparkles, Layers } from 'lucide-react-native';
import { api } from '../../services/api';
import { Product } from '../../types';
import { FALLBACK_IMAGE } from '../../constants';
import ProductCard from '../../components/ProductCard';
import NotificationModal from '../../components/NotificationModal';
import { useBackToHome } from '../../components/useAndroidBackHandler';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category aliases for smart matching
const CATEGORY_ALIASES: Record<string, string[]> = {
  'skin care': ['skin', 'face', 'cream', 'moisturizer', 'lotion', 'wash'],
  'personal care': ['personal', 'body', 'lotion', 'cream', 'hygiene', 'moisturizer'],
  'beauty': ['beauty', 'glow', 'face', 'cream', 'bright', 'nivea'],
  'makeup': ['makeup', 'beauty', 'glow', 'face', 'cream'],
  'hair care': ['hair', 'oil', 'shampoo'],
  'fragrances': ['sandalwood', 'perfume', 'talcum', 'fragrance', 'powder'],
  'general use': ['general', 'powder', 'household'],
  'cream': ['cream', 'moisturizing', 'soft'],
  'powder': ['powder', 'talcum'],
  'bath & body': ['body', 'bath', 'wash', 'lotion', 'cream'],
  'household': ['general', 'household', 'clean', 'powder'],
};

const matchProductToCategory = (p: Product, category: string): boolean => {
  if (!category || category === 'All') return true;
  const pCat = (p.category || '').toLowerCase().trim();
  const cCat = category.toLowerCase().trim();
  if (pCat === cCat) return true;

  const keywords = CATEGORY_ALIASES[cCat] || [cCat];
  const text = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
  return keywords.some(k => text.includes(k));
};

const DEFAULT_CATEGORY_TILES = [
  { id: 'Skin Care', name: 'Skin Care', image: require('../../assets/images/cat-skincare.jpg'), subtitle: 'Creams & Face Care' },
  { id: 'Personal Care', name: 'Personal Care', image: require('../../assets/images/cat-personal-care.jpg'), subtitle: 'Lotions & Hygiene' },
  { id: 'Beauty', name: 'Beauty & Glow', image: require('../../assets/images/cat-beauty.jpg'), subtitle: 'Moisturizers & Glow' },
  { id: 'General Use', name: 'Daily Care', image: require('../../assets/images/promo-essentials.jpg'), subtitle: 'Powders & Essentials' },
  { id: 'Fragrances', name: 'Fragrances', image: require('../../assets/images/cat-bangles.jpg'), subtitle: 'Sandalwood & Perfumes' },
];

function ShopScreenInner() {
  useBackToHome();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; brand?: string; q?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [categorySections, setCategorySections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'All');
  const [selectedBrand, setSelectedBrand] = useState(params.brand || '');
  const [search, setSearch] = useState(params.q || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notif, setNotif] = useState(false);
  const [activeTrendingDot, setActiveTrendingDot] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodData, sectionsData] = await Promise.all([
        api.getProducts(),
        api.getCategorySections().catch(() => []),
      ]);
      setProducts(prodData || []);
      setCategorySections(Array.isArray(sectionsData) ? sectionsData : []);
    } catch (e) {
      console.error('Failed to load shop data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Dynamic filter chips derived from products
  const availableCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    }
    const chips = [{ id: 'All', label: `All (${products.length})` }];
    for (const [cat, count] of Object.entries(counts)) {
      chips.push({ id: cat, label: `${cat} (${count})` });
    }
    // Also add Beauty and Fragrances if not present
    if (!counts['Beauty']) chips.push({ id: 'Beauty', label: 'Beauty & Glow' });
    if (!counts['Fragrances']) chips.push({ id: 'Fragrances', label: 'Fragrances' });
    return chips;
  }, [products]);

  const suggestions = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return { matchingProducts: [], matchingCategories: [] };
    const matchingProducts = products.filter(p =>
      (p.name || '').toLowerCase().includes(trimmed) ||
      (p.category && p.category.toLowerCase().includes(trimmed)) ||
      (p.description && p.description.toLowerCase().includes(trimmed))
    ).slice(0, 5);
    const matchingCategories = availableCategories
      .filter(c => c.id !== 'All' && c.id.toLowerCase().includes(trimmed))
      .map(c => c.id)
      .slice(0, 3);
    return { matchingProducts, matchingCategories };
  }, [search, products, availableCategories]);

  // Smart filtered products
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = matchProductToCategory(p, selectedCategory);
      const matchSearch = !search.trim() ||
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase());
      const matchBrand = !selectedBrand || selectedBrand === 'All' ||
        (typeof p.brand_id === 'object' && p.brand_id ? (p.brand_id.slug === selectedBrand || p.brand_id._id === selectedBrand) : false) ||
        (typeof p.brand_id === 'string' && p.brand_id === selectedBrand) ||
        (typeof (p as any).brand === 'object' && (p as any).brand ? ((p as any).brand.slug === selectedBrand || (p as any).brand._id === selectedBrand) : false) ||
        (typeof (p as any).brand === 'string' && ((p as any).brand === selectedBrand || (p as any).brand.toLowerCase() === selectedBrand.toLowerCase())) ||
        (p.name || '').toLowerCase().includes(selectedBrand.toLowerCase().replace(/-/g, ' '));
      return matchCat && matchSearch && matchBrand;
    });
  }, [products, selectedCategory, search, selectedBrand]);

  const trendingProducts = useMemo(() => products.slice(0, 8), [products]);

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
          <Text style={styles.brandTitle}>Categories & Shop</Text>
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
            placeholder="Search beauty, skin care, lotions..."
            placeholderTextColor={THEME.colors.ink500}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setIsSearchFocused(true)}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
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
              Search for "<Text style={{ fontWeight: '700' }}>{search.trim()}</Text>"
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
        </View>
      )}

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Categories Carousel (Only when search is empty) ── */}
        {search.trim().length === 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Layers size={18} color={THEME.colors.maroon700} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Shop by Category</Text>
              </View>
              {selectedCategory !== 'All' && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory('All')}
                  style={styles.seeAllBtn}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                  <ArrowRight size={13} color={THEME.colors.maroon700} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTilesTrack}
            >
              {DEFAULT_CATEGORY_TILES.map(cat => {
                const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
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
                    <Text style={styles.categoryTileSub} numberOfLines={1}>
                      {cat.subtitle}
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
              {availableCategories.map(cat => {
                const active = selectedCategory.toLowerCase() === cat.id.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Dynamic Category Sections from Server (If available) ── */}
            {categorySections.length > 0 && selectedCategory === 'All' && (
              <View style={styles.sectionsContainer}>
                {categorySections.map((sec: any) => (
                  <View key={sec._id || sec.sectionTitle} style={styles.sectionBlock}>
                    <Text style={styles.subSectionTitle}>{sec.sectionTitle}</Text>
                    {sec.sectionSubtitle && (
                      <Text style={styles.subSectionSubtitle}>{sec.sectionSubtitle}</Text>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subItemsTrack}>
                      {(sec.items || []).map((it: any) => (
                        <TouchableOpacity
                          key={it._id || it.name}
                          style={styles.subItemTile}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (it.link && it.link.includes('cat=')) {
                              const match = it.link.match(/cat=([^&]+)/);
                              if (match) setSelectedCategory(decodeURIComponent(match[1]));
                            } else if (it.link && it.link.includes('search=')) {
                              const match = it.link.match(/search=([^&]+)/);
                              if (match) setSearch(decodeURIComponent(match[1]));
                            } else {
                              setSelectedCategory(it.name);
                            }
                          }}
                        >
                          <View style={styles.subItemImgWrap}>
                            <Image
                              source={{ uri: it.image || FALLBACK_IMAGE }}
                              style={styles.subItemImg}
                              resizeMode="cover"
                            />
                          </View>
                          <Text style={styles.subItemName} numberOfLines={1}>{it.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </View>
            )}

            {/* ── Trending Carousel ── */}
            {selectedCategory === 'All' && trendingProducts.length > 0 && (
              <View style={styles.trendingSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Sparkles size={16} color={THEME.colors.gold500} />
                    <Text style={styles.sectionTitle}>Trending Now</Text>
                  </View>
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
              </View>
            )}
          </>
        )}

        {/* ── All / Filtered Products Grid ── */}
        <View style={styles.allProductsSection}>
          <View style={styles.productsHeaderRow}>
            <Text style={styles.productsHeaderTitle}>
              {search.trim().length > 0
                ? `Results for "${search}"`
                : (selectedCategory === 'All' ? 'All Products' : selectedCategory)}
            </Text>
            <Text style={styles.productsCountBadge}>
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={THEME.colors.maroon700} size="large" style={{ marginVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No direct match in {selectedCategory}</Text>
              <Text style={styles.emptyText}>Showing all available products from our store:</Text>
              <TouchableOpacity
                style={styles.resetCategoryBtn}
                onPress={() => {
                  setSelectedCategory('All');
                  setSearch('');
                }}
              >
                <Text style={styles.resetCategoryBtnText}>View All Products</Text>
              </TouchableOpacity>
              <View style={styles.productsGrid}>
                {products.map(item => (
                  <View key={item._id} style={styles.gridItemWrapper}>
                    <ProductCard product={item} />
                  </View>
                ))}
              </View>
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

export default function ShopScreen() {
  return (
    <ErrorBoundary fallbackTitle="Categories Error">
      <ShopScreenInner />
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
    ...THEME.shadow,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: THEME.colors.ink900,
    marginLeft: 8,
    paddingVertical: 0,
    outlineStyle: 'none',
  } as any,
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
    marginTop: -4,
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
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
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
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllText: {
    fontSize: 12.5,
    color: THEME.colors.maroon700,
    fontWeight: '700',
  },
  categoryTilesTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 10,
  },
  categoryTile: {
    width: 104,
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.line,
    outlineStyle: 'none' as any,
    ...THEME.shadow,
    elevation: 2,
  },
  categoryTileSelected: {
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    transform: [{ scale: 1.06 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  categoryTileImgContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 0,
    marginBottom: 8,
  },
  categoryTileImg: {
    width: '100%',
    height: '100%',
  },
  categoryTileName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.ink900,
    textAlign: 'center',
  },
  categoryTileNameSelected: {
    color: THEME.colors.black,
    fontWeight: '900',
    fontSize: 12.5,
  },
  categoryTileSub: {
    fontSize: 9.5,
    color: THEME.colors.ink500,
    textAlign: 'center',
    marginTop: 1,
  },
  filterChipsScroll: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterChipsTrack: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.white,
    borderColor: '#09090B',
    borderWidth: 2,
    shadowColor: '#09090B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    transform: [{ scale: 1.03 }],
  },
  filterChipText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#09090B',
    fontWeight: '800',
  },
  sectionsContainer: {
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionBlock: {
    backgroundColor: THEME.colors.white,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  subSectionSubtitle: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 1,
    marginBottom: 10,
  },
  subItemsTrack: {
    gap: 10,
  },
  subItemTile: {
    width: 76,
    alignItems: 'center',
  },
  subItemImgWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: THEME.colors.blush50,
    marginBottom: 4,
  },
  subItemImg: {
    width: '100%',
    height: '100%',
  },
  subItemName: {
    fontSize: 11,
    color: THEME.colors.ink900,
    fontWeight: '600',
    textAlign: 'center',
  },
  trendingSection: {
    marginTop: 14,
  },
  trendingListTrack: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 6,
  },
  allProductsSection: {
    marginTop: 16,
  },
  productsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  productsHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  productsCountBadge: {
    fontSize: 12,
    color: THEME.colors.ink500,
    fontWeight: '600',
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
  resetCategoryBtn: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    marginBottom: 16,
  },
  resetCategoryBtnText: {
    color: THEME.colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
