import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { OrderProvider } from '../context/OrderContext';
import OfflineNotice from '../components/OfflineNotice';

function NotificationListener() {
  const router = useRouter();

  useEffect(() => {
    // Listen for notification taps when customer taps notification banner on lockscreen or tray
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = response?.notification?.request?.content?.data;
        if (data?.screen === 'orders' || data?.orderId) {
          router.push('/(tabs)/orders' as any);
        } else if (data?.productId) {
          router.push({ pathname: '/product-details', params: { id: data.productId } } as any);
        }
      } catch (e) {
        console.warn('Notification navigation error:', e);
      }
    });

    return () => {
      sub.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrderProvider>
        <CartProvider>
          <NotificationListener />
          <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView edges={['top']} style={styles.safeArea}>
              <OfflineNotice />
            </SafeAreaView>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="checkout" options={{ title: 'Checkout', headerStyle: { backgroundColor: '#7c1f3e' }, headerTintColor: '#fff' }} />
              <Stack.Screen name="beauty-parlor" options={{ title: 'Beauty Parlor', headerStyle: { backgroundColor: '#7c1f3e' }, headerTintColor: '#fff', headerShown: true }} />
              <Stack.Screen name="bridal-lehenga" options={{ title: 'Bridal Lehenga', headerStyle: { backgroundColor: '#7c1f3e' }, headerTintColor: '#fff', headerShown: true }} />
              <Stack.Screen name="admin/dashboard" options={{ title: 'Admin Dashboard', headerStyle: { backgroundColor: '#7c1f3e' }, headerTintColor: '#fff', headerShown: true }} />
              <Stack.Screen name="product-details" options={{ headerShown: false }} />
            </Stack>
          </View>
        </CartProvider>
      </OrderProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c1f3e',
  },
  safeArea: {
    backgroundColor: '#7c1f3e',
  },
});
