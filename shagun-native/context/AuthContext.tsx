import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, UserRole } from '../types';
import { STORAGE_KEYS } from '../constants';
import { api } from '../services/api';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync } from '../services/notification';

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load persisted user on app start
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          registerForPushNotificationsAsync(parsed._id || parsed.id).catch(() => {});
        } else {
          registerForPushNotificationsAsync().catch(() => {});
        }
      } catch (e) {
        console.error('Failed to load user from SecureStore', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (userData: User) => {
    setUser(userData);
    await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData));
    registerForPushNotificationsAsync(userData._id || (userData as any).id).catch(() => {});
  };

  const logout = async () => {
    setUser(null);
    await api.logout();
    router.replace('/login');
  };

  const updateUser = async (userData: User) => {
    setUser(userData);
    await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      updateUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === UserRole.ADMIN,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
