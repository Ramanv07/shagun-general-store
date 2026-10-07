import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { TopBar } from './components/TopBar';
import { Header } from './components/Header';
import { IntroOverlay } from './components/IntroOverlay';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Orders } from './pages/Orders';
import { Account } from './pages/Account';
import { BeautyParlor } from './pages/BeautyParlor';
import { BridalLehenga } from './pages/BridalLehenga';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Login } from './pages/Login';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TrackOrderModal } from './components/TrackOrderModal';
import { HelpSupportModal } from './components/HelpSupportModal';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactElement; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user?.token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== UserRole.ADMIN) return <Navigate to="/" replace />;

  return children;
};

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home — Everything You Need Under One Roof | Shagun General Store',
  '/shop': 'Shop Products | Shagun General Store',
  '/beauty-parlor': 'Beauty Parlor & Salon Appointments | Shagun General Store',
  '/bridal-lehenga': 'Bridal Lehenga Rentals | Shagun General Store',
  '/cart': 'Shopping Cart | Shagun General Store',
  '/checkout': 'Shipping & Checkout | Shagun General Store',
  '/orders': 'My Orders | Shagun General Store',
  '/account': 'My Account | Shagun General Store',
  '/login': 'Sign In / Register | Shagun General Store',
  '/privacy': 'Privacy Policy & Terms | Shagun General Store',
  '/admin': 'Admin Dashboard | Shagun General Store',
};

const AppRoutes: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'Shagun General Store | Bamitha';
    document.title = title;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900 font-sans flex flex-col selection:bg-maroon-900 selection:text-cream-50">
      {/* WCAG 2.4.1: Skip to main content bypass link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[999] focus:px-4 focus:py-2 focus:bg-maroon-900 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-2 focus:outline-gold-400 font-semibold text-sm transition-all"
      >
        Skip to main content
      </a>
      <TopBar />
      <Header />
      <main id="main-content" className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/beauty-parlor" element={<BeautyParlor />} />
          <Route path="/bridal-lehenga" element={<BridalLehenga />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/account" element={<Account />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('shagun_intro_shown');
  });

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('shagun_intro_shown', 'true');
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <CartProvider>
            {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
            <ErrorBoundary>
              <AppRoutes />
              <TrackOrderModal />
              <HelpSupportModal />
            </ErrorBoundary>
          </CartProvider>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
