
import React from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface Props {
  product: Product;
}

export const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();

  return (
    <div className="group relative h-[420px] w-full cursor-pointer">
      <div className="absolute inset-0 glass-card rounded-2xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300 hover:shadow-gold-500/10 hover:border-white/20">

        {/* Image */}
        <div className="h-64 w-full overflow-hidden bg-white/5 relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
            <button
              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
              className="bg-gold-500 text-black font-bold py-2 px-6 rounded-full shadow-lg hover:bg-gold-400 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
            >
              Add to Cart
            </button>
          </div>
          {product.isBestseller && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-gold-500 to-amber-500 text-black text-xs font-bold px-2 py-1 rounded shadow-lg">
              BESTSELLER
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 text-left">
          <p className="text-gold-500 text-xs font-bold tracking-wider mb-1 uppercase">{product.category}</p>
          <h3 className="text-xl font-semibold text-white mb-2 line-clamp-1">{product.name}</h3>

          <div className="flex items-center justify-between mt-4">
            <span className="text-2xl font-bold text-white">₹{product.price}</span>
            <div className="flex items-center text-yellow-500 text-sm">
              <i className="fas fa-star mr-1"></i>
              <span>{product.rating}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
