import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-stone-500 mb-8">Last updated: October 5, 2026</p>

        <section className="space-y-6 text-stone-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">1. Overview</h2>
            <p>
              Welcome to <strong>Shagun General Store</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring your personal information is handled safely and responsibly. This Privacy Policy applies to our website and our mobile application.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">2. Information We Collect</h2>
            <p className="mb-2">When you use our app or website, we may collect the following personal information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Information:</strong> Name, email address, password (encrypted), and phone number.</li>
              <li><strong>Delivery Information:</strong> Physical shipping address, house number, street, city, state, and PIN code.</li>
              <li><strong>Order History:</strong> Products ordered, total amount, payment method (COD/UPI/Online), and order status.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">3. How We Use Your Information</h2>
            <p className="mb-2">We use your information solely to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Process, fulfill, and deliver your grocery and store orders.</li>
              <li>Allow you to track order progress and manage your delivery addresses.</li>
              <li>Provide customer support and respond to inquiries via WhatsApp or phone.</li>
              <li>Maintain the security and integrity of your account.</li>
            </ul>
            <p className="mt-2 text-stone-600">We do <strong>not</strong> sell, rent, or trade your personal data to any third parties or advertisers.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">4. Data Security</h2>
            <p>
              All communication between our app and our servers is encrypted using industry-standard Transport Layer Security (HTTPS/TLS). Passwords are cryptographically hashed, and sensitive data is stored securely in our MongoDB Atlas cloud cluster with role-based access control.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">5. User Rights &amp; Account Deletion</h2>
            <p className="mb-2">
              In compliance with Google Play Store policies and international privacy standards:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>In-App Deletion:</strong> You can permanently delete your account and all associated personal data directly from the mobile app by navigating to <em>Account → Delete Account</em>.</li>
              <li><strong>Online Request:</strong> You can also request account and data deletion by emailing us at <a href="mailto:support@shagun.com" className="text-rose-700 underline">support@shagun.com</a> or messaging our store support on WhatsApp. Upon verification, your account and profile data will be permanently removed within 48 hours.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">6. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact:
            </p>
            <div className="mt-2 p-4 bg-stone-100 rounded-lg text-sm text-stone-800 space-y-1">
              <p><strong>Shagun General Store</strong></p>
              <p>Support WhatsApp: +91 88272 59023</p>
              <p>Email: support@shagun.com</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
