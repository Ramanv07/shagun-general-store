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
import { DeleteAccountInfo } from './pages/DeleteAccountInfo';
import { Terms } from './pages/Terms';
import { RefundPolicy } from './pages/RefundPolicy';
import { ShippingPolicy } from './pages/ShippingPolicy';
import { RentalTerms } from './pages/RentalTerms';
import { ContactUs } from './pages/ContactUs';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TrackOrderModal } from './components/TrackOrderModal';
import { HelpSupportModal } from './components/HelpSupportModal';
import { StorageConsentBanner } from './components/StorageConsentBanner';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactElement; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user?.token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} state={{ from: location }} replace />;
  }
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
  '/privacy': 'Privacy Policy | Shagun Mart',
  '/delete-account': 'Account Deletion & Data Retention | Shagun Mart',
  '/terms': 'Terms & Conditions | Shagun Mart',
  '/refund-policy': 'Refund & Cancellation Policy | Shagun Mart',
  '/shipping-policy': 'Shipping & Delivery Policy | Shagun Mart',
  '/rental-terms': 'Bridal Lehenga Rental Terms | Shagun Mart',
  '/contact-us': 'Contact Us & Store Location | Shagun Mart',
  '/admin': 'Admin Dashboard | Shagun Mart',
};

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Shagun Mart — Bamitha, Madhya Pradesh. Everything you need, beautifully sorted. Bridal lehenga on rent, makeup, daily essentials and cosmetics.',
  '/shop': 'Browse cosmetics, personal care, household essentials, and gifts available for quick delivery at Shagun Mart.',
  '/beauty-parlor': 'Book salon and bridal makeup appointments with professional beauty experts at Shagun Beauty Parlor.',
  '/bridal-lehenga': 'Rent premium designer bridal lehengas, bridal jewelry, and accessories for weddings and receptions.',
  '/cart': 'Review selected items in your Shagun Mart shopping cart before checking out.',
  '/checkout': 'Safe and fast checkout with cash on delivery and UPI payment options at Shagun Mart.',
  '/orders': 'Track your order status and view recent purchases from Shagun Mart.',
  '/account': 'Manage your personal profile, saved delivery addresses, and preferences.',
  '/login': 'Sign in or register for an account at Shagun Mart Bamitha.',
  '/privacy': 'Learn how Shagun Mart collects, uses, and protects your personal information and privacy.',
  '/delete-account': 'Information on account deletion, anonymization, and data retention rules at Shagun Mart.',
  '/terms': 'Terms and conditions governing the use of Shagun Mart website, store, and mobile app.',
  '/refund-policy': 'Official policies on order cancellation, returns, and refunds at Shagun Mart.',
  '/shipping-policy': 'Local shipping coverage, timelines, delivery fees, and free delivery thresholds.',
  '/rental-terms': 'Terms and security deposit rules for bridal lehenga rentals at Shagun Mart.',
  '/contact-us': 'Get in touch with Shagun Mart Bamitha via WhatsApp, phone, or in-store visit.',
  '/admin': 'Secure store administration panel for inventory, orders, and customer management.',
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'Shagun Mart | Bamitha';
    document.title = title;
    const desc = PAGE_DESCRIPTIONS[location.pathname] || PAGE_DESCRIPTIONS['/'];
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', desc);
    }
  }, [location.pathname]);

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
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/delete-account" element={<DeleteAccountInfo />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/rental-terms" element={<RentalTerms />} />
          <Route path="/contact-us" element={<ContactUs />} />

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
              <StorageConsentBanner />
            </ErrorBoundary>
          </CartProvider>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
