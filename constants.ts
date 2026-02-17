
import { Product, Review, UserRole } from './types';

export const ADMIN_WHATSAPP = "917987367845";

export const CATEGORIES = [
  "All",
  "Personal Care",
  "Skin Care",
  "Toy",
  "General Use",
  "Bangle",
  "Cream",
  "Powder",
  "Other"
];

export const MOCK_PRODUCTS: Product[] = [
  {
    _id: "1",
    name: "Premium Basmati Rice",
    price: 1250,
    category: "General Use",
    stock: 50,
    description: "Aged perfection, extra long grain aromatic basmati rice. Perfect for Biryani.",
    image: "https://picsum.photos/400/400?random=1",
    rating: 4.8,
    reviews: 120
  },
  {
    _id: "2",
    name: "Luxury Skin Cream",
    price: 450,
    category: "Skin Care",
    stock: 100,
    description: "Hydrating skin cream with vitamin E for a radiant glow.",
    image: "https://picsum.photos/400/400?random=2",
    rating: 4.5,
    reviews: 85
  },
  {
    _id: "3",
    name: "Dark Chocolate Cookies",
    price: 120,
    category: "General Use",
    stock: 200,
    description: "Decadent dark chocolate cookies with melted chips inside.",
    image: "https://picsum.photos/400/400?random=3",
    rating: 4.9,
    reviews: 210
  },
  {
    _id: "4",
    name: "Cold Pressed Almond Oil",
    price: 890,
    category: "Personal Care",
    stock: 30,
    description: "100% pure almond oil for hair and skin. No additives.",
    image: "https://picsum.photos/400/400?random=4",
    rating: 4.7,
    reviews: 55
  },
  {
    _id: "5",
    name: "Educational Robot Toy",
    price: 1500,
    category: "Toy",
    stock: 15,
    description: "Interactive educational robot for kids aged 5+.",
    image: "https://picsum.photos/400/400?random=5",
    rating: 4.2,
    reviews: 300
  },
  {
    _id: "6",
    name: "Gold Plated Bangle Set",
    price: 2100,
    category: "Bangle",
    stock: 80,
    description: "Traditional gold plated bangle set with intricate design.",
    image: "https://picsum.photos/400/400?random=6",
    rating: 4.8,
    reviews: 90
  },
  {
    _id: "7",
    name: "Sandalwood Talcum Powder",
    price: 150,
    category: "Powder",
    stock: 60,
    description: "Refreshing sandalwood talcum powder for all day freshness.",
    image: "https://picsum.photos/400/400?random=7",
    rating: 4.6,
    reviews: 110
  },
  {
    _id: "8",
    name: "Lavender Floor Cleaner",
    price: 350,
    category: "General Use",
    stock: 45,
    description: "Disinfectant floor cleaner with long lasting lavender fragrance.",
    image: "https://picsum.photos/400/400?random=8",
    rating: 4.4,
    reviews: 75
  },
  {
    _id: "9",
    name: "Aloe Vera Gel",
    price: 180,
    category: "Skin Care",
    stock: 90,
    description: "Pure Aloe Vera gel for soothing skin and hair.",
    image: "https://picsum.photos/400/400?random=9",
    rating: 4.3,
    reviews: 65
  },
  {
    _id: "10",
    name: "Exotic Fruit & Nut Mix",
    price: 650,
    category: "General Use",
    stock: 40,
    description: "Premium mix of berries, nuts, and seeds.",
    image: "https://picsum.photos/400/400?random=10",
    rating: 4.9,
    reviews: 150
  },
  {
    _id: "11",
    name: "Herbal Shampoo",
    price: 420,
    category: "Personal Care",
    stock: 55,
    description: "Sulphate free herbal shampoo for daily use.",
    image: "https://picsum.photos/400/400?random=11",
    rating: 4.5,
    reviews: 95
  },
  {
    _id: "12",
    name: "Face Moisturizing Cream",
    price: 900,
    category: "Cream",
    stock: 25,
    description: "Intense moisturizing cream for dry skin repair.",
    image: "https://picsum.photos/400/400?random=12",
    rating: 4.8,
    reviews: 180
  }
];

export const MOCK_REVIEWS: Review[] = [
  { id: '1', user: "Rahul Sharma", rating: 5, comment: "Amazing quality and fast delivery!", date: "2 days ago" },
  { id: '2', user: "Priya Singh", rating: 4, comment: "Loved the packaging. Very premium.", date: "1 week ago" },
  { id: '3', user: "Amit Patel", rating: 5, comment: "Best grocery store in town. The app is super smooth.", date: "3 weeks ago" },
];

// Mock Local Storage Keys
export const STORAGE_KEYS = {
  USERS: 'shagun_users',
  PRODUCTS: 'shagun_products',
  ORDERS: 'shagun_orders',
  CURRENT_USER: 'shagun_current_user',
  CART: 'shagun_cart'
};
