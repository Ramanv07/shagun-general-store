import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { mockApi } from '../services/mockService';
import { Product } from '../types';

export const BeautyParlor: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let lastTimestamp = 0;
    const fetchProducts = async (force = false) => {
      try {
        const needsUpdate = await mockApi.checkUpdates(lastTimestamp);
        if (needsUpdate || force) {
          const data = await mockApi.getProducts();
          // Filter ONLY Makeup category
          const makeup = data.filter(p => p.category === 'Makeup');
          setProducts(makeup);
          setLoading(false);
          lastTimestamp = Number(localStorage.getItem('shagun_data_version') || Date.now());
        }
      } catch (err) { console.error('Fetch failed', err); }
    };
    fetchProducts(true);
    const iv = setInterval(() => fetchProducts(), 2500);
    return () => clearInterval(iv);
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'low-high') return a.price - b.price;
    if (sort === 'high-low') return b.price - a.price;
    if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0; // newest
  });

  return (
    <div className="min-h-screen pt-24 pb-12" style={{ backgroundColor: 'var(--clr-cream)' }}>
      {/* Page Header */}
      <div className="bg-maroon-700 text-white py-12 mb-8">
        <div className="container">
          <h1 className="font-serif text-4xl font-bold mb-3">Beauty Parlor</h1>
          <p className="text-cream-300">Premium makeup and beauty products for your glow-up.</p>
        </div>
      </div>

      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <p className="text-maroon-700 font-semibold">{products.length} products found</p>
          <select 
            className="px-4 py-2 rounded-xl border border-cream-300 bg-white text-maroon-800 shadow-sm focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none transition-all"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="low-high">Price: Low → High</option>
            <option value="high-low">Price: High → Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-80 bg-cream-300 animate-pulse" />
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedProducts.map((p, i) => (
              <div key={p._id} className={`animate-fade-in-up anim-delay-${Math.min(i + 1, 4)}`}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 card">
            <div className="text-cream-400 text-5xl mb-4"><i className="fas fa-lipstick" /></div>
            <h3 className="text-maroon-700 font-serif text-xl font-bold mb-2">No beauty products found</h3>
            <p className="text-cream-600">Check back later for new arrivals.</p>
          </div>
        )}
      </div>
    </div>
  );
};
