import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { mockApi } from '../services/mockService';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';

interface ParlorService {
  id: string;
  name: string;
  duration: string;
  price: number;
  desc: string;
  badge?: string;
}

const PARLOR_SERVICES: ParlorService[] = [
  { id: 'bridal', name: 'Complete Bridal Makeover', duration: '3.5 hrs', price: 6500, desc: 'HD Bridal makeup, hair styling, saree/lehenga draping & jewelry setting', badge: 'Popular' },
  { id: 'party', name: 'HD Party & Reception Makeup', duration: '1.5 hrs', price: 2200, desc: 'Flawless party look with waterproof makeup and custom hair setting' },
  { id: 'hair', name: 'Hair Styling & Keratin Treatment', duration: '2 hrs', price: 1800, desc: 'Deep nourishment, blow dry, curling, and bridal bun hairstyles' },
  { id: 'facial', name: 'Diamond Glow Facial & Clean-up', duration: '1 hr', price: 1200, desc: 'Radiant skin rejuvenation with herbal cleansing and gold mask' },
  { id: 'mehendi', name: 'Bridal & Traditional Mehendi', duration: '2.5 hrs', price: 2500, desc: 'Intricate organic henna designs for both hands and feet' }
];

const TIME_SLOTS = [
  '10:00 AM',
  '12:00 PM',
  '02:00 PM',
  '04:00 PM',
  '06:00 PM'
];

interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string;
  slot: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  createdAt: string;
}

