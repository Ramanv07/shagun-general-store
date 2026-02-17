
import { MOCK_PRODUCTS, STORAGE_KEYS } from '../constants';
import { Product, User, UserRole, Order, OrderStatus } from '../types';

// Initialize Data if not present
const initData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    // Add a default admin
    const admin: User = { _id: 'admin1', name: 'Shagun Admin', email: 'admin@shagun.com', role: UserRole.ADMIN, token: 'mock_admin_token' };
    const demoUser: User = { _id: 'user1', name: 'Demo User', email: 'user@shagun.com', role: UserRole.USER, token: 'mock_user_token' };
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

export const mockApi = {
  login: async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Hardcoded Admin - Always Allow
        if (email.toLowerCase() === 'admin@shagun.com' && password === 'admin123') {
          const adminUser = {
            _id: 'admin1',
            name: 'Shagun Admin',
            email: email.toLowerCase(),
            role: UserRole.ADMIN,
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
          resolve({ _id: 'user1', name: 'Demo User', email, role: UserRole.USER, token: 'mock_user_token' });
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

  register: async (name: string, email: string, password: string): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const newUser = { _id: Date.now().toString(), name, email, password, role: UserRole.USER };
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
          const newProduct = { ...product, _id: Date.now().toString(), rating: 0, reviews: 0 };
          products.push(newProduct);
        }
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        resolve(product as Product);
      }, 600);
    });
  },

  deleteProduct: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
      const newProducts = products.filter((p: Product) => p._id !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(newProducts));
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

        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

        const newOrder = {
          ...order,
          _id: Date.now().toString(),
          status: OrderStatus.PROCESSING,
          createdAt: new Date().toISOString()
        };
        orders.unshift(newOrder); // Add to top
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
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
          lehenga._id = Date.now().toString();
          lehengas.push(lehenga);
        }
        localStorage.setItem('shagun_lehengas', JSON.stringify(lehengas));
        resolve(lehenga);
      }, 600);
    });
  },

  deleteLehenga: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      const lehengas = JSON.parse(localStorage.getItem('shagun_lehengas') || '[]');
      const newLehengas = lehengas.filter((l: any) => l._id !== id);
      localStorage.setItem('shagun_lehengas', JSON.stringify(newLehengas));
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
  }
};
