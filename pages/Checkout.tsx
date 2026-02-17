
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { ADMIN_WHATSAPP } from '../constants';
import { useNavigate } from 'react-router-dom';

export const Checkout: React.FC = () => {
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    mobile: '',
    houseNo: '',
    street: '',
    city: '',
    state: '',
    pinCode: ''
  });

  const [loading, setLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [orderId, setOrderId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Create Order
    const newOrder = await addOrder({
      user: user!,
      items: cart, // CartItem[] matches Order.items
      totalAmount: totalPrice,
      shippingAddress: formData,
      status: 'Processing' as any,
    });

    setOrderId(newOrder._id);

    // 2. Generate WhatsApp Link
    const orderItems = cart.map(i => `- ${i.name} (x${i.quantity}) - ₹${i.price * i.quantity}`).join('%0a');

    const message = `*New Order from Shagun Store*%0a%0a` +
      `*Order ID:* ${newOrder._id}%0a` +
      `*Customer:* ${formData.fullName}%0a` +
      `*Mobile:* ${formData.mobile}%0a` +
      `*Address:* ${formData.houseNo}, ${formData.street}, ${formData.city}, ${formData.state} - ${formData.pinCode}%0a%0a` +
      `*Items:*%0a${orderItems}%0a%0a` +
      `*Total Amount: ₹${totalPrice}*`;

    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${message}`;

    // 3. Clear Cart & Show Thank You Modal
    clearCart();
    setLoading(false);
    setShowThankYou(true);

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
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
        <h1 className="text-3xl font-serif font-bold text-white mb-8 text-center">Shipping Details</h1>

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
            <label className="text-gray-400 text-sm">Street / Area</label>
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
              <label className="text-gray-400 text-sm">PIN Code</label>
              <input required name="pinCode" value={formData.pinCode} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-gold-500 outline-none" />
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-300">Total Amount</span>
              <span className="text-2xl font-bold text-gold-500">₹{totalPrice}</span>
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
