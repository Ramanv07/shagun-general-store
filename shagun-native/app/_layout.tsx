import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { OrderProvider } from '../context/OrderContext';
import OfflineNotice from '../components/OfflineNotice';

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrderProvider>
        <CartProvider>
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
