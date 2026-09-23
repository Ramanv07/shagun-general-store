
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // 0. Validate Pincode
    if (formData.pinCode !== '471105') {
      alert('Delivery is available only for Pincode 471105');
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
        totalAmount: totalPrice,
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

      // 3. Generate WhatsApp Link
      const orderItems = cart.map(i => `- ${i.name} (x${i.quantity}) - ₹${i.price * i.quantity}`).join('%0a');

      const message = `*New Order from Shagun Store*%0a%0a` +
        `*Order ID:* ${newOrder._id}%0a` +
        `*Customer:* ${formData.fullName}%0a` +
        `*Mobile:* ${formData.mobile}%0a` +
        `*Address:* ${formData.houseNo}, ${formData.street}, ${formData.city}, ${formData.state} - ${formData.pinCode}%0a%0a` +
        `*Items:*%0a${orderItems}%0a%0a` +
        `*Total Amount: ₹${totalPrice}*`;

      const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${message}`;

      // 4. Clear Cart & Show Thank You Modal
      clearCart();
      setShowThankYou(true);

      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');
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
    <div className="min-h-screen bg-midnight-950 pt-28 px-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-white mb-2 text-center">Shipping & Checkout</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Fast delivery directly to your doorstep</p>

        {/* Saved Addresses Quick Selector */}
        {savedAddresses.length > 0 && (
          <div className="glass p-6 rounded-2xl mb-6 space-y-3">
            <label className="text-gold-500 font-bold text-sm block flex items-center gap-2">
              <i className="fas fa-map-marker-alt"></i>
              Select Delivery Address:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAddresses.map((addr, idx) => (
                <div
                  key={addr._id || idx}
                  onClick={() => handleSelectAddress(addr._id || '')}
                  className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                    selectedAddressId === addr._id
                      ? 'bg-gold-500/20 border-gold-500 text-white'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white">{addr.fullName}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-gold-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{addr.mobile}</p>
                  <p className="text-xs text-gray-300 truncate mt-1">
                    {addr.houseNo}, {addr.street}, {addr.city}
                  </p>
                </div>
              ))}
              <div
                onClick={() => handleSelectAddress('new')}
                className={`p-3 rounded-xl border cursor-pointer transition text-left flex items-center justify-center gap-2 ${
                  selectedAddressId === 'new'
                    ? 'bg-gold-500/20 border-gold-500 text-gold-400 font-bold'
                    : 'bg-white/5 border-dashed border-white/20 hover:border-white/40 text-gray-400'
                }`}
              >
                <i className="fas fa-plus-circle"></i>
                <span className="text-sm">Use New Address</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="glass p-8 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">Full Name</label>
              <input required name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">Mobile Number</label>
              <input required name="mobile" value={formData.mobile} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 text-sm">House No. / Building</label>
            <input required name="houseNo" value={formData.houseNo} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Street / Area / Landmark</label>
            <input required name="street" value={formData.street} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">City</label>
              <input required name="city" value={formData.city} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">State</label>
              <input required name="state" value={formData.state} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">PIN Code (Only 471105)</label>
              <input required name="pinCode" value={formData.pinCode} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
            </div>
          </div>

          {selectedAddressId === 'new' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="saveToProfile"
                checked={saveToProfile}
                onChange={e => setSaveToProfile(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-gold-500 focus:ring-gold-500"
              />
              <label htmlFor="saveToProfile" className="text-gray-300 text-sm cursor-pointer">
                Save this address to my profile for future orders
              </label>
            </div>
          )}

          <div className="pt-6 border-t border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-gray-300 block text-sm">Payment Method</span>
                <span className="text-gold-400 text-xs font-semibold">Cash on Delivery (COD)</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-xs">Total Amount</span>
                <span className="text-2xl font-bold text-gold-500">₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
            >
              {loading ? 'Processing...' : (
                <>
                  <span>Place Order on WhatsApp</span>
                  <i className="fab fa-whatsapp text-2xl"></i>
                </>
              )}
            </button>
          </div>
        </form>
      </div>


      {/* Thank You Modal */}
      {showThankYou && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-midnight-900 rounded-2xl max-w-md w-full p-8 border-2 border-gold-500/50 text-center">
            <div className="w-20 h-20 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-check-circle text-4xl text-gold-500"></i>
            </div>
            <h2 className="text-3xl font-serif font-bold text-white mb-3">Thank You for Shopping!</h2>
            <p className="text-gray-400 mb-2">Your order has been placed successfully</p>
            <p className="text-sm text-gray-500 mb-6">Order ID: <span className="text-gold-500 font-mono">{orderId}</span></p>
            <p className="text-gray-400 text-sm mb-8">
              We've sent your order details via WhatsApp. Our team will contact you shortly!
            </p>
            <button
              onClick={handleGoToOrders}
              className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3 rounded-lg transition"
            >
              View My Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
