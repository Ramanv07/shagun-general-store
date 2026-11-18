import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface LocationInfo {
  name: string;
  hindiName: string;
  title: string;
  metaDesc: string;
  distance: string;
  travelTime: string;
  content: {
    lead: string;
    sections: {
      title: string;
      body: string;
    }[];
  };
  faqs: {
    q: string;
    a: string;
  }[];
}

const LOCATION_DATA: Record<string, LocationInfo> = {
  bamitha: {
    name: 'Bamitha',
    hindiName: 'बमीठा',
    title: 'Best Lehenga & Churi Shop in Bamitha | Shagun Mart',
    metaDesc: 'Looking for the best lehenga and churi shop in Bamitha? Visit Shagun Mart on Khajuraho Road for bridal wear, festive bangles & complete wedding shopping.',
    distance: 'Located in Bamitha',
    travelTime: 'Main Town Hub',
    content: {
      lead: 'Shagun Mart (Sagun Lengha Chunari Center) is Bamitha’s dedicated bridal showroom and festive shopping center located right on Khajuraho Road. We bring royal wedding fashion, matching bridal chudas, and salon makeover services right to your doorstep in town.',
      sections: [
        {
          title: 'Bamitha’s Own Wedding & Festive Wear Destination',
          body: 'For years, local families in Bamitha and neighboring gram panchayats had to travel hours to distant cities just to inspect bridal lehenga albums. Shagun Mart was built to give Bamitha immediate access to royal bridal lehengas, party-wear lehengas, and designer bangles with complete comfort and personal trial guidance.',
        },
        {
          title: 'Bridal Lehengas & Sangeet Outfits on Khajuraho Road',
          body: 'Located in a prime, easily accessible spot on Khajuraho Road, our showroom offers a relaxed setting where families can sit together, compare embroidery styles, and try on outfits. Whether you are shopping for a crimson red bridal velvet lehenga with zardozi borders, a bright yellow sangeet lehenga, or festive wear for Karwa Chauth and Teej, our collection is curated to honor regional traditions and modern fashion.',
        },
        {
          title: 'Specialized Churi Counter & Bangle Matching',
          body: 'What truly sets our Bamitha store apart is our dedicated churi center. Instead of settling for mismatched accessories, our experienced staff helps you assemble custom glass and lacquer bangle sets that match the exact border or zari work of your lehenga or saree. We maintain sizes across all age groups, including delicate sizes for young girls and traditional broad bridal chudas.',
        },
        {
          title: 'In-House Alterations & Bridal Makeover Support',
          body: 'Wedding clothes demand accurate fitting. Our in-house alteration support ensures that waistbands, can-can layers, and blouse necklines fit you accurately without requiring extra trips to local tailors. In addition, our beauty parlour provides complete pre-bridal and bridal makeover packages so you can prepare for your big day seamlessly in one place.',
        },
      ],
    },
    faqs: [
      {
        q: 'Where is Shagun Mart located in Bamitha?',
        a: 'We are located on Khajuraho Road, Bamitha, Madhya Pradesh - 471105. Roadside parking for cars and two-wheelers is readily available.',
      },
      {
        q: 'What are the shop timings in Bamitha?',
        a: 'We are open all 7 days a week, Monday to Sunday, from 7:00 AM to 9:00 PM.',
      },
      {
        q: 'Can I get matching bangles for my saree or lehenga in Bamitha?',
        a: 'Yes, our specialized churi counter customizes bridal chuda and glass bangle sets to match your exact fabric and border colors on the spot.',
      },
    ],
  },
  chhatarpur: {
    name: 'Chhatarpur',
    hindiName: 'छतरपुर',
    title: 'Bridal Lehenga & Churi Shop near Chhatarpur | Shagun Mart',
    metaDesc: 'Planning wedding shopping in Chhatarpur? Shagun Mart Bamitha offers heavy bridal lehengas, party wear & churi collections just a short 30-min drive away.',
    distance: 'Approx. 30 km from Chhatarpur',
    travelTime: '30-40 min highway drive',
    content: {
      lead: 'Skip the congested city lanes and parking headaches of Chhatarpur. Located just a short 30-minute highway drive away in Bamitha, Shagun Mart offers an unhurried, royal bridal lehenga and bangle shopping experience for Chhatarpur families.',
      sections: [
        {
          title: 'Premium Bridal Lehengas Without the Crowded City Hassle',
          body: 'Wedding shoppers in Chhatarpur often face a dilemma: navigate crowded bazaar alleys with impossible parking, or travel far away to Gwalior or Jhansi. Shagun Mart provides the ideal solution: a spacious bridal destination showroom with peaceful trial spaces and extensive designer stock tailored specifically for Bundelkhand brides.',
        },
        {
          title: 'Extensive Range: Velvet, Silk, Georgette & Pastel Lehengas',
          body: 'We welcome wedding parties every week from Chhatarpur city, Rajnagar, and surrounding tehsils. Our showroom display features bridal lehengas that reflect royal craftsmanship, including deep wine and crimson velvets with heavy zardozi embroidery, intricate floral handloom motifs, and lightweight organza lehengas designed for daytime weddings.',
        },
        {
          title: 'Custom Bridal Chuda & Bangle Coordination for Chhatarpur Brides',
          body: 'A bride’s look remains incomplete without an authentic chuda. We offer customizable bridal chuda combinations featuring traditional red-and-white sets, velvet-wrapped bangles, kundan latkan bangles, and sparkling micro-cut glass churis that mirror your lehenga’s gold or silver zari work.',
        },
        {
          title: 'Smooth Travel & Ample Parking from Chhatarpur',
          body: 'Driving to Shagun Mart from Chhatarpur is a smooth 30 to 40-minute journey along the national highway toward Khajuraho. With generous roadside parking right outside our store, your family can comfortably spend several hours selecting outfits and enjoying trials without rush.',
        },
      ],
    },
    faqs: [
      {
        q: 'How far is Shagun Mart from Chhatarpur city?',
        a: 'Shagun Mart is approximately 30 kilometers from Chhatarpur, taking about 30 to 40 minutes along the main highway.',
      },
      {
        q: 'Why should Chhatarpur wedding shoppers travel to Bamitha?',
        a: 'Shagun Mart offers an extensive collection of heavy bridal lehengas, instant churi color matching, dedicated trial rooms, and stress-free parking without city congestion.',
      },
      {
        q: 'Can I check bridal lehenga designs on WhatsApp before driving from Chhatarpur?',
        a: 'Yes, message us at +91 8827259023 and our team will share photos and videos of newly arrived bridal collections.',
      },
    ],
  },
  khajuraho: {
    name: 'Khajuraho',
    hindiName: 'खजुराहो',
    title: 'Bridal Lehenga & Churi Center near Khajuraho | Shagun Mart',
    metaDesc: 'Just 10 minutes from Khajuraho: Shagun Mart Bamitha provides stunning bridal lehengas, sangeet party wear, bridal chudas & wedding shagun essentials.',
    distance: 'Just 10-12 km from Khajuraho',
    travelTime: '10-15 min drive',
    content: {
      lead: 'Just 10 minutes from the historic town of Khajuraho, Shagun Mart in Bamitha is the premier wedding shopping destination for local families and destination wedding parties seeking royal bridal attire, festive wear, and customized bangles.',
      sections: [
        {
          title: 'Premium Bridal Fashion Minutes Away from Khajuraho',
          body: 'With Khajuraho serving as a premier destination for heritage weddings and cultural celebrations, Shagun Mart provides the high-end bridal fashion and accessories required for unforgettable wedding ceremonies. Local and visiting families find an impressive array of heavy bridal outfits and coordinated festive wear just a 10-minute drive down the road.',
        },
        {
          title: 'Destination Wedding Trousseau: Sangeet, Mehendi & Bridal Wear',
          body: 'Our bridal line includes royal velvet lehengas, pastel organza sets, golden tissue fabrics, and intricate mirror-work lehengas that catch the light during evening sangeet and garland ceremonies. We also feature curated collections for bridesmaids, including crop-top lehengas and lightweight celebratory skirts.',
        },
        {
          title: 'Complete Bangle Boutique: Glass, Lac & Bridal Chuda Sets',
          body: 'Our signature churi center carries classic red-and-white bridal chudas, intricate lac bangles inspired by regional craftsmanship, soft velvet bangles, and gleaming glass bangles designed to complement both traditional sarees and contemporary designer lehengas.',
        },
        {
          title: 'Quick 10-Minute Drive from Khajuraho with Convenient Parking',
          body: 'Reaching Shagun Mart from Khajuraho is a breeze along the Khajuraho-Bamitha link road. Avoid the hassle of shopping in distant commercial hubs; our spacious showroom offers unhurried trials, personalized styling advice, and respectful service for your entire family.',
        },
      ],
    },
    faqs: [
      {
        q: 'How close is Shagun Mart to Khajuraho?',
        a: 'Shagun Mart is only 10 to 12 kilometers from Khajuraho, a quick 10 to 15-minute drive on Khajuraho Road.',
      },
      {
        q: 'Do you cater to destination weddings in Khajuraho?',
        a: 'Yes, we regularly assist families and wedding parties attending Khajuraho events with festive lehengas, emergency fitting adjustments, and matching accessories.',
      },
      {
        q: 'Does Shagun Mart provide bridal makeup for Khajuraho weddings?',
        a: 'Yes, our beauty parlour team provides complete bridal makeover packages by prior appointment.',
      },
    ],
  },
  panna: {
    name: 'Panna',
    hindiName: 'पन्ना',
    title: 'Wedding Lehenga & Bangle Store near Panna | Shagun Mart',
    metaDesc: 'Shop bridal lehengas, party-wear outfits & churi sets near Panna. Shagun Mart in Bamitha is your complete wedding shopping destination in Bundelkhand.',
    distance: 'Approx. 40-45 km from Panna',
    travelTime: '45-50 min drive',
    content: {
      lead: 'For families in Panna district planning a wedding, Shagun Mart in Bamitha is your trusted one-stop bridal haven. We offer grand bridal lehengas, customized chudas, and complete shagun essentials within an easy driving distance.',
      sections: [
        {
          title: 'A Trusted Bridal Wear Destination for Panna District',
          body: 'For families residing in Panna and nearby towns like Devendranagar and Ajaigarh, organizing a grand wedding requires finding authentic, high-quality attire that honors regional traditions. Shagun Mart in neighboring Bamitha has become a trusted shopping hub for Panna residents seeking magnificent bridal lehengas without travelling to distant metros.',
        },
        {
          title: 'Royal Bridal Outfits for Traditional Bundelkhandi Weddings',
          body: 'For brides seeking traditional grandeur, we feature heavy bridal lehengas embroidered with heritage gota patti, dori, threadwork, and sparkling stone embellishments that hold up beautifully under wedding photography lights. For sisters and relatives, we carry fashionable semi-stitched lehengas and party suits.',
        },
        {
          title: 'Traditional Chudas, Glass Bangles & Wedding Shagun Sets',
          body: 'Alongside wedding apparel, our store is known across Panna district for its comprehensive churi center. At Shagun Mart, you can match your bangles on the spot. From authentic bridal chudas accented with minakari work to everyday glass churis in every rainbow shade, our assortment ensures your shringar is flawless.',
        },
        {
          title: 'Effortless Route from Panna to Bamitha',
          body: 'Traveling from Panna to Shagun Mart in Bamitha is straightforward via the Panna-Chhatarpur connecting highway. Our attentive staff provides personalized attention, showing you multiple colorways and silhouettes within your stated budget.',
        },
      ],
    },
    faqs: [
      {
        q: 'Can customers from Panna visit for bridal trials?',
        a: 'Yes! Families from Panna regularly visit our Bamitha showroom for bridal trials and custom bangle matching.',
      },
      {
        q: 'What is the route to Shagun Mart from Panna?',
        a: 'Take the main highway toward Chhatarpur and turn toward Bamitha on Khajuraho Road. The journey takes about 45 to 50 minutes.',
      },
      {
        q: 'What payment options can Panna shoppers use?',
        a: 'We accept all major UPI apps (Google Pay, PhonePe, Paytm), debit/credit cards, and cash.',
      },
    ],
  },
};

