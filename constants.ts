
import { Product, Review, UserRole } from './types';

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

export const MOCK_PRODUCTS: Product[] = [
  {
    _id: "1",
    name: "Premium Basmati Rice",
    price: 1250,
    category: "General Use",
    stock: 50,
    description: "Aged perfection, extra long grain aromatic basmati rice. Perfect for Biryani.",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviews: 120,
    isBestseller: true
  },
  {
    _id: "2",
    name: "Luxury Skin Cream",
    price: 450,
    category: "Skin Care",
    stock: 100,
    description: "Hydrating skin cream with vitamin E for a radiant glow.",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    reviews: 85,
    isBestseller: true
  },
  {
    _id: "3",
    name: "Dark Chocolate Cookies",
    price: 120,
    category: "General Use",
    stock: 200,
    description: "Decadent dark chocolate cookies with melted chips inside.",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1608248597359-54378f8449fa?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1611591475819-79b8b730ab8c?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviews: 90,
    isBestseller: true
  },
  {
    _id: "7",
    name: "Sandalwood Talcum Powder",
    price: 150,
    category: "Powder",
    stock: 60,
    description: "Refreshing sandalwood talcum powder for all day freshness.",
    image: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1567928815104-b7980ee5032e?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    reviews: 150,
    isBestseller: true
  },
  {
    _id: "11",
    name: "Herbal Shampoo",
    price: 420,
    category: "Personal Care",
    stock: 55,
    description: "Sulphate free herbal shampoo for daily use.",
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviews: 180
  },
  {
    _id: "13",
    name: "Matte Lipstick Set",
    price: 599,
    category: "Makeup",
    stock: 40,
    description: "Long-lasting matte lipstick collection in 6 rich Indian shades.",
    image: "https://images.unsplash.com/photo-1586495777744-4e6232bf2a6b?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    reviews: 130,
    isBestseller: true
  },
  {
    _id: "14",
    name: "Kajal & Eyeliner Duo",
    price: 299,
    category: "Makeup",
    stock: 60,
    description: "Intense black kajal with smudge-proof eyeliner for dramatic eyes.",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    reviews: 95
  },
  {
    _id: "15",
    name: "Bridal Foundation",
    price: 849,
    category: "Makeup",
    stock: 25,
    description: "Full coverage bridal foundation — sweat-proof & long wearing up to 24 hours.",
    image: "https://images.unsplash.com/photo-1631214524020-3c69b9fe0bb9?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviews: 200,
    isBestseller: true
  },
  {
    _id: "16",
    name: "Red Bridal Lehenga",
    price: 12500,
    category: "Bridal Lehenga",
    stock: 5,
    description: "Classic red bridal lehenga with heavy zari embroidery and dupatta. Book via WhatsApp for trials.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    reviews: 42,
    isBestseller: true
  },
  {
    _id: "17",
    name: "Pink Floral Lehenga",
    price: 8999,
    category: "Bridal Lehenga",
    stock: 8,
    description: "Soft pink lehenga with floral prints and mirror work — perfect for engagement ceremonies.",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    reviews: 31
  },
  {
    _id: "18",
    name: "Maroon Velvet Lehenga",
    price: 15000,
    category: "Bridal Lehenga",
    stock: 3,
    description: "Royal maroon velvet bridal lehenga with golden border and kundan work.",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=800",
    rating: 5.0,
    reviews: 18,
    isBestseller: true
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
