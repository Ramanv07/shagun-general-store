import React from 'react';
import { Link } from 'react-router-dom';

export const ShippingPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200">
        
        {/* Draft Notice Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
          <div className="flex items-start">
            <span className="text-amber-800 font-bold text-sm">
              ⚠️ Draft — pending final review by owner and legal counsel. Parameter check: [FILL: coverage radius in kilometers from Bamitha store, e.g., 10km radius].
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 mb-2">Shipping &amp; Delivery Policy</h1>
        <p className="text-sm text-stone-500 mb-8">Last revised: November 2026 (Operational Draft)</p>

        <section className="space-y-6 text-stone-700 leading-relaxed text-sm sm:text-base">
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">1. Delivery Coverage Area</h2>
            <p>
              Shagun Mart currently operates local door-step delivery in Bamitha and surrounding localities in Chhatarpur district, Madhya Pradesh (PIN 471105) within a [FILL: 10–15 km delivery radius]. Orders requested outside our verified delivery zone may require in-store pickup or special delivery arrangements.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">2. Delivery Charges &amp; Free Delivery Threshold</h2>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2 text-sm">
              <p><strong>Free Delivery:</strong> All orders with a cart subtotal of <strong>₹399 or higher</strong> qualify for free local delivery.</p>
              <p><strong>Standard Delivery Fee:</strong> A flat charge of <strong>₹30</strong> is applied to orders with a subtotal below ₹399.</p>
              <p><strong>No Hidden Fees:</strong> Packaging, handling, and platform fees are completely free of charge.</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">3. Estimated Delivery Timelines</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Standard Local Delivery:</strong> Same-day or next-day delivery depending on order placement time. Orders placed before [FILL: 4:00 PM] are typically delivered the same evening between 5:00 PM and 8:30 PM.</li>
              <li><strong>Store Operating Hours:</strong> Monday through Saturday, 9:00 AM to 9:00 PM. Orders placed on Sunday or holidays are processed on the subsequent working morning.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">4. Order Tracking &amp; Delivery Verification</h2>
            <p>
              Customers can monitor live order status (<em>Processing → Packed → Out for Delivery → Delivered</em>) on the{' '}
              <Link to="/orders" className="text-maroon-700 underline font-semibold">My Orders</Link>{' '}
              page. Our delivery partner will contact the phone number provided in your shipping address upon arrival.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">5. Delivery Attempts &amp; Undelivered Orders</h2>
            <p>
              If our delivery partner cannot reach the recipient after [FILL: 2 attempts] or if the shipping address is unreachable, the order will return to our store. We will contact you via WhatsApp or phone to arrange re-delivery or in-store pickup.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
