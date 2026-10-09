import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, ChevronDown, Menu, X, User as UserIcon, LogOut, ShieldCheck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { UserRole, Product } from '../types';
import { mockApi } from '../services/mockService';

export const Header: React.FC = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Fetch product catalog for fast live client-side search
  useEffect(() => {
    mockApi.getProducts().then(data => {
      setProducts(data.filter(p => p.category !== 'Makeup' && p.category !== 'Bridal Lehenga'));
    }).catch(() => {});
  }, []);

  // Compute live search results matching word by word and letter by letter
  const liveResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter(p => {
      const text = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
      return terms.every(t => text.includes(t));
    }).sort((a, b) => {
      const q = searchQuery.toLowerCase().trim();
      const aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
      return bStarts - aStarts;
    });
  }, [searchQuery, products]);

  // Close dropdowns on outside click or navigation
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      const insideDesktop = desktopSearchRef.current?.contains(target);
      const insideMobile = mobileSearchRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close search dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchFocused(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const handleSelectProduct = (product: Product) => {
    setSearchQuery('');
    setSearchFocused(false);
    navigate(`/shop?search=${encodeURIComponent(product.name)}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setSearchFocused(false);
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
          <img
            src="/app-icon.png"
            alt="Shagun Mart Logo"
            className="w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-2xl object-cover shadow-sm shrink-0 group-hover:scale-105 transition-transform border border-amber-200/50"
          />
          <div className="flex flex-col justify-center">
            <span className="font-serif text-maroon-900 text-[20px] sm:text-[24px] font-semibold tracking-wider leading-none">
              SHAGUN
            </span>
            <span className="font-sans text-ink-500 text-[9px] sm:text-[10px] tracking-[0.22em] font-semibold uppercase mt-1 leading-none">
              Mart
            </span>
          </div>
        </Link>

        {/* Center-Left: Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-6 2xl:gap-8 h-full text-[15px] font-medium text-ink-900">
          <Link
            to="/"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${isActive('/')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
              }`}
          >
            Home
          </Link>
          <Link
            to="/bridal-lehenga"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${isActive('/bridal-lehenga')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
              }`}
          >
            Bridal Lehenga
          </Link>
          <Link
            to="/beauty-parlor"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${isActive('/beauty-parlor')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
              }`}
          >
            Beauty Parlor
          </Link>
          <Link
            to="/shop"
            className={`h-full flex items-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${isActive('/shop')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
              }`}
          >
            <span>Shop</span>
            <ChevronDown size={14} strokeWidth={1.5} className="text-ink-500" />
          </Link>
          <Link
            to="/shop?cat=Offers"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${location.search.includes('Offers')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
              }`}
          >
            Offers
          </Link>
          <Link
            to="/orders"
            className={`h-full flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 ${isActive('/orders')
                ? 'text-maroon-900 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900'
                : 'text-ink-900 hover:text-maroon-700 hover:underline underline-offset-8 decoration-maroon-700'
              }`}
          >
            Orders
          </Link>
          {user?.role === UserRole.ADMIN && (
            <Link
              to="/admin"
              className={`h-full flex items-center gap-1 transition-colors text-maroon-700 font-semibold hover:underline underline-offset-8 decoration-maroon-700 ${isActive('/admin') ? 'relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-maroon-900' : ''
                }`}
            >
              <ShieldCheck size={16} strokeWidth={1.5} />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* Center-Right: Pill Search Input (Desktop) */}
        <div ref={desktopSearchRef} className="hidden lg:flex flex-1 max-w-[340px] xl:max-w-[400px] relative items-center">
          <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center">
            <input
              id="desktop-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search for personal care, beauty, bangles..."
              aria-label="Search store products"
              autoComplete="off"
              className="w-full bg-[#FBF5EE] border border-line rounded-full py-2.5 pl-5 pr-14 text-[13px] text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-maroon-900 focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-9 text-ink-400 hover:text-ink-700 w-5 h-5 flex items-center justify-center rounded-full hover:bg-cream-200 transition-colors"
                aria-label="Clear search"
              >
                <X size={13} strokeWidth={2} />
              </button>
            )}
            <button
              type="submit"
              aria-label="Submit Search"
              className="absolute right-3.5 text-ink-500 hover:text-maroon-900 transition-colors cursor-pointer"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>
          </form>

          {/* Desktop Live Search Results Dropdown */}
          {searchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-line py-2 z-50 max-h-[420px] overflow-y-auto animate-fade-in-up">
              <div className="px-4 py-2 border-b border-line/60 flex items-center justify-between text-xs text-ink-500 font-medium">
                <span>{liveResults.length} {liveResults.length === 1 ? 'product' : 'products'} found</span>
                <span className="text-[11px] text-ink-400">Press Enter for all</span>
              </div>

              {liveResults.length > 0 ? (
                <div className="divide-y divide-line/40">
                  {liveResults.slice(0, 6).map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => handleSelectProduct(item)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-cream-50 transition-colors group cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-lg bg-[#FAF6F2] p-1 flex items-center justify-center shrink-0 border border-line/60 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/app-icon.png'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold uppercase text-gold-700 tracking-wider">
                          {item.category}
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-ink-900 group-hover:text-maroon-700 transition-colors truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-maroon-800">
                            ₹{item.price.toLocaleString('en-IN')}
                          </span>
                          {item.mrp && item.mrp > item.price && (
                            <span className="text-[10px] text-cream-600 line-through">
                              ₹{item.mrp.toLocaleString('en-IN')}
                            </span>
                          )}
                          {item.stock <= 0 && (
                            <span className="text-[10px] text-red-600 font-semibold">Out of Stock</span>
                          )}
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-xs text-ink-400 group-hover:text-maroon-700 transition-colors shrink-0" />
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="w-full py-2.5 px-4 text-center text-xs font-semibold text-maroon-800 hover:bg-cream-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>View all {liveResults.length} results for "{searchQuery.trim()}"</span>
                    <i className="fas fa-arrow-right text-[10px]" />
                  </button>
                </div>
              ) : (
                <div className="py-6 px-4 text-center">
                  <i className="fas fa-search text-cream-400 text-lg mb-2" />
                  <p className="text-xs text-ink-600 font-medium">No products matching "{searchQuery}"</p>
                  <p className="text-[11px] text-ink-400 mt-0.5">Try searching with a different word or category</p>
                </div>
              )}
            </div>
          )}
        </div>

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
      <div ref={mobileSearchRef} className="lg:hidden px-5 pb-3 relative">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            id="mobile-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search products..."
            aria-label="Search store products"
            autoComplete="off"
            className="w-full bg-[#FBF5EE] border border-line rounded-full py-2.5 pl-4 pr-12 text-[13px] text-ink-900 placeholder:text-ink-500 focus:outline-none focus:border-maroon-900 focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-9 text-ink-400 hover:text-ink-700 w-5 h-5 flex items-center justify-center rounded-full hover:bg-cream-200 transition-colors"
              aria-label="Clear search"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
          <button
            type="submit"
            aria-label="Submit Search"
            className="absolute right-3.5 text-ink-500 hover:text-maroon-900"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
        </form>

        {/* Mobile Live Search Results Dropdown */}
        {searchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-5 right-5 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-line py-2 z-50 max-h-[380px] overflow-y-auto animate-fade-in-up">
            <div className="px-4 py-2 border-b border-line/60 flex items-center justify-between text-xs text-ink-500 font-medium">
              <span>{liveResults.length} {liveResults.length === 1 ? 'product' : 'products'} found</span>
              <span className="text-[11px] text-ink-400">Tap to view</span>
            </div>

            {liveResults.length > 0 ? (
              <div className="divide-y divide-line/40">
                {liveResults.slice(0, 5).map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelectProduct(item)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-cream-50 transition-colors group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#FAF6F2] p-1 flex items-center justify-center shrink-0 border border-line/60 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/app-icon.png'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold uppercase text-gold-700 tracking-wider">
                        {item.category}
                      </span>
                      <p className="text-xs font-medium text-ink-900 group-hover:text-maroon-700 transition-colors truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-maroon-800">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                        {item.stock <= 0 && (
                          <span className="text-[10px] text-red-600 font-semibold">Out of Stock</span>
                        )}
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-xs text-ink-400 group-hover:text-maroon-700 transition-colors shrink-0" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full py-2.5 px-4 text-center text-xs font-semibold text-maroon-800 hover:bg-cream-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>View all {liveResults.length} results for "{searchQuery.trim()}"</span>
                  <i className="fas fa-arrow-right text-[10px]" />
                </button>
              </div>
            ) : (
              <div className="py-6 px-4 text-center">
                <i className="fas fa-search text-cream-400 text-lg mb-2" />
                <p className="text-xs text-ink-600 font-medium">No products matching "{searchQuery}"</p>
                <p className="text-[11px] text-ink-400 mt-0.5">Try searching with another word</p>
              </div>
            )}
          </div>
        )}
      </div>

    </header>
  );
};
