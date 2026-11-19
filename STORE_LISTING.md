# Google Play Store Listing Specification (Shagun Mart)

## 1. Store Listing Text Metadata

### App Title (Max 30 Characters)
- **Title (Option 1):** `Shagun Mart: Apni Dukan` *(24 characters)*
- **Title (Option 2):** `Shagun Mart - Daily Kirana` *(26 characters)*
*(Note: "Shagun mart - aap ki apni dukan" was 31 characters, exceeding Google Play's strict 30-character hard limit).*

### Short Description (Max 80 Characters)
`Online shopping for daily groceries, personal care, toys & household items.` *(77 characters)*

### Full Description (Max 4000 Characters — Real Code Features Only)
```text
Welcome to Shagun Mart, your trusted neighborhood general store in Bamitha, offering an easy way to shop for daily grocery and household essentials directly from your phone.

Browse a wide selection of everyday products, add items to your cart, and have them delivered directly to your doorstep.

WHAT YOU CAN DO ON SHAGUN MART:
• Explore Everyday Categories: Browse personal care products, skincare, baby care, hair care, cosmetics, cleaning supplies, kitchen essentials, toys, games, and stationery.
• Search & Filter: Find items quickly with instant product search and category filtering.
• Local Doorstep Delivery: Enjoy convenient home delivery across our local service area in Bamitha.
• Flexible Payment Options: Pay securely using Cash on Delivery (COD) or UPI direct intent.
• Order Tracking: Monitor your order progress from placed, packed, out for delivery, to delivered with live status updates.
• Save Delivery Addresses: Add and manage multiple delivery locations for quick checkout.
• Special Services: Explore our local beauty parlor service bookings and bridal lehenga rental inquiries directly through the app.
• Transparent Customer Reviews: Read verified customer ratings and feedback, or share your own review after receiving your delivery.
• In-App Customer Feedback: Report issues, share suggestions, or get in touch with our team directly via the Account section.

PRIVACY & SECURITY:
We respect your privacy. Shagun Mart encrypts all communications in transit. You have complete control over your data with in-app self-service account deletion and transparent data policies.

Customer Support: ramanvishwari@gmail.com
Store Location: Main Market, Bamitha, Madhya Pradesh 471105
Website: https://www.shagunmart.shop/
```

---

## 2. Graphic Asset Requirements

| Graphic Asset | Exact Dimensions | File Format | Specs & Guidelines |
| :--- | :--- | :--- | :--- |
| **App Icon** | 512 × 512 px | 32-bit PNG (with alpha) | Max 1 MB. Clean brand logo on solid background (`#FAF6F0`). No drop shadows or pre-rounded corners (Google rounds them automatically). |
| **Feature Graphic** | 1024 × 500 px | JPEG or 24-bit PNG | Max 1 MB. Vibrant banner showing Shagun Mart storefront branding & key promise ("Daily Essentials & Grocery Delivery"). No third-party logos. |
| **Phone Screenshots** | 1080 × 2400 px or 1080 × 1920 px | PNG / JPEG (min 4, max 8) | Minimum 16:9 or 9:16 aspect ratio. Minimum 2 screens required; 6-8 recommended. |

---

## 3. Recommended 6-Screenshot Plan

| Screen # | Screen Capture View | Top Banner Headline | Content Shown (Must Be Free of Personal Data) |
| :---: | :--- | :--- | :--- |
| **1** | Home Screen (`app/(tabs)/index.tsx`) | *Daily Essentials At Your Doorstep* | Clean category strip, featured essentials carousel, daily grocery items. |
| **2** | Shop / Catalog (`app/(tabs)/shop.tsx`) | *Browse Wide Product Variety* | Category tabs (Personal Care, Kitchen, Household) with price and discount badges. |
| **3** | Product Detail (`app/product-details.tsx`) | *Clear Pricing & Verified Reviews* | Product photo, MRP vs selling price, stock availability, customer ratings. |
| **4** | Cart & Offers (`app/(tabs)/cart.tsx`) | *Easy Cart & Instant Discounts* | Item quantity selector, bill summary, coupon discount code section. |
| **5** | Checkout & Delivery (`app/checkout.tsx`) | *Fast Checkout & Cash on Delivery* | Clean address selection, Cash on Delivery option, clear total. |
| **6** | Order Tracking (`app/(tabs)/orders.tsx`) | *Real-Time Order Tracking* | Visual timeline: Processing → Packed → Out for Delivery → Delivered. |

*Guidelines for Screenshot Captures:*
- Use a stock Android phone status bar with full battery, clean Wi-Fi icon, and no personal notification icons.
- Ensure test customer names or personal phone numbers are NOT visible in screenshots.

---

## 4. Policy Pages & Pending `[FILL]` Items

Before submitting to Google Play Console, confirm the following URLs are published and live:

1. **Privacy Policy URL:**
   - Play Console Field: `Policy > Privacy Policy`
   - URL: `https://www.shagunmart.shop/privacy`
   - Fact Verification: Matches `DATA_SAFETY_DRAFT.md` (identifies collector, contact email, data types, encryption, and deletion path).

2. **Account Deletion URL:**
   - Play Console Field: `Policy > Data safety > Delete account URL`
   - URL: `https://www.shagunmart.shop/delete-account`
   - Fact Verification: States how a user deletes their account from the web without reinstalling the app, and explains data retention for accounting records.

3. **Remaining Fact Items Required from Store Owner:**
   - `[FILL: Official Support Phone Number]` — (e.g. `+91 8827259023` as configured in `ADMIN_WHATSAPP`)
   - `[FILL: Registered Business Address]` — e.g. `Main Road, Bamitha, Chhatarpur, Madhya Pradesh 471105`
