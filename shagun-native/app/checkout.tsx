import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking, Modal, SafeAreaView, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Address, Order } from '../types';
import { ADMIN_WHATSAPP, API_BASE_URL, APP_ENV, PRODUCTION_API_HOST } from '../constants';
import { api } from '../services/api';
import { isHostBlocked } from '../utils/hostSafety';
import { useSmartBack } from '../components/useAndroidBackHandler';

const PAYMENT_METHODS = ['COD', 'UPI', 'Online'] as const;

export default function CheckoutScreen() {
  useSmartBack('/(tabs)/cart');
  const { cart, totalPrice, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { user, isAuthenticated, updateUser } = useAuth();
  const router = useRouter();

  // Order success state
  const [orderPlacedOrder, setOrderPlacedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Login Required',
        'Please log in to your account to proceed with checkout.',
        [
          { text: 'Cancel', onPress: () => router.back(), style: 'cancel' },
          { text: 'Log In', onPress: () => router.replace('/login') }
        ]
      );
    }
  }, [isAuthenticated, user]);

  // Default address from user profile
  const defaultAddr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0] || null;
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(defaultAddr);

  // Address Modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [modalMode, setModalMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState(user?.name || '');
  const [formPhone, setFormPhone] = useState(user?.phone || '');
  const [formHouse, setFormHouse] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formDefault, setFormDefault] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [formError, setFormError] = useState('');

  // Payment & Order states
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'Online'>('COD');
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [upiMessage, setUpiMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isDevLiveBlocked = false;

  useEffect(() => {
    api.getUpiSettings().then(res => {
      const enabled = Boolean(res.enabled);
      setUpiEnabled(enabled);
      if (!enabled) {
        setUpiMessage('UPI is not set up');
        if (paymentMethod === 'UPI') {
          setPaymentMethod('COD');
        }
      } else {
        setUpiMessage(null);
      }
    }).catch(() => {
      setUpiEnabled(false);
      setUpiMessage('Could not reach the server');
      if (paymentMethod === 'UPI') {
        setPaymentMethod('COD');
      }
    });
  }, []);

  // If user has no address, prompt to add one first
  useEffect(() => {
    if (user && (!user.addresses || user.addresses.length === 0) && !selectedAddress) {
      resetFormForAdd();
      setModalMode('form');
      setShowAddressModal(true);
    } else if (!selectedAddress && defaultAddr) {
      setSelectedAddress(defaultAddr);
    }
  }, [user]);

  const handleBack = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
        return;
      }
      router.replace('/(tabs)/cart');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/cart');
    }
  };

  const resetFormForAdd = () => {
    setEditingId(null);
    setFormName(user?.name || '');
    setFormPhone(user?.phone || '');
    setFormHouse('');
    setFormStreet('');
    setFormCity('');
    setFormState('');
    setFormPin('');
    setFormDefault((user?.addresses?.length || 0) === 0);
    setFormError('');
  };

  const startEditAddress = (addr: Address) => {
    setEditingId(addr._id || null);
    setFormName(addr.fullName || '');
    setFormPhone(addr.mobile || '');
    setFormHouse(addr.houseNo || '');
    setFormStreet(addr.street || '');
    setFormCity(addr.city || '');
    setFormState(addr.state || '');
    setFormPin(addr.pinCode || '');
    setFormDefault(!!addr.isDefault);
    setFormError('');
    setModalMode('form');
  };

  const saveAddressForm = async () => {
    setFormError('');
    if (!formName.trim() || !formPhone.trim() || !formHouse.trim() || !formStreet.trim() || !formCity.trim() || !formState.trim() || !formPin.trim()) {
      setFormError('Please fill in all address fields.');
      return;
    }
    const cleanMobile = formPhone.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const cleanPin = formPin.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setFormError('Please enter a valid 6-digit PIN code.');
      return;
    }

    setSavingAddr(true);
    const payload = {
      fullName: formName.trim(),
      mobile: cleanMobile,
      houseNo: formHouse.trim(),
      street: formStreet.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      pinCode: cleanPin,
      isDefault: formDefault,
    };

    try {
      let updatedAddresses: Address[] = [];
      if (editingId) {
        updatedAddresses = await api.updateAddress(editingId, payload);
      } else {
        updatedAddresses = await api.addAddress(payload);
      }

      if (user && Array.isArray(updatedAddresses)) {
        updateUser({ ...user, addresses: updatedAddresses });
        const matched = editingId
          ? updatedAddresses.find(a => a._id === editingId)
          : updatedAddresses[updatedAddresses.length - 1];
        setSelectedAddress(matched || updatedAddresses[0]);
      }
      setShowAddressModal(false);
    } catch (err: any) {
      console.warn('Backend address save failed, updating locally:', err);
      const fallbackAddresses = [...(user?.addresses || [])];
      const newAddr: Address = {
        _id: editingId || `addr_${Date.now()}`,
        fullName: formName.trim(),
        mobile: cleanMobile,
        houseNo: formHouse.trim(),
        street: formStreet.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        pinCode: cleanPin,
        isDefault: formDefault,
      };
      if (formDefault) {
        fallbackAddresses.forEach(a => { a.isDefault = false; });
      }
      if (editingId) {
        const idx = fallbackAddresses.findIndex(a => a._id === editingId);
        if (idx !== -1) fallbackAddresses[idx] = newAddr;
      } else {
        fallbackAddresses.push(newAddr);
      }
      if (user) {
        updateUser({ ...user, addresses: fallbackAddresses });
      }
      setSelectedAddress(newAddr);
      setShowAddressModal(false);
    } finally {
      setSavingAddr(false);
    }
  };

  const deliveryFee = cart.length === 0 ? 0 : (totalPrice >= 399 ? 0 : 30);
  const finalTotal = cart.length === 0 ? 0 : (totalPrice + deliveryFee);

  const placeOrder = async () => {
    if (!isAuthenticated || !user || !user.token) {
      Alert.alert(
        'Login Required',
        'You must be logged in to place an order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please add a delivery address to place your order.');
      resetFormForAdd();
      setModalMode('form');
      setShowAddressModal(true);
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Add items to your cart first.');
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

    setLoading(true);
    try {
      const orderPayload = {
        user: user?._id as any,
        items: cart.map(item => ({
          product: item._id as any,
          name: item.name,
          image: item.image || (item.images && item.images[0]) || '',
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: finalTotal,
        shippingAddress: {
          fullName: selectedAddress.fullName,
          mobile: selectedAddress.mobile,
          houseNo: selectedAddress.houseNo,
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pinCode: selectedAddress.pinCode,
        },
        paymentMethod,
        paymentStatus: paymentMethod === 'UPI' ? 'pending' : 'Pending' as const,
      };

      const placedOrder = await addOrder(orderPayload);
      clearCart();

      // For UPI orders: attempt to open UPI app via Linking, then route to payment confirmation screen
      if (paymentMethod === 'UPI') {
        const upiUri = placedOrder?.upiIntent?.upiUri;
        if (upiUri) {
          try {
            await Linking.openURL(upiUri);
          } catch (linkErr) {
            Alert.alert(
              'No UPI app found',
              'No UPI app was detected on this device. You can proceed to enter your 12-digit UTR reference, or choose Cash on Delivery (COD) instead.',
              [
                { text: 'Proceed to UTR', onPress: () => {} },
                { text: 'Choose COD', onPress: () => { router.replace('/checkout'); } }
              ]
            );
          }
        }
        router.replace({
          pathname: '/payment-confirm' as any,
          params: { orderId: placedOrder?._id }
        });
        return;
      }

      setOrderPlacedOrder(placedOrder || (orderPayload as any));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // ── 1. Order Placed Success View ───────────────────────────────────────────
  if (orderPlacedOrder) {
    const orderId = orderPlacedOrder._id || 'SGN' + Date.now().toString().slice(-7);
    const orderAddr = orderPlacedOrder.shippingAddress || selectedAddress;

    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Top Bar with Back Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/orders')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#047857" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Order Confirmed</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={64} color="#15803d" />
          </View>

          <Text style={styles.successTitle}>Order Placed Successfully!</Text>
          <Text style={styles.successSub}>Thank you for ordering with Shagun Mart</Text>

          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Order ID</Text>
              <Text style={styles.successVal}>#{orderId.toString().slice(-8).toUpperCase()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Total Paid</Text>
              <Text style={[styles.successVal, { color: '#047857', fontSize: 16 }]}>
                ₹{orderPlacedOrder.totalAmount?.toLocaleString('en-IN') || finalTotal}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Payment Method</Text>
              <Text style={styles.successVal}>{orderPlacedOrder.paymentMethod || paymentMethod}</Text>
            </View>

            {orderAddr && (
              <>
                <View style={styles.divider} />
                <View style={{ gap: 4 }}>
                  <Text style={styles.successLabel}>Delivering To:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a0a12' }}>{orderAddr.fullName} (📞 {orderAddr.mobile})</Text>
                  <Text style={{ fontSize: 12.5, color: '#555', lineHeight: 17 }}>
                    {orderAddr.houseNo}, {orderAddr.street}, {orderAddr.city}, {orderAddr.state} – {orderAddr.pinCode}
                  </Text>
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.replace('/orders')}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt-outline" size={19} color="#fff" />
            <Text style={styles.primaryActionBtnText}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whatsappActionBtn}
            onPress={() => {
              const waMsg = `🛍️ *New Order Placed!*\n\n` +
                `Order ID: #${orderId}\n` +
                `Customer: ${orderAddr?.fullName || ''} (${orderAddr?.mobile || ''})\n` +
                `Total: ₹${orderPlacedOrder.totalAmount?.toLocaleString('en-IN') || finalTotal} (${paymentMethod})\n\n` +
                `Hi Shagun Mart, please confirm my order!`;
              Linking.openURL(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(waMsg)}`);
              router.replace('/orders');
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={19} color="#fff" />
            <Text style={styles.primaryActionBtnText}>Send on WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.replace('/(tabs)/shop')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryActionBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 2. Empty Cart View ─────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Top Bar with Back Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#047857" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Checkout</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.emptyCartContainer}>
          <View style={styles.emptyCartIconCircle}>
            <Ionicons name="cart-outline" size={60} color="#047857" />
          </View>
          <Text style={styles.emptyCartTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptyCartSub}>Add items to your cart before proceeding to checkout.</Text>
          <TouchableOpacity
            style={styles.startShopBtn}
            onPress={() => router.replace('/(tabs)/shop')}
            activeOpacity={0.85}
          >
            <Ionicons name="bag-handle-outline" size={18} color="#fff" />
            <Text style={styles.startShopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 3. Active Checkout Screen ──────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Bar with Back Button (Requested by User) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#047857" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── Compact Top Delivery Address Card ── */}
        {selectedAddress ? (
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="location" size={18} color="#047857" />
                <Text style={styles.deliveryToText} numberOfLines={1}>
                  Deliver to: <Text style={styles.deliveryToName}>{selectedAddress.fullName}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => {
                  setModalMode(user?.addresses && user.addresses.length > 1 ? 'list' : 'form');
                  if (!user?.addresses || user.addresses.length <= 1) {
                    startEditAddress(selectedAddress);
                  }
                  setShowAddressModal(true);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={13} color="#047857" />
                <Text style={styles.changeBtnText}>Change / Edit</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.deliveryAddressText}>
              {selectedAddress.houseNo}, {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} – {selectedAddress.pinCode}
            </Text>
            <Text style={styles.deliveryPhoneText}>📞 {selectedAddress.mobile}</Text>
          </View>
        ) : (
          <View style={styles.noAddressCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="location-outline" size={24} color="#047857" />
              <View style={{ flex: 1 }}>
                <Text style={styles.noAddressTitle}>No Delivery Address Added</Text>
                <Text style={styles.noAddressSub}>Please enter your address to place order</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addAddressPromptBtn}
              onPress={() => {
                resetFormForAdd();
                setModalMode('form');
                setShowAddressModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addAddressPromptBtnText}>+ Add Address</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Payment Method Selector ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map(method => {
              const isUpiDisabled = method === 'UPI' && !upiEnabled;
              return (
                <TouchableOpacity
                  key={method}
                  disabled={isUpiDisabled}
                  style={[
                    styles.paymentOption,
                    paymentMethod === method && styles.paymentOptionActive,
                    isUpiDisabled && { opacity: 0.45 }
                  ]}
                  onPress={() => {
                    if (!isUpiDisabled) setPaymentMethod(method);
                  }}
                >
                  <Ionicons
                    name={method === 'COD' ? 'cash-outline' : method === 'UPI' ? 'phone-portrait-outline' : 'card-outline'}
                    size={20}
                    color={paymentMethod === method ? '#f5ede8' : '#047857'}
                  />
                  <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!upiEnabled && (
            <Text style={{ fontSize: 11, color: '#991b1b', marginTop: 6, fontWeight: '600' }}>
              {upiMessage || 'UPI payments are temporarily unavailable. Please choose Cash on Delivery.'}
            </Text>
          )}
        </View>

        {/* ── Order Summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)</Text>
          {cart.map(item => (
            <View key={item._id} style={styles.summaryRow}>
              <Text style={styles.summaryName} numberOfLines={1}>{item.name} ×{item.quantity}</Text>
              <Text style={styles.summaryPrice}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={{ fontSize: 13, color: '#666' }}>Subtotal</Text>
            <Text style={{ fontSize: 13, color: '#666' }}>₹{totalPrice.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ fontSize: 13, color: '#666' }}>Delivery</Text>
            <Text style={{ fontSize: 13, color: deliveryFee === 0 ? '#1b8a4b' : '#047857', fontWeight: '600' }}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>₹{finalTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* ── Place Order Button ── */}
        <TouchableOpacity
          style={styles.orderBtn}
          onPress={placeOrder}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.orderBtnText}>Place Order (₹{finalTotal.toLocaleString('en-IN')}) →</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />

        {/* ── Address Change / Add Modal ── */}
        <Modal visible={showAddressModal} animationType="slide" onRequestClose={() => setShowAddressModal(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f5ede8' }}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="location" size={22} color="#047857" />
                <Text style={styles.modalTitle}>
                  {modalMode === 'form'
                    ? (editingId ? 'Edit Delivery Address' : 'Add Delivery Address')
                    : 'Select Delivery Address'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={26} color="#047857" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 14 }} showsVerticalScrollIndicator={false}>
              {modalMode === 'form' ? (
                /* Address Form */
                <View style={styles.modalCard}>
                  {formError ? (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorBannerText}>{formError}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.fieldLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#9c7a8a"
                    value={formName}
                    onChangeText={setFormName}
                  />

                  <Text style={styles.fieldLabel}>Mobile Number *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#9c7a8a"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />

                  <Text style={styles.fieldLabel}>House / Flat / Building No. *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Flat 204, Royal Palms"
                    placeholderTextColor="#9c7a8a"
                    value={formHouse}
                    onChangeText={setFormHouse}
                  />

                  <Text style={styles.fieldLabel}>Street / Area / Landmark *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. MG Road, Near City Mall"
                    placeholderTextColor="#9c7a8a"
                    value={formStreet}
                    onChangeText={setFormStreet}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>City *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Chhatarpur"
                        placeholderTextColor="#9c7a8a"
                        value={formCity}
                        onChangeText={setFormCity}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>State *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. MP"
                        placeholderTextColor="#9c7a8a"
                        value={formState}
                        onChangeText={setFormState}
                      />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>PIN Code *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="6-digit PIN"
                    placeholderTextColor="#9c7a8a"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={formPin}
                    onChangeText={setFormPin}
                  />

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    activeOpacity={0.8}
                    onPress={() => setFormDefault(!formDefault)}
                  >
                    <Ionicons
                      name={formDefault ? 'checkbox' : 'square-outline'}
                      size={22}
                      color="#047857"
                    />
                    <Text style={styles.checkboxText}>Set as default delivery address</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={saveAddressForm}
                    disabled={savingAddr}
                    activeOpacity={0.85}
                  >
                    {savingAddr ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {editingId ? 'Update Address' : 'Save & Deliver Here'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {user?.addresses && user.addresses.length > 0 && (
                    <TouchableOpacity
                      style={styles.cancelLinkBtn}
                      onPress={() => setModalMode('list')}
                    >
                      <Text style={styles.cancelLinkText}>← Choose from Saved Addresses</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* Address Selection List */
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                      resetFormForAdd();
                      setModalMode('form');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>+ Add Another Address</Text>
                  </TouchableOpacity>

                  {user?.addresses && user.addresses.map((addr: Address, idx: number) => {
                    const isSelected = selectedAddress?._id === addr._id ||
                      (selectedAddress?.houseNo === addr.houseNo && selectedAddress?.mobile === addr.mobile);

                    return (
                      <TouchableOpacity
                        key={addr._id || idx}
                        style={[styles.addrSelectCard, isSelected && styles.addrSelectCardActive]}
                        onPress={() => {
                          setSelectedAddress(addr);
                          setShowAddressModal(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={22}
                            color="#047857"
                            style={{ marginTop: 2 }}
                          />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={styles.addrSelectName}>{addr.fullName}</Text>
                              {addr.isDefault && (
                                <View style={styles.defaultPill}>
                                  <Text style={styles.defaultPillText}>DEFAULT</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.addrSelectLine}>
                              {addr.houseNo}, {addr.street}, {addr.city}, {addr.state} – {addr.pinCode}
                            </Text>
                            <Text style={styles.addrSelectPhone}>📞 {addr.mobile}</Text>
                          </View>
                        </View>

                        <View style={styles.addrSelectFooter}>
                          <TouchableOpacity
                            style={styles.addrEditBtn}
                            onPress={() => startEditAddress(addr)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="pencil" size={13} color="#047857" />
                            <Text style={styles.addrEditBtnText}>Edit</Text>
                          </TouchableOpacity>

                          {isSelected && (
                            <View style={styles.selectedPill}>
                              <Ionicons name="checkmark-circle" size={14} color="#1b8a4b" />
                              <Text style={styles.selectedPillText}>Delivering Here</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#f5ede8' },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f0e4da',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fbf5f2',
  },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#047857' },

  // Empty Cart
  emptyCartContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: '#f5ede8',
  },
  emptyCartIconCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#fbf5f2',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e8d5c4',
  },
  emptyCartTitle: { fontSize: 20, fontWeight: '800', color: '#047857' },
  emptyCartSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  startShopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#047857', paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 24, marginTop: 8,
  },
  startShopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Compact Top Address Card
  deliveryCard: {
    backgroundColor: '#fff', margin: 12, marginBottom: 4, borderRadius: 12, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#047857',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  deliveryHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  deliveryToText: { fontSize: 14, color: '#333', fontWeight: '500' },
  deliveryToName: { fontSize: 14, fontWeight: '800', color: '#1a0a12' },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fbf5f2', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#e8d5c4',
  },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: '#047857' },
  deliveryAddressText: { fontSize: 13, color: '#555', lineHeight: 18 },
  deliveryPhoneText: { fontSize: 12.5, color: '#666', marginTop: 4 },

  noAddressCard: {
    backgroundColor: '#fff', margin: 12, marginBottom: 4, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#e8d5c4', borderStyle: 'dashed',
  },
  noAddressTitle: { fontSize: 13.5, fontWeight: '700', color: '#047857' },
  noAddressSub: { fontSize: 12, color: '#777', marginTop: 2 },
  addAddressPromptBtn: {
    backgroundColor: '#047857', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  addAddressPromptBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Sections
  section: {
    backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#047857', marginBottom: 14 },

  // Payment
  paymentRow: { flexDirection: 'row', gap: 10 },
  paymentOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#047857',
  },
  paymentOptionActive: { backgroundColor: '#047857' },
  paymentOptionText: { fontWeight: '700', color: '#047857', fontSize: 13 },
  paymentOptionTextActive: { color: '#f5ede8' },

  // Order Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryName: { flex: 1, color: '#333', fontSize: 13 },
  summaryPrice: { fontWeight: '600', color: '#047857', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#f0e4da', marginVertical: 8 },
  totalLabel: { fontWeight: '800', fontSize: 16, color: '#1a0a12' },
  totalValue: { fontWeight: '800', fontSize: 18, color: '#047857' },

  // Place Order Button
  orderBtn: {
    backgroundColor: '#09090B', marginHorizontal: 12, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#09090B', shadowOpacity: 0.15, shadowRadius: 5, elevation: 2,
  },
  orderBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  // Success Screen
  successIconCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 16,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#15803d', textAlign: 'center' },
  successSub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  successCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 20,
  },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  successLabel: { fontSize: 13, color: '#666' },
  successVal: { fontSize: 14, fontWeight: '700', color: '#1a0a12' },
  primaryActionBtn: {
    backgroundColor: '#047857', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%', paddingVertical: 14, borderRadius: 12, marginBottom: 10,
  },
  primaryActionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  whatsappActionBtn: {
    backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%', paddingVertical: 14, borderRadius: 12, marginBottom: 10,
  },
  secondaryActionBtn: {
    paddingVertical: 12, alignItems: 'center', width: '100%',
  },
  secondaryActionBtnText: { color: '#047857', fontSize: 14, fontWeight: '700' },

  // Modal Styles
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8d5c4',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#047857' },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 8 },
  modalInput: {
    borderWidth: 1, borderColor: '#e8d5c4', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: '#1a0a12', backgroundColor: '#faf6f3',
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 },
  checkboxText: { fontSize: 13, color: '#333', fontWeight: '500' },
  primaryBtn: {
    backgroundColor: '#047857', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorBanner: {
    backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorBannerText: { color: '#dc2626', fontSize: 13, fontWeight: '500' },
  cancelLinkBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 6 },
  cancelLinkText: { color: '#047857', fontSize: 13, fontWeight: '600' },

  addBtn: {
    backgroundColor: '#047857', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Address Selection List Item
  addrSelectCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#e8d5c4',
  },
  addrSelectCardActive: {
    borderColor: '#047857', backgroundColor: '#fff',
  },
  addrSelectName: { fontSize: 15, fontWeight: '700', color: '#1a0a12' },
  defaultPill: {
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: '#f59e0b',
  },
  defaultPillText: { fontSize: 10, fontWeight: '800', color: '#b45309' },
  addrSelectLine: { fontSize: 13, color: '#444', lineHeight: 18, marginTop: 4 },
  addrSelectPhone: { fontSize: 12.5, color: '#666', marginTop: 4 },
  addrSelectFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0e4da',
  },
  addrEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: '#047857',
  },
  addrEditBtnText: { fontSize: 12, fontWeight: '600', color: '#047857' },
  selectedPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectedPillText: { fontSize: 12, fontWeight: '700', color: '#1b8a4b' },
});
