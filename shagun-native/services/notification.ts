import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';

// Configure foreground notification behavior (Flipkart-style banner alert + sound)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device with backend for push notifications
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Order Updates & Offers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D47343',
      enableVibrate: true,
      showBadge: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Push] Notification permission not granted');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'b5f0f01b-d17c-477f-a261-11ccda7be2e6';

    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = pushTokenData.data;
      console.log('[Push] Received Expo Push Token:', token);

      // Save token locally
      await SecureStore.setItemAsync(STORAGE_KEYS.PUSH_TOKEN, token);

      // Register with backend server
      await sendTokenToBackend(token, userId);
    } catch (e: any) {
      console.warn('[Push] Error getting push token:', e.message || e);
    }
  } else {
    console.log('[Push] Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Synchronize token with backend MongoDB
 */
export async function sendTokenToBackend(pushToken: string, userId?: string) {
  try {
    let authHeader = '';
    let resolvedUserId = userId;

    const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER);
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.token) authHeader = `Bearer ${u.token}`;
      if (!resolvedUserId && u?._id) resolvedUserId = u._id;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pushToken, userId: resolvedUserId }),
    });

    if (res.ok) {
      console.log('[Push] Token successfully registered on Shagun Mart backend');
    }
  } catch (err: any) {
    console.warn('[Push] Failed to register token with backend:', err.message);
  }
}

/**
 * Fetch customer in-app notifications
 */
export async function fetchCustomerNotifications() {
  try {
    const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER);
    if (!userStr) return [];
    const u = JSON.parse(userStr);
    if (!u?.token) return [];

    const res = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: {
        'Authorization': `Bearer ${u.token}`,
      },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

/**
 * Mark all notifications as read
 */
export async function markCustomerNotificationsRead() {
  try {
    const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER);
    if (!userStr) return;
    const u = JSON.parse(userStr);
    if (!u?.token) return;

    await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${u.token}`,
      },
    });
  } catch {}
}
