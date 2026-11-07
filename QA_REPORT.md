# Shagun Mart / Shagun General Store — Comprehensive QA & Security Audit Report

## Phase 0: Reconnaissance & Stack Baseline

### 1. Stack Confirmation
- **Mobile App**: React Native (Expo SDK 51, Expo Router v3 file-based routing)
- **Web App (Customer & Admin)**: React 18 + Vite + Tailwind CSS + React Router DOM
- **Backend**: Node.js v24 + Express + Mongoose + JWT Auth (ES modules)
- **Database**: MongoDB (Local Staging / MongoMemoryServer @ `mongodb://127.0.0.1:27017/shagun-staging`)
- **Safety Gate Status**: PASS. Live Atlas URI is isolated. Outbound actions (SMS, OTP, email, push, payments) mocked/stubbed.

### 2. Baseline Data Integrity Checksums
- **Source**: `backend/backups/atlas_backup_20261101120039/products.json`
- **Product Document Count**: 28
- **Raw File SHA-256**: `f792b316b6a0b6870085c483cdaf356d3c240ddaa8b66f581498a285cd816e9c`
- **Normalized Canonical SHA-256** (`_id, name, price, mrp, image, stock`): `53fa1d92b6381474ede7c1a94240f62fba4e928a5c0e23657b57e661643b1c60`

---

### 3. Screen & Route Inventory

#### A. Mobile App Screens (15 routes via Expo Router)
1. `/(tabs)` → Home Screen with Auto-scroll poster carousel, category grid, delivery strip, horizontal product recommendations
2. `/(tabs)/shop` → Product Catalog / Shop with category filter, search & 2-column product grid
3. `/(tabs)/offers` → Offers & Promotions list
4. `/(tabs)/cart` → Shopping Cart with price summary, delivery fee calculation, checkout CTA
5. `/(tabs)/orders` → Customer Order History & details
6. `/(tabs)/account` → User Profile, Saved Addresses CRUD, Payment Preferences & links
7. `/checkout` → Two-step Checkout (Address verification/entry, Payment Method COD/UPI, Place Order)
8. `/product-details` → Detailed Product View with zoom image, MRP discount badge, Add to Cart / Buy Now
9. `/search` → Full-screen Search with debounced query & category chips
10. `/login` → Authentication (Email/Password, Google OAuth sign-in, Sign-up tab)
11. `/beauty-parlor` → Parlour services catalog & appointment booking modal
12. `/bridal-lehenga` → Bridal Lehenga catalog, calendar date picker & rental booking modal
13. `/admin/dashboard` → Admin Mobile Management Portal (Products, Orders, Banners, Broadcasts)
14. `/(tabs)/_layout` → 5-Tab Navigation Layout (Home, Shop, Offers, Cart, Profile)
15. `/_layout` → Root Stack Navigator with modals & deep link routing

#### B. Customer Web Pages (11 routes via React Router)
1. `/` (`pages/Home.tsx`) → Hero vanity, quick categories, promo cards, bridal section, parlour section
2. `/shop` (`pages/Shop.tsx`) → Product Catalog with price filtering & sorting
3. `/cart` (`pages/Cart.tsx`) → Shopping Cart & item breakdown
4. `/checkout` (`pages/Checkout.tsx`) → Delivery details & order placement
5. `/orders` (`pages/Orders.tsx`) → Order history & live status tracker
6. `/account` (`pages/Account.tsx`) → Saved addresses, orders, profile edit
7. `/login` (`pages/Login.tsx`) → Customer/Admin Sign in & Registration
8. `/beauty-parlor` (`pages/BeautyParlor.tsx`) → Parlour service selection & slot booking
9. `/bridal-lehenga` (`pages/BridalLehenga.tsx`) → Designer lehenga rental calendar
10. `/privacy-policy` (`pages/PrivacyPolicy.tsx`) → Privacy policy document
11. `*` (`pages/NotFound.tsx`) → 404 Fallback page

#### C. Admin Web Panel
- `/admin` (`pages/admin/AdminDashboard.tsx`) → Admin Dashboard:
  - Product CRUD (Title, Price, MRP, Image, Stock, Category)
  - Order Management & Status Transitions
  - Delivery Configuration (Free delivery threshold, ETA)
  - Push Notification Broadcast Manager
  - Lehenga Rentals & Parlour Appointment Tracking

---

### 4. Backend Route Inventory (14 route files, 66 endpoints)

