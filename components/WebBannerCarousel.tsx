import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface BannerItem {
  _id: string;
  title: string;
  imageUrl: string;
  target?: {
    type: 'none' | 'category' | 'product' | 'brand' | 'offers';
    value: string;
  };
}

export const WebBannerCarousel: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const cached = localStorage.getItem('shagun_web_banners');
    if (cached) {
      try {
        setBanners(JSON.parse(cached));
      } catch {
        // ignore
      }
    }

    fetch('/api/banners?placement=web_home')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setBanners(data);
          localStorage.setItem('shagun_web_banners', JSON.stringify(data));
        }
      })
      .catch(() => {
        // keep cached or empty
      });

    return () => { mounted = false; };
  }, []);

  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % count);
    }, 4000);
    return () => clearInterval(interval);
  }, [count]);

  if (count === 0) return null;

  const handleBannerClick = (b: BannerItem) => {
    const target = b.target;
    if (!target || target.type === 'none') return;

    if (target.type === 'category' && target.value) {
      navigate(`/shop?category=${encodeURIComponent(target.value)}`);
    } else if (target.type === 'offers') {
      navigate('/shop?offers=true');
    } else if (target.type === 'brand' && target.value) {
      navigate(`/shop?brand=${encodeURIComponent(target.value)}`);
    }
  };

  const current = banners[currentIndex] || banners[0];
  const isTappable = Boolean(current.target && current.target.type !== 'none');

  return (
    <div className="container mx-auto px-4 mt-6 mb-8">
      <div
        onClick={() => handleBannerClick(current)}
        className={`relative overflow-hidden rounded-2xl shadow-md bg-gray-100 aspect-21/9 md:aspect-32/9 max-h-[320px] transition-all duration-300 ${isTappable ? 'cursor-pointer hover:shadow-lg' : ''}`}
      >
        <img
          src={current.imageUrl}
          alt={current.title || 'Promotional Banner'}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
        />

        {current.title && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
            <div>
              <h3 className="text-white text-lg md:text-2xl font-serif font-bold drop-shadow-md">
                {current.title}
              </h3>
              {isTappable && (
                <span className="inline-block mt-2 text-xs text-gold-300 font-semibold uppercase tracking-wider">
                  Explore Now →
                </span>
              )}
            </div>
          </div>
        )}

        {count > 1 && (
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-gold-400 w-5' : 'bg-white/60 hover:bg-white'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

