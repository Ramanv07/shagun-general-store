import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
  SafeAreaView, StatusBar, Modal, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_WHATSAPP } from '../constants';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useSmartBack } from '../components/useAndroidBackHandler';

const DEFAULT_SERVICES = [
  { id: 'bridal', name: 'Bridal Makeup', price: 6500, desc: 'Complete bridal package — trial & wedding day', icon: 'heart-outline' as const },
  { id: 'party', name: 'Party Makeup', price: 2200, desc: 'Flawless party look with waterproof makeup', icon: 'brush-outline' as const },
  { id: 'hair', name: 'Haircut & Styling', price: 1800, desc: 'Expert cuts, blowouts & hair treatments', icon: 'cut-outline' as const },
  { id: 'facial', name: 'Facial & Skin Care', price: 1200, desc: 'Deep cleansing, anti-aging & hydration facials', icon: 'leaf-outline' as const },
  { id: 'nails', name: 'Manicure & Pedicure', price: 800, desc: 'Professional nail care with premium products', icon: 'hand-left-outline' as const },
  { id: 'spa', name: 'Massage & Spa', price: 2000, desc: 'Relaxing full-body massage therapies', icon: 'body-outline' as const },
];

export default function BeautyParlorScreen() {
  useSmartBack('/(tabs)');
  const router = useRouter();
  const { user } = useAuth();

  const [services, setServices] = useState<any[]>(DEFAULT_SERVICES);
  const [loadingServices, setLoadingServices] = useState(false);

  // Booking Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split('T')[0];
  });
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  useEffect(() => {
    (async () => {
      setLoadingServices(true);
      try {
        const liveServices = await api.getParlorServices();
        if (liveServices && liveServices.length > 0) {
          const mapped = liveServices.map((s: any, idx: number) => ({
            id: s._id || s.id || `srv_${idx}`,
            name: s.name,
            price: s.price || 0,
            desc: s.desc || s.description || '',
            icon: DEFAULT_SERVICES[idx % DEFAULT_SERVICES.length].icon
          }));
          setServices(mapped);
        }
      } catch (e) {
        console.warn('Using default parlor services', e);
      } finally {
        setLoadingServices(false);
      }
    })();
  }, []);

  const fetchSlots = async (serviceId: string, date: string) => {
    setLoadingSlots(true);
    try {
      const data = await api.getAppointmentSlots(serviceId, date);
      setAllSlots(data.allSlots || []);
      setBookedSlots(data.bookedSlots || []);
      const avail = data.availableSlots || [];
      if (avail.length > 0) {
        setSelectedSlot(avail[0]);
      } else {
        setSelectedSlot('');
      }
    } catch (e) {
      console.warn('Failed to load slots', e);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleOpenBooking = (service: any) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in to book an appointment at Shagun Beauty Parlor.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    setSelectedService(service);
    if (user.name) setCustomerName(user.name);
    if (user.phone) setCustomerPhone(user.phone);
    fetchSlots(service.id, bookingDate);
    setModalVisible(true);
  };

  const handleDateChange = (newDate: string) => {
    if (newDate < tomorrowStr) {
      Alert.alert('Invalid Date', 'Appointments must be booked at least 1 day in advance.');
      return;
    }
    setBookingDate(newDate);
    if (selectedService) {
      fetchSlots(selectedService.id, newDate);
    }
  };

  const handleConfirmBooking = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Missing Info', 'Please enter your name and phone number.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Slot Unavailable', 'Please select an available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      await api.bookAppointment({
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        price: selectedService.price,
        date: bookingDate,
        slot: selectedSlot,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim()
      });
      setModalVisible(false);
      Alert.alert('Booking Confirmed!', `Your appointment for ${selectedService.name} is booked on ${bookingDate} at ${selectedSlot}.`);
    } catch (err: any) {
      if (err.code === 409 || err.message?.includes('taken') || err.message?.includes('booked')) {
        Alert.alert('Slot Just Taken', 'This time slot was just booked by another customer. Please choose another slot.');
        fetchSlots(selectedService.id, bookingDate);
      } else {
        Alert.alert('Booking Failed', err.message || 'Could not complete appointment booking.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const openWhatsApp = (serviceName?: string) => {
    const msg = serviceName
      ? `Hello! I would like to inquire about *${serviceName}* at Shagun Beauty Parlor.`
      : `Hello! I have a question regarding Shagun Beauty Parlor services.`;
    Linking.openURL(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#047857' }}>
      <StatusBar barStyle="light-content" backgroundColor="#047857" />

      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Beauty Parlor</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="flower-outline" size={36} color="#d4a853" style={{ marginBottom: 8 }} />
          <Text style={styles.heroTitle}>Shagun Beauty Parlor</Text>
          <Text style={styles.heroSubtitle}>Professional bridal & salon services in Bamitha</Text>
        </View>

        {/* Services List */}
        <Text style={styles.sectionTitle}>Our Salon Services</Text>
        {loadingServices ? (
          <ActivityIndicator size="small" color="#047857" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.servicesGrid}>
            {services.map((srv, i) => (
              <View key={srv.id || i} style={styles.serviceCard}>
                <Ionicons name={srv.icon || 'sparkles-outline'} size={24} color="#047857" style={{ marginBottom: 4 }} />
                <Text style={styles.serviceName}>{srv.name}</Text>
                {srv.price > 0 && <Text style={styles.servicePrice}>₹{srv.price.toLocaleString('en-IN')}</Text>}
                <Text style={styles.serviceDesc} numberOfLines={2}>{srv.desc}</Text>
                <TouchableOpacity
                  style={styles.bookBadge}
                  activeOpacity={0.8}
                  onPress={() => handleOpenBooking(srv)}
                >
                  <Text style={styles.bookBadgeText}>Book Slot →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Working Hours */}
        <View style={styles.timingsCard}>
          <Text style={styles.timingsTitle}>Working Hours</Text>
          <Text style={styles.timingsText}>Monday – Saturday: 9:00 AM – 8:00 PM</Text>
          <Text style={styles.timingsText}>Sunday: 10:00 AM – 6:00 PM</Text>
          <Text style={styles.timingsNote}>Appointments guaranteed • Walk-ins subject to availability</Text>
        </View>

        {/* Secondary WhatsApp Inquire */}
        <TouchableOpacity style={styles.ctaBtn} onPress={() => openWhatsApp()}>
          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          <Text style={styles.ctaBtnText}>Ask us on WhatsApp</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Appointment Booking Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSub}>Book Appointment</Text>
                <Text style={styles.modalTitle}>{selectedService?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={26} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Date Input */}
              <Text style={styles.label}>Appointment Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={bookingDate}
                onChangeText={handleDateChange}
                placeholder="YYYY-MM-DD"
              />

              {/* Slots */}
              <Text style={styles.label}>Select Time Slot</Text>
              {loadingSlots ? (
                <ActivityIndicator size="small" color="#047857" style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.slotsGrid}>
                  {(allSlots.length > 0 ? allSlots : ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '02:00 PM - 03:00 PM', '04:00 PM - 05:00 PM']).map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        disabled={isBooked}
                        onPress={() => setSelectedSlot(slot)}
                        style={[
                          styles.slotChip,
                          isSelected && styles.slotChipSelected,
                          isBooked && styles.slotChipBooked
                        ]}
                      >
                        <Text style={[
                          styles.slotText,
                          isSelected && styles.slotTextSelected,
                          isBooked && styles.slotTextBooked
                        ]}>
                          {slot} {isBooked ? '(Booked)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Name & Phone */}
              <Text style={styles.label}>Customer Name</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Your name"
              />

              <Text style={styles.label}>Customer Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Notes / Special Requests (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any preferences or skin allergies..."
                multiline
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
                disabled={submitting}
                onPress={handleConfirmBooking}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#047857',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  container: { flex: 1, backgroundColor: '#fbf8f5' },
  hero: {
    backgroundColor: '#047857', padding: 28, alignItems: 'center', gap: 6,
  },
  heroTitle: { color: '#f5ede8', fontSize: 22, fontWeight: '800' },
  heroSubtitle: { color: '#d4a853', fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#047857', padding: 16 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  serviceCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    borderWidth: 1, borderColor: '#f0e6e0'
  },
  serviceName: { fontWeight: '700', color: '#1a0a12', fontSize: 14 },
  servicePrice: { color: '#047857', fontWeight: '800', fontSize: 13 },
  serviceDesc: { color: '#7a6650', fontSize: 11, lineHeight: 15, marginVertical: 2 },
  bookBadge: {
    backgroundColor: '#047857', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: 6,
  },
  bookBadgeText: { color: '#f5ede8', fontSize: 11, fontWeight: '700' },
  timingsCard: {
    backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, gap: 6,
    borderLeftWidth: 4, borderLeftColor: '#d4a853',
  },
  timingsTitle: { fontWeight: '700', color: '#047857', fontSize: 15, marginBottom: 4 },
  timingsText: { color: '#333', fontSize: 13 },
  timingsNote: { color: '#9c7a8a', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#25D366', marginHorizontal: 12, borderRadius: 14, paddingVertical: 14,
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalSub: { fontSize: 11, color: '#d4a853', fontWeight: '700', textTransform: 'uppercase' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#047857' },
  label: { fontSize: 12, fontWeight: '700', color: '#555', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14,
    backgroundColor: '#fafafa', color: '#333'
  },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  slotChip: {
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  slotChipSelected: { backgroundColor: '#047857', borderColor: '#047857' },
  slotChipBooked: { backgroundColor: '#eee', borderColor: '#eee' },
  slotText: { fontSize: 11, color: '#333', fontWeight: '600' },
  slotTextSelected: { color: '#fff', fontWeight: '700' },
  slotTextBooked: { color: '#aaa', textDecorationLine: 'line-through' },
  confirmBtn: {
    backgroundColor: '#047857', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    marginTop: 20, marginBottom: 30,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 }
});