| Route File | Mount Point in server.js | Endpoints Count | Auth Required | Admin Required |
|---|---|---|---|---|
| `authRoutes.js` | `/api/auth` | 6 | 2 (`/me`, `/profile`) | 0 |
| `productRoutes.js` | `/api/products` | 5 | 3 (POST, PUT, DELETE) | 3 |
| `orderRoutes.js` | `/api/orders` | 7 | 7 (All routes protected) | 2 (status, stats) |
| `rentalRoutes.js` | `/api/rentals` | 5 | 5 | 2 (approve, return) |
| `uploadRoutes.js` | `/api/upload` | 2 | 2 (Cloudinary upload) | 2 |
| `appointmentRoutes.js` | `/api/appointments` | 5 | 3 | 2 (status, cancel) |
| `parlorServiceRoutes.js`| `/api/parlor-services`| 5 | 3 | 3 |
| `categoryRoutes.js` | `/api/categories` | 5 | 3 | 3 |
| `notificationRoutes.js`| `/api/notifications` | 6 | 6 | 2 (broadcast, send) |
| `settingRoutes.js` | `/api/settings` | 5 | 2 | 2 |
| `wishlistRoutes.js` | `/api/wishlist` | 4 | 4 | 0 |
| `reviewRoutes.js` | `/api/reviews` | 5 | 4 | 1 (moderation) |
| `brandRoutes.js` | **UNMOUNTED** | 4 | 3 | 3 |
| `paymentPreferenceRoutes.js` | **UNMOUNTED** | 2 | 2 | 0 |

> [!WARNING]
> **Recon finding**: `brandRoutes.js` and `paymentPreferenceRoutes.js` exist in `backend/routes/` but are NOT mounted in `backend/server.js`, causing 404 on `/api/payment-preferences`.

---

### 5. Mongoose Models (13 Models)
1. `User.js` → Fields: name, email, password, phone, role ('customer'|'admin'), addresses[], pushTokens[]
2. `Product.js` → Fields: name, description, price, mrp, category, image, images[], stock, rating, numReviews, isFeatured
3. `Order.js` → Fields: user, orderItems[], shippingAddress, paymentMethod, paymentResult, itemsPrice, deliveryPrice, totalPrice, isPaid, isDelivered, orderStatus ('Order Confirmed'|'Packed'|'Out for Delivery'|'Delivered'|'Cancelled')
4. `Rental.js` → Fields: user, product, startDate, returnDate, totalDays, dailyRate, securityDeposit, totalAmount, status
5. `Appointment.js` → Fields: user, service, customerName, phone, date, timeSlot, status
6. `ParlorService.js` → Fields: name, category, price, durationMinutes, description, active
7. `CategorySection.js` → Fields: name, slug, description, image, order, active
8. `Notification.js` → Fields: user, title, body, type, isRead, data, createdAt
9. `StoreSetting.js` → Fields: key, value, description, updatedAt
10. `WishlistItem.js` → Fields: user, product, createdAt
11. `Review.js` → Fields: product, user, rating, comment, isVerifiedPurchase
12. `Brand.js` → Fields: name, logo, active
13. `PaymentPreference.js` → Fields: user, preferredMethod, upiId

---

### 6. State Stores
- **Native**: `AuthContext.tsx` (user, token, login, logout, register), `CartContext.tsx` (items, total, count, addToCart, removeFromCart, updateQty), `OrderContext.tsx` (activeOrder, orders, fetchOrders)
- **Web**: Parallel implementation in `context/AuthContext.tsx`, `context/CartContext.tsx`, `context/OrderContext.tsx`

---

### 7. Environment Variables (Names Only)
- `PORT`
- `MONGODB_URI`
- `STAGING_MONGODB_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_WHATSAPP`
- `NTFY_TOPIC`
- `CALLMEBOT_API_KEY`
- `VITE_API_URL`

---

### 8. Test Infrastructure & Staging Database Reachability
- Test Harness: `jest` (v30.5.2), `supertest` (v7.3.1), `mongodb-memory-server` (v11.3.0) confirmed installed and functional on local loopback `127.0.0.1:27017`.
- Live Atlas Connection: Completely prevented per Safety Rule.
- Initial Baseline Checksum Verified.

---

## Phase 1: Database Audit (Staging Data)

### 1. Document Counts Audited
- **Products**: 28 documents
- **Users**: 10 documents
- **Orders**: 1 document
- **Category Sections**: 2 documents
- **Parlor Services**: 1 document
- **Rentals**: 0 documents (empty initial state)
- **Appointments**: 0 documents (empty initial state)

