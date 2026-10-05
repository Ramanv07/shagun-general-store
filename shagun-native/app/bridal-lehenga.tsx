import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  Linking, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Product } from '../types';
import { ADMIN_WHATSAPP } from '../constants';

const { width } = Dimensions.get('window');

export default function BridalLehengaScreen() {
  const [lehengas, setLehengas] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLehengas()
      .then(setLehengas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const bookViaWhatsApp = (name?: string) => {
    const msg = name
      ? `Hello! I'm interested in the *${name}* and would like to book a trial.`
      : `Hello! I'd like to enquire about your bridal lehenga collection.`;
    Linking.openURL(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <FlatList
      style={{ backgroundColor: '#f5ede8' }}
      data={lehengas}
      keyExtractor={item => item._id}
      numColumns={1}
      ListHeaderComponent={() => (
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>👰</Text>
          <Text style={styles.heroTitle}>Bridal Lehenga Collection</Text>
          <Text style={styles.heroSubtitle}>Exclusive handcrafted lehengas for your special day</Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => bookViaWhatsApp()}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.heroBtnText}>Enquire on WhatsApp</Text>
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
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32, gap: 16 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.image }} style={[styles.cardImage, { width: width - 24 }]} resizeMode="cover" />
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
              <TouchableOpacity style={styles.bookBtn} onPress={() => bookViaWhatsApp(item.name)}>
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={styles.bookBtnText}>Book Trial</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#4a0f22', padding: 32, alignItems: 'center', gap: 8, marginBottom: 16,
  },
  heroEmoji: { fontSize: 52 },
  heroTitle: { color: '#f5ede8', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { color: '#d4a853', fontSize: 13, textAlign: 'center' },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
    backgroundColor: '#25D366', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardImage: { height: 280 },
  cardContent: { padding: 16, gap: 8 },
  cardName: { fontSize: 18, fontWeight: '800', color: '#1a0a12' },
  cardDesc: { color: '#9c7a8a', fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardPrice: { fontSize: 22, fontWeight: '800', color: '#7c1f3e' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#25D366', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#9c7a8a', marginTop: 40 },
});
