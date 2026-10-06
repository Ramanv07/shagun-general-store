import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div
      className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16 text-center"
      style={{ backgroundColor: 'var(--clr-cream)' }}
    >
      <div className="card p-10 max-w-md w-full shadow-lg border border-cream-300">
        <div className="w-20 h-20 rounded-full bg-cream-200 text-maroon-700 flex items-center justify-center mx-auto mb-6 text-3xl font-serif font-bold">
          404
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-maroon-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-cream-700 text-sm mb-8 leading-relaxed">
          The page or product you are looking for doesn't exist, may have been moved, or the link is incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn btn-primary justify-center text-sm py-2.5">
            <i className="fas fa-home mr-2" /> Back to Home
          </Link>
          <Link to="/shop" className="btn btn-outline justify-center text-sm py-2.5">
            <i className="fas fa-store mr-2" /> Explore Shop
          </Link>
        </div>
      </div>
    </div>
  );
};
