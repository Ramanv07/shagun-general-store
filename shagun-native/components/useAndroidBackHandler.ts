import { useCallback } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

/**
 * Hook for Home Screen: Double press back to exit with a toast
 */
export function useDoubleBackToExit() {
  useFocusEffect(
    useCallback(() => {
      let backPressCount = 0;

      const onBackPress = () => {
        if (backPressCount === 0) {
          backPressCount++;
          if (Platform.OS === 'android') {
            ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          }
          setTimeout(() => {
            backPressCount = 0;
          }, 2000);
          return true; // Prevent default back action
        }
        return false; // Allow app exit on second press
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );
}

/**
 * Hook for Sub-screens/Tabs: Pressing back button goes to Home instead of closing app
 */
export function useBackToHome() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.navigate('/(tabs)');
        return true; // Handled, redirected to Home
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [router])
  );
}
