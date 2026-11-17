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
import DevApiBanner from '../components/DevApiBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initWebAlertPolyfill } from '../utils/webAlertPolyfill';

initWebAlertPolyfill();

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
    <ErrorBoundary fallbackTitle="Shagun Mart Notice">
      <AuthProvider>
        <OrderProvider>
          <CartProvider>
            <NotificationListener />
            <View style={styles.container}>
              <StatusBar style="dark" />
              <SafeAreaView edges={['top']} style={styles.safeArea}>
                <OfflineNotice />
                <DevApiBanner />
              </SafeAreaView>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="checkout" options={{ headerShown: false }} />
                <Stack.Screen name="beauty-parlor" options={{ headerShown: false }} />
                <Stack.Screen name="bridal-lehenga" options={{ headerShown: false }} />
                <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
                <Stack.Screen name="product-details" options={{ headerShown: false }} />
                <Stack.Screen name="search" options={{ headerShown: false }} />
              </Stack>
            </View>
          </CartProvider>
        </OrderProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
});