### 2. Data Integrity Checks (Pass/Fail)
| Check | Status | Evidence / Notes |
|---|---|---|
| Product Pricing | ✅ PASS | All 28 products have `price > 0`. Zero zero or negative prices. |
| Product MRP vs Price | ✅ PASS | All 28 products have `mrp >= price`. Maximum discount is 53% on Vaseline 600ml. |
| Product Stock Integrity | ✅ PASS | All 28 products have integer `stock >= 1`. No negative or fractional stocks. |
| Product Names & Descriptions | ✅ PASS | Zero empty, null, or whitespace-only names/descriptions. |
| Product Image CDN URLs | ✅ PASS | All 28 products point to valid Cloudinary URLs (`https://res.cloudinary.com/yg0l2ra0/...`). No localhost URLs. |
| User Account & Password Hashes | ✅ PASS | All 10 user documents possess valid 60-character bcrypt hashes (`$2a$` / `$2b$`). No plain-text passwords. |
| Order Referential Integrity | ✅ PASS | User ID `6ac5c57c0be3222185613fdd` resolves to `admin@shagun.com`. All 3 item product IDs exist in `products.json`. |
| Order Financial Sum Calculation | ✅ PASS | Items sum (₹145 + ₹105 + ₹200 = ₹450) matches `totalAmount: ₹450` exactly. ₹399 free delivery threshold applied. |
| Product Baseline Checksum | ✅ PASS | Pre: `f792b316...` == Post: `f792b316...` (Byte-identical, 0 modifications). |

### 3. Database & Schema Findings
1. **🔴 BLOCKER [DB-01] Missing compound unique index on Review (`user_id + product_id`)**
   - **Evidence**: `backend/models/Review.js:12`. Schema uses `autoIndex: false` and lacks `reviewSchema.index({ user_id: 1, product_id: 1 }, { unique: true })`.
   - **Impact**: Any user can submit unlimited duplicate reviews for the same product, distorting ratings.
   - **Suggested Fix**: Add compound unique index and run `syncIndexes()`.

2. **🔴 BLOCKER [DB-02] Missing compound unique index on WishlistItem (`user_id + product_id`)**
   - **Evidence**: `backend/models/WishlistItem.js:10`. Schema uses `autoIndex: false` and lacks compound unique index.
   - **Impact**: Duplicate wishlist entries can be created indefinitely for the same product.
   - **Suggested Fix**: Add `wishlistItemSchema.index({ user_id: 1, product_id: 1 }, { unique: true })`.

3. **🟠 HIGH [DB-03] Inconsistent timestamp naming across Mongoose models**
   - **Evidence**: `Review.js` and `WishlistItem.js` define explicit snake_case `created_at: Date`, while `Order.js`, `User.js`, `Product.js`, and `StoreSetting.js` use Mongoose's camelCase `{ timestamps: true }` (`createdAt`, `updatedAt`).
   - **Impact**: Frontends and API consumers face mismatched field naming schemas (`createdAt` vs `created_at`).
   - **Suggested Fix**: Standardize on Mongoose `{ timestamps: true }` across all models.

4. **🟠 HIGH [DB-04] Lack of soft-delete pattern on catalog and user records**
   - **Evidence**: `Product.js` and `User.js` implement physical deletion via `findByIdAndDelete()`.
   - **Impact**: Hard-deleting a product or user breaks historical references in existing orders, leaving broken tracking views.
   - **Suggested Fix**: Implement soft-delete pattern (`isDeleted: { type: Boolean, default: false }`).

5. **🟡 MEDIUM [DB-05] Missing search/text index on Product model**
   - **Evidence**: `backend/models/Product.js`. Search endpoint in `productRoutes.js` performs unindexed `$regex` full-collection scans on `name` and `description`.
   - **Impact**: Slow query execution under high product catalog volume.
   - **Suggested Fix**: Add compound text index `productSchema.index({ name: 'text', description: 'text', category: 1 })`.

---

## Phase 2: API Testing & Security Findings (Every Endpoint)

### 1. Test Suite Execution Summary
- **Test Harness**: `jest` + `supertest` + `mongodb-memory-server` (`backend/tests/api_phase2.test.js`)
- **Total Tests Executed**: 14 tests across Auth, Products, Orders, Appointments, Rentals, Reviews, Wishlist
- **Pass Rate**: 100% (14 passed in 2.35s)
- **Live Atlas Protection**: Zero calls to Atlas; Staging in-memory isolation verified.
- **Product Backup Checksum**: Pre: `f792b316...` == Post: `f792b316...` (Byte-identical).

### 2. Detailed API Findings & Vulnerabilities

