
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';
import { STORAGE_KEYS } from '../constants';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem(STORAGE_KEYS.CART);
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, qty = 1) => {
    const availableStock = typeof product.stock === 'number' ? product.stock : 999;
    if (availableStock <= 0) {
      alert(`"${product.name}" is currently Out of Stock.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > availableStock) {
          alert(`Only ${availableStock} unit${availableStock > 1 ? 's' : ''} available for "${product.name}". You already have ${existing.quantity} in your cart.`);
          return prev.map(item => 
            item._id === product._id ? { ...item, quantity: availableStock, stock: availableStock } : item
          );
        }
        return prev.map(item => 
          item._id === product._id ? { ...item, quantity: newQty, stock: availableStock } : item
        );
      }
      const initialQty = Math.min(qty, availableStock);
      return [...prev, { ...product, quantity: initialQty, stock: availableStock }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => {
      if (item._id === productId) {
        const availableStock = typeof item.stock === 'number' ? item.stock : 999;
        if (availableStock <= 0) {
          alert(`"${item.name}" is currently Out of Stock.`);
          return item;
        }
        if (quantity > availableStock) {
          alert(`Only ${availableStock} unit${availableStock > 1 ? 's' : ''} available for "${item.name}".`);
          return { ...item, quantity: availableStock };
        }
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
