
import { MOCK_PRODUCTS, STORAGE_KEYS } from '../constants';
import { Product, User, UserRole, Order, OrderStatus } from '../types';

// Initialize Data if not present
const initData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    // Add a default admin
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

// Clean oversized base64 images that might have bloated localStorage in past sessions
const cleanBloatedStorage = () => {
  try {
    const prodStr = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (prodStr && prodStr.includes('data:image')) {
      const prods = JSON.parse(prodStr);
      let changed = false;
      const cleaned = prods.map((p: any) => {
        if (p.image && p.image.startsWith('data:') && p.image.length > 50000) {
          changed = true;
          return { ...p, image: 'https://picsum.photos/400/400?random=1' };
        }
        return p;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cleaned));
      }
    }

    const ordStr = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (ordStr && ordStr.includes('data:image')) {
      const ords = JSON.parse(ordStr);
      let changed = false;
      const cleaned = ords.map((o: any) => ({
        ...o,
        items: (o.items || []).map((it: any) => {
          if (it.image && it.image.startsWith('data:') && it.image.length > 1000) {
            changed = true;
            return { ...it, image: '' };
          }
          return it;
        })
      }));
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(cleaned));
      }
    }
  } catch (e) {
    console.warn("[Storage] Cleanup warning:", e);
  }
};

// Safe LocalStorage setter to catch and handle QuotaExceededError
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError' || error?.code === 22 || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn(`[Storage] Quota exceeded for "${key}". Cleaning up bloat and retrying...`);
      try {
        cleanBloatedStorage();
        localStorage.removeItem('shagun_data_version');
        localStorage.setItem(key, value);
        return true;
      } catch (innerErr) {
        console.error(`[Storage] Unable to save to localStorage (storage full).`, innerErr);
        return false;
      }
    }
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
  return new Promise((resolve) => {
    const serverTimestamp = Number(localStorage.getItem('shagun_data_version') || 0);
    resolve(serverTimestamp > clientTimestamp);
  });
};

