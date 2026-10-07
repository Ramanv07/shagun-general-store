
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockApi } from '../services/mockService';
import { Order, OrderStatus } from '../types';
import { useAuth } from './AuthContext';

interface OrderContextType {
    orders: Order[];
    addOrder: (order: Partial<Order>) => Promise<Order>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    cancelOrder: (orderId: string) => Promise<void>;
    getUserOrders: (userId: string) => Order[];
    getAllOrders: () => Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Instant initial load from cache (0ms)
    const [orders, setOrders] = useState<Order[]>(() => {
        try {
            const cached = localStorage.getItem('shagun_user_orders');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const { user, logout } = useAuth();

    // Load orders on mount and when user identity changes
    useEffect(() => {
        if (!user) {
            setOrders([]);
            return;
        }

        loadOrders();

        // Refresh periodically only if the browser tab is actively visible
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadOrders();
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [user?._id, user?.email]);

    const loadOrders = async () => {
        try {
            if (!user) return;
            const data = await mockApi.getOrders();
            if (Array.isArray(data)) {
                setOrders(data);
                try {
                    localStorage.setItem('shagun_user_orders', JSON.stringify(data));
                } catch {}
            }
        } catch (error: any) {
            console.warn('Orders fetch warning:', error?.message);
            // Do NOT wipe out existing orders on transient network glitch!
            if (error.message && error.message.includes('401')) {
                logout();
            }
        }
    };

    const addOrder = async (orderData: Partial<Order>): Promise<Order> => {
        const newOrder = await mockApi.createOrder(orderData);
        // Optimistically put the new order in state immediately
        setOrders(prev => {
            const updated = [newOrder, ...prev.filter(o => o._id !== newOrder._id)];
            try {
                localStorage.setItem('shagun_user_orders', JSON.stringify(updated));
            } catch {}
            return updated;
        });
        return newOrder;
    };

    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        await mockApi.updateOrderStatus(orderId, status);
        await loadOrders();
    };

    const cancelOrder = async (orderId: string) => {
        await mockApi.cancelOrder(orderId);
        await loadOrders();
    };

    const getUserOrders = (userId: string): Order[] => {
        return orders.filter(order => 
            order.user?._id === userId || 
            order.user?.email === userId || 
            order.user === userId ||
            (order as any).legacyUserId === userId ||
            (order as any).userId === userId
        );
    };


    const getAllOrders = (): Order[] => {
        return orders;
    };

    return (
        <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, cancelOrder, getUserOrders, getAllOrders }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrders = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrders must be used within OrderProvider');
    }
    return context;
};
