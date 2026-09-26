import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { LehengaSection } from '../components/LehengaSection';
import { mockApi } from '../services/mockService';
import { Product } from '../types';

export const BridalLehenga: React.FC = () => {
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
          // Filter ONLY Bridal Lehenga category
          const lehengas = data.filter(p => p.category === 'Bridal Lehenga');
          setProducts(lehengas);
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
          <h1 className="font-serif text-4xl font-bold mb-3">Bridal Lehengas</h1>
          <p className="text-cream-300">Handcrafted lehengas for your special moments.</p>
        </div>
      </div>

      <div className="container">
        {/* We can include the LehengaSection here since it also pulls from legacy lehengas */}
        <LehengaSection />
      </div>
    </div>
  );
};
