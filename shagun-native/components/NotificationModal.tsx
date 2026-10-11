import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Bell, X, CheckCheck, Package, Tag, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { fetchCustomerNotifications, markCustomerNotificationsRead } from '../services/notification';
import { THEME } from '../constants/theme';

interface NotificationItem {
  _id?: string;
  title: string;
  body: string;
  type?: 'order' | 'promotion' | string;
  read?: boolean;
  createdAt?: string;
  data?: any;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomerNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const handleMarkAllRead = async () => {
    await markCustomerNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    onClose();
    if (item.data?.screen === 'orders' || item.data?.orderId || item.type === 'order') {
      router.push('/(tabs)/orders' as any);
    } else if (item.data?.productId) {
      router.push({ pathname: '/product-details', params: { id: item.data.productId } } as any);
    } else if (item.data?.target === 'bridal-lehenga') {
      router.push('/bridal-lehenga' as any);
    } else if (item.data?.target === 'beauty-parlor') {
      router.push('/beauty-parlor' as any);
    } else if (item.data?.target === 'shop') {
      router.push('/(tabs)/shop' as any);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Bell size={18} color="#fff" />
              </View>
              <Text style={styles.title}>Notifications</Text>
            </View>

            <View style={styles.headerActions}>
              {notifications.some(n => !n.read) && (
                <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
                  <CheckCheck size={16} color="#D47343" />
                  <Text style={styles.markReadText}>Mark read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#D47343" />
              <Text style={styles.loadingText}>Fetching updates...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Bell size={32} color="#D47343" />
              </View>
              <Text style={styles.emptyTitle}>No Notifications Yet</Text>
              <Text style={styles.emptyDesc}>
                You will receive real-time order tracking updates and exclusive offers here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item, index) => item._id || String(index)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.itemCard, !item.read && styles.unreadCard]}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.typeBadge}>
                      {item.type === 'order' ? (
                        <Package size={12} color="#7c1f3e" />
                      ) : (
                        <Tag size={12} color="#D47343" />
                      )}
                      <Text style={[styles.typeText, item.type === 'order' ? styles.orderTypeText : styles.promoTypeText]}>
                        {item.type === 'order' ? 'ORDER UPDATE' : 'EXCLUSIVE OFFER'}
                      </Text>
                    </View>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemBody}>{item.body}</Text>

                  <View style={styles.itemFooter}>
                    <Text style={styles.timeText}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </Text>
                    <View style={styles.tapToView}>
                      <Text style={styles.tapText}>View</Text>
                      <ArrowRight size={12} color="#D47343" />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '40%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ede6',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7c1f3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FDF6EE',
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D47343',
  },
  closeBtn: {
    padding: 4,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#777',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDF6EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ece7de',
  },
  unreadCard: {
    backgroundColor: '#fff',
    borderColor: '#D47343',
    borderWidth: 1.5,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orderTypeText: {
    color: '#7c1f3e',
  },
  promoTypeText: {
    color: '#D47343',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D47343',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0ede6',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
  },
  tapToView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tapText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D47343',
  },
});
