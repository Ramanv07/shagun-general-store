import { Product, Review } from './types';
import { validateProductionApiUrl } from './utils/hostSafety';

export const ADMIN_WHATSAPP = "918827259023";

export const CATEGORIES = [
  "All",
  "Personal Care",
  "Skin Care",
  "Makeup",
  "Bridal Lehenga",
  "Toy",
  "General Use",
  "Bangle",
  "Cream",
  "Powder",
  "Bath & body",
  "Baby care",
  "Hair care",
  "Beauty",
  "Fragrances",
  "Grooming & hygiene",
  "Cleaning essentials",
  "Home & furnishing",
  "Kitchen needs",
  "Stationery supplies",
  "Toys & games",
  "Other"
];

export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800";

// Environment & Host Safety Configuration
export const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || (isDev ? 'development' : 'production');
export const PRODUCTION_API_HOST = process.env.EXPO_PUBLIC_PRODUCTION_API_HOST || 'api.shagunmart.com';

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (APP_ENV === 'production' || !isDev) {
  const check = validateProductionApiUrl(envApiUrl || '');
  if (!check.valid) {
    throw new Error(`FATAL BUILD ERROR: Invalid production API URL: ${check.error}. Configure in eas.json or build environment.`);
  }
}

export const API_BASE_URL = envApiUrl || 'http://localhost:5000/api';

export const PRIVACY_POLICY_URL = `${API_BASE_URL.replace(/\/api\/?$/, '')}/privacy`;

export const STORAGE_KEYS = {
  CURRENT_USER: 'shagun_current_user',
  CART: 'shagun_cart',
  PUSH_TOKEN: 'shagun_push_token',
};

export const MOCK_REVIEWS: Review[] = [
  { id: '1', user: "Rahul Sharma", rating: 5, comment: "Amazing quality and fast delivery!", date: "2 days ago" },
  { id: '2', user: "Priya Singh", rating: 4, comment: "Loved the packaging. Very premium.", date: "1 week ago" },
  { id: '3', user: "Amit Patel", rating: 5, comment: "Best grocery store in town. The app is super smooth.", date: "3 weeks ago" },
];
