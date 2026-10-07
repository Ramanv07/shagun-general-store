import React from 'react';
import { MapPin, ChevronDown, Truck, HelpCircle, Package, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const TopBar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="w-full bg-maroon-900 text-cream-50 text-[13px] h-[44px] flex items-center font-sans">
      <div className="max-w-[1440px] w-full mx-auto px-5 lg:px-16 flex items-center justify-between">
        {/* Left: Location */}
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
          <MapPin size={15} strokeWidth={1.5} className="text-gold-500 shrink-0" />
          <span className="font-medium">Bamitha, Madhya Pradesh</span>
          <ChevronDown size={14} strokeWidth={1.5} className="opacity-80" />
        </div>

        {/* Center: Delivery Announcement (hidden on small mobile, visible md+) */}
        <div className="hidden md:flex items-center gap-2">
          <Truck size={16} strokeWidth={1.5} className="text-gold-500 shrink-0" />
          <span>Free delivery on orders above ₹499</span>
        </div>

        {/* Right: Support, Track Order, Download App */}
        <div className="flex items-center gap-5 sm:gap-6 text-[12px] sm:text-[13px]">
          <a
            href="#help"
            className="hidden sm:flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <HelpCircle size={15} strokeWidth={1.5} />
            <span>Help &amp; Support</span>
          </a>

          {isAuthenticated ? (
            <Link
              to="/orders"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Package size={15} strokeWidth={1.5} />
              <span>Track Order</span>
            </Link>
          ) : (
            <a
              href="#track"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Package size={15} strokeWidth={1.5} />
              <span>Track Order</span>
            </a>
          )}

          <a href="/shagun-app.apk" download className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
            <Smartphone size={15} strokeWidth={1.5} />
            <span>Download App</span>
          </a>
        </div>
      </div>
    </div>
  );
};
