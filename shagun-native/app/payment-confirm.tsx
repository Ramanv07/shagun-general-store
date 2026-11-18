import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Order } from '../types';
import { API_BASE_URL, APP_ENV, PRODUCTION_API_HOST } from '../constants';
import { isHostBlocked } from '../utils/hostSafety';

export default function PaymentConfirmScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [utr, setUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const fetchOrder = useCallback(async (isSilent = false) => {
    if (!orderId) return;
    try {
      if (!isSilent) setLoading(true);
      const data = await api.getOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      if (!isSilent) {
        Alert.alert('Error', err.message || 'Failed to fetch order details');
      }
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Periodic polling every 60s when app is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active' && order?.paymentStatus !== 'paid') {
        fetchOrder(true);
      }
    }, 60000);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && order?.paymentStatus !== 'paid') {
        fetchOrder(true);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetchOrder, order?.paymentStatus]);

  // Countdown timer
  useEffect(() => {
    if (!order?.paymentExpiresAt) return;
    const expiresAtMs = new Date(order.paymentExpiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [order?.paymentExpiresAt]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder(true);
  };

  const isDevLiveBlocked = false;

  const handleUtrSubmit = async () => {

    const cleanUtr = utr.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      Alert.alert('Invalid UTR', 'UTR must be exactly 12 numeric digits from your bank transaction receipt.');
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await api.submitUpiUtr(orderId!, cleanUtr);
      Alert.alert('UTR Submitted', res.message || 'Your UTR is now under verification.');
      setOrder(res.order);
      setUtr('');
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Unable to submit UTR.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleRetryPayment = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Desktop Notice',
        'UPI apps (GPay, PhonePe, Paytm) only open on mobile devices.\n\nEnter your 12-digit bank UTR below to confirm payment, or test the app on a mobile phone.'
      );
      return;
    }

    if (!order?.upiIntent?.upiUri) {
      Alert.alert('Notice', 'No UPI payment link available for this order.');
      return;
    }
    try {
      await Linking.openURL(order.upiIntent.upiUri);
    } catch {
      Alert.alert(
        'No UPI app found',
        'No UPI app was detected on this device. You can pay manually by entering your 12-digit UTR reference, or cancel and place an order using Cash on Delivery (COD).',
        [
          { text: 'Enter UTR', onPress: () => { } },
          { text: 'Choose COD', onPress: () => { router.replace('/checkout'); } }
        ]
      );
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7c1f3e" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#991b1b" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/orders')}>
          <Text style={styles.backBtnText}>View My Orders</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const paymentStatus = order.paymentStatus || 'pending';
  const isPaid = paymentStatus === 'paid';
  const isVerifying = paymentStatus === 'verifying';
  const isLatePayment = paymentStatus === 'late_payment';
  const isExpired = paymentStatus === 'expired' || (paymentStatus === 'pending' && remainingSeconds === 0);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.replace('/orders')} style={styles.topBackBtn}>
          <Ionicons name="arrow-back" size={24} color="#7c1f3e" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Confirming Payment</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c1f3e']} />}
      >
        {/* Warning Banner */}
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#b45309" />
          <Text style={styles.warningText}>
            If money was debited, enter your UTR, do not pay again.
          </Text>
        </View>

        {/* Order Info Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.label}>Order Number</Text>
              <Text style={styles.orderIdText}>#{order.orderNumber || order._id.slice(-8)}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.label}>Total Amount</Text>
              <Text style={styles.amountText}>₹{Number(order.totalAmount).toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Status Badge */}
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Payment Status</Text>
            <View
              style={[
                styles.badge,
                isPaid && styles.badgePaid,
                isVerifying && styles.badgeVerifying,
                isLatePayment && styles.badgeLate,
                isExpired && styles.badgeExpired,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isPaid && styles.badgeTextPaid,
                  isVerifying && styles.badgeTextVerifying,
                  isLatePayment && styles.badgeTextLate,
                  isExpired && styles.badgeTextExpired,
                ]}
              >
                {isPaid ? 'Paid' : isVerifying ? 'Verifying' : isLatePayment ? 'Late Payment' : isExpired ? 'Expired' : 'Pending'}
              </Text>
            </View>
          </View>

          {/* Timer */}
          {!isPaid && !isExpired && remainingSeconds !== null && (
            <View style={styles.timerRow}>
              <Ionicons name="timer-outline" size={16} color="#7c1f3e" />
              <Text style={styles.timerLabel}>Time remaining:</Text>
              <Text style={styles.timerValue}>{formatTimer(remainingSeconds)}</Text>
            </View>
          )}

          {isLatePayment && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>We received your reference and are checking it.</Text>
            </View>
          )}

          {isExpired && !isLatePayment && !isPaid && (
            <View style={styles.noticeBoxExpired}>
              <Text style={styles.noticeTextExpired}>
                Payment window expired. If money was debited, enter your 12-digit UTR below so our team can verify or refund.
              </Text>
            </View>
          )}
        </View>

        {/* Paid confirmation */}
        {isPaid ? (
          <View style={styles.paidCard}>
            <Ionicons name="checkmark-circle" size={48} color="#15803d" />
            <Text style={styles.paidTitle}>Payment Verified</Text>
            <Text style={styles.paidSub}>Your order is being processed for shipping.</Text>
            <TouchableOpacity style={styles.ordersBtn} onPress={() => router.replace('/orders')}>
              <Text style={styles.ordersBtnText}>View My Orders</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Pay with UPI App Action */}
            <TouchableOpacity style={styles.payAppBtn} onPress={handleRetryPayment}>
              <Ionicons name="phone-portrait-outline" size={20} color="#ffffff" />
              <Text style={styles.payAppBtnText}>Pay with UPI App</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retryBtn} onPress={handleRetryPayment}>
              <Ionicons name="refresh-outline" size={16} color="#7c1f3e" />
              <Text style={styles.retryBtnText}>Retry payment</Text>
            </TouchableOpacity>

            {/* 12-Digit UTR Form */}
            <View style={styles.utrCard}>
              <Text style={styles.utrTitle}>Enter 12-Digit Bank UTR / Reference</Text>
              <Text style={styles.utrSub}>
                Found in your Google Pay, PhonePe, Paytm, or bank SMS debit receipt.
              </Text>
              <TextInput
                style={styles.utrInput}
                keyboardType="numeric"
                maxLength={12}
                placeholder="e.g. 432109876543"
                value={utr}
                onChangeText={text => setUtr(text.replace(/\D/g, ''))}
              />
              <TouchableOpacity
                style={[styles.submitUtrBtn, (submittingUtr || utr.length !== 12) && styles.submitUtrBtnDisabled]}
                disabled={submittingUtr || utr.length !== 12}
                onPress={handleUtrSubmit}
              >
                {submittingUtr ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitUtrBtnText}>Submit UTR</Text>
                )}
              </TouchableOpacity>

              {order.upiUtr && (
                <Text style={styles.submittedUtrText}>
                  Submitted UTR: {order.upiUtr} {order.upiUtrAttempts ? `(Attempt ${order.upiUtrAttempts}/5)` : ''}
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#FAF6F0' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6dc',
    backgroundColor: '#ffffff',
  },
  topBackBtn: { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: 'bold', color: '#7c1f3e' },
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#7c1f3e' },
  errorText: { marginTop: 8, fontSize: 16, color: '#991b1b', fontWeight: 'bold' },
  backBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#7c1f3e', borderRadius: 8 },
  backBtnText: { color: '#ffffff', fontWeight: 'bold' },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    borderRadius: 10,
  },
  warningText: { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '600', lineHeight: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ede5dc',
    gap: 12,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alignRight: { alignItems: 'flex-end' },
  label: { fontSize: 11, color: '#8c7b75', textTransform: 'uppercase', fontWeight: '600' },
  orderIdText: { fontSize: 14, fontWeight: 'bold', color: '#2c0810', marginTop: 2 },
  amountText: { fontSize: 20, fontWeight: 'bold', color: '#7c1f3e', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0e6dc', marginVertical: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#eff6ff' },
  badgePaid: { backgroundColor: '#dcfce7' },
  badgeVerifying: { backgroundColor: '#fef3c7' },
  badgeLate: { backgroundColor: '#f3e8ff' },
  badgeExpired: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#1e40af' },
  badgeTextPaid: { color: '#166534' },
  badgeTextVerifying: { color: '#92400e' },
  badgeTextLate: { color: '#6b21a8' },
  badgeTextExpired: { color: '#4b5563' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  timerLabel: { fontSize: 12, color: '#7c1f3e', fontWeight: '600' },
  timerValue: { fontSize: 14, fontWeight: 'bold', color: '#7c1f3e' },
  noticeBox: { backgroundColor: '#f5f3ff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e9d5ff' },
  noticeText: { fontSize: 12, color: '#6b21a8', fontWeight: '500' },
  noticeBoxExpired: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  noticeTextExpired: { fontSize: 12, color: '#374151', lineHeight: 16 },
  paidCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#dcfce7' },
  paidTitle: { fontSize: 18, fontWeight: 'bold', color: '#166534' },
  paidSub: { fontSize: 13, color: '#15803d', textAlign: 'center' },
  ordersBtn: { marginTop: 12, backgroundColor: '#15803d', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  ordersBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  payAppBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  payAppBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#7c1f3e', fontWeight: '600', fontSize: 13 },
  utrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ede5dc',
    gap: 8,
  },
  utrTitle: { fontSize: 13, fontWeight: 'bold', color: '#2c0810' },
  utrSub: { fontSize: 11, color: '#8c7b75', lineHeight: 15 },
  utrInput: {
    borderWidth: 1,
    borderColor: '#d6c7b8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 6,
  },
  submitUtrBtn: {
    backgroundColor: '#7c1f3e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  submitUtrBtnDisabled: { opacity: 0.5 },
  submitUtrBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  submittedUtrText: { fontSize: 11, color: '#8c7b75', marginTop: 4 },
});
