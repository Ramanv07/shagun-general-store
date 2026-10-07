import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Calendar, Truck, ShieldCheck, Users } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative bg-cream-50 pt-8 sm:pt-12 lg:pt-14 pb-20 sm:pb-24 lg:pb-28">
      {/* Absolute Background Image Layer hitting the right edge */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[60%] z-0 pointer-events-none">
        <picture className="absolute inset-0 w-full h-full block">
          <img
            src="/images/hero-vanity-hq.jpg"
            alt="Shagun General Store high quality vanity display featuring makeup, bridal lehengas, jewelry and essentials"
            width={800}
            height={480}
            loading="eager"
            fetchpriority="high"
            className="w-full h-full object-cover object-left lg:object-center"
            style={{
              // Seamless fade on the left edge into the solid cream background
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 5%, rgba(0, 0, 0, 0.4) 20%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 1) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 5%, rgba(0, 0, 0, 0.4) 20%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 1) 100%)'
            }}
          />
        </picture>
        {/* Mobile Readability Overlay */}
        <div className="absolute inset-0 bg-cream-50/85 lg:hidden" />
      </div>

      {/* Faint gold floral line-art at the far left edge */}
      <div
        className="absolute top-0 left-0 w-72 sm:w-96 h-full pointer-events-none opacity-20 select-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 400 600"
          fill="none"
          stroke="#B8893A"
          strokeWidth="1.2"
          className="w-full h-full object-cover -translate-x-20 -translate-y-10"
        >
          {/* Subtle floral mandala ornament */}
          <circle cx="100" cy="250" r="80" strokeDasharray="3 3" />
          <circle cx="100" cy="250" r="140" />
          <circle cx="100" cy="250" r="200" strokeDasharray="4 4" />
          <path d="M100,50 Q160,180 100,250 Q40,180 100,50 Z" />
          <path d="M100,250 Q160,320 100,450 Q40,320 100,250 Z" />
          <path d="M0,250 Q70,190 100,250 Q70,310 0,250 Z" />
          <path d="M100,250 Q130,190 200,250 Q130,310 100,250 Z" />
          <path d="M30,180 Q100,210 170,180 Q100,290 30,180 Z" />
          <path d="M30,320 Q100,290 170,320 Q100,210 30,320 Z" />
        </svg>
      </div>

      {/* Content Layer */}
      <div className="max-w-[1440px] mx-auto px-5 lg:px-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-10 lg:gap-8 justify-between">
          
          {/* Left Column: ~45% width */}
          <div className="w-full lg:w-[46%] flex flex-col justify-center pt-2 sm:pt-4">

            {/* Eyebrow */}
            <div className="text-[11px] sm:text-[12px] font-sans font-semibold tracking-[0.25em] text-ink-500 uppercase mb-3">
              EVERYTHING UNDER ONE ROOF
            </div>

            {/* H1 Heading (two lines, tight leading, serif) */}
            <h1 className="font-serif text-maroon-900 text-[38px] sm:text-[50px] lg:text-[58px] xl:text-[62px] font-semibold leading-[1.05] tracking-tight drop-shadow-sm">
              Everything You Need,<br />
              Beautifully Sorted
            </h1>

            {/* Gold ornament divider under heading */}
            <div className="flex items-center gap-3 my-4 sm:my-5 max-w-[280px]" aria-hidden="true">
              <span className="h-[1px] bg-gold-500/50 flex-1" />
              <svg
                width="20"
                height="12"
                viewBox="0 0 24 14"
                fill="none"
                stroke="#B8893A"
                strokeWidth="1.5"
                className="shrink-0"
              >
                <circle cx="12" cy="7" r="2.5" fill="#B8893A" />
                <path d="M3,7 Q7,2 12,7 Q17,2 21,7" />
                <path d="M3,7 Q7,12 12,7 Q17,12 21,7" />
              </svg>
              <span className="h-[1px] bg-gold-500/50 flex-1" />
            </div>

            {/* Paragraph copy */}
            <p className="text-ink-600 font-medium text-[15px] sm:text-[16px] leading-[1.65] max-w-[500px] mb-8 font-sans drop-shadow-sm">
              Personal care, beauty &amp; makeup, bangles, toys, household essentials, bridal lehenga rental and beauty parlour bookings — all in one place.
            </p>

            {/* Two Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-4 mb-10 sm:mb-12 relative z-20">
              {/* Button 1: Filled Maroon Pill */}
              <Link
                to="/shop"
                className="inline-flex items-center gap-2.5 bg-maroon-900 hover:bg-maroon-700 text-white font-medium text-[14px] sm:text-[15px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-full transition-all duration-200 shadow-sm group"
              >
                <ShoppingBag size={18} strokeWidth={1.5} />
                <span>Shop Now</span>
                <ArrowRight size={16} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Button 2: Outlined Pill with White Fill */}
              <Link
                to="/beauty-parlor"
                className="inline-flex items-center gap-2.5 bg-white hover:bg-cream-50 border border-maroon-900/30 hover:border-maroon-900 text-ink-900 font-medium text-[14px] sm:text-[15px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-full transition-all duration-200 shadow-sm"
              >
                <Calendar size={18} strokeWidth={1.5} className="text-maroon-900" />
                <span>Book Beauty Appointment</span>
              </Link>
            </div>

            {/* Trust row (3 items) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 border-t border-maroon-900/10">
              {/* Item 1 */}
              <div className="flex items-start gap-2.5">
                <Truck size={22} strokeWidth={1.5} className="text-maroon-900 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink-900 text-[13px] sm:text-[14px] leading-tight drop-shadow-sm">
                    Free Delivery
                  </div>
                  <div className="text-ink-600 font-medium text-[11px] sm:text-[12px] leading-tight mt-0.5 drop-shadow-sm">
                    on orders above ₹499
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={22} strokeWidth={1.5} className="text-maroon-900 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink-900 text-[13px] sm:text-[14px] leading-tight drop-shadow-sm">
                    Quality Products
                  </div>
                  <div className="text-ink-600 font-medium text-[11px] sm:text-[12px] leading-tight mt-0.5 drop-shadow-sm">
                    Trusted &amp; genuine
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-2.5">
                <Users size={22} strokeWidth={1.5} className="text-maroon-900 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink-900 text-[13px] sm:text-[14px] leading-tight drop-shadow-sm">
                    Local &amp; Trusted
                  </div>
                  <div className="text-ink-600 font-medium text-[11px] sm:text-[12px] leading-tight mt-0.5 drop-shadow-sm">
                    Bamitha , Madhya Pradesh
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column Spacer: to push the layout and match height */}
          <div className="w-full lg:w-[54%] hidden lg:block min-h-[480px]"></div>

        </div>
      </div>
    </section>
  );
};
