
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { ADMIN_WHATSAPP } from '../constants';
import { useNavigate } from 'react-router-dom';

export const Checkout: React.FC = () => {
  const { cart, totalPrice, clearCart } = useCart();
  const { user, updateUser } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();

  const defaultAddr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0];

  const [formData, setFormData] = useState({
    fullName: defaultAddr?.fullName || user?.name || '',
    mobile: defaultAddr?.mobile || user?.phone || '',
    houseNo: defaultAddr?.houseNo || '',
    street: defaultAddr?.street || '',
    city: defaultAddr?.city || '',
    state: defaultAddr?.state || 'Madhya Pradesh',
    pinCode: defaultAddr?.pinCode || '471105'
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddr?._id || 'new');
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [orderId, setOrderId] = useState('');

  const savedAddresses = user?.addresses || [];

  const handleSelectAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === 'new') {
      setFormData({
        fullName: user?.name || '',
        mobile: user?.phone || '',
        houseNo: '',
        street: '',
        city: '',
        state: 'Madhya Pradesh',
        pinCode: '471105'
      });
    } else {
      const found = savedAddresses.find(a => a._id === addrId);
      if (found) {
        setFormData({
          fullName: found.fullName,
          mobile: found.mobile,
          houseNo: found.houseNo,
          street: found.street,
          city: found.city,
          state: found.state,
          pinCode: found.pinCode
        });
      }
    }
  };

  const appliedCoupon = (() => {
    try {
      const saved = sessionStorage.getItem('shagun_applied_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const deliveryFee = totalPrice >= 500 ? 0 : 50;
  const finalAmount = Math.max(0, totalPrice - discountAmount + deliveryFee);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // 0. Validate 6-digit PIN code
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(formData.pinCode.trim())) {
      alert('Please enter a valid 6-digit PIN code (e.g. 462001).');
      return;
    }

    setLoading(true);

    try {
      // 1. Sanitize items to remove heavy base64 strings from bloating localStorage
      const sanitizedItems = cart.map(item => ({
        ...item,
        image: item.image?.startsWith('data:') && item.image.length > 500 ? '' : item.image
      }));

      // 2. Create Order
      const newOrder = await addOrder({
        user: user!,
        items: sanitizedItems,
        totalAmount: finalAmount,
        shippingAddress: formData,
        status: 'Processing' as any,
        paymentMethod: 'COD',
        paymentStatus: 'Pending'
      });

      // If user checked save to profile and it's a new address
      if (saveToProfile && user && updateUser) {
        const alreadyHas = savedAddresses.some(
          a => a.houseNo === formData.houseNo && a.pinCode === formData.pinCode
        );
        if (!alreadyHas) {
          const newAddressList = [
            ...savedAddresses,
            {
              _id: 'ADDR_' + Date.now(),
              ...formData,
              isDefault: savedAddresses.length === 0
            }
          ];
          updateUser({
            ...user,
            phone: user.phone || formData.mobile,
            addresses: newAddressList
          });
        }
      }

      setOrderId(newOrder._id);

      // 3. Clear Cart & Show Thank You Modal
      clearCart();
      setShowThankYou(true);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('There was an issue processing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToOrders = () => {
    setShowThankYou(false);
    navigate('/orders');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen pt-28 px-4 pb-20" style={{ backgroundColor: 'var(--clr-cream)' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-maroon-800 mb-2 text-center">Shipping & Checkout</h1>
        <p className="text-cream-700 text-sm text-center mb-8">Fast delivery directly to your doorstep</p>

        {/* Saved Addresses Quick Selector */}
        {savedAddresses.length > 0 && (
          <div className="card p-6 rounded-2xl mb-6 space-y-3">
            <label className="text-maroon-800 font-bold text-sm block flex items-center gap-2">
              <i className="fas fa-map-marker-alt text-gold-500"></i>
              Select Delivery Address:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAddresses.map((addr, idx) => (
                <div
                  key={addr._id || idx}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedAddressId === addr._id}
                  onClick={() => handleSelectAddress(addr._id || '')}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAddress(addr._id || '');
                    }
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition text-left focus-visible:outline-2 focus-visible:outline-maroon-900 ${
                    selectedAddressId === addr._id
                      ? 'bg-maroon-50 border-maroon-600 text-maroon-800'
                      : 'bg-white border-cream-300 hover:border-gold-400 text-cream-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-maroon-800">{addr.fullName}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-gold-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cream-700">{addr.mobile}</p>
                  <p className="text-xs text-cream-700 truncate mt-1">
                    {addr.houseNo}, {addr.street}, {addr.city}
                  </p>
                </div>
              ))}
              <div
                role="button"
                tabIndex={0}
                aria-pressed={selectedAddressId === 'new'}
                onClick={() => handleSelectAddress('new')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectAddress('new');
                  }
                }}
                className={`p-3 rounded-xl border cursor-pointer transition text-left flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-maroon-900 ${
                  selectedAddressId === 'new'
                    ? 'bg-maroon-50 border-maroon-600 text-maroon-800 font-bold'
                    : 'bg-white border-dashed border-cream-300 hover:border-gold-400 text-cream-700'
                }`}
              >
                <i className="fas fa-plus-circle" aria-hidden="true"></i>
                <span className="text-sm">Use New Address</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="card p-8 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="checkout-fullName" className="text-maroon-700 text-sm font-semibold">Full Name</label>
              <input id="checkout-fullName" required name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-white border border-cream-300 rounded-lg p-3 text-maroon-800 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label htmlFor="checkout-mobile" className="text-maroon-700 text-sm font-semibold">Mobile Number</label>
              <input id="checkout-mobile" required name="mobile" value={formData.mobile} onChange={handleChange} className="w-full bg-white border border-cream-300 rounded-lg p-3 text-maroon-800 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="checkout-houseNo" className="text-maroon-700 text-sm font-semibold">House No. / Building</label>
            <input id="checkout-houseNo" required name="houseNo" value={formData.houseNo} onChange={handleChange} className="w-full bg-white border border-cream-300 rounded-lg p-3 text-maroon-800 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" />
          </div>

          <div className="space-y-2">
            <label htmlFor="checkout-street" className="text-maroon-700 text-sm font-semibold">Street / Area / Landmark</label>
            <input id="checkout-street" required name="street" value={formData.street} onChange={handleChange} className="w-full bg-white border border-cream-300 rounded-lg p-3 text-maroon-800 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="checkout-city" className="text-maroon-700 text-sm font-semibold">City</label>
              <input id="checkout-city" required name="city" value={formData.city} onChange={handleChange} className="w-full bg-white border border-cream-300 rounded-lg p-3 text-maroon-800 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label htmlFor="checkout-state" className="text-maroon-700 text-sm font-semibold">State</label>
              <input id="checkout-state" required name="state" value={formData.state} onChange={handleChange} className="w-full bg-white border border-cream-300 rounded-lg p-3 text-maroon-800 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label htmlFor="checkout-pinCode" className="text-maroon-700 text-sm font-semibold">PIN Code (6 digits)</label>
              <input id="checkout-pinCode" required name="pinCode" placeholder="e.g. 462001" value={formData.pinCode} onChange={handleChange} className="w-full bg-white border border-cream-300 rounded-lg p-3 text-maroon-800 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" />
            </div>
          </div>

          {selectedAddressId === 'new' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="saveToProfile"
                checked={saveToProfile}
                onChange={e => setSaveToProfile(e.target.checked)}
                className="rounded border-cream-300 bg-white text-maroon-600 focus:ring-maroon-600"
              />
              <label htmlFor="saveToProfile" className="text-cream-800 text-sm cursor-pointer">
                Save this address to my profile for future orders
              </label>
            </div>
          )}

          <div className="pt-6 border-t border-cream-300 space-y-3">
            <div className="flex justify-between items-center text-sm text-cream-700">
              <span>Subtotal</span>
              <span className="font-semibold text-maroon-800">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-sm text-green-700 font-semibold">
                <span>Coupon Discount ({appliedCoupon.code})</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm text-cream-700">
              <span>Delivery</span>
              <span className={deliveryFee === 0 ? 'text-green-600 font-semibold' : 'text-maroon-700 font-semibold'}>
                {deliveryFee === 0 ? 'FREE' : '₹50'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-cream-200">
              <div>
                <span className="text-cream-800 block text-xs">Payment Method</span>
                <span className="text-maroon-600 text-xs font-semibold">Cash on Delivery (COD)</span>
              </div>
              <div className="text-right">
                <span className="text-cream-700 block text-xs">Total Amount</span>
                <span className="text-2xl font-bold text-maroon-800">₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 mt-4"
            >
              {loading ? 'Processing...' : (
                <>
                  <span>Place Order</span>
                  <i className="fas fa-check-circle text-xl"></i>
                </>
              )}
            </button>
          </div>
        </form>
      </div>


      {/* Thank You Modal */}
      {showThankYou && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="thank-you-dialog-title"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-maroon-xl text-center animate-scale-in">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-check-circle text-4xl text-green-500" aria-hidden="true"></i>
            </div>
            <h2 id="thank-you-dialog-title" className="text-3xl font-serif font-bold text-maroon-800 mb-3">Thank You for Shopping!</h2>
            <p className="text-cream-800 mb-2 font-medium">Your order has been placed successfully</p>
            <p className="text-sm text-cream-700 mb-6">Order ID: <span className="text-maroon-600 font-mono font-bold">{orderId}</span></p>
            <p className="text-cream-700 text-sm mb-8 leading-relaxed">
              We've received your order details. You can track its status from your orders page!
            </p>
            <button
              onClick={handleGoToOrders}
              className="w-full bg-maroon-600 hover:bg-maroon-700 text-white font-bold py-3 rounded-xl transition focus-visible:outline-2 focus-visible:outline-gold-400"
            >
              View My Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
