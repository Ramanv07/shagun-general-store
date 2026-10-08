import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { TopBar } from './components/TopBar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
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
  '/': 'Home — Everything You Need Under One Roof | Shagun Mart',
  '/shop': 'Shop Products | Shagun Mart',
  '/beauty-parlor': 'Beauty Parlor & Salon Appointments | Shagun Mart',
  '/bridal-lehenga': 'Bridal Lehenga Rentals | Shagun Mart',
  '/cart': 'Shopping Cart | Shagun Mart',
  '/checkout': 'Shipping & Checkout | Shagun Mart',
  '/orders': 'My Orders | Shagun Mart',
  '/account': 'My Account | Shagun Mart',
  '/login': 'Sign In / Register | Shagun Mart',
  '/privacy': 'Privacy Policy & Terms | Shagun Mart',
  '/admin': 'Admin Dashboard | Shagun Mart',
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'Shagun Mart | Bamitha';
    document.title = title;
  }, [location.pathname]);

  // Welcome Gate: Prompt unauthenticated guest to login/signup on first open (with skip option)
  useEffect(() => {
    const hasSkipped = sessionStorage.getItem('shagun_guest_browse');
    if (!isAuthenticated && !hasSkipped && location.pathname === '/') {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900 font-sans flex flex-col selection:bg-maroon-900 selection:text-cream-50 pb-16 xl:pb-0">
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
      <BottomNav />
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