export const BeautyParlor: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');

  // Appointment Booking State
  const [selectedService, setSelectedService] = useState<ParlorService>(PARLOR_SERVICES[0]);
  const [bookingDate, setBookingDate] = useState(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);

  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const loadAppointments = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('shagun_parlor_bookings') || '[]');
      setMyAppointments(stored);
    } catch {
      setMyAppointments([]);
    }
  };

  useEffect(() => {
    loadAppointments();
    if (user) {
      if (user.name) setCustomerName(user.name);
      if (user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    let lastTimestamp = 0;
    const fetchProducts = async (force = false) => {
      try {
        const needsUpdate = await mockApi.checkUpdates(lastTimestamp);
        if (needsUpdate || force) {
          const data = await mockApi.getProducts();
          const makeup = data.filter(p => p.category === 'Makeup');
          setProducts(makeup);
          setLoading(false);
          lastTimestamp = Number(localStorage.getItem('shagun_data_version') || Date.now());
        }
      } catch (err) {
        console.error('Fetch failed', err);
        setLoading(false);
      }
    };
    fetchProducts(true);
    const iv = setInterval(() => fetchProducts(), 4000);
    return () => clearInterval(iv);
  }, []);

  const handleOpenBooking = (srv: ParlorService) => {
    setSelectedService(srv);
    setBookingError(null);
    setBookingModalOpen(true);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setBookingError('Please enter your Name and Mobile Number.');
      return;
    }
    if (!bookingDate || bookingDate < tomorrowStr) {
      setBookingError('Appointments must be booked at least 1 day in advance.');
      return;
    }

    // Check for double booking
    const allBookings: Appointment[] = JSON.parse(localStorage.getItem('shagun_parlor_bookings') || '[]');
    const isSlotTaken = allBookings.some(
      b => b.date === bookingDate && b.slot === selectedSlot && b.serviceId === selectedService.id
    );

    if (isSlotTaken) {
      setBookingError(`The ${selectedSlot} slot on ${bookingDate} is already booked. Please choose another time slot.`);
      return;
    }

    const newAppt: Appointment = {
      id: 'APPT_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: bookingDate,
      slot: selectedSlot,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    allBookings.push(newAppt);
    localStorage.setItem('shagun_parlor_bookings', JSON.stringify(allBookings));
    setMyAppointments(allBookings);
    setBookingSuccess(newAppt);
    setBookingModalOpen(false);
  };

  const handleCancelAppointment = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this beauty appointment?')) {
      const allBookings: Appointment[] = JSON.parse(localStorage.getItem('shagun_parlor_bookings') || '[]');
      const filtered = allBookings.filter(b => b.id !== id);
      localStorage.setItem('shagun_parlor_bookings', JSON.stringify(filtered));
      setMyAppointments(filtered);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bookingModalOpen) setBookingModalOpen(false);
        if (bookingSuccess) setBookingSuccess(null);
      }
    };
    if (bookingModalOpen || bookingSuccess) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bookingModalOpen, bookingSuccess]);

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'low-high') return a.price - b.price;
    if (sort === 'high-low') return b.price - a.price;
    if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ backgroundColor: 'var(--clr-cream)' }}>
      {/* ── Page Header ── */}
      <div className="bg-maroon-900 text-white py-14 mb-10 shadow-md">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-semibold mb-3 border border-gold-400/30">
                <i className="fas fa-spa text-gold-400" /> Shagun Beauty Salon & Parlour
              </div>
              <h1 className="font-serif text-3xl md:text-5xl font-bold mb-3 tracking-wide">
                Beauty Parlor & Bridal Salon
              </h1>
              <p className="text-cream-200 text-sm md:text-base max-w-xl leading-relaxed">
                Expert bridal makeup, hair styling, facials, and mehendi by certified artists in Bamitha. Walk-ins welcome, appointments preferred.
              </p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => handleOpenBooking(PARLOR_SERVICES[0])}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-semibold text-sm shadow-md transition-all duration-200 cursor-pointer"
              >
                <i className="fas fa-calendar-check" /> Book Appointment Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4">
        {/* ── Services Menu ── */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="section-title text-2xl">Our Beauty Services</h2>
              <p className="text-xs text-cream-700">Choose a service and reserve your appointment slot</p>
            </div>
            <a
              href="https://wa.me/918827259023?text=Hello%20Shagun%20Parlor,%20I%20have%20an%20inquiry%20regarding%20beauty%20services."
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-maroon-700 hover:text-gold-600 font-semibold flex items-center gap-1.5"
            >
              <i className="fab fa-whatsapp text-sm text-green-600" /> WhatsApp Inquiry
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PARLOR_SERVICES.map(srv => (
              <div
                key={srv.id}
                className="card p-5 flex flex-col justify-between hover:shadow-lg transition-all border border-cream-300 relative group"
              >
                {srv.badge && (
                  <span className="absolute top-3 right-3 badge badge-gold text-[10px]">
                    {srv.badge}
                  </span>
                )}
                <div>
                  <h3 className="font-serif font-bold text-lg text-maroon-900 mb-1 group-hover:text-gold-600 transition-colors">
                    {srv.name}
                  </h3>
                  <div className="text-xs text-cream-600 font-medium mb-3 flex items-center gap-3">
                    <span><i className="fas fa-clock mr-1 text-gold-500" /> {srv.duration}</span>
                  </div>
                  <p className="text-xs text-cream-700 leading-relaxed mb-4">
                    {srv.desc}
                  </p>
                </div>
                <div className="pt-4 border-t border-cream-200 flex items-center justify-between">
                  <div className="text-xl font-bold text-maroon-800">
                    ₹{srv.price.toLocaleString('en-IN')}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenBooking(srv)}
                    className="btn btn-primary btn-sm"
                  >
                    Select Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── User's Booked Appointments (if any) ── */}
        {myAppointments.length > 0 && (
          <div className="mb-14 card p-6 bg-cream-100 border border-gold-400/30">
            <h3 className="font-serif font-bold text-lg text-maroon-800 mb-4 flex items-center gap-2">
              <i className="fas fa-calendar-check text-gold-500" /> Your Booked Appointments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAppointments.map(appt => (
                <div key={appt.id} className="bg-white p-4 rounded-xl shadow-xs border border-cream-300">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-cream-600 bg-cream-200 px-1.5 py-0.5 rounded">
                      {appt.id}
                    </span>
                    <span className="badge badge-gold text-[10px]">Confirmed</span>
                  </div>
                  <h4 className="font-semibold text-sm text-maroon-900 mb-1">{appt.serviceName}</h4>
                  <p className="text-xs text-cream-700 mb-1">
                    <i className="fas fa-calendar mr-1.5 text-gold-500" /> {appt.date} at {appt.slot}
                  </p>
                  <p className="text-xs font-semibold text-maroon-700 mb-3">₹{appt.price.toLocaleString('en-IN')}</p>
                  <button
                    type="button"
                    onClick={() => handleCancelAppointment(appt.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    <i className="fas fa-trash-can mr-1" /> Cancel Slot
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Salon Makeup Products ── */}
        <div className="border-t border-cream-300 pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="section-title text-2xl">Salon Cosmetics & Products</h2>
              <p className="text-xs text-cream-700">{products.length} salon products available</p>
            </div>
            <select
              id="parlor-sort-select"
              aria-label="Sort salon cosmetics and products"
              className="px-4 py-2 rounded-xl border border-cream-300 bg-white text-maroon-800 text-xs shadow-sm focus:border-gold-400 outline-none"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="low-high">Price: Low → High</option>
              <option value="high-low">Price: High → Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card h-80 bg-cream-300 animate-pulse" />
              ))}
            </div>
          ) : sortedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedProducts.map((p) => (
                <div key={p._id}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 card">
              <div className="text-cream-400 text-5xl mb-4"><i className="fas fa-lipstick" /></div>
              <h3 className="text-maroon-700 font-serif text-xl font-bold mb-2">No beauty products found</h3>
              <p className="text-cream-600">Check back later for new arrivals.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {bookingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="parlor-booking-title"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setBookingModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] text-gold-600 uppercase tracking-wider font-semibold">Appointment Booking</span>
                <h3 id="parlor-booking-title" className="font-serif font-bold text-xl text-maroon-900">{selectedService.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                aria-label="Close appointment booking dialog"
                className="w-8 h-8 rounded-full bg-cream-200 text-ink-700 flex items-center justify-center hover:bg-cream-300"
              >
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            <div className="bg-cream-100 p-3 rounded-xl mb-4 flex justify-between items-center text-xs">
              <span className="text-cream-700"><i className="fas fa-clock mr-1" />{selectedService.duration}</span>
              <span className="font-bold text-maroon-800 text-base">₹{selectedService.price.toLocaleString('en-IN')}</span>
            </div>

            {bookingError && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
                <i className="fas fa-circle-exclamation flex-shrink-0" /> {bookingError}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label htmlFor="parlor-booking-date" className="text-xs font-semibold text-maroon-700 block mb-1">Appointment Date</label>
                <input
                  id="parlor-booking-date"
                  type="date"
                  min={tomorrowStr}
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  required
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-maroon-700 block mb-1">Available Time Slot</label>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Available appointment time slots">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={selectedSlot === slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${selectedSlot === slot
                          ? 'bg-maroon-900 text-white border-maroon-900'
                          : 'bg-white text-cream-800 border-cream-300 hover:border-gold-400'
                        }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="parlor-customer-name" className="text-xs font-semibold text-maroon-700 block mb-1">Your Full Name</label>
                <input
                  id="parlor-customer-name"
                  type="text"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  required
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label htmlFor="parlor-customer-phone" className="text-xs font-semibold text-maroon-700 block mb-1">Mobile Number</label>
                <input
                  id="parlor-customer-phone"
                  type="tel"
                  placeholder="e.g. 9826012345"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  required
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label htmlFor="parlor-notes" className="text-xs font-semibold text-maroon-700 block mb-1">Notes / Preferences (Optional)</label>
                <input
                  id="parlor-notes"
                  type="text"
                  placeholder="Skin type, allergy, hair preference..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full justify-center py-3 text-xs font-semibold mt-2"
              >
                <i className="fas fa-check-circle mr-1.5" /> Confirm Appointment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Booking Confirmation Modal ── */}
      {bookingSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="parlor-success-title"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-3xl mx-auto mb-4">
              <i className="fas fa-calendar-check" />
            </div>
            <h3 id="parlor-success-title" className="font-serif font-bold text-xl text-maroon-900 mb-1">Appointment Confirmed!</h3>
            <p className="text-xs text-cream-600 mb-4">
              Booking Reference: <strong className="text-maroon-700 font-mono">{bookingSuccess.id}</strong>
            </p>
            <div className="bg-cream-100 p-3 rounded-xl text-left text-xs space-y-1.5 mb-6 text-cream-800">
              <p><strong>Service:</strong> {bookingSuccess.serviceName}</p>
              <p><strong>Date & Slot:</strong> {bookingSuccess.date} at {bookingSuccess.slot}</p>
              <p><strong>Client:</strong> {bookingSuccess.customerName} ({bookingSuccess.customerPhone})</p>
              <p><strong>Amount:</strong> ₹{bookingSuccess.price.toLocaleString('en-IN')}</p>
            </div>
            <div className="space-y-2">
              <a
                href={`https://wa.me/918827259023?text=Hello,%20I%20have%20booked%20an%20appointment%20for%20${encodeURIComponent(bookingSuccess.serviceName)}%20on%20${bookingSuccess.date}%20at%20${bookingSuccess.slot}%20(ID:%20${bookingSuccess.id})`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full justify-center text-xs"
              >
                <i className="fab fa-whatsapp mr-1 text-sm" /> Notify Salon on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setBookingSuccess(null)}
                className="btn btn-outline w-full justify-center text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
