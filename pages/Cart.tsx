
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FALLBACK_IMAGE } from '../constants';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-4"
        style={{ backgroundColor: 'var(--clr-cream)' }}>
        <div className="card p-12 text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-cream-300 flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-bag-shopping text-3xl text-maroon-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-maroon-700 mb-2">Your Cart is Empty</h2>
          <p className="text-cream-700 text-sm mb-8">Looks like you haven't added anything yet!</p>
          <Link to="/shop" className="btn btn-primary w-full justify-center">
            <i className="fas fa-store" /> Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: 'var(--clr-cream)' }}>
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="breadcrumb mb-2">
            <Link to="/">Home</Link>
            <i className="fas fa-chevron-right text-[8px] text-cream-600" />
            <span className="text-cream-700">Cart</span>
          </div>
          <h1 className="section-title">Shopping Cart</h1>
          <div className="section-divider" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Cart Items ── */}
          <div className="flex-1 space-y-4">
            {cart.map(item => (
              <div key={item._id} className="card p-4 flex items-center gap-4">
                {/* Product image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream-300 flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gold-600 font-semibold uppercase tracking-wider mb-0.5">{item.category}</p>
                  <h3 className="font-semibold text-maroon-700 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h3>
                  <p className="text-maroon-600 font-bold">₹{item.price.toLocaleString('en-IN')}</p>
                </div>

                {/* Qty stepper */}
                <div className="qty-stepper flex-shrink-0">
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >−</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  >+</button>
                </div>

                {/* Item total */}
                <div className="hidden sm:block text-right flex-shrink-0 w-20">
                  <p className="text-xs text-cream-600 mb-0.5">Total</p>
                  <p className="font-bold text-maroon-700">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFromCart(item._id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all text-cream-600 hover:bg-red-50 hover:text-red-500"
                  title="Remove"
                >
                  <i className="fas fa-trash-can text-sm" />
                </button>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors mt-2 flex items-center gap-1"
            >
              <i className="fas fa-trash" /> Clear entire cart
            </button>
          </div>

          {/* ── Order Summary ── */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="card p-6 sticky top-24">
              <h3 className="font-serif font-bold text-maroon-700 text-xl mb-6">Order Summary</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-cream-700">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="font-medium text-maroon-700">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm text-cream-700">
                  <span>Delivery</span>
                  <span className={totalPrice >= 500 ? 'text-green-600 font-medium' : 'text-maroon-600 font-medium'}>
                    {totalPrice >= 500 ? 'FREE' : '₹50'}
                  </span>
                </div>
                {totalPrice < 500 && (
                  <div className="text-xs text-cream-600 bg-cream-200 rounded-lg px-3 py-2">
                    <i className="fas fa-info-circle text-gold-500 mr-1" />
                    Add ₹{(500 - totalPrice).toLocaleString('en-IN')} more for free delivery
                  </div>
                )}
                <div className="h-px bg-cream-300" />
                <div className="flex justify-between font-bold">
                  <span className="text-maroon-700">Total</span>
                  <span className="text-xl text-maroon-600">
                    ₹{(totalPrice + (totalPrice >= 500 ? 0 : 50)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="btn btn-primary w-full justify-center btn-lg mb-3"
              >
                <i className="fas fa-lock text-xs" /> Proceed to Checkout
              </button>

              <Link to="/shop" className="btn btn-outline w-full justify-center text-sm">
                <i className="fas fa-arrow-left text-xs" /> Continue Shopping
              </Link>

              {/* Trust badges */}
              <div className="mt-6 pt-5 border-t border-cream-300">
                <p className="text-xs text-center text-cream-600 mb-3">Secure Checkout</p>
                <div className="flex justify-center gap-4 text-cream-500">
                  {['fa-lock', 'fa-shield-check', 'fa-mobile-screen'].map(ic => (
                    <i key={ic} className={`fas ${ic} text-lg`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
