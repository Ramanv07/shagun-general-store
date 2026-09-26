
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { FALLBACK_IMAGE } from '../constants';

interface Props {
  product: Product;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="text-gold-500 text-xs">
      {[...Array(full)].map((_, i) => <i key={i} className="fas fa-star" />)}
      {half && <i className="fas fa-star-half-alt" />}
    </span>
  );
};

export const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();
  const [imgSrc, setImgSrc] = useState<string>(product.image || FALLBACK_IMAGE);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setImgSrc(product.image || FALLBACK_IMAGE);
  }, [product.image]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="product-card card group cursor-pointer animate-fade-in">
      {/* ── Image ── */}
      <div className="relative h-56 overflow-hidden bg-cream-300">
        <img
          src={imgSrc}
          alt={product.name}
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          className="product-card-img w-full h-full object-cover"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className="add-to-cart-overlay">
          <button
            onClick={handleAdd}
            className={`add-to-cart-btn-hover btn btn-gold btn-sm ${added ? 'opacity-80' : ''}`}
          >
            {added
              ? <><i className="fas fa-check mr-1.5" /> Added!</>
              : <><i className="fas fa-bag-shopping mr-1.5" /> Add to Cart</>
            }
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isBestseller && (
            <span className="badge badge-gold">
              <i className="fas fa-trophy text-[8px]" /> Bestseller
            </span>
          )}
          {product.stock <= 10 && product.stock > 0 && (
            <span className="badge badge-maroon text-[10px]">Only {product.stock} left</span>
          )}
        </div>

        {/* Category chip top-right */}
        <div className="absolute top-3 right-3">
          <span className="badge badge-cream text-[10px]">{product.category}</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-4">
        <h3 className="font-semibold text-cream-900 text-base leading-tight mb-1 line-clamp-2 group-hover:text-maroon-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating row */}
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={product.rating} />
          <span className="text-xs text-cream-700">{product.rating.toFixed(1)}</span>
          <span className="text-xs text-cream-600">({product.reviews})</span>
        </div>

        {/* Price + Quick Add */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-maroon-600">₹{product.price.toLocaleString('en-IN')}</span>
          </div>
          <button
            onClick={handleAdd}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm
              ${added
                ? 'bg-gold-500 text-maroon-800'
                : 'bg-cream-200 text-maroon-600 hover:bg-maroon-600 hover:text-white'
              }`}
            title="Add to cart"
          >
            <i className={`fas ${added ? 'fa-check' : 'fa-plus'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
