import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.CART);
        if (stored) setCart(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load cart', e);
      }
    })();
  }, []);

  // Persist cart on every change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)).catch(console.error);
  }, [cart]);

  const addToCart = (product: Product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => item._id === productId ? { ...item, quantity } : item));
  };

  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
