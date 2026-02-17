
import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { mockApi } from '../services/mockService';
import { Product } from '../types';
import { CATEGORIES } from '../constants';

export const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    mockApi.getProducts().then(data => {
      setProducts(data);
      setFilteredProducts(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = [...products];

    // Search
    if (search) {
      result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Category
    if (category !== 'All') {
      result = result.filter(p => p.category === category);
    }

    // Sort
    if (sort === 'low-high') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'high-low') {
      result.sort((a, b) => b.price - a.price);
    }
    // newest assumed default order

    setFilteredProducts(result);
  }, [search, category, sort, products]);

  if (loading) return <div className="min-h-screen bg-midnight-950 flex items-center justify-center text-white">Loading Premium Experience...</div>;

  return (
    <div className="min-h-screen bg-midnight-950 pt-24 px-4 pb-20">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-8 text-center">Our Collection</h1>
        
        {/* Filters */}
        <div className="glass p-6 rounded-2xl mb-12 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          <div className="flex gap-4 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap px-6 py-2 rounded-full border transition-all ${
                  category === cat 
                    ? 'bg-gold-500 text-black border-gold-500 font-bold' 
                    : 'bg-transparent text-gray-300 border-white/20 hover:border-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select 
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-black/50 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gold-500"
          >
            <option value="newest">Newest First</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
          </select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center text-gray-400 py-20">
            <h3 className="text-2xl">No products found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
