import React from 'react';
import { Link } from 'react-router-dom';

export const RentalTerms: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200">
        
        {/* Draft Notice Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
          <div className="flex items-start">
            <span className="text-amber-800 font-bold text-sm">
              ⚠️ Draft — pending final review by owner and legal counsel. Security deposit structure: [FILL: refundable security deposit amount / percentage, e.g., ₹2,000 or 50% of rental fee].
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 mb-2">Bridal Lehenga Rental Terms</h1>
        <p className="text-sm text-stone-500 mb-8">Last revised: November 2026 (Operational Draft)</p>

        <section className="space-y-6 text-stone-700 leading-relaxed text-sm sm:text-base">
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">1. Overview &amp; Booking</h2>
            <p>
              Shagun Mart offers designer bridal lehengas, bridal jewelry sets, and celebration attire for rental in Bamitha and surrounding areas. Rentals can be reserved via the{' '}
              <Link to="/bridal-lehenga" className="text-maroon-700 underline font-semibold">Bridal Lehenga</Link>{' '}
              section or in-store.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">2. Rental Period &amp; Return</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Standard rental periods are typically [FILL: 3 days / 4 days] (Pickup Day, Event Day, Return Day).</li>
              <li>Late returns without prior written extension may incur a late fee of [FILL: ₹500 per day] deducted from the refundable security deposit.</li>
              <li>Pickup and returns take place at Shagun Mart, Main Market, Bamitha.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">3. Security Deposit &amp; Inspection</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>A refundable security deposit of [FILL: ₹2,000 to ₹5,000 depending on outfit tier] is payable at or before garment handover.</li>
              <li>Garments are thoroughly inspected for tears, missing stones, severe stains, or alterations upon return.</li>
              <li>Normal wear from a wedding ceremony is expected. Severe fabric damage, burn marks, cuts, or permanent grease/dye damage will be assessed and deducted from the deposit at actual repair/replacement cost.</li>
              <li>Once inspected and cleared, the full deposit balance is refunded immediately via UPI or cash.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">4. Care &amp; Alterations</h2>
            <p>
              Please do <strong>not</strong> perform permanent machine alterations, cut fabric, or self-dry-clean the garment. Minor temporary stitching adjustments can be coordinated with our store tailor. Professional dry cleaning is handled exclusively by Shagun Mart after return.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">5. Cancellation &amp; Rescheduling</h2>
            <p>
              Cancellations requested at least [FILL: 7 days] before the scheduled pickup date are eligible for a full booking refund. For any emergency date changes, please contact store management directly on WhatsApp at +91 88272 59023.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
