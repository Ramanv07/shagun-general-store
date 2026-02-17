
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-midnight-950 flex flex-col items-center justify-center pt-20">
        <i className="fas fa-shopping-basket text-6xl text-gray-600 mb-6"></i>
        <h2 className="text-3xl text-white font-bold mb-4">Your cart is empty</h2>
        <Link to="/shop" className="bg-gold-500 text-black px-8 py-3 rounded-full font-bold hover:bg-gold-400 transition-all">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-950 pt-28 px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-serif font-bold text-white mb-8">Your Cart</h1>
        
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Cart Items */}
          <div className="flex-1 space-y-4">
            {cart.map(item => (
              <div key={item._id} className="glass p-4 rounded-xl flex items-center gap-4">
                <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-lg bg-white/5" />
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{item.name}</h3>
                  <p className="text-gold-500 font-semibold">₹{item.price}</p>
                </div>

                <div className="flex items-center gap-3 bg-white/5 rounded-lg p-1">
                  <button 
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded"
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="text-white font-bold w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded"
                  >
                    +
                  </button>
                </div>

                <button 
                  onClick={() => removeFromCart(item._id)}
                  className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
            
            <button onClick={clearCart} className="text-red-400 text-sm hover:text-red-300 underline">
              Clear Cart
            </button>
          </div>

          {/* Summary */}
          <div className="lg:w-96">
            <div className="glass p-6 rounded-2xl sticky top-24">
              <h3 className="text-2xl font-bold text-white mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-6 text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{totalPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-gold-500">₹{totalPrice}</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-gradient-to-r from-gold-500 to-amber-600 text-black font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-gold-500/20 transition-all transform hover:-translate-y-1"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
