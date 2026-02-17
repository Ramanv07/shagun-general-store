
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { Navbar } from './components/Navbar';
import { IntroOverlay } from './components/IntroOverlay';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Orders } from './pages/Orders';
import { Account } from './pages/Account';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Login } from './pages/Login';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactElement, adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== UserRole.ADMIN) return <Navigate to="/" />;

  return children;
};

const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/account" element={<Account />} />

        <Route path="/checkout" element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <CartProvider>
            {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}
            <AppRoutes />
          </CartProvider>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
