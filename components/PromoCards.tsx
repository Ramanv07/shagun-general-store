import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface PromoCardData {
  id: string;
  title: string;
  text: string;
  buttonText: string;
  image: string;
  link: string;
}

const promoCards: PromoCardData[] = [
  {
    id: 'essentials',
    title: 'Shop Everyday Essentials',
    text: 'Personal care, household items, beauty & more for your daily needs.',
    buttonText: 'Explore Products →',
    image: '/images/promo-essentials.jpg',
    link: '/shop'
  },
  {
    id: 'lehenga',
    title: 'Rent Your Bridal Look',
    text: 'Premium bridal lehenga collection for your special day.',
    buttonText: 'View Collection →',
    image: '/images/promo-lehenga.jpg',
    link: '/bridal-lehenga'
  },
  {
    id: 'parlour',
    title: 'Book a Beauty Appointment',
    text: 'Makeup, skincare, hairstyling and more — by trusted professionals.',
    buttonText: 'Book Now →',
    image: '/images/promo-parlour.jpg',
    link: '/beauty-parlor'
  }
];

export const PromoCards: React.FC = () => {
  return (
    <section className="max-w-[1440px] mx-auto px-5 lg:px-16 mt-8 sm:mt-10 mb-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {promoCards.map((card) => (
          <div
            key={card.id}
            className="group relative rounded-[12px] overflow-hidden bg-gradient-to-r from-[#FDF0EE] via-[#F8DFDF] to-blush-200 border border-line/60 shadow-sm flex justify-between h-[160px] sm:h-[168px] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {/* Left Content Area (~58% width) */}
            <div className="w-[58%] flex flex-col justify-between p-4 sm:p-5 z-10">
              <div>
                <h3 className="font-serif text-maroon-900 font-semibold text-[16px] sm:text-[17px] leading-tight">
                  {card.title}
                </h3>
                <p className="text-ink-500 text-[11px] sm:text-[12px] leading-relaxed mt-1 font-sans">
                  {card.text}
                </p>
              </div>

              {/* Small Maroon Pill Button */}
              <Link
                to={card.link}
                className="inline-flex items-center gap-1 bg-maroon-900 hover:bg-maroon-700 text-white font-medium text-[11px] sm:text-[12px] px-3.5 py-1.5 rounded-full transition-colors w-fit shadow-xs group-hover:shadow focus-visible:outline-2 focus-visible:outline-maroon-900 focus-visible:outline-offset-2"
              >
                <span>{card.buttonText}</span>
              </Link>
            </div>

            {/* Right Photo Area (~42% width, bleeds to card edge) */}
            <div className="w-[42%] h-full relative overflow-hidden shrink-0">
              <picture className="w-full h-full block">
                <source srcSet={card.image.replace(/\.jpg$/, '.webp')} type="image/webp" />
                <img
                  src={card.image}
                  alt={card.title}
                  loading="lazy"
                  width={240}
                  height={168}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 15%, black 35%, black 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 15%, black 35%, black 100%)'
                  }}
                />
              </picture>
              
              {/* Fallback gradient fade for left edge */}
              <div 
                className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-[#F8DFDF] to-transparent" 
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
