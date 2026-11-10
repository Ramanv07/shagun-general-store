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
          {/* Draft Notice Banner */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
            <span className="text-amber-800 font-bold text-xs sm:text-sm">
              Draft — pending final review by owner and legal counsel. Support contact: [FILL: support email, e.g. support@shagunmart.com].
            </span>
          </div>

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
                <li>Scroll down to the bottom Danger Zone and click or tap <strong>Delete Account</strong>.</li>
                <li>Verify your identity using your account password (or Google login proof / email OTP for passwordless accounts).</li>
                <li>Confirm permanent deletion. Your active authentication tokens will be immediately invalidated (HTTP 401).</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-base text-maroon-800">
                2. What Data Is Immediately Removed or Anonymized
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-cream-700">
                <li>Your profile name is replaced with <code>Deleted User</code> and your email address is anonymized to <code>deleted_&lt;id&gt;@deleted.invalid</code>.</li>
                <li>Your phone number, password hash, saved delivery addresses, push notification tokens, and notifications are permanently erased.</li>
                <li>Wishlist items, active OTP verification sessions, and payment preferences are purged immediately.</li>
                <li>Historical reviews you posted remain visible to inform other customers, but the author attribution permanently displays as <code>Deleted User</code>.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-base text-maroon-800">
                3. What Data Is Retained (Statutory Accounting & Tax Compliance)
              </h2>
              <p className="text-cream-700 leading-relaxed">
                In compliance with applicable accounting and tax laws, completed order records (purchased item names, quantities, unit prices, total invoice amounts, and transaction timestamps) are retained as required by applicable law [FILL: retention period, confirm with accountant]. All customer-identifying information (full name, phone number, street, house number) is completely redacted from these order records, leaving only non-identifying aggregate geographic data (city, state, PIN code) for tax reporting.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-bold text-base text-maroon-800">
                4. Active Commitments Blocking Deletion
              </h2>
              <p className="text-cream-700 leading-relaxed">
                To protect both customer and store rights, self-service account deletion is blocked if you currently have:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-cream-700">
                <li>An active store order in progress (status Processing, Packed, or Out for Delivery).</li>
                <li>An active bridal lehenga rental that has not yet been returned and inspected.</li>
                <li>An upcoming parlour appointment that has not yet concluded or been cancelled.</li>
                <li>Sole administrator status (the last remaining administrator account cannot be deleted).</li>
              </ul>
            </section>

            <section className="bg-rose-50/60 p-5 rounded-xl border border-rose-200 text-rose-900">
              <h2 className="font-bold text-base text-rose-800 mb-1">
                5. Cannot Access Your Account?
              </h2>
              <p className="text-xs text-rose-700 leading-relaxed mb-3">
                If you cannot log in or need manual deletion assistance, email us from your registered email address at [FILL: support email, e.g. support@shagunmart.com]:
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