export const mockApi = {
  generateId,
  updateTimestamp,
  checkUpdates,

  login: async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Hardcoded Admin - Always Allow
        if (email.toLowerCase() === 'admin@shagun.com' && password === 'admin123') {
          const adminUser: User = {
            _id: 'ADMIN001',
            name: 'Shagun Admin',
            email: email.toLowerCase(),
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
          // Ensure admin is in local storage for persistence across reloads if needed
          const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
          if (!users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
            users.push(adminUser);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          }
          resolve(adminUser);
          return;
        }

        if (email === 'user@shagun.com' && password === 'user123') {
          resolve({ 
            _id: 'USER001', 
            name: 'Demo User', 
            email, 
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
          });
          return;
        }

        // Check registered users
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);

        if (user) {
          const { password, ...safeUser } = user;
          resolve({ ...safeUser, token: 'mock_user_token' });
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 800);
    });
  },

  register: async (name: string, email: string, password: string, phone?: string): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const newUser: any = {
          _id: generateId('USR'),
          name,
          email,
          phone: phone || '',
          password,
          role: UserRole.USER,
          addresses: []
        };
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        const { password: _, ...safeUser } = newUser;
        resolve({ ...safeUser, token: 'mock_user_token' });
      }, 800);
    });
  },


  getProducts: async (): Promise<Product[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        resolve(products);
      }, 500);
    });
  },

  saveProduct: async (product: Partial<Product>): Promise<Product> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        if (product._id) {
          const index = products.findIndex((p: Product) => p._id === product._id);
          products[index] = { ...products[index], ...product };
        } else {
          const newProduct = {
            ...product,
            _id: generateId('PROD'),
            rating: product.rating || 0, // Allow manual initial rating
            reviews: product.reviews || 0
          };
          products.push(newProduct);
        }
        safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        updateTimestamp(); // Trigger update
        resolve(product as Product);
      }, 600);
    });
  },

  deleteProduct: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
      const newProducts = products.filter((p: Product) => p._id !== id);
      safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(newProducts));
      updateTimestamp(); // Trigger update
      resolve();
    });
  },

  createOrder: async (order: Partial<Order>): Promise<Order> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
        const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');

        // Check stock availability first
        for (const item of order.items || []) {
          const product = products.find((p: Product) => p._id === item._id || p._id === (item as any).productId);
          if (!product || product.stock < item.quantity) {
            console.error(`Insufficient stock for ${item.name}`);
            // In a real app we would reject, but for mock we'll just log
          }
        }

        // Decrement Stock
        const updatedProducts = products.map((p: Product) => {
          const orderItem = order.items?.find((item: any) => item._id === p._id || item.productId === p._id);
          if (orderItem) {
            return { ...p, stock: p.stock - orderItem.quantity };
          }
          return p;
        });

        safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
        updateTimestamp(); // Stock change triggers update

        const newOrder = {
          ...order,
          _id: generateId('ORD'),
          status: OrderStatus.PROCESSING,
          createdAt: new Date().toISOString()
        };
        orders.unshift(newOrder); // Add to top
        safeSetItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
        resolve(newOrder as Order);
      }, 800);
    });
  },

  getOrders: async (): Promise<Order[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
        resolve(orders);
      }, 500);
    });
  },

  deleteOrder: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
      const newOrders = orders.filter((o: Order) => o._id !== id);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(newOrders));
      resolve();
    });
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<void> => {
    return new Promise((resolve) => {
      const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
      const index = orders.findIndex((o: Order) => o._id === id);
      if (index > -1) {
        orders[index].status = status;
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
      resolve();
    });
  },

  addReview: async (productId: string, rating: number): Promise<void> => {
    return new Promise((resolve) => {
      const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
      const index = products.findIndex((p: Product) => p._id === productId);
      if (index > -1) {
        const product = products[index];
        const newReviewsCount = (product.reviews || 0) + 1;
        // Calculate new average
        const currentTotal = (product.rating || 0) * (product.reviews || 0);
        const newRating = (currentTotal + rating) / newReviewsCount;

        products[index] = { ...product, rating: parseFloat(newRating.toFixed(1)), reviews: newReviewsCount };
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        updateTimestamp();
      }
      resolve();
    });
  },

  getLehengas: async (): Promise<any[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const lehengas = JSON.parse(localStorage.getItem('shagun_lehengas') || '[]');
        resolve(lehengas);
      }, 500);
    });
  },

  saveLehenga: async (lehenga: any): Promise<any> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const lehengas = JSON.parse(localStorage.getItem('shagun_lehengas') || '[]');
        if (lehenga._id) {
          const index = lehengas.findIndex((l: any) => l._id === lehenga._id);
          lehengas[index] = { ...lehengas[index], ...lehenga };
        } else {
          lehenga._id = generateId('LEG');
          lehengas.push(lehenga);
        }
        safeSetItem('shagun_lehengas', JSON.stringify(lehengas));
        resolve(lehenga);
      }, 600);
    });
  },

  deleteLehenga: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      const lehengas = JSON.parse(localStorage.getItem('shagun_lehengas') || '[]');
      const newLehengas = lehengas.filter((l: any) => l._id !== id);
      safeSetItem('shagun_lehengas', JSON.stringify(newLehengas));
      resolve();
    });
  },

  getUsers: async (): Promise<User[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        // Don't return passwords
        const safeUsers = users.map((u: any) => {
          const { password, ...safe } = u;
          return safe;
        });
        resolve(safeUsers);
      }, 500);
    });
  },

  deleteUser: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const newUsers = users.filter((u: User) => u._id !== id);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
      resolve();
    });
  },

  updateProfile: async (userId: string, data: { name?: string; email?: string; phone?: string }): Promise<User> => {
    return new Promise((resolve, reject) => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const index = users.findIndex((u: any) => u._id === userId || u.email === userId);
      if (index === -1) {
        reject(new Error('User not found'));
        return;
      }
      users[index] = { ...users[index], ...data };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      const { password, ...safeUser } = users[index];
      resolve(safeUser);
    });
  },

  addAddress: async (userId: string, address: any): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const index = users.findIndex((u: any) => u._id === userId || u.email === userId);
      if (index === -1) {
        reject(new Error('User not found'));
        return;
      }
      const user = users[index];
      user.addresses = user.addresses || [];
      const newAddr = {
        _id: generateId('ADDR'),
        ...address,
        isDefault: address.isDefault || user.addresses.length === 0
      };
      if (newAddr.isDefault) {
        user.addresses.forEach((a: any) => { a.isDefault = false; });
      }
      user.addresses.push(newAddr);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      resolve(user.addresses);
    });
  },

  deleteAddress: async (userId: string, addressId: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const index = users.findIndex((u: any) => u._id === userId || u.email === userId);
      if (index === -1) {
        reject(new Error('User not found'));
        return;
      }
      const user = users[index];
      user.addresses = (user.addresses || []).filter((a: any) => a._id !== addressId);
      if (user.addresses.length > 0 && !user.addresses.some((a: any) => a.isDefault)) {
        user.addresses[0].isDefault = true;
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      resolve(user.addresses);
    });
  }
};

