import { MOCK_PRODUCTS, STORAGE_KEYS, FALLBACK_IMAGE } from '../constants';
import { Product, User, UserRole, Order, OrderStatus } from '../types';

// Helper for auth headers
const getAuthHeaders = (): Record<string, string> => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u && u.token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${u.token}`
        };
      }
    }
  } catch (e) {
    console.warn("Failed to get auth headers", e);
  }
  return { 'Content-Type': 'application/json' };
};

// Initialize Data if not present
const initData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
  } else {
    try {
      const prodStr = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (prodStr) {
        const prods = JSON.parse(prodStr);
        if (prods.length !== MOCK_PRODUCTS.length) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
        } else if (prodStr.includes('picsum.photos')) {
          const cleaned = prods.map((p: any) => {
            if (p.image && p.image.includes('picsum.photos')) {
              const match = MOCK_PRODUCTS.find(mp => mp.name?.toLowerCase() === p.name?.toLowerCase());
              return { ...p, image: match ? match.image : FALLBACK_IMAGE };
            }
            return p;
          });
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cleaned));
        }
      }
    } catch (e) {}
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const admin: User = { 
      _id: 'admin1', 
      name: 'Shagun Admin', 
      email: 'admin@shagun.com', 
      phone: '9876543200',
      role: UserRole.ADMIN, 
      addresses: [{
        _id: 'ADDR_ADMIN',
        fullName: 'Shagun Admin',
        mobile: '9876543200',
        houseNo: 'Shop No. 12',
        street: 'Main Bazaar Road',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
        isDefault: true
      }],
      token: 'mock_admin_token' 
    };
    const demoUser: User = { 
      _id: 'user1', 
      name: 'Demo User', 
      email: 'user@shagun.com', 
      phone: '9876543210',
      role: UserRole.USER, 
      addresses: [{
        _id: 'ADDR_DEMO',
        fullName: 'Demo User',
        mobile: '9876543210',
        houseNo: 'Plot 42',
        street: 'Main Market Road',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
        isDefault: true
      }],
      token: 'mock_user_token' 
    };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([admin, demoUser]));
  }

  if (!localStorage.getItem('shagun_lehengas')) {
    const mockLehengas = [
      { _id: 'l1', name: 'Royal Red Bridal Lehenga', price: 45000, image: 'https://images.unsplash.com/photo-1594463750939-ebb6bd2d5337?auto=format&fit=crop&q=80&w=800', description: 'Hand-embroidered traditional red lehenga with heavy zari work.' },
      { _id: 'l2', name: 'Pastel Pink Sabyasachi Vibe', price: 32000, image: 'https://images.unsplash.com/photo-1599839619722-397514112634?auto=format&fit=crop&q=80&w=800', description: 'Elegant pastel pink lehenga perfect for receptions.' },
      { _id: 'l3', name: 'Emerald Green Velvet', price: 38000, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800', description: 'Rich emerald green velvet lehenga for a regal look.' }
    ];
    localStorage.setItem('shagun_lehengas', JSON.stringify(mockLehengas));
  }
};

initData();

// Safe LocalStorage setter
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.error(`[Storage] Error setting "${key}":`, error);
    return false;
  }
};

// Helpers
const generateId = (prefix: string = ''): string => {
  return prefix + Math.random().toString(36).substr(2, 6).toUpperCase();
};

const updateTimestamp = () => {
  const ts = Date.now().toString();
  safeSetItem('shagun_data_version', ts);
  return ts;
};

const checkUpdates = async (clientTimestamp: number): Promise<boolean> => {
  const serverTimestamp = Number(localStorage.getItem('shagun_data_version') || 0);
  return serverTimestamp > clientTimestamp;
};

// Flag to avoid repeated auto-sync loops in a single session
let hasSyncedLocalProductsToCloud = false;

export const mockApi = {
  generateId,
  updateTimestamp,
  checkUpdates,

  login: async (email: string, password: string): Promise<User> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const user = await res.json();
      safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Invalid email or password');
  },

  register: async (name: string, email: string, password: string, phone?: string): Promise<User> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone })
    });
    if (res.ok) {
      const user = await res.json();
      safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Registration failed');
  },

  getProducts: async (): Promise<Product[]> => {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products from backend');
    return await res.json();
  },

  saveProduct: async (product: Partial<Product>): Promise<Product> => {
    // 1. Try saving to real backend
    try {
      const isMongoId = product._id && product._id.length === 24 && /^[0-9a-fA-F]+$/.test(product._id);
      const url = isMongoId ? `/api/products/${product._id}` : '/api/products';
      const method = isMongoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(product)
      });

      if (res.ok) {
        const savedProduct: Product = await res.json();
        // Update local cache
        const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        const idx = products.findIndex((p: Product) => p._id === savedProduct._id || (product._id && p._id === product._id));
        if (idx > -1) {
          products[idx] = savedProduct;
        } else {
          products.unshift(savedProduct);
        }
        safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        updateTimestamp();
        return savedProduct;
      }
    } catch (e) {
      console.warn("Failed to save product to backend, saving to local storage:", e);
    }

    // 2. Fallback to localStorage
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    let resultProduct: Product;
    if (product._id) {
      const index = products.findIndex((p: Product) => p._id === product._id);
      if (index > -1) {
        products[index] = { ...products[index], ...product };
        resultProduct = products[index];
      } else {
        resultProduct = product as Product;
        products.unshift(resultProduct);
      }
    } else {
      resultProduct = {
        ...product,
        _id: generateId('PROD'),
        rating: product.rating || 0,
        reviews: product.reviews || 0,
        image: product.image || FALLBACK_IMAGE
      } as Product;
      products.unshift(resultProduct);
    }
    safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    updateTimestamp();
    return resultProduct;
  },

  deleteProduct: async (id: string): Promise<void> => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete product');
  },

  createOrder: async (order: Partial<Order>): Promise<Order> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(order)
    });
    if (!res.ok) throw new Error('Failed to create order');
    return await res.json();
  },

  getOrders: async (): Promise<Order[]> => {
    const res = await fetch('/api/orders', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return await res.json();
  },

  deleteOrder: async (id: string): Promise<void> => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete order');
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<void> => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
  },

  addReview: async (productId: string, rating: number): Promise<void> => {
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const index = products.findIndex((p: Product) => p._id === productId);
    if (index > -1) {
      const product = products[index];
      const newReviewsCount = (product.reviews || 0) + 1;
      const currentTotal = (product.rating || 0) * (product.reviews || 0);
      const newRating = (currentTotal + rating) / newReviewsCount;
      products[index] = { ...product, rating: parseFloat(newRating.toFixed(1)), reviews: newReviewsCount };
      safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      updateTimestamp();
    }
  },

  getLehengas: async (): Promise<any[]> => {
    try {
      const res = await fetch('/api/products?category=Bridal Lehenga');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch lehengas from backend', e);
    }
    return JSON.parse(localStorage.getItem('shagun_lehengas') || '[]');
  },

  saveLehenga: async (lehenga: any): Promise<any> => {
    // Treat lehenga as a product with category "Bridal Lehenga"
    lehenga.category = 'Bridal Lehenga';
    // Provide a dummy stock and description if missing
    lehenga.stock = lehenga.stock || 1;
    lehenga.description = lehenga.description || 'Exclusive bridal lehenga';
    
    return await mockApi.saveProduct(lehenga);
  },

  deleteLehenga: async (id: string): Promise<void> => {
    return await mockApi.deleteProduct(id);
  },

  getUsers: async (): Promise<User[]> => {
    const res = await fetch('/api/auth/users', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return await res.json();
  },

  deleteUser: async (id: string): Promise<void> => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const newUsers = users.filter((u: User) => u._id !== id);
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
  },

  updateProfile: async (userId: string, data: { name?: string; email?: string; phone?: string }): Promise<User> => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const updated = await res.json();
    safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
    return updated;
  },

  addAddress: async (userId: string, address: any): Promise<any[]> => {
    const res = await fetch('/api/auth/address', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(address)
    });
    if (!res.ok) throw new Error('Failed to add address');
    return await res.json();
  },

  deleteAddress: async (userId: string, addressId: string): Promise<any[]> => {
    const res = await fetch(`/api/auth/address/${addressId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete address');
    const data = await res.json();
    return data.addresses || [];
  }
};
