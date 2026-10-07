import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import categoriesData from '../data/categories.json';

export interface CategoryItem {
  id: string;
  name: string;
  image: string;
}

export const CategoryStrip: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="max-w-[1440px] relative z-30 px-5 lg:px-16 mx-auto -mt-10 sm:-mt-14 lg:-mt-16"
    >
      {/* Floating White Card */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(90,15,30,0.08)] border border-line/40 py-5 sm:py-6 px-3 sm:px-6 relative flex items-center">
        
        {/* Left Chevron Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label="Scroll categories left"
          className="hidden md:flex absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center text-ink-900 hover:text-maroon-700 transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 focus-visible:outline-offset-2 rounded-full"
        >
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>

        {/* 7 Categories Horizontal Strip */}
        <div
          ref={scrollContainerRef}
          className="w-full flex md:grid md:grid-cols-7 items-start justify-between gap-4 sm:gap-6 md:gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none px-2 md:px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {(categoriesData as CategoryItem[]).map((category) => {
            const getHref = () => {
              if (category.id === 'lehenga') return '/bridal-lehenga';
              if (category.id === 'parlour') return '/beauty-parlor';
              if (category.id === 'beauty') return '/shop?cat=Makeup';
              if (category.id === 'bangles') return '/shop?cat=Bangle';
              if (category.id === 'toys') return '/shop?cat=Toy';
              if (category.id === 'household') return '/shop?cat=General%20Use';
              return `/shop?cat=${encodeURIComponent(category.name)}`;
            };

            return (
              <Link
                key={category.id}
                to={getHref()}
                className="flex flex-col items-center shrink-0 md:shrink group cursor-pointer transition-transform duration-200 hover:-translate-y-[2px] focus-visible:outline-2 focus-visible:outline-maroon-900 rounded-xl p-1"
              >
                {/* Circular Photo */}
                <div className="w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] lg:w-[110px] lg:h-[110px] rounded-full overflow-hidden shadow-sm flex items-center justify-center bg-white border border-line/50">
                  <picture className="w-full h-full block">
                    <source srcSet={category.image.replace(/\.jpg$/, '.webp')} type="image/webp" />
                    <img
                      src={category.image}
                      alt={category.name}
                      width={110}
                      height={110}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </picture>
                </div>

                {/* Category Label */}
                <span className="text-[12px] sm:text-[13px] lg:text-[14px] font-medium text-ink-900 text-center mt-2.5 leading-tight max-w-[105px] lg:max-w-[115px] group-hover:text-maroon-700 transition-colors">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right Chevron Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label="Scroll categories right"
          className="hidden md:flex absolute right-2 lg:right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center text-ink-900 hover:text-maroon-700 transition-colors focus-visible:outline-2 focus-visible:outline-maroon-900 focus-visible:outline-offset-2 rounded-full"
        >
          <ChevronRight size={22} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
