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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Search,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  Tag,
  MessageSquare,
  HelpCircle,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { Product } from '../types';
import { CATEGORIES, FALLBACK_IMAGE } from '../constants';
import ProductCard from '../components/ProductCard';
import { useSmartBack } from '../components/useAndroidBackHandler';

const RECENT_SEARCHES_KEY = 'shagun_recent_searches';

const POPULAR_SEARCHES = [
  'Mamaearth',
  'Face Wash',
  'Nivea',
  'Vaseline',
  'Ponds',
  'Lotion',
  'Soap',
  'Shampoo',
  'Hair Oil',
  'Cream',
];

export default function SearchScreen() {
  useSmartBack();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState(params.q || '');
  const [submittedQuery, setSubmittedQuery] = useState(params.q || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchMode, setSearchMode] = useState<'exact' | 'fuzzy' | 'partial'>('exact');
  const [correctedQuery, setCorrectedQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [liveSuggestions, setLiveSuggestions] = useState<{
    products: Array<{ _id: string; name: string; category: string; price: number; image: string }>;
    brands: string[];
    categories: string[];
    didYouMean: string;
  }>({ products: [], brands: [], categories: [], didYouMean: '' });

  const reqSequenceRef = useRef<number>(0);

  // Load recent searches on mount
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

  // Perform search with race condition prevention
  const performSearch = useCallback(async (searchTerm: string, categoryFilter: string = 'All') => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults([]);
      setCorrectedQuery('');
      setLoading(false);
      return;
    }

    const currentReqId = ++reqSequenceRef.current;
    setLoading(true);

    try {
      const res = await api.searchProductsDetailed(term, {
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        limit: 50,
      });

      // Ignore stale responses if a newer request was dispatched
      if (currentReqId !== reqSequenceRef.current) return;

      setSearchResults(res.products);
      setSearchMode(res.mode);
      setCorrectedQuery(res.correctedQuery);
    } catch (err) {
      if (currentReqId === reqSequenceRef.current) {
        console.warn('Search execution failed', err);
        setSearchResults([]);
      }
    } finally {
      if (currentReqId === reqSequenceRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Debounced live suggestions when typing
  useEffect(() => {
    const term = query.trim();
    if (!term || !isFocused) {
      setLiveSuggestions({ products: [], brands: [], categories: [], didYouMean: '' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await api.getSuggestions(term);
        setLiveSuggestions(data);
      } catch (e) {
        // ignore
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isFocused]);

  // Sync if query param passed from navigation
  useEffect(() => {
    if (params.q !== undefined && params.q !== query) {
      setQuery(params.q);
      setSubmittedQuery(params.q);
      saveRecentSearch(params.q);
      performSearch(params.q, 'All');
    }
  }, [params.q, performSearch]);

  // Auto-focus input if launched fresh
  useEffect(() => {
    if (!params.q) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [params.q]);

  const handleSearchCommit = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSubmittedQuery(clean);
    setQuery(clean);
    setSelectedCategory('All');
    setIsFocused(false);
    saveRecentSearch(clean);
    performSearch(clean, 'All');
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    performSearch(submittedQuery, cat);
  };

  const handleClear = () => {
    setQuery('');
    setSubmittedQuery('');
    setSelectedCategory('All');
    setSearchResults([]);
    setCorrectedQuery('');
    inputRef.current?.focus();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/shop');
    }
  };

  const handleSelectProduct = (productId: string, productObj?: Product) => {
    router.push({
      pathname: '/product-details' as any,
      params: {
        id: productId,
        productJson: productObj ? JSON.stringify(productObj) : undefined,
      },
    });
  };

  // Available categories derived from results
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    searchResults.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [searchResults]);

  const showSuggestions = isFocused && query.trim().length > 0;
  const isSearchActive = submittedQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />

      {/* Top Bar with Search Input */}
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
            placeholder="Search products, brands, daily items..."
            placeholderTextColor={THEME.colors.ink500}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            returnKeyType="search"
            onSubmitEditing={() => handleSearchCommit(query)}
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

      {/* Live Suggestions Overlay While Typing */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {/* Search current query action */}
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

            {/* Did you mean suggestion */}
            {liveSuggestions.didYouMean && liveSuggestions.didYouMean !== query.trim().toLowerCase() && (
              <TouchableOpacity
                style={styles.didYouMeanBox}
                activeOpacity={0.8}
                onPress={() => handleSearchCommit(liveSuggestions.didYouMean)}
              >
                <Sparkles size={16} color={THEME.colors.maroon700} />
                <Text style={styles.didYouMeanText}>
                  Did you mean: <Text style={styles.boldText}>{liveSuggestions.didYouMean}</Text>?
                </Text>
              </TouchableOpacity>
            )}

            {/* Matching Categories */}
            {liveSuggestions.categories.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.suggestionSectionTitle}>CATEGORIES</Text>
                <View style={styles.catChipsRow}>
                  {liveSuggestions.categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.catChip}
                      onPress={() => {
                        handleCategorySelect(cat);
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

            {/* Matching Brands */}
            {liveSuggestions.brands.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.suggestionSectionTitle}>BRANDS</Text>
                <View style={styles.catChipsRow}>
                  {liveSuggestions.brands.map(brand => (
                    <TouchableOpacity
                      key={brand}
                      style={styles.catChip}
                      onPress={() => handleSearchCommit(brand)}
                    >
                      <Sparkles size={12} color={THEME.colors.maroon700} />
                      <Text style={styles.catChipText}>{brand}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Relative Products */}
            {liveSuggestions.products.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.suggestionSectionTitle}>POPULAR MATCHES</Text>
                {liveSuggestions.products.map(p => (
                  <TouchableOpacity
                    key={p._id}
                    style={styles.productSuggestionRow}
                    activeOpacity={0.7}
                    onPress={() => handleSelectProduct(p._id)}
                  >
                    <Image source={{ uri: p.image || FALLBACK_IMAGE }} style={styles.productThumb} resizeMode="cover" />
                    <View style={styles.productInfoCol}>
                      <Text style={styles.productNameText} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.productCategoryText}>{p.category} • ₹{p.price}</Text>
                    </View>
                    <ArrowRight size={14} color={THEME.colors.ink500} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Main Content View */}
      {!showSuggestions && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isSearchActive ? (
            <View style={styles.resultsContainer}>
              {/* Corrected Query / Typo Notice */}
              {correctedQuery ? (
                <View style={styles.correctedBanner}>
                  <Sparkles size={16} color={THEME.colors.maroon700} style={{ marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.correctedText}>
                      Showing results for <Text style={styles.boldText}>{correctedQuery}</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        performSearch(submittedQuery, selectedCategory);
                        setCorrectedQuery('');
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.originalQueryLink}>
                        Search original: "{submittedQuery}"
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* Results summary header */}
              <View style={styles.resultsHeader}>
                <View>
                  <Text style={styles.resultsTitle}>
                    Results for "<Text style={styles.highlightText}>{submittedQuery}</Text>"
                  </Text>
                  <Text style={styles.resultsSubtitle}>
                    {loading ? 'Searching...' : `${searchResults.length} product${searchResults.length === 1 ? '' : 's'} found (${searchMode} match)`}
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
                    onPress={() => handleCategorySelect('All')}
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
                        onPress={() => handleCategorySelect(active ? 'All' : cat)}
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
              ) : searchResults.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <View style={styles.emptyIconCircle}>
                    <Search size={32} color={THEME.colors.maroon700} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.emptyTitle}>No matching products</Text>
                  <Text style={styles.emptySubtitle}>
                    We couldn't find any products matching "{submittedQuery}".{'\n'}
                    Try checking the spelling or browse our popular categories below.
                  </Text>

                  {/* Quick Browse Categories */}
                  <View style={styles.popularCategoriesRow}>
                    {['Skin Care', 'Hair Care', 'Personal Care', 'Daily Use'].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={styles.popularCategoryBtn}
                        onPress={() => handleCategorySelect(cat)}
                      >
                        <Tag size={12} color={THEME.colors.maroon700} />
                        <Text style={styles.popularCategoryText}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Feedback Link for Missed Products */}
                  <TouchableOpacity
                    style={styles.feedbackLinkBox}
                    onPress={() => router.push('/(tabs)/account' as any)}
                    activeOpacity={0.7}
                  >
                    <MessageSquare size={16} color={THEME.colors.maroon700} style={{ marginRight: 6 }} />
                    <Text style={styles.feedbackLinkText}>
                      Can't find an item? Tell us what you were looking for
                    </Text>
                  </TouchableOpacity>

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
                  {searchResults.map(p => (
                    <View key={p._id} style={styles.gridItemWrapper}>
                      <ProductCard product={p} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* STATE B: INITIAL SEARCH SCREEN (Recent + Popular) */
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
                  <Sparkles size={16} color={THEME.colors.maroon700} />
                  <Text style={styles.sectionHeading}>Popular Searches</Text>
                </View>
                <View style={styles.tagsTrack}>
                  {POPULAR_SEARCHES.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.popularTag}
                      onPress={() => handleSearchCommit(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.popularTagText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Browse All Categories */}
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Tag size={16} color={THEME.colors.maroon700} />
                  <Text style={styles.sectionHeading}>Browse Categories</Text>
                </View>
                <View style={styles.categoriesGrid}>
                  {CATEGORIES.filter(c => c !== 'All').map((cat, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.categoryCard}
                      onPress={() => {
                        router.push({
                          pathname: '/(tabs)/shop',
                          params: { category: cat },
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryCardText}>{cat}</Text>
                      <ArrowRight size={14} color={THEME.colors.ink500} />
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.blush50,
    borderRadius: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.ink900,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  searchActionBtn: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionsContainer: {
    flex: 1,
    backgroundColor: THEME.colors.white,
  },
  suggestionsScroll: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
    gap: 10,
  },
  suggestionActionText: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.ink900,
  },
  boldText: {
    fontWeight: '700',
    color: THEME.colors.maroon700,
  },
  didYouMeanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginVertical: 10,
    gap: 8,
  },
  didYouMeanText: {
    fontSize: 13,
    color: '#92400e',
  },
  suggestionSection: {
    marginTop: 16,
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
    backgroundColor: THEME.colors.blush50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    gap: 6,
  },
  catChipText: {
    fontSize: 12,
    color: THEME.colors.maroon700,
    fontWeight: '600',
  },
  productSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
    gap: 10,
  },
  productThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: THEME.colors.peach100,
  },
  productInfoCol: {
    flex: 1,
  },
  productNameText: {
    fontSize: 13,
    color: THEME.colors.ink900,
    fontWeight: '600',
  },
  productCategoryText: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  resultsContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  correctedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  correctedText: {
    fontSize: 13,
    color: THEME.colors.ink900,
  },
  originalQueryLink: {
    fontSize: 12,
    color: THEME.colors.maroon700,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 15,
    color: THEME.colors.ink900,
  },
  highlightText: {
    fontWeight: '700',
    color: THEME.colors.maroon700,
  },
  resultsSubtitle: {
    fontSize: 12,
    color: THEME.colors.ink500,
    marginTop: 2,
  },
  resetFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resetFilterText: {
    fontSize: 13,
    color: THEME.colors.maroon700,
    fontWeight: '600',
  },
  filterChipsScroll: {
    marginBottom: 14,
  },
  filterChipsTrack: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.maroon700,
    borderColor: THEME.colors.maroon700,
  },
  filterChipText: {
    fontSize: 12,
    color: THEME.colors.ink900,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItemWrapper: {
    width: '50%',
    padding: 6,
  },
  emptyStateBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.peach100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.ink900,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.ink500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  popularCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  popularCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  popularCategoryText: {
    fontSize: 12,
    color: THEME.colors.maroon700,
    fontWeight: '600',
  },
  feedbackLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  feedbackLinkText: {
    fontSize: 12,
    color: '#6d28d9',
    fontWeight: '600',
  },
  browseAllBtn: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  browseAllBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  initialContainer: {
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  clearAllText: {
    fontSize: 12,
    color: THEME.colors.maroon700,
    fontWeight: '600',
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
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  recentTagText: {
    fontSize: 12,
    color: THEME.colors.ink900,
  },
  popularTag: {
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  popularTagText: {
    fontSize: 12,
    color: THEME.colors.ink900,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  categoryCardText: {
    fontSize: 13,
    color: THEME.colors.ink900,
    fontWeight: '600',
  },
});
