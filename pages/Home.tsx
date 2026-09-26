
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_REVIEWS, CATEGORIES } from '../constants';
import { ProductCard } from '../components/ProductCard';
import { LehengaSection } from '../components/LehengaSection';
import { mockApi } from '../services/mockService';

/* ── Typewriter component ──────────────────────────────── */
const Typewriter = ({ texts, delay = 110 }: { texts: string[]; delay?: number }) => {
  const [idx, setIdx] = React.useState(0);
  const [displayText, setDisplayText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const current = texts[idx];
    let timeout: NodeJS.Timeout;

    if (isDeleting) {
      if (displayText.length > 0) {
        timeout = setTimeout(() => setDisplayText(current.slice(0, displayText.length - 1)), 45);
      } else {
        setIsDeleting(false);
        setIdx((i) => (i + 1) % texts.length);
      }
    } else {
      if (displayText.length < current.length) {
        timeout = setTimeout(() => setDisplayText(current.slice(0, displayText.length + 1)), delay);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2200);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, idx, texts, delay]);

  return (
    <span className="text-gradient-gold">
      {displayText}
      <span className="border-r-2 ml-0.5 animate-pulse" style={{ borderColor: '#C9A24B' }}>&nbsp;</span>
    </span>
  );
};

/* ── Feature data ──────────────────────────────────────── */
const FEATURES = [
  { icon: 'fa-truck-fast',   title: 'Fast Delivery',    desc: 'Same-day delivery within city limits on orders above ₹500.' },
  { icon: 'fa-shield-check', title: 'Secure Payments',  desc: 'Pay via UPI, cards or Netbanking — fully encrypted & safe.' },
  { icon: 'fa-gem',          title: 'Premium Quality',  desc: 'Carefully sourced products from trusted suppliers only.' },
  { icon: 'fa-arrows-rotate',title: 'Easy Returns',     desc: '7-day hassle-free return policy on all eligible items.' },
];

/* ── Category icons ────────────────────────────────────── */
const CAT_ICONS: Record<string, string> = {
  'All':             'fa-grid-2',
  'Personal Care':   'fa-hand-sparkles',
  'Skin Care':       'fa-face-smile',
  'Makeup':          'fa-lipstick',
  'Bridal Lehenga':  'fa-crown',
  'Toy':             'fa-puzzle-piece',
  'General Use':     'fa-box-open',
  'Bangle':          'fa-ring',
  'Cream':           'fa-jar',
  'Powder':          'fa-wand-sparkles',
  'Other':           'fa-ellipsis',
};

