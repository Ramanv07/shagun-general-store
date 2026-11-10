import { Alert, Platform } from 'react-native';

/**
 * Polyfill Alert.alert for React Native Web where it is otherwise a no-op.
 * Seamlessly handles single alerts and 2-button confirmations (e.g. Logout, Cancel).
 */
export function initWebAlertPolyfill() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    Alert.alert = (
      title?: string,
      message?: string,
      buttons?: Array<{ text?: string; onPress?: () => void; style?: string }>
    ) => {
      const text = [title, message].filter(Boolean).join('\n\n');
      if (!buttons || buttons.length === 0) {
        window.alert(text);
        return;
      }
      if (buttons.length === 1) {
        window.alert(text);
        buttons[0].onPress?.();
        return;
      }
      const confirmButton = buttons.find(b => b.style === 'destructive') || buttons[buttons.length - 1];
      const cancelButton = buttons.find(b => b.style === 'cancel');
      const ok = window.confirm(text);
      if (ok) {
        confirmButton?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
    };
  }
}
