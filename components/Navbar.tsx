
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'text-gold-500 font-semibold' : 'text-gray-300 hover:text-white transition-colors';

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link to="/" className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-600">
              SHAGUN
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link to="/" className={isActive('/')}>Home</Link>
              <Link to="/shop" className={isActive('/shop')}>Shop</Link>
              {user?.role === UserRole.ADMIN && (
                <Link to="/admin" className={isActive('/admin')}>Dashboard</Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/cart" className="relative text-gray-300 hover:text-white transition-transform hover:scale-110">
              <i className="fas fa-shopping-cart text-xl"></i>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/account" className="text-gray-300 hover:text-gold-500 transition-colors">
                  <i className="fas fa-user-circle text-xl"></i>
                </Link>
                <span className="text-sm text-gray-400">Hi, {user.name.split(' ')[0]}</span>
                <button onClick={logout} className="px-4 py-2 text-sm rounded-full border border-white/20 hover:bg-white/10 transition-all">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-6 py-2 rounded-full bg-gradient-to-r from-gold-500 to-amber-600 text-black font-semibold hover:shadow-lg hover:shadow-gold-500/20 transition-all">
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="relative text-gray-300 hover:text-white">
              <i className="fas fa-shopping-cart text-lg"></i>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'} text-2xl`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-white/10 animate-fade-in-down">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10">Home</Link>
            <Link to="/shop" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10">Shop</Link>
            {user?.role === UserRole.ADMIN && (
              <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10">Admin Dashboard</Link>
            )}
            {user && (
              <Link to="/account" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10">My Account</Link>
            )}
            {user && (
              <Link to="/orders" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10">My Orders</Link>
            )}
            {!user && (
              <Link to="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gold-500 hover:bg-white/10">Login</Link>
            )}
            {user && (
              <button onClick={() => { logout(); setIsOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-white/10">Logout</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