| ID | Endpoint | Severity | Vulnerability / Issue | Evidence |
|---|---|---|---|---|
| **API-01** | `POST /api/auth/google` | 🔴 **BLOCKER** | **Full Account Takeover / Auth Bypass**: Endpoint trusts client-supplied `email` without verifying Google ID token. Logging in with `admin@shagun.com` issues a valid Admin JWT token. | `authRoutes.js:182-200`, verified in `api_phase2.test.js:125-151` |
| **API-02** | `POST /api/orders` | 🔴 **BLOCKER** | **Client-Side Price Tampering**: Server accepts `item.price` and `totalAmount` directly from HTTP body without cross-checking database product prices. Tested ₹500 perfume bought for ₹1. | `orderRoutes.js:247-250`, verified in `api_phase2.test.js:93-122` |
| **API-03** | `POST /api/auth/verify-otp` | 🔴 **BLOCKER** | **Hardcoded OTP Bypass Backdoor**: Universal fallback code `'123456'` allows verifying any mobile number without SMS delivery. | `authRoutes.js:103` (`if (otp === '123456' \|\| ...)`) |
| **API-04** | `POST /api/rentals` | 🔴 **BLOCKER** | **Rental Price Tampering**: `finalRentalPrice = rentalPrice !== undefined ? Number(rentalPrice) : Number(lehenga.price)`. Client can force ₹0 or ₹1 rental fee. | `rentalRoutes.js:153` |
| **API-05** | `POST /api/appointments` | 🔴 **BLOCKER** | **Double Booking & Past Date Booking**: No slot collision detection and no past-date validation. Allows 100 clients on same slot or 1990 bookings. | `appointmentRoutes.js:9-31`, verified in `api_phase2.test.js:154-197` |
| **API-06** | `POST /api/orders` | 🟠 **HIGH** | **Inventory Overselling Race Condition**: If atomic decrement `{ stock: { $gte: requestedQty } }` fails, fallback clamps stock to 0 and still creates the order instead of failing. | `orderRoutes.js:216-223` |
| **API-07** | `/api/payment-preferences` | 🟠 **HIGH** | **Unmounted Router (404 Not Found)**: `paymentPreferenceRoutes.js` exists in `backend/routes/` but is never mounted in `server.js`. Client calls fail with 404. | `backend/server.js:79-90` |
| **API-08** | `/api/brands` | 🟠 **HIGH** | **Unmounted Router (404 Not Found)**: `brandRoutes.js` exists in `backend/routes/` but is never mounted in `server.js`. Admin brand management fails. | `backend/server.js:79-90` |
| **API-09** | `PUT /api/settings/delivery-strip` | 🟡 **MEDIUM** | **Missing Admin Settings Update Endpoint**: `settingRoutes.js` only provides GET; admin panel cannot save updated delivery ETA min/max to DB. | `backend/routes/settingRoutes.js:1-31` |
| **API-10** | `POST /api/reviews` | ✅ **PASS** | **Verified Purchase Protection**: Properly blocks unverified buyers with `403 Only verified purchasers with a delivered order can review`. | `reviewRoutes.js:80-93`, verified in `api_phase2.test.js:200-213` |
| **API-11** | `POST /api/products` | ✅ **PASS** | **Admin Role Protection**: Non-admin JWT tokens are strictly rejected with 403. | `productRoutes.js:160`, verified in `api_phase2.test.js:63-76` |
| **API-12** | `GET /api/orders/myorders` | ✅ **PASS** | **Authentication & Token Integrity**: Expired, missing, or malformed JWT tokens return 401. | `authMiddleware.js:17`, verified in `api_phase2.test.js:48-61` |
| **API-13** | `POST /api/orders` | ✅ **PASS** | **Stock Boundary Validation**: Quantities > available stock or <= 0 are rejected with 400. | `orderRoutes.js:183-199`, verified in `api_phase2.test.js:240-280` |
| **API-14** | `GET /api/wishlist` | ✅ **PASS** | **User Isolation (IDOR Safe)**: Users can only view and mutate their own wishlist items. | `wishlistRoutes.js:15`, verified in `api_phase2.test.js:216-237` |





---

## Phase 3: Security & Compliance Audit

### 1. Security Findings Matrix

