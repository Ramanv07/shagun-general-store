import React, { useEffect, useState } from 'react';
import { mockApi } from '../services/mockService';
import { useCart } from '../context/CartContext';
import { ActiveRentalInfo, RentalBooking } from '../types';

interface Lehenga {
  _id: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  description: string;
}

export const LehengaSection: React.FC = () => {
  const [lehengas, setLehengas] = useState<Lehenga[]>([]);
  const [activeRentalsMap, setActiveRentalsMap] = useState<Record<string, ActiveRentalInfo>>({});
  const [loading, setLoading] = useState(true);

  // Rental Modal State
  const [selectedLehenga, setSelectedLehenga] = useState<Lehenga | null>(null);
  const [startDate, setStartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<RentalBooking | null>(null);

  const { addToCart, setIsCartOpen } = useCart();

  const loadData = async () => {
    try {
      const [legacyLehengas, allProducts, rentalsRes] = await Promise.all([
        mockApi.getLehengas(),
        mockApi.getProducts(),
        mockApi.getActiveRentals()
      ]);

      const categoryLehengas = allProducts
        .filter(p => p.category === 'Bridal Lehenga')
        .map(p => ({
          _id: p._id,
          name: p.name,
          price: p.price,
          image: p.image,
          images: p.images,
          description: p.description
        }));

      const merged = [...legacyLehengas, ...categoryLehengas];
      const unique = Array.from(new Map(merged.map(item => [item._id, item])).values());
      setLehengas(unique);
      setActiveRentalsMap(rentalsRes.activeMap || {});
    } catch (err) {
      console.error('Failed to load lehengas or rentals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getMinStartDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinReturnDate = () => {
    if (!startDate) return getMinStartDate();
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  };

  const openRentalModal = (lehenga: Lehenga) => {
    setSelectedLehenga(lehenga);
    setBookingError(null);
    setBookingSuccess(null);

    // Prepopulate user details from localStorage if logged in
    try {
      const userStr = localStorage.getItem('shagun_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.name) setCustomerName(u.name);
        if (u.phone) setCustomerPhone(u.phone);
        if (u.email) setCustomerEmail(u.email);
      }
    } catch (e) {}

    // Default dates: tomorrow to +4 days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnD = new Date(tomorrow);
    returnD.setDate(returnD.getDate() + 3);

    // If currently booked, suggest starting after the return date
    const active = activeRentalsMap[lehenga._id];
    if (active && new Date(active.returnDate) > tomorrow) {
      const avail = new Date(active.returnDate);
      avail.setDate(avail.getDate() + 1);
      const availReturn = new Date(avail);
      availReturn.setDate(availReturn.getDate() + 3);
      setStartDate(avail.toISOString().split('T')[0]);
      setReturnDate(availReturn.toISOString().split('T')[0]);
    } else {
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setReturnDate(returnD.toISOString().split('T')[0]);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLehenga) return;

    if (!startDate || !returnDate) {
      setBookingError('Please choose both Booking Date and Return Date.');
      return;
    }

    if (new Date(returnDate) <= new Date(startDate)) {
      setBookingError('Return date must be at least one day after the booking start date.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setBookingError('Please provide Customer Name and Mobile Number.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      // Calculate rental days (minimum 1 day)
      const diffTime = Math.abs(new Date(returnDate).getTime() - new Date(startDate).getTime());
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const securityDeposit = 2500; // Flat refundable security deposit

      const booking = await mockApi.createRentalBooking({
        lehengaId: selectedLehenga._id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        startDate,
        returnDate,
        rentalPrice: selectedLehenga.price,
        securityDeposit,
        notes: notes.trim()
      });

      setBookingSuccess(booking);
      // Reload active bookings to update badges immediately
      await loadData();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete rental booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookNow = (lehenga: Lehenga) => {
    addToCart({
      _id: lehenga._id,
      name: lehenga.name,
      price: lehenga.price,
      image: lehenga.image,
      description: lehenga.description,
      category: 'Bridal Lehenga'
    } as any, 1);
    setIsCartOpen(true);
  };

  if (loading || lehengas.length === 0) return null;

  return (
    <section id="lehengas" className="py-16 bg-white">
      <div className="container">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="badge badge-maroon mb-3 inline-flex items-center gap-1.5">
              <i className="fas fa-crown text-[10px]" /> Exclusive Bridal Rental
            </span>
            <h2 className="section-title">Rental Lehenga Collection</h2>
            <div className="section-divider" />
            <p className="section-subtitle mt-3 max-w-2xl text-cream-800">
              Rent designer handcrafted bridal lehengas for weddings and grand receptions. Choose your event and return dates with seamless online booking and database tracking.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-cream-800 bg-cream-100 px-4 py-2.5 rounded-xl border border-cream-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Available for Rent
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              Booked (Shows Available Date)
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {lehengas.map((lehenga, i) => {
            const activeBooking = activeRentalsMap[lehenga._id];
            const isBooked = Boolean(activeBooking && activeBooking.isBooked);

            return (
              <div
                key={lehenga._id}
                className={`product-card card overflow-hidden group rounded-2xl border border-cream-300/60 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between animate-fade-in-up anim-delay-${Math.min(i + 1, 4)}`}
              >
                {/* Image & Badges */}
                <div className="relative h-[380px] overflow-hidden bg-cream-200">
                  <img
                    src={lehenga.image || (lehenga.images && lehenga.images[0])}
                    alt={lehenga.name}
                    className={`product-card-img w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${(lehenga.images && lehenga.images.length > 1) ? 'group-hover:opacity-0' : ''}`}
                  />
                  {lehenga.images && lehenga.images.length > 1 && (
                    <img
                      src={lehenga.images[1]}
                      alt={lehenga.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  )}

                  {/* Top-Left Exclusive Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="badge badge-maroon shadow-md text-[11px] font-bold py-1 px-2.5">
                      <i className="fas fa-crown text-[9px] mr-1" /> Royal Rental
                    </span>
                  </div>

                  {/* Top-Right Availability Status Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    {isBooked ? (
                      <span className="bg-rose-700/95 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
                        <i className="fas fa-lock text-[9px]"></i> Booked
                      </span>
                    ) : (
                      <span className="bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
                        <i className="fas fa-check-circle text-[9px]"></i> Available
                      </span>
                    )}
                  </div>
                </div>

                {/* Info & Booking Section */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-cream-950 text-lg mb-1 group-hover:text-maroon-700 transition-colors line-clamp-1">
                      {lehenga.name}
                    </h3>
                    <p className="text-xs text-cream-700 mb-3 line-clamp-2 leading-relaxed">
                      {lehenga.description}
                    </p>

                    {/* Dynamic Availability & Return Date Banner */}
                    {isBooked ? (
                      <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl text-xs text-amber-950 shadow-sm">
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 text-amber-800">
                            <i className="fas fa-calendar-times text-amber-600"></i>
                            Currently Booked Until:
                          </span>
                          <span className="font-bold text-amber-900">
                            {formatDate(activeBooking.returnDate)}
                          </span>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-amber-200/50 flex items-center justify-between text-[11px]">
                          <span className="text-amber-800 font-medium">Available to rent from:</span>
                          <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            ✨ {formatDate(activeBooking.availableFrom)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between shadow-sm">
                        <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                          <i className="fas fa-calendar-check text-emerald-600"></i>
                          Available for your event date
                        </span>
                        <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Ready Now
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="pt-2 border-t border-cream-200 flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-cream-600 uppercase font-semibold tracking-wider block">Rental Price</span>
                        <span className="text-2xl font-serif font-bold text-maroon-700">
                          ₹{lehenga.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-cream-600 ml-1">/ booking</span>
                      </div>
                      <span className="text-[11px] text-cream-500 font-medium">+ ₹2,500 security deposit</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openRentalModal(lehenga)}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          isBooked
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-maroon-700 hover:bg-maroon-800 text-white hover:shadow-maroon-700/20'
                        }`}
                      >
                        <i className={`fas ${isBooked ? 'fa-calendar-alt' : 'fa-calendar-check'}`} />
                        {isBooked ? 'Reserve Next' : 'Rent Lehenga'}
                      </button>

                      <button
                        onClick={() => handleBookNow(lehenga)}
                        className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs border border-maroon-700/30 text-maroon-800 hover:bg-maroon-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fas fa-shopping-bag text-maroon-600" />
                        Cart / Buy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RENTAL BOOKING MODAL */}
      {selectedLehenga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-cream-300 relative animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-maroon-800 to-maroon-700 text-white p-6 rounded-t-3xl relative">
              <button
                type="button"
                onClick={() => setSelectedLehenga(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-gold-400 text-lg">
                  👑
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold">Lehenga Rental Booking</h3>
                  <p className="text-xs text-cream-200">Select your booking and return dates</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {bookingSuccess ? (
                /* Success View */
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
                    <i className="fas fa-check"></i>
                  </div>
                  <h4 className="font-serif text-2xl font-bold text-cream-950">Rental Booking Confirmed!</h4>
                  <p className="text-sm text-cream-700 max-w-md mx-auto">
                    Your bridal lehenga has been reserved in our database and synced with the store admin.
                  </p>

                  <div className="bg-cream-100 p-4 rounded-2xl border border-cream-300 text-left text-xs space-y-2 mt-4">
                    <div className="flex justify-between">
                      <span className="text-cream-600">Booking ID:</span>
                      <strong className="font-mono text-cream-950">#{bookingSuccess._id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cream-600">Lehenga:</span>
                      <strong className="text-cream-950">{bookingSuccess.lehengaName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cream-600">Pick-up / Booking Date:</span>
                      <strong className="text-maroon-700 font-bold">{formatDate(bookingSuccess.startDate)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cream-600">Return Date:</span>
                      <strong className="text-maroon-700 font-bold">{formatDate(bookingSuccess.returnDate)}</strong>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-cream-300">
                      <span className="text-cream-600">Total Rental Amount:</span>
                      <strong className="text-base text-maroon-800 font-bold">₹{bookingSuccess.totalAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedLehenga(null);
                      setBookingSuccess(null);
                    }}
                    className="w-full mt-4 py-3 bg-maroon-700 hover:bg-maroon-800 text-white font-bold rounded-xl transition-all shadow-md"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Booking Form View */
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  {/* Selected Lehenga Summary Card */}
                  <div className="flex items-center gap-3 p-3 bg-cream-100 rounded-2xl border border-cream-200">
                    <img
                      src={selectedLehenga.image}
                      alt={selectedLehenga.name}
                      className="w-16 h-16 rounded-xl object-cover border border-cream-300 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif font-bold text-cream-950 text-sm truncate">{selectedLehenga.name}</h4>
                      <p className="text-xs text-maroon-700 font-bold mt-0.5">
                        ₹{selectedLehenga.price.toLocaleString('en-IN')} <span className="text-cream-600 font-normal">rental fee</span>
                      </p>
                      <p className="text-[11px] text-cream-600">+ ₹2,500 refundable security deposit</p>
                    </div>
                  </div>

                  {/* Active Booking Notice if currently booked */}
                  {activeRentalsMap[selectedLehenga._id]?.isBooked && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <i className="fas fa-info-circle text-amber-600 mt-0.5"></i>
                      <div>
                        <strong>Currently Booked:</strong> This lehenga is out on rental until{' '}
                        <span className="font-bold underline">
                          {formatDate(activeRentalsMap[selectedLehenga._id].returnDate)}
                        </span>
                        . It becomes available from{' '}
                        <span className="font-bold text-emerald-800">
                          {formatDate(activeRentalsMap[selectedLehenga._id].availableFrom)}
                        </span>
                        . Please pick your booking date on or after this date.
                      </div>
                    </div>
                  )}

                  {bookingError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                      <i className="fas fa-exclamation-circle text-rose-600 text-sm"></i>
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {/* Dates Picker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-cream-900 mb-1">
                        📅 Booking Date (Event / Pickup) *
                      </label>
                      <input
                        type="date"
                        min={getMinStartDate()}
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-cream-300 text-sm font-medium text-cream-950 focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-cream-900 mb-1">
                        🔄 Return Date (Drop-off) *
                      </label>
                      <input
                        type="date"
                        min={getMinReturnDate()}
                        value={returnDate}
                        onChange={e => setReturnDate(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-cream-300 text-sm font-medium text-cream-950 focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600 outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-cream-900 mb-1">
                        👤 Customer Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-cream-300 text-sm text-cream-950 focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600 outline-none bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-cream-900 mb-1">
                          📱 Mobile Number *
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          required
                          className="w-full p-2.5 rounded-xl border border-cream-300 text-sm text-cream-950 focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-cream-900 mb-1">
                          ✉️ Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="priya@example.com"
                          value={customerEmail}
                          onChange={e => setCustomerEmail(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-cream-300 text-sm text-cream-950 focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600 outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-cream-900 mb-1">
                        📝 Fitting / Special Requests (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Mention trial timings, blouse fitting, or dupatta requirements..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-cream-300 text-xs text-cream-950 focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600 outline-none bg-white resize-none"
                      />
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-3 bg-cream-100 rounded-xl border border-cream-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-cream-800">
                      <span>Rental Fee:</span>
                      <span className="font-semibold">₹{selectedLehenga.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-cream-800">
                      <span>Refundable Security Deposit:</span>
                      <span className="font-semibold">₹2,500</span>
                    </div>
                    <div className="flex justify-between text-maroon-800 font-bold pt-1.5 border-t border-cream-300 text-sm">
                      <span>Total Payable:</span>
                      <span>₹{(selectedLehenga.price + 2500).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedLehenga(null)}
                      className="w-1/3 py-3 rounded-xl border border-cream-300 text-cream-800 font-semibold text-xs hover:bg-cream-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-2/3 py-3 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {bookingLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Reserving in Database...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle" />
                          <span>Confirm Rental Booking</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
