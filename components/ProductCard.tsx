
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
    <span
      className="text-gold-500 text-xs inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Rating: ${rating.toFixed(1)} out of 5 stars`}
    >
      {[...Array(full)].map((_, i) => <i key={i} className="fas fa-star" aria-hidden="true" />)}
      {half && <i className="fas fa-star-half-alt" aria-hidden="true" />}
    </span>
  );
};

export const ProductCard: React.FC<Props> = ({ product }) => {
  const { addToCart } = useCart();
  const [imgSrc, setImgSrc] = useState<string>(product.image || FALLBACK_IMAGE);
  const [added, setAdded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  const productImages: string[] = (product.images && product.images.length > 0)
    ? product.images
    : (product.image ? [product.image] : [FALLBACK_IMAGE]);

  const [isWishlisted, setIsWishlisted] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('shagun_wishlist') || '[]');
      return stored.includes(product._id);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setImgSrc(product.image || FALLBACK_IMAGE);
    setSelectedImgIdx(0);
  }, [product.image, product._id]);

  useEffect(() => {
    if (showDetail) {
      setSelectedImgIdx(0);
    }
  }, [showDetail]);

  // WCAG 2.1.2: Close modal on Escape key
  useEffect(() => {
    if (!showDetail) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDetail(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetail]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem('shagun_wishlist') || '[]');
      let updated: string[];
      if (stored.includes(product._id)) {
        updated = stored.filter((id: string) => id !== product._id);
        setIsWishlisted(false);
      } else {
        updated = [...stored, product._id];
        setIsWishlisted(true);
      }
      localStorage.setItem('shagun_wishlist', JSON.stringify(updated));
      window.dispatchEvent(new Event('shagun_wishlist_updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock <= 0) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const isOutOfStock = product.stock <= 0;
  const effectiveMrp = (product.mrp && product.mrp > product.price)
    ? product.mrp
    : Math.round(product.price * 1.25);
  const discountPercent = Math.round(((effectiveMrp - product.price) / effectiveMrp) * 100);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`View details for ${product.name}, price ₹${product.price}`}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetail(true);
          }
        }}
        className="product-card card group cursor-pointer animate-fade-in relative focus-visible:outline-2 focus-visible:outline-maroon-900"
      >
        {/* ── Image ── */}
        <div className="relative aspect-square sm:aspect-auto sm:h-56 overflow-hidden bg-cream-300">
          <img
            src={imgSrc}
            alt={product.name}
            onError={() => setImgSrc(FALLBACK_IMAGE)}
            className={`product-card-img w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
            loading="lazy"
          />

          {/* Hover overlay */}
          <div className="add-to-cart-overlay">
            {isOutOfStock ? (
              <span className="btn bg-gray-700/90 text-white text-xs px-3 py-1.5 rounded-full cursor-not-allowed">
                <i className="fas fa-ban mr-1.5" /> Out of Stock
              </span>
            ) : (
              <button
                onClick={handleAdd}
                className={`add-to-cart-btn-hover btn btn-gold btn-sm ${added ? 'opacity-80' : ''}`}
              >
                {added
                  ? <><i className="fas fa-check mr-1.5" /> Added!</>
                  : <><i className="fas fa-bag-shopping mr-1.5" /> Add to Cart</>
                }
              </button>
            )}
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {isOutOfStock ? (
              <span className="badge bg-red-600 text-white font-bold text-[10px] shadow-sm">
                Out of Stock
              </span>
            ) : product.stock <= 5 ? (
              <span className="badge bg-amber-600 text-white font-bold text-[10px] shadow-sm animate-pulse">
                Only {product.stock} left!
              </span>
            ) : product.stock <= 10 ? (
              <span className="badge badge-maroon text-[10px]">Only {product.stock} left</span>
            ) : null}
            {discountPercent > 0 && !isOutOfStock && (
              <span className="badge bg-emerald-600 text-white font-bold text-[10px] shadow-sm">
                {discountPercent}% OFF
              </span>
            )}
            {productImages.length > 1 && (
              <span className="badge bg-black/60 text-white font-medium text-[10px] shadow-sm backdrop-blur-xs inline-flex items-center gap-1">
                <i className="fas fa-images text-[9px]" /> {productImages.length}
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm z-10 ${isWishlisted
              ? 'bg-red-50 text-red-600 scale-110'
              : 'bg-white/80 hover:bg-white text-ink-500 hover:text-red-500'
              }`}
          >
            <i className={`fas fa-heart text-[10px] sm:text-xs ${isWishlisted ? 'text-red-600' : ''}`} />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="p-2 sm:p-4">
          <div className="text-[8px] sm:text-[10px] text-gold-700 font-semibold uppercase tracking-wider mb-1 truncate">
            {product.category}
          </div>
          <h3 className="font-semibold text-cream-900 text-xs sm:text-base leading-tight mb-1 line-clamp-2 group-hover:text-maroon-600 transition-colors">
            {product.name}
          </h3>

          {/* Rating row */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
            <div className="scale-75 sm:scale-100 origin-left flex items-center">
              <StarRating rating={product.rating} />
            </div>
            <span className="text-[10px] sm:text-xs text-cream-700">{product.rating.toFixed(1)}</span>
            <span className="text-[10px] sm:text-xs text-cream-700 truncate">({product.reviews})</span>
          </div>

          {/* Price + Quick Add */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {effectiveMrp > product.price && (
                  <span className="text-[11px] sm:text-xs text-cream-600 line-through font-medium">
                    ₹{effectiveMrp.toLocaleString('en-IN')}
                  </span>
                )}
                <span className="text-sm sm:text-xl font-bold text-maroon-600">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
              </div>
              {discountPercent > 0 && (
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={isOutOfStock}
              aria-label={isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
              className={`w-6 h-6 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all text-[10px] sm:text-sm
                ${isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                  : added
                    ? 'bg-gold-500 text-maroon-800'
                    : 'bg-cream-200 text-maroon-600 hover:bg-maroon-600 hover:text-white'
                }`}
              title={isOutOfStock ? 'Out of Stock' : 'Add to cart'}
            >
              <i className={`fas ${isOutOfStock ? 'fa-ban' : added ? 'fa-check' : 'fa-plus'}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Product Detail Modal (WCAG 4.1.2 Dialog) ── */}
      {showDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`product-dialog-title-${product._id}`}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-64 bg-cream-200">
              <img
                src={productImages[selectedImgIdx] || imgSrc}
                alt={`${product.name} view ${selectedImgIdx + 1}`}
                onError={() => setImgSrc(FALLBACK_IMAGE)}
                className="w-full h-full object-cover transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-ink-700 flex items-center justify-center shadow-md transition-all focus-visible:outline-2 focus-visible:outline-maroon-900"
                aria-label={`Close ${product.name} details`}
              >
                <i className="fas fa-times text-sm" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={toggleWishlist}
                className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all focus-visible:outline-2 focus-visible:outline-maroon-900 ${isWishlisted ? 'bg-red-50 text-red-600' : 'bg-white/80 text-ink-500 hover:text-red-500'
                  }`}
                aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              >
                <i className="fas fa-heart text-xs" aria-hidden="true" />
              </button>
              {productImages.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {selectedImgIdx + 1} / {productImages.length}
                </div>
              )}
            </div>

            {/* Multi-image thumbnail strip (1-4 images) */}
            {productImages.length > 1 && (
              <div className="flex gap-2 px-6 pt-3 pb-2 bg-cream-50 border-b border-cream-200 overflow-x-auto">
                {productImages.slice(0, 4).map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImgIdx(idx)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      selectedImgIdx === idx
                        ? 'border-maroon-800 ring-2 ring-maroon-300 scale-105'
                        : 'border-cream-300 opacity-65 hover:opacity-100 hover:border-maroon-400'
                    }`}
                    aria-label={`View photo ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="badge badge-cream text-xs">{product.category}</span>
                <span className="text-xs">
                  {product.stock <= 0 ? (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <i className="fas fa-times-circle" aria-hidden="true" /> Out of Stock
                    </span>
                  ) : product.stock <= 5 ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                      <i className="fas fa-exclamation-triangle" aria-hidden="true" /> Only {product.stock} left in stock - order soon!
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <i className="fas fa-check-circle" aria-hidden="true" /> In Stock ({product.stock})
                    </span>
                  )}
                </span>
              </div>

              <h2 id={`product-dialog-title-${product._id}`} className="font-serif font-bold text-xl text-maroon-900 mb-2">
                {product.name}
              </h2>

              <div className="flex items-center gap-2 mb-4">
                <StarRating rating={product.rating} />
                <span className="text-sm font-semibold text-maroon-800">{product.rating.toFixed(1)}</span>
                <span className="text-xs text-cream-700">({product.reviews} customer reviews)</span>
              </div>

              <div className="bg-cream-100 p-4 rounded-xl mb-6">
                <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
                  {effectiveMrp > product.price && (
                    <div className="text-base text-cream-600 line-through font-medium">
                      MRP: ₹{effectiveMrp.toLocaleString('en-IN')}
                    </div>
                  )}
                  <div className="text-2xl font-bold text-maroon-800">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                  {effectiveMrp > product.price && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
                {effectiveMrp > product.price && (
                  <p className="text-xs text-emerald-700 font-semibold mb-1">
                    You save ₹{(effectiveMrp - product.price).toLocaleString('en-IN')}!
                  </p>
                )}
                <p className="text-xs text-cream-700">
                  Free same-day doorstep delivery in Bamitha on orders above ₹399. Pay on delivery available.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isOutOfStock}
                  className={`btn flex-1 justify-center py-3 ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed hover:bg-gray-300'
                      : 'btn-primary'
                  }`}
                >
                  {isOutOfStock ? (
                    <><i className="fas fa-ban mr-2" /> Out of Stock</>
                  ) : added ? (
                    <><i className="fas fa-check mr-2" /> Added to Cart</>
                  ) : (
                    <><i className="fas fa-bag-shopping mr-2" /> Add to Cart</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetail(false)}
                  className="btn btn-outline px-5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
