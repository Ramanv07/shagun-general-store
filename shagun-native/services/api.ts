import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { Product, User, Order, OrderStatus, RentalBooking, RentalStatus, ActiveRentalInfo, Brand, PaymentPreference } from '../types';
import { appStorage } from './storage';

// ─── Auth Headers ────────────────────────────────────────────────────────────
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const userStr = await appStorage.getItem(STORAGE_KEYS.CURRENT_USER);
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

// Read from API_BASE_URL (which reads EXPO_PUBLIC_API_URL or defaults to http://localhost:5000/api)
const BASE = (API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

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
      await appStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
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
      await appStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Registration failed');
  },

  loginWithGoogle: async (data: { name: string; email: string; googleId?: string; photoUrl?: string }): Promise<User> => {
    const res = await fetch(`${BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const user: User = await res.json();
      await appStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Google authentication failed');
  },

  forgotPassword: async (phone: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    throw new Error(data.message || 'Failed to request password reset');
  },

  resetPassword: async (phone: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    throw new Error(data.message || 'Failed to reset password');
  },

  logout: async (): Promise<void> => {
    await appStorage.deleteItem(STORAGE_KEYS.CURRENT_USER);
  },

  // ── Products ──────────────────────────────────────────────────────────────
  getProducts: async (category?: string, brand?: string, search?: string, page?: number, limit?: number): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (brand && brand !== 'All') params.append('brand', brand);
    if (search && search.trim()) params.append('search', search.trim());
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    const url = qs ? `${BASE}/api/products?${qs}` : `${BASE}/api/products`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  getProductById: async (id: string): Promise<Product> => {
    const res = await fetch(`${BASE}/api/products/${id}`);
    if (!res.ok) throw new Error('Failed to fetch product');
    return res.json();
  },

  getBrands: async (): Promise<Brand[]> => {
    try {
      const res = await fetch(`${BASE}/api/brands`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch brands', e);
    }
    return [];
  },

  getCategorySections: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${BASE}/api/categories/sections`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch category sections', e);
    }
    return [];
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

  uploadImage: async (base64Image: string): Promise<string> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/upload/base64`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: base64Image }),
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to place order');
    }
    return res.json();
  },

  getOrders: async (): Promise<Order[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders`, { headers });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  getOrderById: async (id: string): Promise<Order> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders/${id}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch order');
    }
    return res.json();
  },

  submitUpiUtr: async (id: string, utr: string): Promise<{ success: boolean; message: string; order: Order }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/orders/${id}/upi-utr`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ utr })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit UTR');
    }
    return res.json();
  },

  getUpiSettings: async (): Promise<{ enabled: boolean; upi_vpa: string | null; upi_name: string | null; timeout_minutes: number }> => {
    const res = await fetch(`${BASE}/api/settings/upi`);
    if (!res.ok) {
      throw new Error(`Failed to fetch UPI settings: HTTP ${res.status}`);
    }
    return await res.json();
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
    await appStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
    return updated;
  },

  deleteAccount: async (password?: string): Promise<void> => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${BASE}/api/auth/delete-account`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPassword: password || '' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || 'Failed to delete account');
    }
    await appStorage.deleteItem(STORAGE_KEYS.CURRENT_USER);
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

  updateAddress: async (addressId: string, address: any): Promise<any[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/auth/address/${addressId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(address),
    });
    if (!res.ok) throw new Error('Failed to update address');
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

  // ── Settings & Notifications (Phase A & B) ─────────────────────────────────
  getDeliveryConfig: async (): Promise<{ enabled: boolean; eta_min: number | null; eta_max: number | null }> => {
    try {
      const res = await fetch(`${BASE}/api/settings/delivery-strip`);
      if (res.ok) return await res.json();
    } catch {}
    return { enabled: false, eta_min: null, eta_max: null };
  },

  getUnreadNotificationCount: async (): Promise<number> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/notifications/unread-count`, { headers });
      if (res.ok) {
        const data = await res.json();
        return typeof data.count === 'number' ? data.count : 0;
      }
    } catch {}
    return 0;
  },

  markAllNotificationsRead: async (): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // ── Wishlist (Phase D) ─────────────────────────────────────────────────────
  getWishlist: async (): Promise<Product[]> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/wishlist`, { headers });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch wishlist', e);
    }
    return [];
  },

  addToWishlist: async (productId: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/wishlist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to add to wishlist', e);
      return false;
    }
  },

  removeFromWishlist: async (productId: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/wishlist/${productId}`, {
        method: 'DELETE',
        headers,
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to remove from wishlist', e);
      return false;
    }
  },

  // ── Reviews & Ratings (Phase E) ────────────────────────────────────────────
  getProductReviews: async (productId: string) => {
    try {
      const res = await fetch(`${BASE}/api/reviews/product/${productId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch product reviews', e);
    }
    return { reviews: [], averageRating: null, reviewCount: 0 };
  },

  getMyReviews: async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/reviews/mine`, { headers });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch my reviews', e);
    }
    return [];
  },

  getEligibleReviewProducts: async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/reviews/eligible`, { headers });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch eligible products', e);
    }
    return [];
  },

  createReview: async (productId: string, rating: number, comment: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId, rating, comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to submit review');
    }
    return data;
  },

  getPaymentPreferences: async (): Promise<PaymentPreference> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE}/api/payment-preferences`, { headers });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch payment preferences', e);
    }
    return { preferred_method: 'COD' };
  },

  getBanners: async (placement: string = 'app_home') => {
    try {
      const res = await fetch(`${BASE}/api/banners?placement=${encodeURIComponent(placement)}`);
      if (res.ok) {
        const banners = await res.json();
        await appStorage.setItem(`cached_banners_${placement}`, JSON.stringify(banners));
        return banners;
      }
    } catch (e) {
      console.warn('Failed to fetch banners, checking cache', e);
    }
    const cached = await appStorage.getItem(`cached_banners_${placement}`);
    return cached ? JSON.parse(cached) : [];
  },

  validateCoupon: async (code: string, items: Array<{ product: string; quantity: number }>): Promise<{ valid: boolean; code: string; discount: number; itemsTotal: number; message: string }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/coupons/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, items }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Invalid coupon code');
    }
    return data;
  },

  getPublicCoupons: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${BASE}/api/coupons/public`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch public coupons', e);
    }
    return [];
  },

  getActiveBrands: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${BASE}/api/brands/active-with-products`);
      if (res.ok) {
        const brands = await res.json();
        await appStorage.setItem('cached_brands_active', JSON.stringify(brands));
        return brands;
      }
    } catch (e) {
      console.warn('Failed to fetch active brands', e);
    }
    const cached = await appStorage.getItem('cached_brands_active');
    return cached ? JSON.parse(cached) : [];
  },

  updatePaymentPreferences: async (preferred_method: 'COD' | 'UPI'): Promise<PaymentPreference> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/payment-preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ preferred_method }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update payment preferences');
    }
    return data;
  },

  getParlorServices: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${BASE}/api/parlor-services`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch parlor services', e);
    }
    return [];
  },

  getAppointmentSlots: async (serviceId: string, date: string): Promise<{ allSlots: string[]; bookedSlots: string[]; availableSlots: string[] }> => {
    try {
      const res = await fetch(`${BASE}/api/appointments/slots?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch appointment slots', e);
    }
    return { allSlots: [], bookedSlots: [], availableSlots: [] };
  },

  bookAppointment: async (appointmentData: any): Promise<any> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/appointments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(appointmentData),
    });
    if (res.status === 409) {
      const err: any = new Error('This slot was just taken by another customer. Please choose another slot.');
      err.code = 409;
      throw err;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to book appointment');
    }
    return res.json();
  },
};
