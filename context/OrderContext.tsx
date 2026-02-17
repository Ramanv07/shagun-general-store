
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockApi } from '../services/mockService';
import { Order, OrderStatus } from '../types';
import { useAuth } from './AuthContext';

interface OrderContextType {
    orders: Order[];
    addOrder: (order: Partial<Order>) => Promise<Order>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    getUserOrders: (userId: string) => Order[];
    getAllOrders: () => Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const { user } = useAuth();

    // Load orders from mockApi on mount
    useEffect(() => {
        loadOrders();
        // Poll for updates every 5 seconds (simulating live updates)
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        const data = await mockApi.getOrders();
        setOrders(data);
    };

    const addOrder = async (orderData: Partial<Order>): Promise<Order> => {
        const newOrder = await mockApi.createOrder(orderData);
        await loadOrders(); // Refresh orders
        return newOrder;
    };

    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        await mockApi.updateOrderStatus(orderId, status);
        await loadOrders(); // Refresh to get latest state
    };

    const getUserOrders = (userId: string): Order[] => {
        return orders.filter(order => order.user?.email === userId || (order as any).userId === userId);
    };

    const getAllOrders = (): Order[] => {
        return orders;
    };

    return (
        <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, getUserOrders, getAllOrders }}>
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
