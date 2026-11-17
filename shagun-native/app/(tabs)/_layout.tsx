import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { THEME } from '../../constants/theme';
import { Home, LayoutGrid, Tag, ShoppingBag, User } from 'lucide-react-native';
import { useCart } from '../../context/CartContext';

export default function TabsLayout() {
  const { cartCount } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.colors.white,
          borderTopColor: THEME.colors.line,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.colors.maroon700,
        tabBarInactiveTintColor: THEME.colors.ink500,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2 : 1.5} fill={focused ? color : 'none'} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <LayoutGrid size={22} color={color} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Offers',
          tabBarIcon: ({ color, focused }) => (
            <Tag size={22} color={color} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: THEME.colors.black,
            color: THEME.colors.white,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, focused }) => (
            <ShoppingBag size={22} color={color} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      {/* Orders is moved to Profile/Account, accessible via /orders or router */}
      <Tabs.Screen
        name="orders"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
