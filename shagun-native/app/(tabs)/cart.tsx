import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Alert, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { ChevronLeft, Heart, MapPin, Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FALLBACK_IMAGE } from '../../constants';
import { useBackToHome } from '../../components/useAndroidBackHandler';

export default function CartScreen() {
  useBackToHome();
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to proceed to checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }

    const outOfStock = cart.find(i => typeof i.stock === 'number' && i.stock <= 0);
    if (outOfStock) {
      Alert.alert('Out of Stock', `"${outOfStock.name}" is currently out of stock. Please remove it from your cart.`);
      return;
    }

    const exceeded = cart.find(i => typeof i.stock === 'number' && i.quantity > i.stock);
    if (exceeded) {
      Alert.alert('Stock Limit', `Only ${exceeded.stock} available for "${exceeded.name}". Please reduce the quantity.`);
      return;
    }

    router.push('/checkout');
  };

  const deliveryFee = totalPrice >= 399 ? 0 : 30;
  const finalTotal = totalPrice + deliveryFee;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const defaultAddr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0];

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart (0)</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color={THEME.colors.maroon700} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Explore our products and find great deals</Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.push('/(tabs)/shop')}
            activeOpacity={0.8}
          >
            <Text style={styles.shopNowBtnText}>Browse Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.blush50} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={THEME.colors.ink900} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart ({totalItemCount})</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/account')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart size={22} color={THEME.colors.maroon700} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            {/* Delivery address card */}
            {defaultAddr ? (
              <View style={styles.addressCard}>
                <View style={styles.addressLeft}>
                  <MapPin size={20} color={THEME.colors.maroon700} strokeWidth={2} />
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressTitle}>Deliver to Home</Text>
                    <Text style={styles.addressSubtitle} numberOfLines={1}>
                      {defaultAddr.houseNo}, {defaultAddr.street}, {defaultAddr.city} – {defaultAddr.pinCode}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/account')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => {
          const itemMrp = item.mrp && item.mrp > item.price ? item.mrp : null;
          return (
            <View style={styles.cartCard}>
              <View style={styles.cardImageContainer}>
                <Image
                  source={{ uri: item.image || FALLBACK_IMAGE }}
                  style={styles.cardImage}
                  defaultSource={{ uri: FALLBACK_IMAGE }}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item._id)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={18} color={THEME.colors.ink500} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>

                {typeof item.stock === 'number' && item.stock <= 0 ? (
                  <Text style={styles.stockWarning}>Out of Stock</Text>
                ) : null}

                <View style={styles.cardBottomRow}>
                  <View style={styles.priceRow}>
                    <Text style={styles.cardPrice}>
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </Text>
                    {itemMrp ? (
                      <Text style={styles.cardMrp}>
                        ₹{(itemMrp * item.quantity).toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                  </View>

                  {/* Quantity Stepper Pill */}
                  <View style={styles.stepperPill}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        if (item.quantity <= 1) {
                          removeFromCart(item._id);
                        } else {
                          updateQuantity(item._id, item.quantity - 1);
                        }
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Minus size={14} color={THEME.colors.maroon700} strokeWidth={2} />
                    </TouchableOpacity>
                    <Text style={styles.stepperText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateQuantity(item._id, item.quantity + 1)}
                      disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Plus size={14} color={THEME.colors.maroon700} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          <View style={styles.footerDetails}>
            {/* Clear cart action */}
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => Alert.alert('Clear Cart', 'Remove all items from your cart?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearCart },
              ])}
            >
              <Text style={styles.clearBtnText}>Clear Cart</Text>
            </TouchableOpacity>

            {/* Price Details Card */}
            <View style={styles.priceDetailsCard}>
              <Text style={styles.priceDetailsTitle}>Price Details</Text>

              <View style={styles.priceRowItem}>
                <Text style={styles.priceLabel}>Item Total ({totalItemCount} items)</Text>
                <Text style={styles.priceValue}>₹{totalPrice.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.priceRowItem}>
                <Text style={styles.priceLabel}>Delivery Fee</Text>
                <Text style={[styles.priceValue, deliveryFee === 0 && { color: THEME.colors.success }]}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </Text>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.priceRowItem}>
                <Text style={styles.totalPayableLabel}>Total Payable</Text>
                <Text style={styles.totalPayableValue}>₹{finalTotal.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Pinned Proceed to Checkout Button */}
      <View style={styles.pinnedBottom}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <ArrowRight size={18} color={THEME.colors.white} strokeWidth={2} />
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
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    ...THEME.shadow,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.ink900,
  },
  addressSubtitle: {
    fontSize: 11,
    color: THEME.colors.ink500,
    marginTop: 2,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.maroon700,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.card,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.colors.blushCard,
    ...THEME.shadow,
  },
  cardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: THEME.colors.blush50,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.ink900,
    flex: 1,
    lineHeight: 18,
  },
  stockWarning: {
    color: THEME.colors.error,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.maroon700,
  },
  cardMrp: {
    fontSize: 11.5,
    color: THEME.colors.ink500,
    textDecorationLine: 'line-through',
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.ink900,
    minWidth: 16,
    textAlign: 'center',
  },
  footerDetails: {
    marginTop: 8,
    gap: 14,
  },
  clearBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: THEME.colors.ink500,
    textDecorationLine: 'underline',
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
  priceDetailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.ink900,
    marginBottom: 4,
  },
  priceRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: THEME.colors.ink500,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.ink900,
  },
  priceDivider: {
    height: 1,
    backgroundColor: THEME.colors.line,
    marginVertical: 4,
  },
  totalPayableLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.maroon900,
  },
  totalPayableValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.maroon700,
  },
  pinnedBottom: {
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
  },
  checkoutBtn: {
    backgroundColor: THEME.colors.maroon700,
    borderRadius: THEME.radius.pill,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
  shopNowBtn: {
    backgroundColor: THEME.colors.maroon700,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: THEME.radius.pill,
    marginTop: 8,
  },
  shopNowBtnText: {
    color: THEME.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