export const LocationPage: React.FC = () => {
  const { town } = useParams<{ town: string }>();
  const key = (town || 'bamitha').toLowerCase();
  const data = LOCATION_DATA[key] || LOCATION_DATA['bamitha'];

  useEffect(() => {
    document.title = data.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', data.metaDesc);
    }
    window.scrollTo(0, 0);
  }, [data]);

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center text-xs sm:text-sm text-stone-500 gap-2">
          <Link to="/" className="hover:text-emerald-800 transition">Home</Link>
          <span>/</span>
          <span className="text-stone-400">Locations</span>
          <span>/</span>
          <span className="text-emerald-900 font-semibold">{data.name}</span>
        </nav>

        {/* Hero Section */}
        <header className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            <i className="fas fa-map-marker-alt"></i>
            {data.distance} · {data.travelTime}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 leading-tight">
            {data.name} ({data.hindiName}) — Bridal Lehenga &amp; Churi Center
          </h1>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
            {data.content.lead}
          </p>

          {/* Quick CTA Actions */}
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="https://wa.me/918827259023?text=Namaste%20Shagun%20Mart,%20I%20am%20inquiring%20from%20"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition shadow-sm"
            >
              <i className="fab fa-whatsapp text-base"></i>
              WhatsApp Inquiries (+91 88272 59023)
            </a>
            <a
              href="tel:+918827259023"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition shadow-sm"
            >
              <i className="fas fa-phone-alt text-base"></i>
              Call Store
            </a>
            <a
              href="https://maps.google.com/?cid=854452174360343884"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-100 text-stone-800 font-semibold text-sm hover:bg-stone-200 transition border border-stone-300"
            >
              <i className="fas fa-directions text-emerald-700"></i>
              Get Map Directions
            </a>
          </div>
        </header>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
            <i className="fas fa-female text-2xl text-emerald-800"></i>
            <h3 className="font-bold text-stone-900 text-sm">Bridal Lehengas</h3>
            <p className="text-xs text-stone-500">Royal red, velvet, zardozi &amp; modern pastel lehengas with trials.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
            <i className="fas fa-ring text-2xl text-amber-600"></i>
            <h3 className="font-bold text-stone-900 text-sm">Churi &amp; Bangle Hub</h3>
            <p className="text-xs text-stone-500">Bridal chudas, velvet &amp; glass bangles custom matched on the spot.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
            <i className="fas fa-spa text-2xl text-rose-600"></i>
            <h3 className="font-bold text-stone-900 text-sm">Bridal Makeup Salon</h3>
            <p className="text-xs text-stone-500">Professional pre-bridal &amp; bridal makeover packages in-store.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
            <i className="fas fa-cut text-2xl text-stone-700"></i>
            <h3 className="font-bold text-stone-900 text-sm">Fitting &amp; Alteration</h3>
            <p className="text-xs text-stone-500">In-house sizing and alteration so your outfit fits perfectly.</p>
          </div>
        </div>

        {/* Deep Content Sections (300+ Words unique) */}
        <main className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 space-y-8">
          {data.content.sections.map((sec, idx) => (
            <section key={idx} className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                {sec.title}
              </h2>
              <p className="text-stone-600 leading-relaxed text-sm sm:text-base">
                {sec.body}
              </p>
            </section>
          ))}
        </main>

        {/* Local FAQ Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            Frequently Asked Questions for {data.name} Shoppers
          </h2>
          <div className="space-y-4">
            {data.faqs.map((faq, idx) => (
              <details key={idx} className="border border-stone-200 rounded-2xl p-4 transition group">
                <summary className="font-bold text-stone-800 cursor-pointer list-none flex justify-between items-center text-sm sm:text-base">
                  <span>{faq.q}</span>
                  <span className="text-emerald-700 text-lg font-bold ml-2">+</span>
                </summary>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Other Towns Navigation */}
        <footer className="bg-stone-100 rounded-2xl p-6 border border-stone-200 space-y-3">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
            Explore Other Wedding Shopping Hubs
          </h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.keys(LOCATION_DATA).map((k) => (
              <Link
                key={k}
                to={`/locations/${k}`}
                className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                  k === key
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-700'
                }`}
              >
                {LOCATION_DATA[k].name} ({LOCATION_DATA[k].hindiName})
              </Link>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
};
