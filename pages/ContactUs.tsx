import React from 'react';

export const ContactUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-stone-200">
        
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Contact Us &amp; Store Location</h1>
        <p className="text-sm text-stone-500 mb-8">We are here to assist with bridal lehenga trials, churi matching, beauty parlour bookings, and store orders.</p>

        <section className="space-y-6 text-stone-700 leading-relaxed text-sm sm:text-base">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <i className="fas fa-store text-emerald-700"></i>
                Store Physical Address
              </h2>
              <p className="text-stone-600">
                <strong>Shagun Mart – Lehenga &amp; Churi Center</strong><br />
                <em>(Google Maps: Sagun Lengha Chunari Center)</em><br />
                Khajuraho Road, Bamitha,<br />
                District Chhatarpur, Madhya Pradesh — 471105, India
              </p>
              <div className="pt-2">
                <a
                  href="https://maps.google.com/?cid=854452174360343884"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition bg-emerald-100/70 px-3 py-1.5 rounded-lg"
                >
                  <i className="fas fa-directions"></i> View on Google Maps / Directions
                </a>
              </div>
            </div>

            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <i className="fas fa-clock text-emerald-700"></i>
                Store Timings
              </h2>
              <p className="text-stone-600">
                <strong>Monday to Sunday:</strong> 7:00 AM – 9:00 PM<br />
                <strong>Open All 7 Days</strong> (including festive and wedding seasons)<br />
                <strong>WhatsApp / Phone Support:</strong> 7:00 AM – 9:00 PM IST
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

