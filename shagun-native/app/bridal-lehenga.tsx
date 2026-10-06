import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  Linking, ActivityIndicator, Dimensions, Modal, TextInput,
  ScrollView, Alert, RefreshControl, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Product, ActiveRentalInfo, RentalBooking } from '../types';
import { ADMIN_WHATSAPP } from '../constants';

const { width } = Dimensions.get('window');

export default function BridalLehengaScreen() {
  const [lehengas, setLehengas] = useState<Product[]>([]);
  const [activeRentalsMap, setActiveRentalsMap] = useState<Record<string, ActiveRentalInfo>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Rental Modal State
  const [selectedLehenga, setSelectedLehenga] = useState<Product | null>(null);
  const [startDate, setStartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<RentalBooking | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [lehengasData, rentalsData] = await Promise.all([
        api.getLehengas(),
        api.getActiveRentals()
      ]);
      setLehengas(lehengasData);
      setActiveRentalsMap(rentalsData.activeMap || {});
    } catch (err) {
      console.error('Failed to load bridal lehengas or rentals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const openRentalModal = (lehenga: Product) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to your account to book a bridal lehenga rental.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    setSelectedLehenga(lehenga);
    setBookingSuccess(null);

    // Prepopulate user details
    if (user) {
      if (user.name) setCustomerName(user.name);
      if (user.phone) setCustomerPhone(user.phone);
      if (user.email) setCustomerEmail(user.email);
    }

    // Default dates: tomorrow and +4 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnD = new Date(tomorrow);
    returnD.setDate(returnD.getDate() + 3);

    // If currently booked, suggest date right after return
    const active = activeRentalsMap[lehenga._id];
    if (active && new Date(active.returnDate) > tomorrow) {
      const avail = new Date(active.returnDate);
      avail.setDate(avail.getDate() + 1);
      const nextReturn = new Date(avail);
      nextReturn.setDate(nextReturn.getDate() + 3);
      setStartDate(avail.toISOString().split('T')[0]);
      setReturnDate(nextReturn.toISOString().split('T')[0]);
    } else {
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setReturnDate(returnD.toISOString().split('T')[0]);
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedLehenga) return;

    if (!isAuthenticated || !user?.token) {
      Alert.alert('Authentication Required', 'Please log in to your account before submitting a rental booking.');
      return;
    }

    if (!startDate.trim() || !returnDate.trim()) {
      Alert.alert('Required', 'Please enter both Booking Date and Return Date (YYYY-MM-DD).');
      return;
    }

    if (new Date(returnDate) <= new Date(startDate)) {
      Alert.alert('Invalid Dates', 'Return date must be at least one day after the booking date.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Required', 'Please enter your Name and Mobile Number.');
      return;
    }

    setBookingLoading(true);
    try {
      const booking = await api.createRentalBooking({
        lehengaId: selectedLehenga._id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        startDate,
        returnDate,
        rentalPrice: selectedLehenga.price,
        securityDeposit: 2500,
        notes: notes.trim()
      });

      setBookingSuccess(booking);
      await loadData();
    } catch (err: any) {
      Alert.alert('Booking Notice', err.message || 'Unable to book. Please check date availability.');
    } finally {
      setBookingLoading(false);
    }
  };

  const bookViaWhatsApp = (name?: string, start?: string, end?: string) => {
    let msg = `Hello! I'd like to enquire about your Bridal Lehenga Rental collection.`;
    if (name) {
      msg = `Hello! I want to rent the *${name}*`;
      if (start && end) {
        msg += ` from ${start} to ${end}.`;
      } else {
        msg += `. Please let me know available dates and booking process.`;
      }
    }
    Linking.openURL(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5ede8' }}>
      <FlatList
        data={lehengas}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c1f3e']} />}
        ListHeaderComponent={() => (
          <View style={styles.hero}>
            <Ionicons name="diamond-outline" size={36} color="#d4a853" style={{ marginBottom: 8 }} />
            <Text style={styles.heroTitle}>Bridal Lehenga Rentals</Text>
            <Text style={styles.heroSubtitle}>
              Handcrafted designer bridal lehengas on rent. Real-time booking & return date tracking.
            </Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => bookViaWhatsApp()}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.heroBtnText}>WhatsApp Rental Desk</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() =>
          loading ? (
            <ActivityIndicator color="#d4a853" size="large" style={{ marginTop: 60 }} />
          ) : (
            <Text style={styles.emptyText}>No lehengas available right now.</Text>
          )
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40, gap: 16 }}
        renderItem={({ item }) => {
          const activeBooking = activeRentalsMap[item._id];
          const isBooked = Boolean(activeBooking && activeBooking.isBooked);

          return (
            <View style={styles.card}>
              {/* Image & Status Badge */}
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: item.image || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800' }}
                  style={[styles.cardImage, { width: width - 24 }]}
                  resizeMode="cover"
                />

                {/* Top Badge: Availability */}
                <View style={styles.badgeContainer}>
                  {isBooked ? (
                    <View style={[styles.statusPill, { backgroundColor: 'rgba(190, 18, 60, 0.95)' }]}>
                      <Ionicons name="lock-closed" size={11} color="#fff" />
                      <Text style={styles.statusPillText}>Booked</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusPill, { backgroundColor: 'rgba(5, 150, 105, 0.95)' }]}>
                      <Ionicons name="checkmark-circle" size={11} color="#fff" />
                      <Text style={styles.statusPillText}>Available for Rent</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

                {/* Rental Availability Strip */}
                {isBooked ? (
                  <View style={styles.bookedBanner}>
                    <View style={styles.bookedBannerRow}>
                      <Text style={styles.bookedBannerLabel}>
                        <Ionicons name="calendar-outline" size={13} color="#b45309" /> Currently Booked Until:
                      </Text>
                      <Text style={styles.bookedBannerValue}>
                        {formatDate(activeBooking.returnDate)}
                      </Text>
                    </View>
                    <View style={[styles.bookedBannerRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#fde68a' }]}>
                      <Text style={[styles.bookedBannerLabel, { color: '#047857' }]}>
                        Available From:
                      </Text>
                      <Text style={[styles.bookedBannerValue, { color: '#047857', fontWeight: '800' }]}>
                        {formatDate(activeBooking.availableFrom)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.availableBanner}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                    <Text style={styles.availableBannerText}>Ready for immediate booking for your event</Text>
                  </View>
                )}

                {/* Card Footer: Price & Rent Action */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Rental Price</Text>
                    <Text style={styles.cardPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.rentBtn, isBooked ? { backgroundColor: '#d97706' } : { backgroundColor: '#7c1f3e' }]}
                      onPress={() => openRentalModal(item)}
                    >
                      <Ionicons name={isBooked ? "calendar" : "calendar-outline"} size={15} color="#fff" />
                      <Text style={styles.rentBtnText}>{isBooked ? "Reserve Next" : "Rent Lehenga"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.waBtn}
                      onPress={() => bookViaWhatsApp(item.name)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* RENTAL BOOKING MODAL */}
      {selectedLehenga && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedLehenga(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Book Lehenga Rental</Text>
                  <Text style={styles.modalSubtitle}>Database Synced with Shagun Store</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedLehenga(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
                {bookingSuccess ? (
                  <View style={styles.successView}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark" size={32} color="#059669" />
                    </View>
                    <Text style={styles.successTitle}>Booking Confirmed!</Text>
                    <Text style={styles.successSub}>
                      Your bridal lehenga has been reserved and synced with the store database.
                    </Text>

                    <View style={styles.successBox}>
                      <Text style={styles.successItem}>Lehenga: <Text style={{ fontWeight: 'bold' }}>{bookingSuccess.lehengaName}</Text></Text>
                      <Text style={styles.successItem}>Booking Date: <Text style={{ fontWeight: 'bold' }}>{formatDate(bookingSuccess.startDate)}</Text></Text>
                      <Text style={styles.successItem}>Return Date: <Text style={{ fontWeight: 'bold', color: '#7c1f3e' }}>{formatDate(bookingSuccess.returnDate)}</Text></Text>
                      <Text style={styles.successItem}>Total Rental: <Text style={{ fontWeight: 'bold', color: '#7c1f3e' }}>₹{bookingSuccess.totalAmount.toLocaleString('en-IN')}</Text></Text>
                    </View>

                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={() => setSelectedLehenga(null)}
                    >
                      <Text style={styles.doneBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Selected Item Info */}
                    <View style={styles.selectedItemCard}>
                      <Image source={{ uri: selectedLehenga.image }} style={styles.selectedItemImg} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.selectedItemName}>{selectedLehenga.name}</Text>
                        <Text style={styles.selectedItemPrice}>
                          ₹{selectedLehenga.price.toLocaleString('en-IN')} <Text style={{ fontSize: 11, color: '#71717a' }}>rental fee</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: '#a1a1aa' }}>+ ₹2,500 security deposit</Text>
                      </View>
                    </View>

                    {/* Notice if currently booked */}
                    {activeRentalsMap[selectedLehenga._id]?.isBooked && (
                      <View style={styles.conflictNotice}>
                        <Ionicons name="information-circle" size={16} color="#b45309" />
                        <Text style={styles.conflictNoticeText}>
                          Currently booked until {formatDate(activeRentalsMap[selectedLehenga._id].returnDate)}. Next available date is {formatDate(activeRentalsMap[selectedLehenga._id].availableFrom)}.
                        </Text>
                      </View>
                    )}

                    {/* Date Inputs */}
                    <View style={{ gap: 4 }}>
                      <Text style={styles.inputLabel}>Booking / Event Date (YYYY-MM-DD) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 2026-10-15"
                        placeholderTextColor="#a1a1aa"
                        value={startDate}
                        onChangeText={setStartDate}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={styles.inputLabel}>Return Date (YYYY-MM-DD) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 2026-10-20"
                        placeholderTextColor="#a1a1aa"
                        value={returnDate}
                        onChangeText={setReturnDate}
                      />
                    </View>

                    {/* Customer Inputs */}
                    <View style={{ gap: 4 }}>
                      <Text style={styles.inputLabel}>Customer Full Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Priya Sharma"
                        placeholderTextColor="#a1a1aa"
                        value={customerName}
                        onChangeText={setCustomerName}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={styles.inputLabel}>Mobile Phone *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 9876543210"
                        placeholderTextColor="#a1a1aa"
                        keyboardType="phone-pad"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={styles.inputLabel}>Fitting / Alteration Notes (Optional)</Text>
                      <TextInput
                        style={[styles.input, { height: 60 }]}
                        placeholder="Any size specifications or trial time..."
                        placeholderTextColor="#a1a1aa"
                        multiline
                        value={notes}
                        onChangeText={setNotes}
                      />
                    </View>

                    {/* Action Buttons */}
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={handleBookingSubmit}
                      disabled={bookingLoading}
                    >
                      {bookingLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.submitBtnText}>Confirm Rental Booking</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.waSubmitBtn}
                      onPress={() => bookViaWhatsApp(selectedLehenga.name, startDate, returnDate)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                      <Text style={styles.waSubmitBtnText}>Book via WhatsApp</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#4a0f22',
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: { color: '#f5ede8', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { color: '#e5c479', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    backgroundColor: '#25D366', paddingHorizontal: 22, paddingVertical: 11, borderRadius: 24,
  },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eeded5',
  },
  cardImage: { height: 290 },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: { padding: 16, gap: 8 },
  cardName: { fontSize: 18, fontWeight: '800', color: '#1a0a12' },
  cardDesc: { color: '#71717a', fontSize: 12, lineHeight: 17 },
  bookedBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 10,
  },
  bookedBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookedBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  bookedBannerValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350f',
  },
  availableBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availableBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
  },
  priceLabel: {
    fontSize: 10,
    color: '#a1a1aa',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  cardPrice: { fontSize: 22, fontWeight: '800', color: '#7c1f3e' },
  rentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  rentBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  waBtn: {
    backgroundColor: '#25D366',
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'center', color: '#9c7a8a', marginTop: 40 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#4a0f22',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: '#d4a853', fontSize: 12 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedItemCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#faf5f2',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  selectedItemImg: { width: 56, height: 56, borderRadius: 12 },
  selectedItemName: { fontSize: 15, fontWeight: '700', color: '#1a0a12' },
  selectedItemPrice: { fontSize: 15, fontWeight: '800', color: '#7c1f3e' },
  conflictNotice: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  conflictNoticeText: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#27272a' },
  input: {
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#18181b',
  },
  submitBtn: {
    backgroundColor: '#7c1f3e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  waSubmitBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
  },
  waSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  successView: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#1a0a12' },
  successSub: { fontSize: 13, color: '#71717a', textAlign: 'center' },
  successBox: {
    backgroundColor: '#faf5f2',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    gap: 6,
  },
  successItem: { fontSize: 13, color: '#27272a' },
  doneBtn: {
    backgroundColor: '#7c1f3e',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