export const Home: React.FC = () => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const trendingRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let lastTimestamp = 0;
    const fetchTrending = async (force = false) => {
      try {
        const needsUpdate = await mockApi.checkUpdates(lastTimestamp);
        if (needsUpdate || force) {
          const data = await mockApi.getProducts();
          setProducts(data);
          setLoading(false);
          lastTimestamp = Number(localStorage.getItem('shagun_data_version') || Date.now());
        }
      } catch (err) {
        console.error('Home fetch failed', err);
        setLoading(false);
      }
    };
    fetchTrending(true);
    const iv = setInterval(() => fetchTrending(), 2500);
    return () => clearInterval(iv);
  }, []);

  const scrollToTrending = (e: React.MouseEvent) => {
    e.preventDefault();
    trendingRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Bestsellers ── */
  const bestsellers = products.filter(p => p.isBestseller).slice(0, 4);
  const trending    = products.slice(0, 8);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--clr-cream)' }}>

      {/* ════════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden pt-20"
        style={{ background: 'linear-gradient(160deg, #7A1F2E 0%, #4A0E1A 55%, #2C0810 100%)' }}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 hero-pattern" />
        <div className="absolute inset-0 paisley-pattern opacity-30" />

        {/* Gold glow blobs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.2) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.1) 0%, transparent 70%)' }} />

        {/* Floating ornaments */}
        <div className="absolute top-32 right-12 text-gold-500 opacity-20 animate-float text-5xl">
          <i className="fas fa-star" />
        </div>
        <div className="absolute bottom-40 left-12 text-gold-400 opacity-15 animate-float text-3xl" style={{ animationDelay: '2s' }}>
          <i className="fas fa-diamond" />
        </div>

        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center py-16">
          {/* Left: Text */}
          <div>
            {/* Tagline chip */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fade-in"
              style={{ background: 'rgba(201,162,75,0.15)', border: '1px solid rgba(201,162,75,0.3)' }}>
              <i className="fas fa-store text-gold-500 text-xs" />
              <span className="text-gold-400 text-xs font-semibold tracking-widest uppercase">Everything Under One Roof</span>
            </div>

            <h1 className="font-serif text-white mb-4 animate-fade-in-up anim-delay-1"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 1.15, fontWeight: 700 }}>
              Your Favourite <br />
              <Typewriter texts={['General Store', 'For Makeup', 'For Bridal Lehengas', 'For Bangles', 'For Skin Care', 'For Daily Needs']} />
            </h1>

            <p className="text-cream-300 text-lg leading-relaxed mb-10 max-w-lg animate-fade-in-up anim-delay-2"
              style={{ color: 'rgba(251,243,231,0.75)' }}>
              Premium groceries, personal care, bangles, toys and household essentials —
              curated with love for every Indian home.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up anim-delay-3">
              <Link to="/shop" className="btn btn-gold btn-lg">
                <i className="fas fa-bag-shopping" /> Shop Now
              </Link>
              <button
                onClick={scrollToTrending}
                className="btn btn-outline-light btn-lg"
              >
                <i className="fas fa-fire" /> Trending Items
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-6 mt-12 animate-fade-in-up anim-delay-4">
              {[
                { icon: 'fa-users', text: '5000+ Customers' },
                { icon: 'fa-star',  text: '4.8 Rating' },
                { icon: 'fa-truck', text: 'Free Delivery' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-2">
                  <i className={`fas ${b.icon} text-gold-500 text-sm`} />
                  <span className="text-sm font-medium" style={{ color: 'rgba(251,243,231,0.7)' }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Hero visual */}
          <div className="hidden lg:flex items-center justify-center relative animate-scale-in anim-delay-2">
            <div className="relative">
              {/* Main image frame */}
              <div
                className="w-80 h-80 rounded-full overflow-hidden shadow-2xl border-4"
                style={{ borderColor: 'rgba(201,162,75,0.4)' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600"
                  alt="Shagun General Store"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating product cards */}
              <div className="absolute -top-6 -left-10 card-glass px-4 py-3 rounded-2xl shadow-lg animate-float"
                style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <i className="fas fa-ring text-gold-500" />
                  <div>
                    <div className="text-xs font-bold text-maroon-600">Gold Bangles</div>
                    <div className="text-[10px] text-cream-700">Starting ₹1,500</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-8 card-glass px-4 py-3 rounded-2xl shadow-lg animate-float"
                style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-2">
                  <i className="fas fa-star text-gold-500" />
                  <div>
                    <div className="text-xs font-bold text-maroon-600">4.8 / 5</div>
                    <div className="text-[10px] text-cream-700">5000+ Reviews</div>
                  </div>
                </div>
              </div>
              {/* Decorative ring */}
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed animate-spin"
                style={{ borderColor: 'rgba(201,162,75,0.25)', animationDuration: '20s', margin: '-20px' }}
              />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce-slow opacity-60">
          <div className="w-6 h-10 rounded-full border-2 border-cream-200 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2.5 bg-cream-200 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CATEGORY STRIP
      ════════════════════════════════════════════ */}
      <section className="py-10 bg-white border-b border-cream-300 sticky top-16 z-40">
        <div className="container">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-cream-700 uppercase tracking-wider whitespace-nowrap flex-shrink-0 mr-2">
              Browse:
            </span>
            {CATEGORIES.map(cat => (
              <Link
                key={cat}
                to={`/shop?cat=${encodeURIComponent(cat)}`}
                className="category-pill flex-shrink-0"
              >
                <i className={`fas ${CAT_ICONS[cat] || 'fa-tag'} text-xs`} />
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          BESTSELLERS BANNER
      ════════════════════════════════════════════ */}
      {bestsellers.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="badge badge-gold mb-3">
                  <i className="fas fa-trophy text-[10px]" /> Bestsellers
                </span>
                <h2 className="section-title">Customer Favourites</h2>
                <div className="section-divider" />
              </div>
              <Link to="/shop" className="btn btn-outline btn-sm hidden md:inline-flex">
                View All <i className="fas fa-arrow-right text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.map((p, i) => (
                <div key={p._id} className={`animate-fade-in-up anim-delay-${Math.min(i + 1, 4)}`}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link to="/shop" className="btn btn-outline">View All Products</Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════
          PROMO BANNER
      ════════════════════════════════════════════ */}
      <section className="py-12"
        style={{ background: 'linear-gradient(135deg, #7A1F2E 0%, #5C1622 100%)' }}>
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-gold-400 text-sm font-semibold tracking-widest uppercase mb-2">
                Limited Time Offer
              </div>
              <h2 className="text-white font-serif text-3xl md:text-4xl font-bold leading-tight">
                Free Delivery on<br />
                <span className="text-gradient-gold">Orders above ₹500</span>
              </h2>
            </div>
            <div className="flex-shrink-0">
              <Link to="/shop" className="btn btn-gold btn-lg">
                <i className="fas fa-bag-shopping" /> Shop & Save
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TRENDING SECTION
      ════════════════════════════════════════════ */}
      <section id="trending" ref={trendingRef} className="py-16 bg-cream-200">
        <div className="container">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="badge badge-maroon mb-3">
                <i className="fas fa-fire text-[10px]" /> Trending Now
              </span>
              <h2 className="section-title">Popular Products</h2>
              <div className="section-divider" />
            </div>
            <Link to="/shop" className="btn btn-outline btn-sm hidden md:inline-flex">
              See All <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card h-80 bg-cream-300 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trending.map((p, i) => (
                <div key={p._id} className={`animate-fade-in-up anim-delay-${Math.min(i + 1, 4)}`}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          MAKEUP & BEAUTY SPOTLIGHT
      ════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Text side */}
            <div className="animate-fade-in-up">
              <span className="badge badge-gold mb-4">
                <i className="fas fa-lipstick text-[10px]" /> Makeup & Beauty
              </span>
              <h2 className="section-title mb-2">Glow-Up for Every Occasion</h2>
              <div className="section-divider" />
              <p className="text-cream-700 mt-4 mb-6 leading-relaxed">
                From everyday kajal to bridal foundations — we carry the best Indian and international
                beauty brands at your doorstep. Perfect for festivals, weddings, and daily glam.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: 'fa-check-circle', text: 'Lipsticks, Kajal, Eyeliner & more' },
                  { icon: 'fa-check-circle', text: 'Foundations, Compact & BB Creams' },
                  { icon: 'fa-check-circle', text: 'Nail paints & glitter sets' },
                  { icon: 'fa-check-circle', text: 'Bridal makeup bundles available' },
                ].map(item => (
                  <li key={item.text} className="flex items-center gap-3 text-sm text-cream-800">
                    <i className={`fas ${item.icon} text-gold-500`} />
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link to="/shop" className="btn btn-primary" state={{ category: 'Makeup' }}>
                <i className="fas fa-lipstick" /> Shop Makeup
              </Link>
            </div>

            {/* Cards side */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in-up anim-delay-2">
              {[
                { label: 'Lipsticks', icon: 'fa-kiss-wink-heart', color: '#7A1F2E', img: 'https://images.unsplash.com/photo-1586495777744-4e6232bf2a6b?auto=format&fit=crop&q=80&w=400' },
                { label: 'Eye Makeup', icon: 'fa-eye', color: '#C9A24B', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400' },
                { label: 'Foundation', icon: 'fa-droplet', color: '#5C1622', img: 'https://images.unsplash.com/photo-1631214524020-3c69b9fe0bb9?auto=format&fit=crop&q=80&w=400' },
                { label: 'Nail Art', icon: 'fa-wand-sparkles', color: '#8B2535', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=400' },
              ].map(card => (
                <Link
                  key={card.label}
                  to="/shop"
                  className="card overflow-hidden group cursor-pointer hover:border-gold-400 transition-all"
                >
                  <div className="relative h-32 overflow-hidden">
                    <img src={card.img} alt={card.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-2 left-3 text-white text-sm font-bold">{card.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          BRIDAL LEHENGA SECTION
      ════════════════════════════════════════════ */}
      <LehengaSection />

      {/* ════════════════════════════════════════════
          FEATURES STRIP
      ════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="section-title">Why Shop With Us?</h2>
            <div className="flex justify-center"><div className="section-divider" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`card p-6 text-center hover:border-gold-400 animate-fade-in-up anim-delay-${i + 1}`}
              >
                <div className="feature-icon mx-auto mb-4">
                  <i className={`fas ${f.icon}`} />
                </div>
                <h3 className="font-semibold text-maroon-600 text-base mb-2">{f.title}</h3>
                <p className="text-sm text-cream-700 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          REVIEWS
      ════════════════════════════════════════════ */}
      <section className="py-16" style={{ backgroundColor: 'var(--clr-cream)' }}>
        <div className="container">
          <div className="text-center mb-12">
            <span className="badge badge-gold mb-3">
              <i className="fas fa-star text-[10px]" /> Reviews
            </span>
            <h2 className="section-title">What Our Customers Say</h2>
            <div className="flex justify-center"><div className="section-divider" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_REVIEWS.map((r, i) => (
              <div
                key={r.id}
                className={`card p-6 relative animate-fade-in-up anim-delay-${i + 1}`}
              >
                {/* Quote mark */}
                <i className="fas fa-quote-right absolute top-5 right-5 text-3xl text-cream-300" />

                <div className="flex text-gold-500 gap-0.5 mb-4">
                  {[...Array(r.rating)].map((_, j) => <i key={j} className="fas fa-star text-sm" />)}
                </div>

                <p className="text-cream-800 italic leading-relaxed mb-6 text-sm">"{r.comment}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-maroon flex items-center justify-center text-gold-400 font-bold text-sm flex-shrink-0">
                    {r.user[0]}
                  </div>
                  <div>
                    <div className="font-bold text-maroon-700 text-sm">{r.user}</div>
                    <div className="text-xs text-cream-600">{r.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════ */}
      <footer className="footer-bg text-white py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(201,162,75,0.2)', border: '1px solid rgba(201,162,75,0.3)' }}>
                  <span className="font-serif font-bold text-gold-400">S</span>
                </div>
                <div>
                  <div className="font-serif font-bold text-lg text-white">SHAGUN</div>
                  <div className="text-[9px] tracking-widest text-cream-400">GENERAL STORE</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(251,243,231,0.6)' }}>
                Your trusted neighbourhood store for all daily needs. Quality products, honest prices.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-gold-400 text-xs font-bold tracking-widest uppercase mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {[['/', 'Home'], ['/shop', 'Shop'], ['/cart', 'Cart'], ['/orders', 'My Orders'], ['/account', 'Account']].map(([path, label]) => (
                  <li key={path}>
                    <Link to={path}
                      className="text-sm transition-colors hover:text-gold-400"
                      style={{ color: 'rgba(251,243,231,0.65)' }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-gold-400 text-xs font-bold tracking-widest uppercase mb-4">Contact Us</h4>
              <ul className="space-y-3">
                {[
                  { icon: 'fa-whatsapp fab', text: '+91 88272 59023' },
                  { icon: 'fa-map-marker-alt', text: 'India' },
                  { icon: 'fa-clock', text: 'Mon–Sat: 9am – 9pm' },
                ].map(c => (
                  <li key={c.text} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(251,243,231,0.65)' }}>
                    <i className={`fas ${c.icon} text-gold-500 w-4 text-center`} />
                    {c.text}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-4 mt-6">
                {[
                  { icon: 'fab fa-instagram', href: '#' },
                  { icon: 'fab fa-facebook',  href: '#' },
                  { icon: 'fab fa-whatsapp',  href: '#' },
                ].map(s => (
                  <a key={s.icon} href={s.href}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: 'rgba(201,162,75,0.15)', border: '1px solid rgba(201,162,75,0.2)' }}>
                    <i className={`${s.icon} text-gold-400 text-sm`} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="ornament-divider mb-6">✦</div>

          <p className="text-center text-xs" style={{ color: 'rgba(251,243,231,0.4)' }}>
            © 2026 Shagun General Store. All rights reserved. Built with <span className="text-gold-500">♥</span> by R_V.
          </p>
        </div>
      </footer>
    </div>
  );
};
