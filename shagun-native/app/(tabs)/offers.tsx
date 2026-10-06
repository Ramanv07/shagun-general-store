import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { THEME } from '../../constants/theme';
import { Tag } from 'lucide-react-native';

export default function OffersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Special Offers</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.offerCard}>
          <Tag size={24} color={THEME.colors.maroon900} strokeWidth={1.5} />
          <Text style={styles.offerTitle}>Free Delivery</Text>
          <Text style={styles.offerSubtitle}>On all orders above ₹499 across Bamitha</Text>
        </View>

        <View style={styles.offerCard}>
          <Tag size={24} color={THEME.colors.maroon900} strokeWidth={1.5} />
          <Text style={styles.offerTitle}>Bridal Lehenga Rental Special</Text>
          <Text style={styles.offerSubtitle}>Get complimentary matching bridal jewelry set</Text>
        </View>

        <View style={styles.offerCard}>
          <Tag size={24} color={THEME.colors.maroon900} strokeWidth={1.5} />
          <Text style={styles.offerTitle}>Beauty Parlour Combo</Text>
          <Text style={styles.offerSubtitle}>Flat 20% off on complete makeover bookings</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.cream50,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.maroon900,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  offerCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    gap: 6,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.maroon900,
  },
  offerSubtitle: {
    fontSize: 13,
    color: THEME.colors.ink500,
  },
});
