import React from 'react';

export const ContactUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200">
        
        {/* Draft Notice Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
          <div className="flex items-start">
            <span className="text-amber-800 font-bold text-sm">
              ⚠️ Draft — pending final review by owner and legal counsel. Parameter check: [FILL: business registration number, trade license number, official grievance email].
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-stone-900 mb-2">Contact Us &amp; Store Location</h1>
        <p className="text-sm text-stone-500 mb-8">We are here to assist with store orders, beauty parlour bookings, and rentals.</p>

        <section className="space-y-6 text-stone-700 leading-relaxed text-sm sm:text-base">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <i className="fas fa-store text-maroon-700"></i>
                Store Physical Address
              </h2>
              <p className="text-stone-600">
                <strong>Shagun Mart / Shagun General Store</strong><br />
                Main Market Road, Near SBI,<br />
                Bamitha, District Chhatarpur,<br />
                Madhya Pradesh — 471105, India
              </p>
              <p className="text-xs text-stone-500">
                Business Registration / GSTIN: [FILL: 23XXXXXXXXXXXZX]
              </p>
            </div>

            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <i className="fas fa-clock text-maroon-700"></i>
                Store Timings
              </h2>
              <p className="text-stone-600">
                <strong>Monday to Saturday:</strong> 9:00 AM – 9:00 PM<br />
                <strong>Sunday:</strong> 10:00 AM – 2:00 PM (Emergency rentals only)<br />
                <strong>Customer Support:</strong> 9:00 AM – 8:00 PM IST
              </p>
            </div>
          </div>

          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <i className="fas fa-headset text-maroon-700"></i>
              Direct Communication Channels
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="https://wa.me/918827259023?text=Hello%20Shagun%20General%20Store"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200 hover:border-green-500 transition group"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg">
                  <i className="fab fa-whatsapp"></i>
                </div>
                <div>
                  <p className="text-xs text-stone-500 font-semibold uppercase">WhatsApp Chat</p>
                  <p className="text-stone-900 font-bold group-hover:text-green-700 transition">+91 88272 59023</p>
                </div>
              </a>

              <a
                href="tel:+918827259023"
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200 hover:border-maroon-700 transition group"
              >
                <div className="w-10 h-10 rounded-full bg-maroon-100 flex items-center justify-center text-maroon-700 text-lg">
                  <i className="fas fa-phone-alt"></i>
                </div>
                <div>
                  <p className="text-xs text-stone-500 font-semibold uppercase">Direct Call</p>
                  <p className="text-stone-900 font-bold group-hover:text-maroon-900 transition">+91 88272 59023</p>
                </div>
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">Consumer Grievance Redressal</h2>
            <p className="mb-2">
              Under the Information Technology Act and Consumer Protection Rules, for unresolved complaints or disputes:
            </p>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1 text-sm">
              <p><strong>Grievance Officer:</strong> [FILL: Store Manager / Appointed Officer Name]</p>
              <p><strong>Email:</strong> [FILL: grievance@shagunmart.com]</p>
              <p><strong>Response Turnaround:</strong> Acknowledged within 48 hours; resolution target within 30 days.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
