import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, ChevronDown, Menu, X, User as UserIcon, LogOut, ShieldCheck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { UserRole } from '../types';

export const Header: React.FC = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or navigation
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [wishlistCount, setWishlistCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shagun_wishlist') || '[]').length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleWishlistChange = () => {
      try {
        setWishlistCount(JSON.parse(localStorage.getItem('shagun_wishlist') || '[]').length);
      } catch {
        setWishlistCount(0);
      }
    };
    window.addEventListener('shagun_wishlist_updated', handleWishlistChange);
    window.addEventListener('storage', handleWishlistChange);
    return () => {
      window.removeEventListener('shagun_wishlist_updated', handleWishlistChange);
      window.removeEventListener('storage', handleWishlistChange);
    };
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-line shadow-xs">
      {/* Main Header Row */}
      <div className="max-w-[1440px] mx-auto px-5 lg:px-16 h-[80px] flex items-center justify-between gap-4">
        {/* Left: Logo & Store Name */}
        <Link to="/" className="flex items-center gap-3.5 shrink-0 group focus-visible:outline-2 focus-visible:outline-maroon-900 rounded-lg">
          <div className="w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-full bg-maroon-900 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <span className="font-serif text-gold-500 text-2xl sm:text-[28px] font-semibold leading-none select-none">
              S
            </span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-serif text-maroon-900 text-[20px] sm:text-[24px] font-semibold tracking-wider leading-none">
              SHAGUN
            </span>
            <span className="font-sans text-ink-500 text-[9px] sm:text-[10px] tracking-[0.22em] font-semibold uppercase mt-1 leading-none">
              GENERAL STORE
            </span>
          </div>
        </Link>

        {/* Center-Left: Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-6 2xl:gap-8 h-full text-[15px] font-medium text-ink-900">
          <Link
            to="/"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${
              isActive('/')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
            }`}
          >
            Home
          </Link>
          <Link
            to="/bridal-lehenga"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${
              isActive('/bridal-lehenga')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
            }`}
          >
            Bridal Lehenga
          </Link>
          <Link
            to="/beauty-parlor"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${
              isActive('/beauty-parlor')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
            }`}
          >
            Beauty Parlor
          </Link>
          <Link
            to="/shop"
            className={`h-full flex items-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${
              isActive('/shop')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
            }`}
          >
            <span>Shop</span>
            <ChevronDown size={14} strokeWidth={1.5} className="text-ink-500" />
          </Link>
          <Link
            to="/shop?cat=Offers"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${
              location.search.includes('Offers')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
            }`}
          >
            Offers
          </Link>
          <Link
            to="/orders"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${
              isActive('/orders')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
            }`}
          >
            Orders
          </Link>
          {user?.role === UserRole.ADMIN && (
            <Link
              to="/admin"
              className={`h-full flex items-center gap-1 transition-colors text-maroon-700 font-semibold hover:underline underline-offset-8 decoration-maroon-700 ${
                isActive('/admin') ? 'relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900' : ''
              }`}
            >
              <ShieldCheck size={16} strokeWidth={1.5} />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* Center-Right: Pill Search Input (Desktop) */}
        <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-[340px] xl:max-w-[400px] relative items-center">
          <input
            id="desktop-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for personal care, beauty, bangles..."
            aria-label="Search store products"
            className="w-full bg-[#FBF5EE] border border-line rounded-full py-2.5 pl-5 pr-11 text-[13px] text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-maroon-900 transition-colors"
          />
          <button
            type="submit"
            aria-label="Submit Search"
            className="absolute right-3.5 text-ink-500 hover:text-maroon-900 transition-colors cursor-pointer"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
        </form>

        {/* Right: Actions (Wishlist, Cart, Profile, Mobile Menu Trigger) */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* Wishlist */}
          <Link
            to="/shop?cat=Wishlist"
            aria-label={`Wishlist with ${wishlistCount} items`}
            className="relative text-ink-900 hover:text-maroon-900 transition-colors hidden sm:block"
          >
            <Heart size={21} strokeWidth={1.5} className={wishlistCount > 0 ? 'text-red-600 fill-red-600' : ''} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-semibold min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center animate-fade-in">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart */}
          <Link
            to="/cart"
            aria-label={`Shopping Cart with ${cartCount} items`}
            className="relative text-ink-900 hover:text-maroon-900 transition-colors cursor-pointer"
          >
            <ShoppingBag size={21} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-maroon-900 text-white text-[10px] font-semibold min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center animate-fade-in">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Profile / Login */}
          <div className="relative" ref={userMenuRef}>
            {isAuthenticated && user ? (
              <div>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                  aria-label={`User account menu for ${user.name}`}
                  className="flex items-center gap-2 cursor-pointer group focus-visible:outline-2 focus-visible:outline-maroon-900 rounded-full"
                >
                  <div className="w-8 h-8 rounded-full bg-maroon-900 text-cream-50 flex items-center justify-center font-serif text-sm font-semibold shadow-xs group-hover:scale-105 transition-transform">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-[14px] font-medium text-ink-900 group-hover:text-maroon-900 transition-colors">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown size={14} strokeWidth={1.5} className="text-ink-500 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-line py-2 z-50 animate-fade-in-up">
                    <div className="px-4 py-2 border-b border-line/60">
                      <p className="text-xs text-ink-500 font-medium">Signed in as</p>
                      <p className="text-sm font-bold text-maroon-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-ink-500 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-900 hover:bg-cream-50 hover:text-maroon-900 transition-colors"
                    >
                      <UserIcon size={16} strokeWidth={1.5} />
                      <span>My Account</span>
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-900 hover:bg-cream-50 hover:text-maroon-900 transition-colors"
                    >
                      <Package size={16} strokeWidth={1.5} />
                      <span>My Orders</span>
                    </Link>

                    {user.role === UserRole.ADMIN && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-maroon-900 font-semibold hover:bg-cream-50 transition-colors"
                      >
                        <ShieldCheck size={16} strokeWidth={1.5} />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    <div className="border-t border-line/60 my-1"></div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-700 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut size={16} strokeWidth={1.5} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-cream-100 hover:bg-cream-200 border border-line text-maroon-900 text-xs font-semibold transition-colors shadow-2xs"
              >
                <UserIcon size={15} strokeWidth={1.5} />
                <span>Log In</span>
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Search Row (visible below header on tablet/mobile) */}
      <div className="lg:hidden px-5 pb-3">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            id="mobile-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            aria-label="Search store products"
            className="w-full bg-[#FBF5EE] border border-line rounded-full py-2 pl-4 pr-10 text-[13px] text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-maroon-900"
          />
          <button
            type="submit"
            aria-label="Submit Search"
            className="absolute right-3.5 text-ink-500"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
        </form>
      </div>

    </header>
  );
};
