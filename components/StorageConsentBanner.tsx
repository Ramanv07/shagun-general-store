import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'shagun_storage_consent';

export const StorageConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consented = localStorage.getItem(STORAGE_KEY);
      if (!consented) {
        setIsVisible(true);
      }
    } catch {
      // Storage unavailable / private mode
      setIsVisible(false);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Storage and Privacy Notice"
      className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 z-40 max-w-md bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-xl p-4 transition-all duration-300 animate-slide-up"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
          <i className="fas fa-shield-alt text-xs" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-700 leading-relaxed">
            We use essential local storage to support your cart and secure session. By browsing Shagun Mart, you acknowledge our{' '}
            <Link to="/privacy-policy" className="text-rose-700 font-medium underline hover:text-rose-800">
              Privacy Policy
            </Link>.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="px-4 py-1.5 bg-[#18181b] hover:bg-black text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