| ID | Area | Severity | Finding / Vulnerability | Evidence | Remediation |
|---|---|---|---|---|---|
| **SEC-01** | Secrets in Git History | 🔴 **BLOCKER** | **MongoDB Atlas Production Credentials Committed**: Production `.env` file containing live connection string `mongodb+srv://...` was committed in `99083bc2` and merged in `bd99275d`. Anyone with repository access can access live user data. | Git commit `99083bc2b38c576cfb48dd818d88eb65ff74da7b` and `a4fe238a23aada4275b3ffe39cbb20a739ed6f72` | Rotate Atlas credentials immediately; scrub repository history with BFG / git filter-repo; verify `.gitignore`. |
| **SEC-02** | PII & Secret Leakage in Logs | 🔴 **BLOCKER** | **Customer Phone Numbers & Live OTPs Printed to Console**: Server outputs customer phone number and unhashed 6-digit OTP code to stdout. Cloud log aggregators (e.g., Vercel, Datadog) capture sensitive PII and 2FA credentials. | `backend/routes/authRoutes.js:61,67` (`console.log('Sending OTP...', otp)`) | Remove all OTP and raw PII logging; use structured logger with masking. |
| **SEC-03** | Auth / Token Lifecycle | 🟠 **HIGH** | **Excessive JWT Expiration Window (90 Days) Without Revocation**: Access token valid for 90 days (`expiresIn: '90d'`). No refresh token rotation or token revocation blocklist exists on user logout. | `backend/routes/authRoutes.js:11` | Implement short-lived access tokens (15m) + refresh token rotation with server-side revocation on logout. |
| **SEC-04** | File Upload Security | 🟠 **HIGH** | **Unbounded Multer File Uploads (Denial of Service)**: Multer upload middleware does not configure `limits: { fileSize }`. An attacker can upload multi-gigabyte payloads exhausting server memory and disk space. | `backend/routes/uploadRoutes.js:38` | Enforce `limits: { fileSize: 5 * 1024 * 1024 }` (5MB max) and restrict MIME types to `image/jpeg`, `image/png`, `image/webp`. |
| **SEC-05** | Infrastructure Resiliency | 🟠 **HIGH** | **Server Starts in Broken State if Database Fails**: In `server.js:129`, if `connectDB()` fails, Express server still launches listening on port, serving 500 error responses across all data routes. | `backend/server.js:129` | Fail fast: exit process with code 1 if initial database connection fails in production. |
| **SEC-06** | Mobile Token Storage | ✅ **PASS** | **Hardware Keystore / Keychain Token Encryption**: Mobile client uses `expo-secure-store` for JWT persistence on Android and iOS devices, with fallback to `AsyncStorage` on web. | `shagun-native/services/storage.ts:1-25` | Compliant with OWASP MASVS for mobile storage. |
| **SEC-07** | Order Tracking PII Isolation | ✅ **PASS** | **Order Tracking Requires Phone Number Authentication**: Public tracking endpoint `POST /api/orders/track` enforces matching `phone` parameter against order before returning delivery address. | `backend/routes/orderRoutes.js:77-84` | Prevents enumeration/scraping of customer delivery addresses. |


---

## Phase 4: Mobile App UI/UX and Workflow Audit (Every Screen)

### 1. Test Summary
- **App Platform**: React Native + Expo Router v3 (Tested across Mobile Viewport 393x852, Web Emulation & Android Handlers)
- **Screens Audited**: 15 / 15 screens (`Home`, `Shop`, `Offers`, `Cart`, `Orders`, `Account`, `Checkout`, `Product Details`, `Search`, `Login`, `Beauty Parlor`, `Bridal Lehenga`, `Admin Dashboard`)
- **Key Flows Verified**:
  - Launch & Auth: 🟡 PARTIAL (Login/Signup works, Forgot Password opens WhatsApp redirect, no in-app phone OTP login screen)
  - Home Carousel & Categories: 🟡 PASS WITH CONDITIONS (Auto-scroll works, but layout resizing on web creates slide sync jitter; admin item count badge leaked onto home)
  - Search & Filtering: 🟠 PASS (Client-side in-memory search over entire catalog; works for 28 items, scales poorly)
  - Product Details: ✅ PASS (Sticky CTA bar, zoom gallery, discount calculation, stock limits, related items)
  - Cart & Checkout: 🔴 CRITICAL (Checkout previously allowed ₹30 delivery on 0 items without back button; fixed in local working tree)
  - Order History & Buy Again: ✅ PASS (Re-order checks live API stock before cart addition; copy order ID works)
  - Parlour & Bridal Booking: 🟠 PARTIAL (Bridal lehenga has full in-app calendar modal; Beauty parlor only opens external WhatsApp)

### 2. Mobile App UI/UX Findings Matrix

