import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface BrandItem {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  active: boolean;
}

export const BrandsYouLove: React.FC = () => {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/brands/active-with-products')
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (isMounted) {
          setBrands(Array.isArray(data) ? data : []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBrands([]);
          setLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Strict condition: row stays completely hidden if no active brands with products
  if (!loaded || brands.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-white border-y border-cream-200">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="badge badge-gold mb-2">
              <i className="fas fa-crown text-[10px]" /> Verified Partners
            </span>
            <h2 className="section-title">Brands You Love</h2>
            <div className="section-divider" />
          </div>
          <Link to="/shop" className="text-sm font-semibold text-maroon-700 hover:text-gold-600 transition flex items-center gap-1">
            Browse Catalog <i className="fas fa-arrow-right text-xs" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:overflow-visible">
          {brands.map(brand => (
            <Link
              key={brand._id}
              to={`/shop?brand=${encodeURIComponent(brand.slug || brand.name || brand._id)}`}
              className="group flex-shrink-0 w-36 sm:w-auto bg-cream-50 hover:bg-white rounded-2xl p-4 border border-cream-200 hover:border-gold-400 hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-xl bg-white p-2 flex items-center justify-center border border-cream-100 group-hover:scale-105 transition-transform duration-300 shadow-sm mb-3">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-full max-w-full object-contain"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-2xl font-serif font-bold text-maroon-700">
                    {brand.name[0]}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-maroon-900 group-hover:text-maroon-600 transition-colors line-clamp-1">
                {brand.name}
              </span>
              {brand.description && (
                <span className="text-[11px] text-cream-600 line-clamp-1 mt-0.5">
                  {brand.description}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

