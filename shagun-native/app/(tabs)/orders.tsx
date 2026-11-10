import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Image, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import {
  ChevronLeft, Headphones, CheckCircle2, Circle, Truck,
  Package, ShoppingBag, Clock, Copy, Check,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { ToastAndroid, Platform } from 'react-native';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import { Order, OrderStatus, Product } from '../../types';
import { FALLBACK_IMAGE } from '../../constants';
import { appStorage } from '../../services/storage';
import { useBackToHome } from '../../components/useAndroidBackHandler';

const TIMELINE_STEPS = [
  { key: OrderStatus.PROCESSING, label: 'Order Confirmed', sub: 'Order placed & verified' },
  { key: OrderStatus.PACKED, label: 'Packed', sub: 'Items packed at store' },
  { key: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery', sub: 'Delivery agent assigned' },
  { key: OrderStatus.DELIVERED, label: 'Delivered', sub: 'Package handed over' },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case OrderStatus.PROCESSING:
      return 0;
    case OrderStatus.PACKED:
      return 1;
    case OrderStatus.OUT_FOR_DELIVERY:
      return 2;
    case OrderStatus.DELIVERED:
      return 3;
    case OrderStatus.CANCELLED:
      return -1;
    default:
      return 0;
  }
}

export default function OrdersScreen() {
  useBackToHome();
  const { orders, refreshOrders } = useOrders();
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [buyingAgain, setBuyingAgain] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const cached = await appStorage.getItem('cached_catalog');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCatalog(parsed);
          }
        }
      } catch {}
      api.getProducts().then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          setCatalog(prods);
          appStorage.setItem('cached_catalog', JSON.stringify(prods)).catch(() => {});
        }
      }).catch(() => {});
    })();
  }, []);

  const getItemImage = (item: any): string => {
    // 1. Direct item image if available
    if (item.image && typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('/'))) {
      return item.image;
    }
    // 2. Populated product object on item
    if (item.product && typeof item.product === 'object') {
      if (item.product.image && typeof item.product.image === 'string') {
        return item.product.image;
      }
      if (Array.isArray(item.product.images) && item.product.images[0]) {
        return item.product.images[0];
      }
    }
    // 3. Search in loaded catalog by product ID
    const prodId = typeof item.product === 'string' ? item.product : item.product?._id;
    if (prodId && catalog.length > 0) {
      const found = catalog.find(p => p._id === prodId || (p as any).id === prodId);
      if (found) {
        if (found.image) return found.image;
        if (Array.isArray(found.images) && found.images[0]) return found.images[0];
      }
    }
    // 4. Exact name match in catalog (trimmed, case-insensitive)
    if (item.name && catalog.length > 0) {
      const targetName = item.name.trim().toLowerCase();
      const exactFound = catalog.find(p => (p.name || '').trim().toLowerCase() === targetName);
      if (exactFound) {
        if (exactFound.image) return exactFound.image;
        if (Array.isArray(exactFound.images) && exactFound.images[0]) return exactFound.images[0];
      }

      // 5. High-precision word-overlap match (must match majority of words)
      const itemWords = targetName.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      let bestMatch: Product | null = null;
      let bestScore = 0;

      for (const p of catalog) {
        const pWords = (p.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        if (pWords.length === 0) continue;
        let matchCount = 0;
        for (const w of itemWords) {
          if (pWords.includes(w)) matchCount++;
        }
        const score = matchCount / Math.max(itemWords.length, pWords.length);
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = p;
        }
      }

      if (bestMatch) {
        if (bestMatch.image) return bestMatch.image;
        if (Array.isArray(bestMatch.images) && bestMatch.images[0]) return bestMatch.images[0];
      }
    }
    return FALLBACK_IMAGE;
  };

  const handleBuyAgain = async (orderToReorder: Order) => {
    if (!orderToReorder?.items || orderToReorder.items.length === 0) return;
    setBuyingAgain(true);
    let addedCount = 0;
    let outOfStockCount = 0;

    for (const item of orderToReorder.items) {
      const prodId = typeof item.product === 'object' && item.product ? item.product._id : String(item.product || '');
      if (!prodId) continue;
      try {
        const liveProduct = await api.getProductById(prodId);
        if (liveProduct && liveProduct.stock > 0) {
          const qty = Math.min(item.quantity || 1, liveProduct.stock);
          addToCart(liveProduct, qty);
          addedCount++;
        } else {
          outOfStockCount++;
        }
      } catch (e) {
        console.warn('Buy Again item failed', prodId, e);
        outOfStockCount++;
      }
    }
    setBuyingAgain(false);

    if (addedCount > 0) {
      if (outOfStockCount > 0) {
        Alert.alert(
          'Items Added',
          `${addedCount} item(s) re-added to your cart. ${outOfStockCount} item(s) are currently out of stock.`,
          [{ text: 'View Cart', onPress: () => router.push('/(tabs)/cart') }]
        );
      } else {
        router.push('/(tabs)/cart');
      }
    } else {
      Alert.alert('Out of Stock', 'The items from this order are currently out of stock.');
    }
  };

  const handleCopyOrderId = async (id: string) => {
    const idStr = `SGN${id.slice(-7).toUpperCase()}`;
    await Clipboard.setStringAsync(idStr);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Order ID copied', ToastAndroid.SHORT);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Package size={48} color={THEME.colors.maroon700} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>Login to view your orders and track live deliveries</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userOrders = orders
    .filter(o =>
      o.user?._id === user?._id ||
      o.user?.email === user?.email ||
      (o.user as any) === user?._id ||
      (o as any).legacyUserId === user?._id
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (userOrders.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Package size={48} color={THEME.colors.maroon700} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySubtitle}>You haven't placed any orders yet</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/shop')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Active or selected order
  const activeOrder: Order = selectedOrderId
    ? (userOrders.find(o => o._id === selectedOrderId) || userOrders[0])
    : userOrders[0];

  const currentStep = getStepIndex(activeOrder.status);
  const orderDate = new Date(activeOrder.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalItemsCount = activeOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Order Details</Text>

        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => router.push('/(tabs)/account')}
        >
          <Headphones size={22} color={THEME.colors.ink900} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* If multiple orders exist, allow switching */}
        {userOrders.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.orderChipsTrack}
          >
            {userOrders.map((o, idx) => {
              const isSelected = o._id === activeOrder._id;
              return (
                <TouchableOpacity
                  key={o._id}
                  style={[styles.orderChip, isSelected && styles.orderChipActive]}
                  onPress={() => setSelectedOrderId(o._id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.orderChipText, isSelected && styles.orderChipTextActive]}>
                    Order #{idx + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Order Header Card ── */}
        <View style={styles.orderHeaderCard}>
          <View style={styles.orderHeaderLeft}>
            <View style={styles.bagIconCircle}>
              <ShoppingBag size={20} color={THEME.colors.maroon700} strokeWidth={1.8} />
            </View>
            <View>
              <Text style={styles.orderIdText}>
                Order ID: SGN{activeOrder._id.slice(-7).toUpperCase()}
              </Text>
              <Text style={styles.orderDateText}>Placed on {orderDate}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => handleCopyOrderId(activeOrder._id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {copied ? (
              <Check size={18} color={THEME.colors.success} strokeWidth={2} />
            ) : (
              <Copy size={18} color={THEME.colors.maroon700} strokeWidth={1.8} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Payment Information Card ── */}
        <View style={styles.orderHeaderCard}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.colors.maroon900 }}>
                {activeOrder.paymentMethod === 'UPI' ? 'UPI Intent Payment' : 'Cash on Delivery (COD)'}
              </Text>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: activeOrder.paymentStatus === 'paid' ? '#dcfce7' :
                                activeOrder.paymentStatus === 'verifying' ? '#fef3c7' :
                                activeOrder.paymentStatus === 'late_payment' ? '#f3e8ff' :
                                activeOrder.paymentStatus === 'expired' ? '#f3f4f6' : '#eff6ff'
              }}>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: activeOrder.paymentStatus === 'paid' ? '#166534' :
                         activeOrder.paymentStatus === 'verifying' ? '#92400e' :
                         activeOrder.paymentStatus === 'late_payment' ? '#6b21a8' :
                         activeOrder.paymentStatus === 'expired' ? '#4b5563' : '#1e40af'
                }}>
                  {activeOrder.paymentStatus === 'paid' ? 'Paid' :
                   activeOrder.paymentStatus === 'verifying' ? 'Verifying' :
                   activeOrder.paymentStatus === 'late_payment' ? 'Late Payment' :
                   activeOrder.paymentStatus === 'expired' ? 'Expired' :
                   activeOrder.paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 12, color: THEME.colors.ink500 }}>
              {activeOrder.paymentMethod === 'UPI'
                ? (
                  activeOrder.paymentStatus === 'paid' ? 'Payment confirmed by store management' :
                  activeOrder.paymentStatus === 'verifying' ? 'Payment reference submitted; verification in progress' :
                  activeOrder.paymentStatus === 'late_payment' ? 'We received your reference and are checking it.' :
                  activeOrder.paymentStatus === 'expired' ? 'Payment window expired' :
                  'Awaiting payment and UTR submission'
                )
                : 'Pay in cash upon delivery to courier'}
            </Text>

            {activeOrder.paymentMethod === 'UPI' && ['pending', 'Pending', 'verifying', 'late_payment', 'expired'].includes(activeOrder.paymentStatus || '') && (
              <TouchableOpacity
                style={{
                  marginTop: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: THEME.colors.maroon700,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => router.push({ pathname: '/payment-confirm' as any, params: { orderId: activeOrder._id } })}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  {activeOrder.paymentStatus === 'paid' ? 'View Payment Details' : 'Open Payment & Submit UTR'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Vertical Status Timeline Card ── */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineList}>
            {TIMELINE_STEPS.map((step, idx) => {
              const isDone = currentStep > idx || currentStep === 3;
              const isCurrent = currentStep === idx && currentStep !== 3;
              const isPending = currentStep < idx;

              return (
                <View key={step.key} style={styles.timelineRow}>
                  {/* Step icon and connector line */}
                  <View style={styles.stepVisualCol}>
                    {isDone ? (
                      <CheckCircle2 size={20} color={THEME.colors.success} fill={THEME.colors.white} strokeWidth={2.5} />
                    ) : isCurrent ? (
                      <View style={styles.currentStepOuter}>
                        <View style={styles.currentStepInner} />
                      </View>
                    ) : (
                      <Circle size={18} color={THEME.colors.line} strokeWidth={2} />
                    )}
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.timelineConnector,
                          isDone && { backgroundColor: THEME.colors.success },
                        ]}
                      />
                    )}
                  </View>

                  {/* Step text info */}
                  <View style={styles.stepInfoCol}>
                    <Text
                      style={[
                        styles.stepTitle,
                        isDone && { color: THEME.colors.ink900, fontWeight: '700' },
                        isCurrent && { color: THEME.colors.maroon900, fontWeight: '800' },
                        isPending && { color: THEME.colors.ink500 },
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.stepSubtitle}>{step.sub}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Graphic Icon box on right */}
          <View style={styles.boxGraphicContainer}>
            <Package size={52} color={THEME.colors.gold500} strokeWidth={1.5} />
          </View>
        </View>

        {/* ── Order Items Section ── */}
        <View style={styles.orderItemsCard}>
          <Text style={styles.sectionTitle}>Order Items ({totalItemsCount})</Text>

          {activeOrder.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemThumbContainer}>
                <Image
                  source={{ uri: getItemImage(item) }}
                  style={styles.itemThumb}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.itemMeta}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.itemPriceQtyRow}>
                  <Text style={styles.itemPrice}>
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Price Details Card ── */}
        <View style={styles.priceDetailsCard}>
          <Text style={styles.sectionTitle}>Price Details</Text>

          <View style={styles.priceLine}>
            <Text style={styles.priceLabel}>Item Total ({totalItemsCount} items)</Text>
            <Text style={styles.priceVal}>₹{activeOrder.totalAmount.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.priceLine}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text style={[styles.priceVal, { color: THEME.colors.success }]}>FREE</Text>
          </View>

          <View style={styles.priceDivider} />

          <View style={styles.priceLine}>
            <Text style={styles.totalPaidLabel}>Total Paid</Text>
            <Text style={styles.totalPaidVal}>₹{activeOrder.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Buy Again Footer ── */}
      <View style={styles.buyAgainFooter}>
        <TouchableOpacity
          style={styles.buyAgainBtn}
          activeOpacity={0.85}
          onPress={() => handleBuyAgain(activeOrder)}
          disabled={buyingAgain}
        >
          {buyingAgain ? (
            <ActivityIndicator size="small" color={THEME.colors.white} />
          ) : (
            <>
              <ShoppingBag size={18} color={THEME.colors.white} strokeWidth={2} />
              <Text style={styles.buyAgainBtnText}>Buy Again</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.colors.blush50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.blush50,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  orderChipsTrack: {
    gap: 8,
    marginBottom: 4,
  },
  orderChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  orderChipActive: {
    backgroundColor: THEME.colors.maroon700,
    borderColor: THEME.colors.maroon700,
  },
  orderChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.ink500,
  },
  orderChipTextActive: {
    color: THEME.colors.white,
    fontWeight: '700',
  },
  orderHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    ...THEME.shadow,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bagIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.blushCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIdText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.ink900,
  },
  orderDateText: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 2,
  },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: THEME.colors.blush50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    alignItems: 'center',
    ...THEME.shadow,
  },
  timelineList: {
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 52,
  },
  stepVisualCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: THEME.colors.line,
    marginVertical: 4,
  },
  currentStepOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: THEME.colors.maroon700,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
  },
  currentStepInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.maroon700,
  },
  stepInfoCol: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 1,
  },
  stepTitle: {
    fontSize: 13,
    color: THEME.colors.ink900,
  },
  stepSubtitle: {
    fontSize: 10.5,
    color: THEME.colors.ink500,
    marginTop: 1,
  },
  boxGraphicContainer: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemsCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    gap: 12,
    ...THEME.shadow,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: THEME.colors.ink900,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
    paddingTop: 10,
  },
  itemThumbContainer: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: THEME.colors.blush50,
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.ink900,
    lineHeight: 18,
  },
  itemPriceQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.maroon700,
  },
  itemQty: {
    fontSize: 11.5,
    color: THEME.colors.ink500,
    fontWeight: '600',
  },
  priceDetailsCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    gap: 10,
    ...THEME.shadow,
  },
  priceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: THEME.colors.ink500,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.ink900,
  },
  priceDivider: {
    height: 1,
    backgroundColor: THEME.colors.line,
    marginVertical: 2,
  },
  totalPaidLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  totalPaidVal: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.maroon700,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.blushCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.ink500,
    textAlign: 'center',
  },
  actionBtn: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: THEME.radius.pill,
    marginTop: 8,
  },
  actionBtnText: {
    color: THEME.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  buyAgainFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.blush50,
    borderTopWidth: 1,
    borderTopColor: '#F5E6E4',
  },
  buyAgainBtn: {
    backgroundColor: THEME.colors.maroon700,
    height: 52,
    borderRadius: THEME.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...THEME.shadow,
  },
  buyAgainBtnText: {
    color: THEME.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
