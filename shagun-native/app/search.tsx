import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Search,
  X,
  ArrowRight,
  Clock,
  TrendingUp,
  Tag,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { Product } from '../types';
import { CATEGORIES, FALLBACK_IMAGE } from '../constants';
import ProductCard from '../components/ProductCard';

const RECENT_SEARCHES_KEY = 'shagun_recent_searches';

const POPULAR_SEARCHES = [
  'Oil',
  'Nivea',
  'Moisturizer',
  'Shower Gel',
  'Cream',
  'Toilet Cleaner',
  'Jhadu',
  'Amla',
  'Bridal',
  'Personal Care',
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState(params.q || '');
  const [submittedQuery, setSubmittedQuery] = useState(params.q || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) {
      console.error('Failed to load products for search:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load recent searches
  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) setRecentSearches(list.slice(0, 8));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const saveRecentSearch = async (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    try {
      const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      await storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await storage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Sync if query param changes
  useEffect(() => {
    if (params.q !== undefined && params.q !== query) {
      setQuery(params.q);
      setSubmittedQuery(params.q);
      if (params.q) saveRecentSearch(params.q);
    }
  }, [params.q]);

  // Focus input automatically if opened without query
  useEffect(() => {
    if (!params.q) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [params.q]);

  // Relative suggestions (matching as user types)
  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return { matchingProducts: [], matchingCategories: [] };

    const matchingProducts = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(trimmed) || cat.includes(trimmed) || desc.includes(trimmed);
    }).slice(0, 6);

    const matchingCategories = CATEGORIES.filter(c =>
      c !== 'All' && c.toLowerCase().includes(trimmed)
    ).slice(0, 3);

    return { matchingProducts, matchingCategories };
  }, [query, products]);

  // Filtered products for committed search
  const filteredProducts = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();
    if (!q) return [];

    const words = q.split(/\s+/).filter(Boolean);

    return products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const brand = typeof p.brand_id === 'object' && p.brand_id ? (p.brand_id.name || '').toLowerCase() : '';

      const matchesQuery = words.every(w =>
        name.includes(w) || cat.includes(w) || desc.includes(w) || brand.includes(w)
      );

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

      return matchesQuery && matchesCat;
    });
  }, [submittedQuery, selectedCategory, products]);

  // Available categories for current search results
  const availableCategories = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();
    if (!q) return [];

    const words = q.split(/\s+/).filter(Boolean);
    const matched = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return words.every(w => name.includes(w) || cat.includes(w) || desc.includes(w));
    });

    const set = new Set<string>();
    matched.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [submittedQuery, products]);

  const handleSearchCommit = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSubmittedQuery(clean);
    setQuery(clean);
    setSelectedCategory('All');
    setIsFocused(false);
    saveRecentSearch(clean);
  };

  const handleClear = () => {
    setQuery('');
    setSubmittedQuery('');
    setSelectedCategory('All');
    inputRef.current?.focus();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/shop');
    }
  };

  const handleSelectProduct = (product: Product) => {
    saveRecentSearch(product.name);
    router.push({
      pathname: '/product-details' as any,
      params: {
        id: product._id,
        productJson: JSON.stringify(product),
      },
    });
  };

  const showSuggestions = isFocused && query.trim().length > 0;
  const isSearchActive = submittedQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />

      {/* ── Top Bar with Search Input ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.searchBarContainer}>
          <Search size={18} color={THEME.colors.maroon700} strokeWidth={2} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search products, brands, categories..."
            placeholderTextColor={THEME.colors.ink500}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            returnKeyType="search"
            onSubmitEditing={() => handleSearchCommit(query)}
            onKeyPress={(e: any) => {
              if (e?.key === 'Enter' || e?.nativeEvent?.key === 'Enter') {
                handleSearchCommit(query);
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={THEME.colors.ink500} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {query.trim().length > 0 && (
          <TouchableOpacity
            style={styles.searchActionBtn}
            onPress={() => handleSearchCommit(query)}
            activeOpacity={0.8}
          >
            <Text style={styles.searchActionText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Live Relative Suggestions Overlay ── */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {/* Action to search current query */}
            <TouchableOpacity
              style={styles.suggestionActionRow}
              activeOpacity={0.7}
              onPress={() => handleSearchCommit(query)}
            >
              <Search size={16} color={THEME.colors.maroon700} strokeWidth={2} />
              <Text style={styles.suggestionActionText} numberOfLines={1}>
                Search for "<Text style={styles.boldText}>{query.trim()}</Text>"
              </Text>
              <ArrowRight size={14} color={THEME.colors.ink500} />
            </TouchableOpacity>

            {/* Category matches */}
            {suggestions.matchingCategories.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.suggestionSectionTitle}>MATCHING CATEGORIES</Text>
                <View style={styles.catChipsRow}>
                  {suggestions.matchingCategories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.catChip}
                      onPress={() => {
                        setSubmittedQuery(query.trim());
                        setSelectedCategory(cat);
                        setIsFocused(false);
                      }}
                    >
                      <Tag size={12} color={THEME.colors.maroon700} />
                      <Text style={styles.catChipText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Product matches */}
            {suggestions.matchingProducts.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.suggestionSectionTitle}>RELATIVE PRODUCTS</Text>
                {suggestions.matchingProducts.map(p => {
                  const imgUri = p.images && p.images[0] ? p.images[0] : FALLBACK_IMAGE;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={styles.productSuggestionRow}
                      activeOpacity={0.7}
                      onPress={() => handleSelectProduct(p)}
                    >
                      <Image source={{ uri: imgUri }} style={styles.productThumb} resizeMode="cover" />
                      <View style={styles.productInfoCol}>
                        <Text style={styles.productSuggestionName} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <View style={styles.productMetaRow}>
                          <Text style={styles.productCategoryBadge}>{p.category}</Text>
                          <Text style={styles.productSuggestionPrice}>₹{p.price}</Text>
                        </View>
                      </View>
                      <ArrowRight size={14} color={THEME.colors.ink500} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {suggestions.matchingProducts.length === 0 && suggestions.matchingCategories.length === 0 && (
              <View style={styles.noSuggestionBox}>
                <Text style={styles.noSuggestionText}>
                  Press <Text style={styles.boldText}>Enter</Text> to search for "{query.trim()}"
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Main Content View (When suggestions overlay is not active) ── */}
      {!showSuggestions && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STATE A: ACTIVE SEARCH RESULTS */}
          {isSearchActive ? (
            <View style={styles.resultsContainer}>
              {/* Results summary header */}
              <View style={styles.resultsHeader}>
                <View>
                  <Text style={styles.resultsTitle}>
                    Results for "<Text style={styles.highlightText}>{submittedQuery}</Text>"
                  </Text>
                  <Text style={styles.resultsSubtitle}>
                    {loading ? 'Searching...' : `${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'} found`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetFilterText}>Clear</Text>
                </TouchableOpacity>
              </View>

              {/* Category Filter Chips if multiple categories exist in results */}
              {availableCategories.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipsTrack}
                  style={styles.filterChipsScroll}
                >
                  <TouchableOpacity
                    style={[styles.filterChip, selectedCategory === 'All' && styles.filterChipActive]}
                    onPress={() => setSelectedCategory('All')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === 'All' && styles.filterChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {availableCategories.map(cat => {
                    const active = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setSelectedCategory(active ? 'All' : cat)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Products Grid or Empty State */}
              {loading ? (
                <ActivityIndicator size="large" color={THEME.colors.maroon700} style={{ marginVertical: 48 }} />
              ) : filteredProducts.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <View style={styles.emptyIconCircle}>
                    <Search size={32} color={THEME.colors.maroon700} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.emptyTitle}>No matching products</Text>
                  <Text style={styles.emptySubtitle}>
                    We couldn't find any products matching "{submittedQuery}".{'\n'}
                    Try checking the spelling or searching for general terms like "oil", "cream", or "shampoo".
                  </Text>
                  <TouchableOpacity
                    style={styles.browseAllBtn}
                    onPress={handleClear}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.browseAllBtnText}>Try Another Search</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {filteredProducts.map(p => (
                    <View key={p._id} style={styles.gridItemWrapper}>
                      <ProductCard product={p} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* STATE B: EMPTY SEARCH SCREEN (Recent + Popular) */
            <View style={styles.initialContainer}>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <Clock size={16} color={THEME.colors.ink500} />
                      <Text style={styles.sectionHeading}>Recent Searches</Text>
                    </View>
                    <TouchableOpacity onPress={clearRecentSearches} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagsTrack}>
                    {recentSearches.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.recentTag}
                        onPress={() => handleSearchCommit(item)}
                        activeOpacity={0.7}
                      >
                        <Clock size={12} color={THEME.colors.ink500} style={{ marginRight: 5 }} />
                        <Text style={styles.recentTagText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Popular Searches */}
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <TrendingUp size={16} color={THEME.colors.maroon700} />
                  <Text style={styles.sectionHeading}>Popular Searches</Text>
                </View>
                <View style={styles.tagsTrack}>
                  {POPULAR_SEARCHES.map((tag, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.popularTag}
                      onPress={() => handleSearchCommit(tag)}
                      activeOpacity={0.7}
                    >
                      <TrendingUp size={12} color={THEME.colors.maroon700} style={{ marginRight: 5 }} />
                      <Text style={styles.popularTagText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Quick Categories */}
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Tag size={16} color={THEME.colors.ink900} />
                  <Text style={styles.sectionHeading}>Browse by Category</Text>
                </View>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.filter(c => c !== 'All').slice(0, 8).map((cat, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.categoryCard}
                      onPress={() => {
                        router.push({ pathname: '/(tabs)/shop', params: { category: cat } } as any);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryCardText} numberOfLines={1}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: THEME.colors.blush50,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.pill,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadow,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.ink900,
    paddingVertical: 0,
    outlineStyle: 'none',
  } as any,
  clearBtn: {
    padding: 4,
    marginLeft: 6,
  },
  searchActionBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.colors.maroon700,
    borderRadius: THEME.radius.pill,
  },
  searchActionText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionsContainer: {
    flex: 1,
    backgroundColor: THEME.colors.white,
  },
  suggestionsScroll: {
    paddingVertical: 10,
  },
  suggestionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: THEME.colors.blush50,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  suggestionActionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: THEME.colors.maroon900,
  },
  boldText: {
    fontWeight: '700',
  },
  suggestionSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  suggestionSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.ink500,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  catChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.blushCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.maroon900,
  },
  productSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2eae8',
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  productInfoCol: {
    flex: 1,
  },
  productSuggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.ink900,
    marginBottom: 3,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productCategoryBadge: {
    fontSize: 11,
    color: THEME.colors.ink500,
    backgroundColor: THEME.colors.blush50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productSuggestionPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.maroon700,
  },
  noSuggestionBox: {
    padding: 24,
    alignItems: 'center',
  },
  noSuggestionText: {
    fontSize: 14,
    color: THEME.colors.ink500,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: THEME.colors.blush50,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  resultsContainer: {
    paddingTop: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  highlightText: {
    color: THEME.colors.maroon700,
  },
  resultsSubtitle: {
    fontSize: 12,
    color: THEME.colors.ink500,
    marginTop: 2,
  },
  resetFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: THEME.colors.blush200,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.maroon900,
  },
  filterChipsScroll: {
    marginBottom: 14,
  },
  filterChipsTrack: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.maroon700,
    borderColor: THEME.colors.maroon700,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.ink500,
  },
  filterChipTextActive: {
    color: THEME.colors.white,
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
    marginBottom: 14,
  },
  emptyStateBox: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.blushCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.ink900,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.ink500,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  browseAllBtn: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
  },
  browseAllBtnText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  initialContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  clearAllText: {
    fontSize: 12,
    color: THEME.colors.ink500,
  },
  tagsTrack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  recentTagText: {
    fontSize: 12,
    color: THEME.colors.ink900,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.blushCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  popularTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.maroon900,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    width: '48%',
  },
  categoryCardText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.ink900,
    textAlign: 'center',
  },
});

