import React from 'react';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200">
        
        {/* Draft Notice Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
          <div className="flex items-start">
            <span className="text-amber-800 font-bold text-sm">
              Draft — pending final review by owner and legal counsel. Business registration: [FILL: Business Registration / GSTIN Number], Grievance Officer: [FILL: Grievance Officer Name & Email].
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-stone-500 mb-8">Last revised: November 2026 (Operational Draft)</p>

        <section className="space-y-6 text-stone-700 leading-relaxed text-sm sm:text-base">
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">1. Agreement to Terms</h2>
            <p>
              These Terms &amp; Conditions govern the use of the <strong>Shagun Mart</strong> website and mobile application operated by [FILL: Legal Entity Name / Owner Name], Bamitha, Madhya Pradesh 471105. By accessing our platform or placing an order, you agree to be bound by these Terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">2. Products, Pricing &amp; Orders</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All product prices are quoted in Indian Rupees (₹) inclusive of applicable taxes unless stated otherwise.</li>
              <li>Free local delivery applies on cart orders equal to or exceeding ₹399. A nominal delivery fee of ₹30 applies to orders below ₹399.</li>
              <li>Payment methods include Cash on Delivery (COD), UPI, and supported online payment channels. For COD orders, exact cash or immediate UPI payment on delivery is expected.</li>
              <li>We reserve the right to decline or cancel orders in cases of stock exhaustion, typographical pricing errors, or suspected unauthorized activity.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">3. Services &amp; Rentals</h2>
            <p>
              Beauty parlour appointments and bridal lehenga rentals are subject to specific advance booking terms and security deposit conditions detailed in our{' '}
              <Link to="/rental-terms" className="text-maroon-700 underline font-semibold">Rental Terms</Link>.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">4. User Accounts &amp; Privacy</h2>
            <p>
              Users are responsible for safeguarding their login credentials and OTPs. We will never ask for your password or OTP over phone or WhatsApp. You may review our data handling practices in our{' '}
              <Link to="/privacy" className="text-maroon-700 underline font-semibold">Privacy Policy</Link>{' '}
              and learn about account removal on our{' '}
              <Link to="/delete-account" className="text-maroon-700 underline font-semibold">Delete Account Info</Link>{' '}
              page.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">5. Governing Law &amp; Jurisdiction</h2>
            <p>
              These terms are governed by the laws of India. Any disputes arising in connection with orders or services shall be subject to the exclusive jurisdiction of the competent courts in Chhatarpur district, Madhya Pradesh.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">6. Grievance Redressal</h2>
            <p>
              In accordance with Consumer Protection (E-Commerce) Rules, grievances may be addressed to:
            </p>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-2 space-y-1 text-sm">
              <p><strong>Grievance Officer:</strong> [FILL: Officer Name]</p>
              <p><strong>Designation:</strong> Store Manager, Shagun Mart</p>
              <p><strong>Address:</strong> Main Market, Bamitha, Chhatarpur, Madhya Pradesh 471105</p>
              <p><strong>Email:</strong> [FILL: Grievance Contact Email, e.g., grievance@shagunmart.com]</p>
              <p><strong>Support Phone / WhatsApp:</strong> +91 88272 59023</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

