
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { mockApi } from '../services/mockService';
import { Product } from '../types';
import { CATEGORIES } from '../constants';

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest First' },
  { value: 'low-high', label: 'Price: Low → High' },
  { value: 'high-low', label: 'Price: High → Low' },
  { value: 'rating',   label: 'Top Rated' },
];

const CAT_ICONS: Record<string, string> = {
  'All':             'fa-border-all',
  'Personal Care':   'fa-hand-sparkles',
  'Skin Care':       'fa-face-smile',
  'Makeup':          'fa-lipstick',
  'Bridal Lehenga':  'fa-crown',
  'Toy':             'fa-puzzle-piece',
  'General Use':     'fa-box-open',
  'Bangle':          'fa-ring',
  'Cream':           'fa-jar',
  'Powder':          'fa-wand-sparkles',
  'Other':           'fa-ellipsis',
};

export const Shop: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const stateCategory = location.state?.category as string;
  const defaultCat = stateCategory || params.get('cat') || 'All';

  const [products, setProducts]               = useState<Product[]>([]);
  const [filteredProducts, setFiltered]       = useState<Product[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState('');
  const [category, setCategory]               = useState(defaultCat);
  const [sort, setSort]                       = useState('newest');
  const [showFilters, setShowFilters]         = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const s = location.state?.category as string;
    const newCat = s || p.get('cat');
    if (newCat) setCategory(newCat);
  }, [location.search, location.state]);

  useEffect(() => {
    let lastTimestamp = 0;
    const fetchProducts = async (force = false) => {
      try {
        const needsUpdate = await mockApi.checkUpdates(lastTimestamp);
        if (needsUpdate || force) {
          let data = await mockApi.getProducts();
          // Hide specialized sections from the main shop
          data = data.filter(p => p.category !== 'Makeup' && p.category !== 'Bridal Lehenga');
          setProducts(data);
          setFiltered(prev => prev.length === 0 ? data : prev);
          setLoading(false);
          lastTimestamp = Number(localStorage.getItem('shagun_data_version') || Date.now());
        }
      } catch (err) { console.error('Fetch failed', err); }
    };
    fetchProducts(true);
    const iv = setInterval(() => fetchProducts(), 2500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let result = [...products];
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category !== 'All') result = result.filter(p => p.category === category);
    if (sort === 'low-high') result.sort((a, b) => a.price - b.price);
    else if (sort === 'high-low') result.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
    setFiltered(result);
  }, [search, category, sort, products]);

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: 'var(--clr-cream)' }}>

      {/* ── Page Header ── */}
      <div
        className="py-12 md:py-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7A1F2E 0%, #5C1622 100%)' }}
      >
        <div className="absolute inset-0 paisley-pattern opacity-20" />
        <div className="container relative z-10">
          {/* Breadcrumb */}
          <div className="breadcrumb mb-4">
            <a href="/" style={{ color: 'rgba(201,162,75,0.8)' }}>Home</a>
            <i className="fas fa-chevron-right text-[8px]" style={{ color: 'rgba(251,243,231,0.4)' }} />
            <span style={{ color: 'rgba(251,243,231,0.6)' }}>Shop</span>
          </div>
          <h1 className="font-serif text-white mb-2" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 700 }}>
            Our Collection
          </h1>
          <p className="text-sm" style={{ color: 'rgba(251,243,231,0.65)' }}>
            {loading ? 'Loading products…' : `${filteredProducts.length} of ${products.length} products`}
            {category !== 'All' && <span className="ml-2 badge badge-gold text-xs">{category}</span>}
          </p>
        </div>
      </div>

      {/* ── Search & Sort Bar ── */}
      <div className="bg-white border-b border-cream-300 sticky top-16 z-30">
        <div className="container py-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-600 text-sm" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10 pr-4 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="input-field text-sm flex-1 sm:flex-none sm:w-44 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Filter toggle (mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline btn-sm flex-shrink-0 sm:hidden"
            >
              <i className="fas fa-sliders" /> Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="container py-8">
        <div className="flex gap-8">

          {/* ── Sidebar: Categories ── */}
          <aside className={`flex-shrink-0 w-52 ${showFilters ? 'block' : 'hidden'} sm:block`}>
            <div className="card p-4 sticky top-36">
              <h3 className="text-xs font-bold tracking-widest text-maroon-700 uppercase mb-4">
                <i className="fas fa-filter mr-2 text-gold-500" /> Categories
              </h3>
              <div className="space-y-1">
                {CATEGORIES.filter(c => c !== 'Makeup' && c !== 'Bridal Lehenga').map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setShowFilters(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                      ${category === cat
                        ? 'bg-maroon-600 text-white'
                        : 'text-cream-800 hover:bg-cream-200 hover:text-maroon-600'
                      }`}
                  >
                    <i className={`fas ${CAT_ICONS[cat] || 'fa-tag'} text-xs w-4 text-center flex-shrink-0`} />
                    {cat}
                    <span className="ml-auto text-[10px] opacity-60">
                      {cat === 'All'
                        ? products.length
                        : products.filter(p => p.category === cat).length
                      }
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Product Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Active filters display */}
            {(category !== 'All' || search) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {category !== 'All' && (
                  <span className="category-pill active text-xs gap-2">
                    {category}
                    <button onClick={() => setCategory('All')} className="ml-1 hover:text-gold-300">
                      <i className="fas fa-times text-[10px]" />
                    </button>
                  </span>
                )}
                {search && (
                  <span className="category-pill active text-xs">
                    "{search}"
                    <button onClick={() => setSearch('')} className="ml-1">
                      <i className="fas fa-times text-[10px]" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => { setCategory('All'); setSearch(''); }}
                  className="text-xs text-maroon-600 hover:underline font-medium"
                >
                  Clear all
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card h-80 bg-cream-300 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-cream-300 flex items-center justify-center mb-6">
                  <i className="fas fa-box-open text-3xl text-maroon-400" />
                </div>
                <h3 className="text-xl font-serif font-bold text-maroon-700 mb-2">No products found</h3>
                <p className="text-cream-700 text-sm mb-6">Try adjusting your search or browse a different category.</p>
                <button
                  onClick={() => { setSearch(''); setCategory('All'); }}
                  className="btn btn-primary"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((p, i) => (
                  <div key={p._id} className="animate-fade-in-up" style={{ animationDelay: `${(i % 8) * 0.06}s` }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
