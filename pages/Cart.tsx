
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FALLBACK_IMAGE } from '../constants';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<{ code: string; discount: number } | null>(() => {
    try {
      const saved = sessionStorage.getItem('shagun_applied_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [couponMessage, setCouponMessage] = React.useState<{ text: string; isError: boolean } | null>(null);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (appliedCoupon?.code === code) {
      setCouponMessage({ text: 'This coupon is already applied.', isError: true });
      return;
    }

    if (code === 'SHAGUN10') {
      const discount = Math.round(totalPrice * 0.1);
      const couponObj = { code, discount };
      setAppliedCoupon(couponObj);
      sessionStorage.setItem('shagun_applied_coupon', JSON.stringify(couponObj));
      setCouponMessage({ text: `Code SHAGUN10 applied: ₹${discount} off!`, isError: false });
    } else if (code === 'Bamitha50') {
      const discount = Math.min(50, totalPrice);
      const couponObj = { code, discount };
      setAppliedCoupon(couponObj);
      sessionStorage.setItem('shagun_applied_coupon', JSON.stringify(couponObj));
      setCouponMessage({ text: `Code Bamitha50 applied: ₹${discount} off!`, isError: false });
    } else if (code === 'EXPIRED2025' || code === 'SAVE2024') {
      setCouponMessage({ text: 'This coupon code has expired.', isError: true });
    } else {
      setCouponMessage({ text: 'Invalid coupon code. Try SHAGUN10 or Bamitha50.', isError: true });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem('shagun_applied_coupon');
    setCouponMessage(null);
    setCouponCode('');
  };

  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const deliveryFee = totalPrice >= 399 ? 0 : 30;
  const finalTotal = Math.max(0, totalPrice - discountAmount + deliveryFee);

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
                  <p className="text-xs text-gold-700 font-semibold uppercase tracking-wider mb-0.5">{item.category}</p>
                  <h3 className="font-semibold text-maroon-700 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h3>
                  <p className="text-maroon-600 font-bold">₹{item.price.toLocaleString('en-IN')}</p>
                  {typeof item.stock === 'number' && item.stock <= 0 ? (
                    <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                      <i className="fas fa-times-circle" /> Out of Stock — please remove to proceed
                    </p>
                  ) : typeof item.stock === 'number' && item.quantity >= item.stock ? (
                    <p className="text-[11px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                      <i className="fas fa-info-circle" /> Max available stock reached ({item.stock} in stock)
                    </p>
                  ) : null}
                </div>

                {/* Qty stepper */}
                <div className="qty-stepper flex-shrink-0" role="group" aria-label={`Quantity for ${item.name}`}>
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease quantity of ${item.name}`}
                  >−</button>
                  <span className="qty-value" aria-label={`Current quantity: ${item.quantity}`}>{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    disabled={typeof item.stock === 'number' && (item.stock <= 0 || item.quantity >= item.stock)}
                    aria-label={`Increase quantity of ${item.name}`}
                    title={typeof item.stock === 'number' && item.quantity >= item.stock ? `Only ${item.stock} available in stock` : 'Increase quantity'}
                  >+</button>
                </div>

                {/* Item total */}
                <div className="hidden sm:block text-right flex-shrink-0 w-20">
                  <p className="text-xs text-cream-700 mb-0.5">Total</p>
                  <p className="font-bold text-maroon-700">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFromCart(item._id)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all text-cream-700 hover:bg-red-50 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-maroon-900"
                  title="Remove"
                >
                  <i className="fas fa-trash-can text-sm" aria-hidden="true" />
                </button>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors mt-2 flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-maroon-900"
            >
              <i className="fas fa-trash" aria-hidden="true" /> Clear entire cart
            </button>
          </div>

          {/* ── Order Summary ── */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="card p-6 sticky top-24">
              <h3 className="font-serif font-bold text-maroon-700 text-xl mb-6">Order Summary</h3>

              {/* Coupon Code Section */}
              <div className="mb-5 pb-5 border-b border-cream-200">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-green-50 border border-green-200 text-xs">
                    <div className="flex items-center gap-1.5 text-green-700">
                      <i className="fas fa-tag text-green-600" aria-hidden="true" />
                      <span>Coupon <strong>{appliedCoupon.code}</strong> (₹{appliedCoupon.discount} off)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      aria-label={`Remove applied coupon ${appliedCoupon.code}`}
                      className="text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      id="cart-coupon-input"
                      type="text"
                      placeholder="Promo code (e.g. SHAGUN10)"
                      aria-label="Enter promo or coupon code"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      className="input-field py-1.5 px-3 text-xs flex-1 uppercase"
                    />
                    <button type="submit" className="btn btn-outline py-1.5 px-3 text-xs">
                      Apply
                    </button>
                  </form>
                )}
                {couponMessage && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-[11px] mt-1.5 ${couponMessage.isError ? 'text-red-600' : 'text-green-600 font-medium'}`}
                  >
                    {couponMessage.text}
                  </p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-cream-700">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="font-medium text-maroon-700">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-700 font-medium">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-cream-700">
                  <span>Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : 'text-maroon-600 font-medium'}>
                    {deliveryFee === 0 ? 'FREE' : '₹30'}
                  </span>
                </div>
                {totalPrice < 399 && (
                  <div className="text-xs text-cream-600 bg-cream-200 rounded-lg px-3 py-2">
                    <i className="fas fa-info-circle text-gold-500 mr-1" />
                    Add ₹{(399 - totalPrice).toLocaleString('en-IN')} more for free delivery
                  </div>
                )}
                <div className="h-px bg-cream-300" />
                <div className="flex justify-between font-bold">
                  <span className="text-maroon-700">Total</span>
                  <span className="text-xl text-maroon-600">
                    ₹{finalTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Inventory issues banner */}
              {(() => {
                const outOfStock = cart.some(i => typeof i.stock === 'number' && i.stock <= 0);
                const exceededStock = cart.some(i => typeof i.stock === 'number' && i.stock > 0 && i.quantity > i.stock);
                if (!outOfStock && !exceededStock) return null;
                return (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <i className="fas fa-triangle-exclamation text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Inventory issue: </span>
                      {outOfStock
                        ? 'Some items in your cart are Out of Stock. Please remove them to proceed.'
                        : 'Some items exceed available stock. Please adjust quantities to proceed.'}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const hasInventoryIssues = cart.some(
                  i => typeof i.stock === 'number' && (i.stock <= 0 || i.quantity > i.stock)
                );
                return (
                  <div>
                    {!isAuthenticated && (
                      <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                        <i className="fas fa-lock text-amber-600 shrink-0" />
                        <span>Sign in or create an account with OTP to complete your order.</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (hasInventoryIssues) return;
                        if (!isAuthenticated) {
                          navigate('/login?redirect=/checkout&msg=' + encodeURIComponent('Please sign in or create an account with OTP to complete your order.'));
                          return;
                        }
                        navigate('/checkout');
                      }}
                      disabled={hasInventoryIssues}
                      className={`btn w-full justify-center btn-lg mb-3 ${
                        hasInventoryIssues
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                          : 'btn-primary'
                      }`}
                    >
                      <i className="fas fa-lock text-xs mr-1" />
                      {!isAuthenticated ? 'Sign In / Register to Order' : 'Proceed to Checkout'}
                    </button>
                  </div>
                );
              })()}

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
