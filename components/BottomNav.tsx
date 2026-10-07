import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Package, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const isActive = (path: string) => {
    if (path === '/shop') {
      return location.pathname === '/shop' || location.pathname === '/bridal-lehenga' || location.pathname === '/beauty-parlor';
    }
    return location.pathname === path;
  };

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-[100] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? 'text-maroon-900' : 'text-ink-500 hover:text-maroon-700'}`}
        >
          <Home size={22} strokeWidth={isActive('/') ? 2 : 1.5} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        
        <Link 
          to="/shop" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/shop') ? 'text-maroon-900' : 'text-ink-500 hover:text-maroon-700'}`}
        >
          <ShoppingBag size={22} strokeWidth={isActive('/shop') ? 2 : 1.5} />
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        
        <Link 
          to="/orders" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/orders') ? 'text-maroon-900' : 'text-ink-500 hover:text-maroon-700'}`}
        >
          <Package size={22} strokeWidth={isActive('/orders') ? 2 : 1.5} />
          <span className="text-[10px] font-medium">Orders</span>
        </Link>
        
        <Link 
          to={isAuthenticated ? "/account" : "/login"} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/account') ? 'text-maroon-900' : 'text-ink-500 hover:text-maroon-700'}`}
        >
          <User size={22} strokeWidth={isActive('/account') ? 2 : 1.5} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
};
