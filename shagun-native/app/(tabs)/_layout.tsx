import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { View, Text, StyleSheet } from 'react-native';

function CartBadge() {
  const { cartCount } = useCart();
  if (cartCount === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1a0a12',
          borderTopColor: '#7c1f3e',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#d4a853',
        tabBarInactiveTintColor: '#9c7a8a',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#7c1f3e' },
        headerTintColor: '#f5ede8',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          headerTitle: '🛍️ Shagun Store',
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
          headerTitle: 'Shop',
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="bag" size={size} color={color} />
              <CartBadge />
            </View>
          ),
          headerTitle: 'My Cart',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          headerTitle: 'My Orders',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          headerTitle: 'My Account',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#d4a853',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#1a0a12',
    fontSize: 10,
    fontWeight: '700',
  },
});
