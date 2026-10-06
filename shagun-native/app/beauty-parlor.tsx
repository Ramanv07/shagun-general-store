import React from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_WHATSAPP } from '../constants';

const SERVICES: { icon: keyof typeof Ionicons.glyphMap; name: string; desc: string }[] = [
  { icon: 'cut-outline', name: 'Haircut & Styling', desc: 'Expert cuts, blowouts & hair treatments' },
  { icon: 'hand-left-outline', name: 'Manicure & Pedicure', desc: 'Professional nail care with premium products' },
  { icon: 'leaf-outline', name: 'Facial & Skin Care', desc: 'Deep cleansing, anti-aging & hydration facials' },
  { icon: 'heart-outline', name: 'Bridal Makeup', desc: 'Complete bridal package — trial & wedding day' },
  { icon: 'brush-outline', name: 'Mehndi / Henna', desc: 'Intricate bridal & festival mehndi designs' },
  { icon: 'body-outline', name: 'Massage & Spa', desc: 'Relaxing full-body massage therapies' },
];

export default function BeautyParlorScreen() {
  const openWhatsApp = (service?: string) => {
    const msg = service
      ? `Hello! I'd like to book an appointment for *${service}* at Shagun Beauty Parlor.`
      : `Hello! I'd like to book an appointment at Shagun Beauty Parlor.`;
    Linking.openURL(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <Ionicons name="flower-outline" size={36} color="#d4a853" style={{ marginBottom: 8 }} />
        <Text style={styles.heroTitle}>Shagun Beauty Parlor</Text>
        <Text style={styles.heroSubtitle}>Premium beauty services for every occasion</Text>
        <TouchableOpacity style={styles.heroBtn} onPress={() => openWhatsApp()}>
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={styles.heroBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Services */}
      <Text style={styles.sectionTitle}>Our Services</Text>
      <View style={styles.servicesGrid}>
        {SERVICES.map((service, i) => (
          <TouchableOpacity key={i} style={styles.serviceCard} onPress={() => openWhatsApp(service.name)}>
            <Ionicons name={service.icon} size={24} color="#7c1f3e" style={{ marginBottom: 6 }} />
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDesc}>{service.desc}</Text>
            <View style={styles.bookBadge}>
              <Text style={styles.bookBadgeText}>Book →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timings */}
      <View style={styles.timingsCard}>
        <Text style={styles.timingsTitle}>Working Hours</Text>
        <Text style={styles.timingsText}>Monday – Saturday: 9:00 AM – 8:00 PM</Text>
        <Text style={styles.timingsText}>Sunday: 10:00 AM – 6:00 PM</Text>
        <Text style={styles.timingsNote}>Walk-ins welcome • Appointments preferred</Text>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.ctaBtn} onPress={() => openWhatsApp()}>
        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
        <Text style={styles.ctaBtnText}>Chat with Us on WhatsApp</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede8' },
  hero: {
    backgroundColor: '#7c1f3e', padding: 32, alignItems: 'center', gap: 8,
  },
  heroEmoji: { fontSize: 52 },
  heroTitle: { color: '#f5ede8', fontSize: 24, fontWeight: '800' },
  heroSubtitle: { color: '#d4a853', fontSize: 14, textAlign: 'center' },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#25D366', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8,
  },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#7c1f3e', padding: 16 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  serviceCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  serviceIcon: { fontSize: 28 },
  serviceName: { fontWeight: '700', color: '#1a0a12', fontSize: 13 },
  serviceDesc: { color: '#9c7a8a', fontSize: 11, lineHeight: 16 },
  bookBadge: {
    backgroundColor: '#7c1f3e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 4,
  },
  bookBadgeText: { color: '#f5ede8', fontSize: 11, fontWeight: '700' },
  timingsCard: {
    backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16, gap: 6,
    borderLeftWidth: 4, borderLeftColor: '#d4a853',
  },
  timingsTitle: { fontWeight: '700', color: '#7c1f3e', fontSize: 15, marginBottom: 4 },
  timingsText: { color: '#333', fontSize: 13 },
  timingsNote: { color: '#9c7a8a', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#25D366', marginHorizontal: 12, borderRadius: 14, paddingVertical: 16,
  },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
