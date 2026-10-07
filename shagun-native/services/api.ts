import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { Product, User, Order, OrderStatus, RentalBooking, RentalStatus, ActiveRentalInfo } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ─── Auth Headers ────────────────────────────────────────────────────────────
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER);
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${u.token}`,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to get auth headers', e);
  }
  return { 'Content-Type': 'application/json' };
};

const BASE = API_BASE_URL;

// ─── API ─────────────────────────────────────────────────────────────────────
export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (email: string, password: string): Promise<User> => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const user: User = await res.json();
      await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Invalid email or password');
  },

  register: async (name: string, email: string, password: string, phone?: string): Promise<User> => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    });
    if (res.ok) {
      const user: User = await res.json();
      await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Registration failed');
  },

  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.CURRENT_USER);
  },

  // ── Products ──────────────────────────────────────────────────────────────
  getProducts: async (category?: string): Promise<Product[]> => {
    const url = category && category !== 'All'
      ? `${BASE}/api/products?category=${encodeURIComponent(category)}`
      : `${BASE}/api/products`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  saveProduct: async (product: Partial<Product>): Promise<Product> => {
    const headers = await getAuthHeaders();
    const isMongoId = product._id && product._id.length === 24 && /^[0-9a-fA-F]+$/.test(product._id);
    const url = isMongoId ? `${BASE}/api/products/${product._id}` : `${BASE}/api/products`;
    const method = isMongoId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(product) });
    if (!res.ok) throw new Error('Failed to save product');
    return res.json();
  },

  deleteProduct: async (id: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/products/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Failed to delete product');
  },

  uploadImage: async (imageUri: string): Promise<string> => {
    const headers = await getAuthHeaders();
    // Remove Content-Type so fetch sets multipart boundary automatically
    delete headers['Content-Type'];
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('image', { uri: imageUri, name: filename, type } as any);
    const res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || 'Image upload failed');
    }
    const data = await res.json();
    return data.imageUrl;
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  createOrder: async (order: Partial<Order>): Promise<Order> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error('Failed to create order');
    return res.json();
  },

  getOrders: async (): Promise<Order[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders`, { headers });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  deleteOrder: async (id: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Failed to delete order');
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders/${id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update order status');
  },

  cancelOrder: async (id: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders/${id}/cancel`, {
      method: 'PUT',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to cancel order');
    }
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: async (): Promise<User[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/auth/users`, { headers });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  updateProfile: async (data: { name?: string; email?: string; phone?: string }): Promise<User> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/auth/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const updated: User = await res.json();
    await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
    return updated;
  },

  deleteAccount: async (): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/auth/profile`, { method: 'DELETE', headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || 'Failed to delete account');
    }
    await SecureStore.deleteItemAsync(STORAGE_KEYS.CURRENT_USER);
  },

  addAddress: async (address: any): Promise<any[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/auth/address`, {
      method: 'POST',
      headers,
      body: JSON.stringify(address),
    });
    if (!res.ok) throw new Error('Failed to add address');
    return res.json();
  },

  deleteAddress: async (addressId: string): Promise<any[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/auth/address/${addressId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Failed to delete address');
    const data = await res.json();
    return data.addresses || [];
  },

  getLehengas: async (): Promise<Product[]> => {
    const res = await fetch(`${BASE}/api/products?category=Bridal%20Lehenga`);
    if (!res.ok) throw new Error('Failed to fetch lehengas');
    return res.json();
  },

  // ── Lehenga Rentals ───────────────────────────────────────────────────────
  getActiveRentals: async (): Promise<{ activeMap: Record<string, ActiveRentalInfo>; activeRentals: RentalBooking[] }> => {
    try {
      const res = await fetch(`${BASE}/api/rentals/active`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch active rentals', e);
    }
    return { activeMap: {}, activeRentals: [] };
  },

  createRentalBooking: async (bookingData: {
    lehengaId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    startDate: string;
    returnDate: string;
    rentalPrice?: number;
    securityDeposit?: number;
    notes?: string;
  }): Promise<RentalBooking> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/rentals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bookingData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create rental booking');
    }
    return data;
  },

  getAllRentals: async (): Promise<RentalBooking[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/rentals`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch rentals');
    }
    return res.json();
  },

  updateRentalStatus: async (rentalId: string, status: RentalStatus | string): Promise<RentalBooking> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/rentals/${rentalId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update rental status');
    }
    return data;
  },
};
