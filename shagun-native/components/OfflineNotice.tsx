import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export default function OfflineNotice() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsConnected(online);
    });

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsConnected((prev) => {
        // If transitioning from offline -> online, show brief success banner
        if (prev === false && online) {
          setShowRestored(true);
          setTimeout(() => setShowRestored(false), 3000);
          setIsModalOpen(false);
        }
        return online;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    try {
      const state = await NetInfo.fetch();
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsConnected(online);
      if (online) {
        setIsModalOpen(false);
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3000);
      }
    } finally {
      setChecking(false);
    }
  };

  // When internet was restored recently
  if (showRestored && isConnected) {
    return (
      <View style={[styles.banner, styles.bannerSuccess]}>
        <Ionicons name="checkmark-circle" size={16} color="#fff" />
        <Text style={styles.bannerText}>Back Online! Connected to Internet.</Text>
      </View>
    );
  }

  // If connected, show nothing
  if (isConnected !== false) {
    return null;
  }

  return (
    <>
      {/* Top Warning Banner (Always visible when offline) */}
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.9}
        onPress={() => setIsModalOpen(true)}
      >
        <Ionicons name="cloud-offline" size={16} color="#fff" />
        <Text style={styles.bannerText}>No Internet Connection. Tap for details.</Text>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* Full-Screen Offline Frame / Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsModalOpen(false)}
            >
              <Ionicons name="close" size={24} color="#7c1f3e" />
            </TouchableOpacity>

            {/* Offline Icon */}
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-offline-outline" size={54} color="#7c1f3e" />
            </View>

            <Text style={styles.title}>No Internet Connection</Text>
            <Text style={styles.subtitle}>
              It looks like your device is offline. Please check your Wi-Fi or mobile data settings to browse products, view bridal collections, or place orders.
            </Text>

            {/* Troubleshooting bullets */}
            <View style={styles.tipsBox}>
              <View style={styles.tipRow}>
                <Ionicons name="wifi-outline" size={16} color="#d4a853" />
                <Text style={styles.tipText}>Check if your Wi-Fi is turned on</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="cellular-outline" size={16} color="#d4a853" />
                <Text style={styles.tipText}>Make sure mobile data has active signal</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="airplane-outline" size={16} color="#d4a853" />
                <Text style={styles.tipText}>Verify Airplane mode is disabled</Text>
              </View>
            </View>

            {/* Retry Button */}
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleRetry}
              disabled={checking}
              activeOpacity={0.8}
            >
              {checking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#b91c1c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 9999,
  },
  bannerSuccess: {
    backgroundColor: '#15803d',
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 10, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f5ede8',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fbe8ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a0a12',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b5a64',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  tipsBox: {
    width: '100%',
    backgroundColor: '#fdf9f5',
    borderWidth: 1,
    borderColor: '#f0e4da',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 12,
    color: '#4a3b43',
    fontWeight: '500',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#7c1f3e',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#7c1f3e',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
