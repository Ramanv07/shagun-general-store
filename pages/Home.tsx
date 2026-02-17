
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Hero3D } from '../components/Hero3D';
import { MOCK_REVIEWS } from '../constants';
import { ProductCard } from '../components/ProductCard';
import { mockApi } from '../services/mockService';
import { LehengaSection } from '../components/LehengaSection';

const Typewriter = ({ text, delay = 100 }: { text: string, delay?: number }) => {
  const [displayText, setDisplayText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showCursor, setShowCursor] = React.useState(true);

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isDeleting) {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length - 1));
        }, 50);
      } else {
        setIsDeleting(false);
      }
    } else {
      if (displayText.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length + 1));
        }, delay);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, text, delay]);

  // Cursor blinking effect
  React.useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-yellow-200 to-amber-600">
      {displayText}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} text-gold-500 transition-opacity ml-1 border-r-2 border-gold-500`}></span>
    </span>
  );
};

export const Home: React.FC = () => {
  const [products, setProducts] = React.useState<any[]>([]);
  const trendingRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let lastTimestamp = 0;

    const fetchTrending = async (force = false) => {
      try {
        const needsUpdate = await mockApi.checkUpdates(lastTimestamp);
        if (needsUpdate || force) {
          const data = await mockApi.getProducts();
          setProducts(data);
          lastTimestamp = Number(localStorage.getItem('shagun_data_version') || Date.now());
        }
      } catch (error) {
        console.error("Home fetch failed", error);
      }
    };

    fetchTrending(true);
    const interval = setInterval(() => fetchTrending(), 2000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTrending = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('trending');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <Hero3D />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          {/* Animated Main Title */}
          <div className="overflow-hidden mb-6">
            <h1 className="text-5xl md:text-8xl font-serif font-bold text-white tracking-tight leading-tight animate-fade-in-up">
              Elevate Your <br />
              <Typewriter text="Lifestyle" delay={150} />
            </h1>
          </div>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            Experience the future of shopping at Shagun General Store. Premium groceries, exotic snacks, and household essentials curated for the modern home.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <Link
              to="/shop"
              className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              Shop Collection
            </Link>
            <button
              onClick={scrollToTrending}
              className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Explore Trends
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce opacity-50">
          <i className="fas fa-chevron-down text-white text-2xl"></i>
        </div>
      </section>

      {/* Trending Section */}
      <section id="trending" className="py-24 px-4 bg-midnight-900 relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-midnight-950 to-midnight-900"></div>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Trending Now</h2>
              <div className="h-1 w-20 bg-gold-500"></div>
            </div>
            <Link to="/shop" className="hidden md:block text-gold-500 hover:text-white transition-colors">
              View All Products <i className="fas fa-arrow-right ml-2"></i>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.slice(0, 4).map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          <div className="mt-12 text-center md:hidden">
            <Link to="/shop" className="text-gold-500 hover:text-white transition-colors">
              View All Products <i className="fas fa-arrow-right ml-2"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* Lehenga Section */}
      <LehengaSection />

      {/* Features Banner */}
      <section className="py-20 bg-midnight-950 relative overflow-hidden">
        {/* CSS Pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="glass p-8 rounded-2xl text-center hover:bg-white/5 transition-colors">
            <i className="fas fa-truck-fast text-4xl text-gold-500 mb-4"></i>
            <h3 className="text-xl font-bold text-white mb-2">Fast Delivery</h3>
            <p className="text-gray-400">Lightning fast delivery to your doorstep within 24 hours.</p>
          </div>
          <div className="glass p-8 rounded-2xl text-center hover:bg-white/5 transition-colors">
            <i className="fas fa-shield-alt text-4xl text-gold-500 mb-4"></i>
            <h3 className="text-xl font-bold text-white mb-2">Secure Payment</h3>
            <p className="text-gray-400">100% secure payment gateways and WhatsApp order integration.</p>
          </div>
          <div className="glass p-8 rounded-2xl text-center hover:bg-white/5 transition-colors">
            <i className="fas fa-gem text-4xl text-gold-500 mb-4"></i>
            <h3 className="text-xl font-bold text-white mb-2">Premium Quality</h3>
            <p className="text-gray-400">Sourced from the best suppliers to ensure top-notch quality.</p>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-24 bg-gradient-to-b from-midnight-900 to-midnight-950">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-center text-white mb-16">Client Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MOCK_REVIEWS.map(review => (
              <div key={review.id} className="glass-card p-8 rounded-2xl relative">
                <i className="fas fa-quote-right absolute top-6 right-6 text-4xl text-white/5"></i>
                <div className="flex text-gold-500 mb-4">
                  {[...Array(review.rating)].map((_, i) => <i key={i} className="fas fa-star text-sm"></i>)}
                </div>
                <p className="text-gray-300 italic mb-6 leading-relaxed">"{review.comment}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-black font-bold">
                    {review.user[0]}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{review.user}</h4>
                    <span className="text-xs text-gray-500">{review.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold text-white mb-6">SHAGUN GENERAL STORE</h2>
          <div className="flex justify-center gap-6 mb-8">
            <a href="javascript:void(0)" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-instagram text-2xl"></i></a>
            <a href="javascript:void(0)" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-facebook text-2xl"></i></a>
            <a href="javascript:void(0)" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-twitter text-2xl"></i></a>
          </div>
          <p className="text-gray-600 text-sm">© 2026 Shagun General Store. All rights reserved. <br /> Built with <span className="text-red-500">♥</span> by R_V.</p>
        </div>
      </footer>
    </div>
  );
};
