import { Product, Review } from './types';

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
  "Other"
];

export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800";

// Production backend API URL (Vercel + MongoDB Atlas):
export const API_BASE_URL = "https://shagun-general-store.vercel.app";

// In local dev with custom backend port, uncomment:
// export const API_BASE_URL = "http://172.20.10.9:5000";

export const PRIVACY_POLICY_URL = "https://shagun-general-store.vercel.app/privacy";

export const STORAGE_KEYS = {
  CURRENT_USER: 'shagun_current_user',
  CART: 'shagun_cart',
};

export const MOCK_REVIEWS: Review[] = [
  { id: '1', user: "Rahul Sharma", rating: 5, comment: "Amazing quality and fast delivery!", date: "2 days ago" },
  { id: '2', user: "Priya Singh", rating: 4, comment: "Loved the packaging. Very premium.", date: "1 week ago" },
  { id: '3', user: "Amit Patel", rating: 5, comment: "Best grocery store in town. The app is super smooth.", date: "3 weeks ago" },
];