| ID | Screen / Flow | Severity | Issue / Finding | Evidence | Suggested Fix |
|---|---|---|---|---|---|
| **APP-01** | `HomeScreen` (Navbar) | 🔴 **BLOCKER** | **Uncaught ReferenceError Crash**: Adding `<Menu .../>` sidebar icon without importing `Menu` from `lucide-react-native` crashed the entire home view. | `shagun-native/app/(tabs)/index.tsx:316` (Recorded in user browser console) | Remove or properly import and implement drawer/sidebar navigation. |
| **APP-02** | `CheckoutScreen` | 🔴 **BLOCKER** | **Empty Cart Checkout & Missing Back Navigation**: Screen rendered ₹30 delivery fee with 0 items, allowed placing a ₹30 ghost order, and trapped user without a back button. | `shagun-native/app/checkout.tsx:196-220` (Captured in user screenshot) | Enforce `if (cart.length === 0)` redirect/empty state and render top bar with back button across all view states. |
| **APP-03** | `HomeScreen` (Categories) | 🟠 **HIGH** | **Admin Count Badges Visible on Customer Home**: Product count badges (`Skin Care 19`, `Personal Care 7`) displayed to logged-in admin / staff on the storefront, cluttering consumer UI. | `shagun-native/app/(tabs)/index.tsx:398-402` | Remove category count badges completely from customer store view; keep inventory counts in Admin Dashboard only. |
| **APP-04** | `BeautyParlorScreen` | 🟠 **HIGH** | **Missing In-App Booking System**: Parlour screen does not integrate with `/api/appointments` or `/api/parlor-services`. It acts only as a static WhatsApp link generator. | `shagun-native/app/beauty-parlor.tsx:30-35` | Connect beauty parlour screen to existing `/api/appointments` booking flow. |
| **APP-05** | `SearchScreen` | 🟠 **HIGH** | **Unbounded Full-Catalog In-Memory Fetch**: Search screen loads all products via `api.getProducts()` and performs client-side JavaScript regex filtering rather than server pagination. | `shagun-native/app/search.tsx:64` | Migrate to debounced backend search query `/api/products?search=...` with pagination. |
| **APP-06** | `AutoScrollPoster` | 🟡 **MEDIUM** | **Carousel Horizontal Slide Calculation Mismatch on Web**: `slideWidth` defaults to `SCREEN_WIDTH - 32` before `onLayout` fires, causing scroll offsets to skip images on non-standard screen sizes. | `shagun-native/app/(tabs)/index.tsx:119-166` | Set CSS scroll-snap on web and initialize width to container layout dimensions. |
| **APP-07** | `LoginScreen` | 🟡 **MEDIUM** | **Forgot Password Routes to WhatsApp Chat**: Tapping "Forgot Password" opens an external WhatsApp link rather than triggering an email/SMS OTP reset flow. | `shagun-native/app/login.tsx:482-487` | Implement automated in-app OTP password reset flow. |
| **APP-08** | `OrdersScreen` (Buy Again) | ✅ **PASS** | **Intelligent Stock Re-validation**: "Buy Again" fetches real-time product data, verifies inventory availability, and warns user if prior items are out of stock. | `shagun-native/app/(tabs)/orders.tsx:137-175` | Production-ready. |
| **APP-09** | `AccountScreen` (Addresses) | ✅ **PASS** | **Complete Address CRUD**: Adding, editing, deleting, and selecting default address works with instant backend persistence. | `shagun-native/app/(tabs)/account.tsx:115-180` | Production-ready. |


---

## Phase 5: Customer Web Version Audit

### 1. Test Summary
- **Web Stack**: React 18 + Vite + React Router DOM v6 + Tailwind CSS
- **Responsive Viewports Evaluated**: Desktop (1440px), Laptop/Tablet Landscape (1024px), Tablet Portrait (768px), Mobile Viewport (375px)
- **Pages Audited**: 11 / 11 pages (`Home`, `Shop`, `Cart`, `Checkout`, `Orders`, `Account`, `Login`, `BeautyParlor`, `BridalLehenga`, `PrivacyPolicy`, `NotFound`)
- **Web vs Mobile Data Parity**: ✅ PASS. Products, pricing, discount percentages, stock levels, and order history retrieve identical data models from `/api`.

### 2. Customer Web Findings Matrix

