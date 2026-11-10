import React from 'react';
import { Link } from 'react-router-dom';

export const DeleteAccountInfo: React.FC = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-cream-50">
      <div className="container max-w-3xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-cream-600 mb-6">
          <Link to="/" className="hover:text-maroon-700">Home</Link>
          <i className="fas fa-chevron-right text-[9px]" />
          <span className="text-maroon-900 font-semibold">Account Deletion</span>
        </div>

        <div className="bg-white rounded-2xl border border-cream-200 p-8 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-xl mb-4">
            <i className="fas fa-user-xmark" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-maroon-900 mb-3">
            Account Deletion Information
          </h1>
          <p className="text-sm text-cream-700 leading-relaxed mb-6">
            At Shagun Mart, we respect your privacy and provide self-service controls to delete your account and personal data at any time.
          </p>

          <div className="space-y-6 text-sm text-cream-800">
            <section className="bg-cream-100/60 p-5 rounded-xl border border-cream-200">
              <h2 className="font-bold text-base text-maroon-800 mb-2">
                1. How to Delete Your Account In-App or on Web
              </h2>
              <ol className="list-decimal pl-5 space-y-1.5 text-cream-700">
                <li>Log into your account on the Shagun Mart mobile app or website.</li>
                <li>Go to <strong>Account / Profile</strong> settings.</li>
                <li>Scroll down to the bottom and tap <strong>Delete Account</strong>.</li>
                <li>Verify your identity using your account password or an email one-time code (OTP).</li>
                <li>Confirm deletion. Your sessions will be terminated immediately.</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-base text-maroon-800">
                2. What Data Is Deleted or Anonymized
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-cream-700">
                <li>Your name, email address, phone number, and profile picture are permanently removed/anonymized.</li>
                <li>All saved delivery addresses and push notification tokens are deleted.</li>
                <li>Wishlist items and account authentication credentials (passwords, tokens) are purged immediately.</li>
                <li>All active sessions on all devices are terminated.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-base text-maroon-800">
                3. What Data Is Retained (Legal & Financial Compliance)
              </h2>
              <p className="text-cream-700 leading-relaxed">
                In compliance with applicable Indian tax and financial reporting laws, records of completed transactions (order items, monetary totals, dates, and GST/invoice summaries) are retained for required statutory retention periods. However, your personal identifying details (name, phone, address) are stripped from historical order records.
              </p>
            </section>

            <section className="bg-rose-50/60 p-5 rounded-xl border border-rose-200 text-rose-900">
              <h2 className="font-bold text-base text-rose-800 mb-1">
                4. Cannot Access Your Account?
              </h2>
              <p className="text-xs text-rose-700 leading-relaxed mb-3">
                If you cannot log in or need manual deletion assistance, email us from your registered email address:
              </p>
              <a
                href="mailto:support@shagunmart.com?subject=Account%20Deletion%20Request"
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <i className="fas fa-envelope" /> Request Deletion via Email
              </a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
