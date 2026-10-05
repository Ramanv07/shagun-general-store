import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from './AuthContext';

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getUserOrders: (userId: string) => Order[];
  getAllOrders: () => Order[];
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { isAuthenticated } = useAuth();

  const loadOrders = async () => {
    try {
      if (isAuthenticated) {
        const data = await api.getOrders();
        setOrders(data);
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
    }
  };

  useEffect(() => {
    loadOrders();
    // Poll every 30 seconds (battery-friendly vs 5s on web)
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const addOrder = async (orderData: Partial<Order>): Promise<Order> => {
    const newOrder = await api.createOrder(orderData);
    await loadOrders();
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await api.updateOrderStatus(orderId, status);
    await loadOrders();
  };

  const getUserOrders = (userId: string): Order[] =>
    orders.filter(order =>
      order.user?._id === userId ||
      order.user?.email === userId ||
      (order as any).legacyUserId === userId
    );

  const getAllOrders = (): Order[] => orders;

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, getUserOrders, getAllOrders, refreshOrders: loadOrders }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
};
