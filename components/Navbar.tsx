
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { UserRole } from '../types';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/bridal-lehenga', label: 'Bridal Lehenga' },
  { to: '/beauty-parlor', label: 'Beauty Parlor' },
  { to: '/shop', label: 'Shop' },
  { to: '/orders', label: 'Orders' },
];

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 navbar ${scrolled ? 'shadow-maroon-md py-2' : 'py-3'}`}
    >
      <div className="container flex items-center justify-between">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-full gradient-maroon flex items-center justify-center shadow-maroon-sm">
            <span className="text-gold-500 font-bold text-sm font-serif">S</span>
          </div>
          <div className="leading-none">
            <div className="text-xl font-serif font-bold text-maroon-600 tracking-wide">SHAGUN</div>
            <div className="text-[9px] font-medium tracking-[0.25em] text-cream-600 uppercase">General Store</div>
          </div>
        </Link>

        {/* ── Desktop Nav ── */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-all duration-200 relative pb-0.5
                ${isActive(link.to)
                  ? 'text-maroon-600 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gold-500 after:rounded-full'
                  : 'text-cream-700 hover:text-maroon-600'
                }`}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === UserRole.ADMIN && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors ${isActive('/admin') ? 'text-maroon-600' : 'text-cream-700 hover:text-maroon-600'}`}
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* ── Desktop Actions ── */}
        <div className="hidden md:flex items-center gap-4">
          {/* Cart */}
          <Link to="/cart" className="relative group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
              ${isActive('/cart') ? 'bg-maroon-600 text-white' : 'bg-cream-300 text-maroon-600 hover:bg-maroon-600 hover:text-white'}`}>
              <i className="fas fa-shopping-bag text-sm"></i>
            </div>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold-500 text-maroon-800 text-[10px] font-bold rounded-full w-4.5 h-4.5 min-w-[18px] min-h-[18px] flex items-center justify-center shadow-gold">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User */}
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/account" className="flex items-center gap-2 text-sm text-cream-700 hover:text-maroon-600 transition-colors">
                <div className="w-8 h-8 rounded-full gradient-maroon flex items-center justify-center text-gold-400 text-xs font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <span className="font-medium hidden lg:block">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={logout}
                className="btn btn-outline btn-sm text-xs"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>

        {/* ── Mobile: Cart + Hamburger ── */}
        <div className="md:hidden flex items-center gap-3">
          <Link to="/cart" className="relative">
            <div className="w-9 h-9 rounded-full bg-cream-300 flex items-center justify-center text-maroon-600">
              <i className="fas fa-shopping-bag text-sm"></i>
            </div>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold-500 text-maroon-800 text-[10px] font-bold rounded-full min-w-[16px] min-h-[16px] flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-9 h-9 rounded-full bg-cream-300 flex items-center justify-center text-maroon-600 transition-all hover:bg-maroon-600 hover:text-white"
            aria-label="Menu"
          >
            <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'} text-sm`}></i>
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="container py-4 space-y-1 border-t border-cream-300">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive(link.to)
                  ? 'bg-maroon-600 text-white'
                  : 'text-cream-800 hover:bg-cream-300 hover:text-maroon-600'
                }`}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === UserRole.ADMIN && (
            <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-cream-800 hover:bg-cream-300 hover:text-maroon-600">
              Admin Dashboard
            </Link>
          )}
          {user && (
            <Link to="/account" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-cream-800 hover:bg-cream-300 hover:text-maroon-600">
              My Account
            </Link>
          )}
          <div className="pt-2 border-t border-cream-300">
            {user ? (
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 text-left transition-colors"
              >
                <i className="fas fa-sign-out-alt mr-2"></i> Logout
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary w-full justify-center">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
