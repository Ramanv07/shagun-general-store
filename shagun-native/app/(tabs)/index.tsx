import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import {
  MapPin,
  ChevronDown,
  Truck,
  Search,
  ShoppingBag,
  ArrowRight,
  Calendar,
  ShieldCheck,
  Users,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Local image assets mapping
const ASSETS = {
  heroVanity: require('../../assets/images/hero-vanity.jpg'),
  catPersonalCare: require('../../assets/images/cat-personal-care.jpg'),
  catBangles: require('../../assets/images/cat-bangles.jpg'),
  catToys: require('../../assets/images/cat-toys.jpg'),
  catHousehold: require('../../assets/images/cat-household.jpg'),
  catBeauty: require('../../assets/images/cat-beauty.jpg'),
  catLehenga: require('../../assets/images/cat-lehenga.jpg'),
  catParlour: require('../../assets/images/cat-parlour.jpg'),
  promoEssentials: require('../../assets/images/promo-essentials.jpg'),
  promoLehenga: require('../../assets/images/promo-lehenga.jpg'),
  promoParlour: require('../../assets/images/promo-parlour.jpg'),
};

const CATEGORIES = [
  { id: 'personal-care', name: 'Personal Care', image: ASSETS.catPersonalCare },
  { id: 'bangles', name: 'Bangles', image: ASSETS.catBangles },
  { id: 'toys', name: 'Toys', image: ASSETS.catToys },
  { id: 'household', name: 'Household', image: ASSETS.catHousehold },
  { id: 'beauty', name: 'Beauty & Makeup', image: ASSETS.catBeauty },
  { id: 'lehenga', name: 'Bridal Lehenga Rental', image: ASSETS.catLehenga },
  { id: 'parlour', name: 'Beauty Parlour Booking', image: ASSETS.catParlour },
];

const PROMO_CARDS = [
  {
    id: 'essentials',
    title: 'Shop Everyday Essentials',
    text: 'Personal care, household items, beauty & more for your daily needs.',
    buttonText: 'Explore Products →',
    image: ASSETS.promoEssentials,
    route: '/(tabs)/shop',
  },
  {
    id: 'lehenga',
    title: 'Rent Your Bridal Look',
    text: 'Premium bridal lehenga collection for your special day.',
    buttonText: 'View Collection →',
    image: ASSETS.promoLehenga,
    route: '/bridal-lehenga',
  },
  {
    id: 'parlour',
    title: 'Book a Beauty Appointment',
    text: 'Makeup, skincare, hairstyling and more — by trusted professionals.',
    buttonText: 'Book Now →',
    image: ASSETS.promoParlour,
    route: '/beauty-parlor',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.maroon900} />

      {/* 1. Top Bar: Compact Location Row */}
      <View style={styles.topBar}>
        <View style={styles.locationContainer}>
          <MapPin size={14} color={THEME.colors.gold500} strokeWidth={1.5} />
          <Text style={styles.locationText} numberOfLines={1}>
            Bamitha, Madhya Pradesh
          </Text>
          <ChevronDown size={13} color={THEME.colors.cream50} strokeWidth={1.5} />
        </View>

        <View style={styles.deliveryContainer}>
          <Truck size={14} color={THEME.colors.gold500} strokeWidth={1.5} />
          <Text style={styles.deliveryText} numberOfLines={1}>
            Free delivery above ₹399
          </Text>
        </View>
      </View>

      {/* 2. Header: Logo + Search + Cart */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {/* Logo & Brand */}
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <View style={styles.brandContainer}>
              <Text style={styles.brandTitle}>SHAGUN</Text>
              <Text style={styles.brandSubtitle}>GENERAL STORE</Text>
            </View>
          </View>

          {/* Cart Icon with Badge */}
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/(tabs)/cart')}
            activeOpacity={0.7}
          >
            <ShoppingBag size={22} color={THEME.colors.ink900} strokeWidth={1.5} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pill Search Input */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search personal care, beauty, bangles..."
            placeholderTextColor={THEME.colors.ink500}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.searchIconContainer}>
            <Search size={18} color={THEME.colors.ink500} strokeWidth={1.5} />
          </View>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. Hero: Stacked Card (Image on top, Text below) */}
        <View style={styles.heroCard}>
          {/* Hero Image on Top */}
          <View style={styles.heroImageContainer}>
            <Image
              source={ASSETS.heroVanity}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          {/* Hero Content Below */}
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>EVERYTHING UNDER ONE ROOF</Text>
            <Text style={styles.heroHeading}>
              Everything You Need,{'\n'}Beautifully Sorted
            </Text>

            {/* Gold Flourish Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDiamond} />
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.heroParagraph}>
              Personal care, beauty &amp; makeup, bangles, toys, household essentials, bridal lehenga rental and beauty parlour bookings — all in one place.
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/(tabs)/shop')}
                activeOpacity={0.8}
              >
                <ShoppingBag size={16} color={THEME.colors.white} strokeWidth={1.5} />
                <Text style={styles.primaryButtonText}>Shop Now</Text>
                <ArrowRight size={15} color={THEME.colors.white} strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/beauty-parlor')}
                activeOpacity={0.8}
              >
                <Calendar size={16} color={THEME.colors.maroon900} strokeWidth={1.5} />
                <Text style={styles.secondaryButtonText}>Book Beauty</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Row */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Truck size={18} color={THEME.colors.maroon900} strokeWidth={1.5} />
                <Text style={styles.trustTitle}>Free Delivery</Text>
                <Text style={styles.trustSub}>above ₹499</Text>
              </View>

              <View style={styles.trustItem}>
                <ShieldCheck size={18} color={THEME.colors.maroon900} strokeWidth={1.5} />
                <Text style={styles.trustTitle}>Quality</Text>
                <Text style={styles.trustSub}>Trusted</Text>
              </View>

              <View style={styles.trustItem}>
                <Users size={18} color={THEME.colors.maroon900} strokeWidth={1.5} />
                <Text style={styles.trustTitle}>Bamitha, MP</Text>
                <Text style={styles.trustSub}>Local Store</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Category Strip: Horizontal Scroll */}
        <View style={styles.categoryCard}>
          <Text style={styles.sectionHeaderTitle}>Shop By Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollTrack}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (category.id === 'lehenga') {
                    router.push('/bridal-lehenga');
                  } else if (category.id === 'parlour') {
                    router.push('/beauty-parlor');
                  } else {
                    router.push('/(tabs)/shop');
                  }
                }}
              >
                <View style={styles.categoryImageContainer}>
                  <Image source={category.image} style={styles.categoryImage} resizeMode="cover" />
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 5. Promo Cards: Vertical List */}
        <View style={styles.promoListContainer}>
          {PROMO_CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.promoCard}
              activeOpacity={0.85}
              onPress={() => router.push(card.route as any)}
            >
              {/* Left Content */}
              <View style={styles.promoLeft}>
                <Text style={styles.promoTitle}>{card.title}</Text>
                <Text style={styles.promoText} numberOfLines={2}>
                  {card.text}
                </Text>
                <View style={styles.promoButton}>
                  <Text style={styles.promoButtonText}>{card.buttonText}</Text>
                </View>
              </View>

              {/* Right Image */}
              <View style={styles.promoRight}>
                <Image source={card.image} style={styles.promoImage} resizeMode="cover" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.maroon900,
  },
  scrollView: {
    flex: 1,
    backgroundColor: THEME.colors.cream50,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // 1. Top Bar
  topBar: {
    height: 38,
    backgroundColor: THEME.colors.maroon900,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    color: THEME.colors.cream50,
    fontSize: 12,
    fontWeight: '500',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryText: {
    color: THEME.colors.cream50,
    fontSize: 11,
    fontWeight: '400',
  },

  // 2. Header
  header: {
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.maroon900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: THEME.colors.gold500,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  brandContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.maroon900,
    letterSpacing: 1,
    fontFamily: 'serif',
  },
  brandSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.colors.ink500,
    letterSpacing: 2,
  },
  cartButton: {
    padding: 6,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: THEME.colors.maroon900,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: THEME.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cream50,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingHorizontal: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.ink900,
    paddingVertical: 0,
  },
  searchIconContainer: {
    paddingLeft: 6,
  },

  // 3. Hero Stacked Card
  heroCard: {
    margin: 16,
    backgroundColor: THEME.colors.peach100,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadow,
  },
  heroImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#FAF5EE',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    padding: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.ink500,
    letterSpacing: 2,
    marginBottom: 4,
  },
  heroHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.maroon900,
    lineHeight: 28,
    fontFamily: 'serif',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
    width: 160,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.gold500,
    opacity: 0.6,
  },
  dividerDiamond: {
    width: 5,
    height: 5,
    backgroundColor: THEME.colors.gold500,
    transform: [{ rotate: '45deg' }],
  },
  heroParagraph: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.colors.ink500,
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.maroon900,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  primaryButtonText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.maroon900,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  secondaryButtonText: {
    color: THEME.colors.maroon900,
    fontSize: 13,
    fontWeight: '600',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(90, 15, 30, 0.1)',
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
  },
  trustTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.ink900,
    marginTop: 2,
    textAlign: 'center',
  },
  trustSub: {
    fontSize: 10,
    color: THEME.colors.ink500,
    textAlign: 'center',
  },

  // 4. Category Strip
  categoryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadow,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.maroon900,
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  categoryScrollTrack: {
    gap: 14,
    paddingHorizontal: 4,
  },
  categoryItem: {
    alignItems: 'center',
    width: 80,
  },
  categoryImageContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: THEME.colors.cream50,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadow,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.ink900,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },

  // 5. Promo Cards
  promoListContainer: {
    marginHorizontal: 16,
    gap: 12,
  },
  promoCard: {
    flexDirection: 'row',
    height: 135,
    borderRadius: 12,
    backgroundColor: THEME.colors.blush200,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    overflow: 'hidden',
    ...THEME.shadow,
  },
  promoLeft: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.maroon900,
    fontFamily: 'serif',
  },
  promoText: {
    fontSize: 11,
    color: THEME.colors.ink500,
    lineHeight: 15,
    marginTop: 2,
  },
  promoButton: {
    backgroundColor: THEME.colors.maroon900,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  promoButtonText: {
    color: THEME.colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  promoRight: {
    width: 115,
    height: '100%',
  },
  promoImage: {
    width: '100%',
    height: '100%',
  },
});