| ID | Page / Area | Severity | Issue / Finding | Evidence | Suggested Fix |
|---|---|---|---|---|---|
| **WEB-01** | Routing / SEO (`/`) | 🔴 **BLOCKER** | **Forced Login Redirect on Homepage**: `App.tsx` forces unauthenticated visitors from `/` to `/login` immediately. Search engine bots (Googlebot) and new visitors are bounced away, preventing organic search indexing. | `App.tsx:61-66` (`navigate('/login', { replace: true })`) | Remove welcome gate redirect; allow guest browsing with non-intrusive modal or banner on checkout. |
| **WEB-02** | `Checkout.tsx` | 🔴 **BLOCKER** | **Empty Cart Order Submission**: Visiting `/checkout` directly with 0 cart items allows submitting the order form, creating a ₹30 ghost order on the backend. | `pages/Checkout.tsx:160-200` | Redirect empty carts to `/shop` with notification: `if (cart.length === 0) return <Navigate to="/shop" />`. |
| **WEB-03** | `IntroOverlay` / LCP | 🟠 **HIGH** | **3.6-Second Mandatory Splash Screen Blocks LCP**: `IntroOverlay.tsx` displays a full-screen blocking animation for 3600ms before revealing content, causing high bounce rates and failing Lighthouse Core Web Vitals. | `components/IntroOverlay.tsx:8-12` | Remove blocking overlay or reduce to a non-blocking subtle micro-animation (<300ms). |
| **WEB-04** | SEO Infrastructure | 🟠 **HIGH** | **Missing `robots.txt` and `sitemap.xml`**: `/public` directory lacks standard crawling instructions and dynamic XML sitemap, hindering indexation across Google, Bing, and AI search engines. | Directory `public/` | Generate static or server-generated `robots.txt` and `sitemap.xml`. |
| **WEB-05** | Privacy & DPDP | 🟡 **MEDIUM** | **Missing Cookie / Storage Consent Banner**: Web app writes persistent session tokens and tracking state to `localStorage` without prior user consent. | `context/AuthContext.tsx` | Implement lightweight cookie and local storage notice compliant with DPDP guidelines. |
| **WEB-06** | `BridalLehenga.tsx` | 🟡 **MEDIUM** | **Aggressive 2.5s Polling Interval**: Bridal lehenga view polls `/api/rentals` every 2500ms via `setInterval()`, wasting network bandwidth and battery on mobile browsers. | `pages/BridalLehenga.tsx:28` | Replace polling with conditional refresh or increase polling interval to 30–60 seconds. |
| **WEB-07** | Accessibility (A11y) | ✅ **PASS** | **Skip to Content Link & Semantic Landmarks**: `App.tsx` includes an accessible skip-link `#main-content`, and forms feature labeled inputs with keyboard navigation support. | `App.tsx:75` | Compliant with WCAG 2.4.1. |
| **WEB-08** | Wildcard Error Page | ✅ **PASS** | **Responsive 404 Route**: `NotFound.tsx` gracefully catches unmapped URLs and provides direct return navigation to Home and Shop. | `pages/NotFound.tsx:1-31` | Production-ready. |


---

## Phase 6: Admin Side Audit (Web & Mobile Portals)

### 1. Test Summary
- **Admin Portals Audited**:
  - Web Admin Dashboard (`pages/admin/AdminDashboard.tsx` — 2,102 lines)
  - Mobile Admin Dashboard (`shagun-native/app/admin/dashboard.tsx` — 453 lines)
- **Role & Route Protection**: Evaluated `ProtectedRoute adminOnly` on Web and `isAdmin` hook check on Mobile.
- **Cross-System Sync**: Tested order status updates, price mutations, and live client propagation.

### 2. Admin Side Findings Matrix

