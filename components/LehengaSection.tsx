
import React, { useEffect, useState } from 'react';
import { mockApi } from '../services/mockService';
import { useCart } from '../context/CartContext';

interface Lehenga {
  _id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export const LehengaSection: React.FC = () => {
  const [lehengas, setLehengas] = useState<Lehenga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([mockApi.getLehengas(), mockApi.getProducts()]).then(([legacyLehengas, allProducts]) => {
      const categoryLehengas = allProducts.filter(p => p.category === 'Bridal Lehenga').map(p => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        image: p.image,
        description: p.description
      }));
      // Merge unique based on name or id to avoid duplicates if any
      const merged = [...legacyLehengas, ...categoryLehengas];
      const unique = Array.from(new Map(merged.map(item => [item._id, item])).values());
      setLehengas(unique);
      setLoading(false);
    });
  }, []);

  const { addToCart, setIsCartOpen } = useCart();

  const handleBookNow = (lehenga: Lehenga) => {
    addToCart({
      _id: lehenga._id,
      name: lehenga.name,
      price: lehenga.price,
      image: lehenga.image,
      description: lehenga.description,
      category: 'Bridal Lehenga'
    } as any, 1);
    setIsCartOpen(true);
  };

  if (loading || lehengas.length === 0) return null;

  return (
    <section id="lehengas" className="py-16 bg-white">
      <div className="container">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="badge badge-maroon mb-3">
              <i className="fas fa-crown text-[10px]" /> Exclusive
            </span>
            <h2 className="section-title">Lehenga Collection</h2>
            <div className="section-divider" />
            <p className="section-subtitle mt-3 max-w-xl">
              Handcrafted Lehenga pieces for your special moments. Book directly through our portal.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {lehengas.map((lehenga, i) => (
            <div
              key={lehenga._id}
              className={`product-card card overflow-hidden group animate-fade-in-up anim-delay-${Math.min(i + 1, 4)}`}
            >
              {/* Image */}
              <div className="relative h-[400px] overflow-hidden bg-cream-300">
                <img
                  src={lehenga.image}
                  alt={lehenga.name}
                  className="product-card-img w-full h-full object-cover"
                />

                <div className="add-to-cart-overlay" style={{ paddingBottom: '24px' }}>
                  <button
                    onClick={() => handleBookNow(lehenga)}
                    className="add-to-cart-btn-hover btn btn-gold"
                  >
                    <i className="fas fa-shopping-cart" /> Add to Cart
                  </button>
                </div>

                {/* Badge */}
                <div className="absolute top-3 left-3">
                  <span className="badge badge-maroon">
                    <i className="fas fa-crown text-[9px]" /> Exclusive
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="font-semibold text-cream-900 text-base mb-1 group-hover:text-maroon-600 transition-colors line-clamp-1">
                  {lehenga.name}
                </h3>
                <p className="text-xs text-cream-700 mb-4 line-clamp-2">{lehenga.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-maroon-600">₹{lehenga.price.toLocaleString('en-IN')}</span>
                  <button
                    onClick={() => handleBookNow(lehenga)}
                    className="btn btn-outline btn-sm text-xs"
                  >
                    <i className="fas fa-shopping-cart text-maroon-600" /> Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
