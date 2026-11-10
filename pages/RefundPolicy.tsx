import React from 'react';
import { Link } from 'react-router-dom';

export const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200">
        
        {/* Draft Notice Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
          <div className="flex items-start">
            <span className="text-amber-800 font-bold text-sm">
              Draft — pending final review by owner and legal counsel. Parameter check: [FILL: return window duration, e.g., 24 hours vs 48 hours for non-perishable goods].
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 mb-2">Refund, Return &amp; Cancellation Policy</h1>
        <p className="text-sm text-stone-500 mb-8">Last revised: November 2026 (Operational Draft)</p>

        <section className="space-y-6 text-stone-700 leading-relaxed text-sm sm:text-base">
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">1. Order Cancellation by Customer</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Before Dispatch:</strong> You may cancel an order free of charge at any time while its status is <em>Processing</em> or <em>Packed</em> by visiting <em>My Orders</em> or contacting store support.</li>
              <li><strong>After Dispatch:</strong> Once an order is marked <em>Out for Delivery</em>, cancellation at the doorstep is subject to confirmation with store staff.</li>
              <li><strong>Parlour Appointments:</strong> Appointments can be cancelled or rescheduled up to [FILL: e.g. 2 hours] prior to the reserved slot.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">2. Return Eligibility &amp; Windows</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Damaged, Defective or Incorrect Items:</strong> If you receive a damaged or expired product, notify us within [FILL: e.g., 24 hours] of delivery with photographic evidence via WhatsApp (+91 88272 59023).</li>
              <li><strong>Personal Care &amp; Cosmetics:</strong> For hygiene and health safety reasons, opened cosmetics, skincare, and intimate products cannot be returned unless delivered damaged or expired.</li>
              <li><strong>Packaged Goods:</strong> Unopened grocery or general merchandise items in original manufacturer packaging may be exchanged or returned within [FILL: e.g., 48 hours].</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">3. Refund Processing</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Online / UPI Payments:</strong> Approved refunds are credited back to the original payment source within [FILL: 5–7 business days] through the payment gateway.</li>
              <li><strong>Cash on Delivery (COD):</strong> Refunds for eligible returned items are disbursed via immediate UPI transfer or store credit upon product inspection at the store.</li>
              <li><strong>Coupon Discounts:</strong> If an order placed with a promotional coupon is cancelled or refunded, the redeemed discount is nullified and the single-use coupon is released as per our coupon rules.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">4. Questions &amp; Support</h2>
            <p>
              For return inquiries or refund assistance, contact us at +91 88272 59023 or email [FILL: support@shagunmart.com]. See also our{' '}
              <Link to="/shipping-policy" className="text-maroon-700 underline font-semibold">Shipping Policy</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