| ID | Area / Module | Severity | Issue / Finding | Evidence | Suggested Fix |
|---|---|---|---|---|---|
| **ADM-01** | Banners & Offers | 🔴 **BLOCKER** | **Missing Admin Management for Banners & Coupons**: No admin UI exists to upload, reorder, schedule, or toggle banners or promotional coupons. Banners are hardcoded in frontend arrays (`index.tsx:28`). | `pages/admin/AdminDashboard.tsx:46` | Build dynamic Banners & Coupons management tab linked to `/api/banners` and `/api/coupons`. |
| **ADM-02** | Brand Management | 🔴 **BLOCKER** | **Unmounted Brand Routes & Missing Brand CRUD**: Brands cannot be added, edited, or deleted in admin portal; backend `brandRoutes.js` is unmounted in `server.js`. | `backend/server.js:79-90` & `AdminDashboard.tsx` | Mount `app.use('/api/brands', brandRoutes)` in `server.js` and add brand management table in admin portal. |
| **ADM-03** | Delivery Configuration | 🟠 **HIGH** | **Hardcoded Delivery Thresholds**: Free delivery cutoff (₹399) and delivery fee (₹30) are hardcoded across multiple client files instead of driven by the Admin Delivery Settings DB model. | `cart.tsx:44`, `Checkout.tsx:70`, `checkout.tsx:196` | Connect admin delivery strip settings to cart and checkout calculations via `/api/settings`. |
| **ADM-04** | Reviews Moderation | 🟠 **HIGH** | **Zero Reviews Moderation Capability**: Admin panel lacks a Reviews tab to inspect, approve, reject, or hide abusive product reviews submitted by users. | `AdminDashboard.tsx:46` | Implement admin review moderation grid with status toggles (`approved` / `hidden`). |
| **ADM-05** | Deletion Safety | 🟠 **HIGH** | **Irreversible Hard Deletes Without Audit Log**: Deleting products or rentals performs immediate unrecoverable `findByIdAndDelete()` without soft-deletion or an audit log trail. | `AdminDashboard.tsx:294` | Replace hard delete with `isDeleted: true` soft-delete and record admin user audit logs. |
| **ADM-06** | Mobile Admin Scope Gap | 🟡 **MEDIUM** | **Mobile Admin Dashboard Missing Rentals & Services**: Mobile admin portal only supports `orders`, `products`, `users`; rentals, bridal calendar, and parlour bookings are absent. | `shagun-native/app/admin/dashboard.tsx:13` | Add Rentals and Parlour tabs to mobile admin dashboard for feature parity with web. |
| **ADM-07** | Order Status Transitions | ✅ **PASS** | **Live Order Updates & Customer Push Dispatch**: Updating order status to Packed / Out for Delivery immediately dispatches push notifications and updates client timelines. | `AdminDashboard.tsx:310-325` | Production-ready. |
| **ADM-08** | Product Form & Image Upload | ✅ **PASS** | **Product CRUD with Cloudinary Upload**: Creating and editing products with MRP, price, stock, category, and Cloudinary image upload works cleanly. | `AdminDashboard.tsx:230-285` | Production-ready. |


---

## Phase 7: Performance & Reliability Audit

### 1. Concurrency & Latency Benchmark (50 Concurrent Requests)
- **Harness**: Staging in-memory MongoDB + Node.js HTTP load simulation (50 concurrent requests per endpoint).
- **Latency Results**:
  - `GET /api/products` (30 products): **p50 = 158.3ms**, **p95 = 188.5ms**, Min = 133.2ms, Max = 194.6ms
  - `GET /api/products?search=nivea`: **p50 = 123.7ms**, **p95 = 133.9ms**, Min = 59.2ms, Max = 138.5ms
  - `GET /api/categories/sections`: **p50 = 318.2ms**, **p95 = 336.2ms**, Min = 244.2ms, Max = 339.7ms
  - `GET /api/orders/myorders` (Auth): **p50 = 270.4ms**, **p95 = 282.2ms**, Min = 235.4ms, Max = 284.4ms

### 2. Performance & Reliability Findings Matrix

| ID | Area / Component | Severity | Finding | Evidence | Remediation |
|---|---|---|---|---|---|
| **PRF-01** | Category Auto-Seed | 🔴 **BLOCKER** | **Concurrent Auto-Seed Race Condition Crash**: When multiple concurrent requests hit `GET /api/categories/sections` while the collection is empty, all workers simultaneously invoke `insertMany()`, throwing `MongoBulkWriteError: E11000 duplicate key error`. | `categoryRoutes.js:147-154` (Verified under 50 concurrent requests) | Remove automatic write-on-read; perform collection seeding during server startup or explicit migration script. |
| **PRF-02** | Product Search & Pagination | 🟠 **HIGH** | **Unindexed Regex Full Collection Scans**: Product search uses unindexed `$regex` full-table scans with zero pagination (`limit`/`skip`), creating CPU spikes and quadratic latency growth as catalog expands. | `productRoutes.js:25-35` | Implement MongoDB Text Index on `name` & `description` with mandatory cursor pagination (`limit: 20`). |
| **PRF-03** | Web Background Polling | 🟠 **HIGH** | **Uncapped 2.5s Polling on Bridal Lehenga Screen**: `BridalLehenga.tsx` executes continuous background polling (`setInterval 2500ms`), causing client battery drain and unnecessary server load. | `pages/BridalLehenga.tsx:28` | Use WebSocket or server-sent events for live availability, or poll only on window focus. |
| **PRF-04** | N+1 Query Prevention | ✅ **PASS** | **Batched Population on Orders**: `Order.find().populate('items.product')` compiles to single batched `$in` queries across Mongoose, avoiding N+1 database roundtrips. | `orderRoutes.js:50` | Efficient query structure. |
| **PRF-05** | Timer Teardown | ✅ **PASS** | **Clean Interval Teardown on Carousel**: Mobile `AutoScrollPoster` reliably clears its slide interval on unmount (`clearInterval(timerRef.current)`), preventing background memory leaks. | `shagun-native/app/(tabs)/index.tsx:141` | Production-ready. |
