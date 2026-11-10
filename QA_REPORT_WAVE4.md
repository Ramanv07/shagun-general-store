# QA Report: Wave 4 Remediation (Admin Tools & Hardening)

**Date:** 2026-11-10  
**Target Environment:** STAGING ONLY (`mongodb://localhost:27017` / In-Memory Mock)  
**Git Branch:** `wave-4-admin-tools` (branched from `wave-3-features`)  
**Canonical Product Checksum:** `53fa1d92b6381474ede7c1a94240f62fba4e928a5c0e23657b57e661643b1c60` (28 products, 100% Match)

---

## 1. Executive Summary

All items specified under Wave 4 (Step A Hardening + Step B Admin Tools: B1 Banners, B2 Coupons, B3 Brands Admin) have been completed, verified against unit/integration regression suites, and built cleanly.

- **Total Test Suites:** 7 passed, 7 total
- **Total Tests:** 43 passed, 0 failed
- **Product Catalog Integrity:** Byte-identical (canonical checksum `53fa1d92...` preserved)
- **Production Build:** Vite production build passed cleanly (`vite v6.4.1` in 8.16s)
- **Security & Schema Invariants:** Zero PII logged, Cloudinary URLs enforced, open-redirects blocked on banner navigation, server-authoritative coupon calculation, and AuditLog recording on all admin mutations.

---

## 2. Scope & Implementation Breakdown

### Wave 4 Step A: Security Hardening & Layout Verification
1. **Forgot/Reset Password Hardening (`backend/routes/authRoutes.js`)**:
   - Generic 200 response returned whether an account exists or not (timing & enumeration attack defense).
   - Rate limiting: Max 10 requests/hour per IP, max 5 requests/hour per target email/phone.
   - Lockout policy: 5 consecutive wrong OTP attempts triggers a 15-minute account lock.
   - Single-use OTP: Code record deleted immediately upon successful reset; `tokenVersion` incremented on user model to invalidate legacy sessions.
2. **Unified OTP Delivery Layer (`backend/services/otpService.js`)**:
   - Clean channel abstraction (`OTP_CHANNEL=email` or `sms`).
   - Integrated `nodemailer` (1.68 MB) for standard SMTP / Gmail App Passwords.
   - Zero sensitive tokens or OTPs logged to console (`console.log` sanitization verified).
3. **W3-02 Layout Verification (`backend/tests/wave3_poster_layout.test.js`)**:
   - Proved mathematically and via unit tests that the home poster renders exactly 328 dp slide widths on standard 360 dp mobile devices (`width - 32`), and cleanly clamps at 1024 px on desktop viewports.

---

### Wave 4 Step B1: Dynamic Banners Engine
- **Model (`backend/models/Banner.js`)**:
  - `title` (optional, max 80 chars), `imageUrl` (required HTTPS Cloudinary or internal authorized asset), `placement` array (`app_home`, `web_home`, `offers`), `sortOrder`, `active`, `startAt`/`endAt` (IST validation), and constrained `target` (`type`: `none` | `category` | `product` | `brand` | `offers`).
  - Open redirects strictly blocked at schema and route level (free-text external URLs rejected).
- **Routes (`backend/routes/bannerRoutes.js`)**:
  - Public `GET /api/banners?placement=` with 60 s HTTP `Cache-Control` header, filtering only currently active in-schedule banners.
  - Admin CRUD endpoints (`/api/banners/admin`, `POST`, `PUT`, `DELETE`, `/reorder`) verifying admin role and recording before/after changes in `AuditLog`.
  - Max 10 active banners limit per placement enforced.
- **Client Integration**:
  - Web: Created `components/WebBannerCarousel.tsx` mounted in `pages/Home.tsx`.
  - App: Updated `AutoScrollPoster` in `shagun-native/app/(tabs)/index.tsx` to fetch `GET /api/banners?placement=app_home` with local cache fallback. If 0 banners return, section is hidden; if 1 banner returns, auto-scroll is disabled.
  - Admin UI: Created `pages/admin/AdminBanners.tsx` mounted as tab in `AdminDashboard.tsx`.
  - Seed Script: Created `backend/scripts/seed_banners.js`.

---

### Wave 4 Step B2: Coupons & Discounts Engine
- **Models (`backend/models/Coupon.js`, `backend/models/CouponRedemption.js`)**:
  - `code` (uppercase alphanumeric, 4–20 characters, unique), `type` (`percent` | `flat`), `value`, `maxDiscount` (cap for percentage discounts), `minOrderAmount`, `startAt`/`endAt`, `usageLimitTotal`, `usageLimitPerUser`, `usedCount`, `active`, `isPublic`, `description`.
  - `CouponRedemption` with unique index `{ order: 1 }` preventing duplicate application per order.
- **Routes (`backend/routes/couponRoutes.js`, `backend/routes/orderRoutes.js`)**:
  - Rate-limited `POST /api/coupons/validate` (auth required, 10/min) re-calculating subtotal from database prices and returning standardized error codes (`expired`, `not_started`, `below_minimum`, `limit_reached`, `already_used`, `inactive`).
  - Order creation accepts ONLY `couponCode` and computes the discount internally on server. Free delivery threshold checked against pre-discount subtotal.
  - Atomic increment of `usedCount` and redemption creation; releases redemption and decrements `usedCount` if order is cancelled.
- **Client Integration**:
  - Web: `pages/Cart.tsx` coupon entry with live validation; `pages/Checkout.tsx` forwards `couponCode`.
  - App: `shagun-native/services/api.ts` wired with `validateCoupon` and `getPublicCoupons`.
  - Admin UI: Created `pages/admin/AdminCoupons.tsx` mounted as tab in `AdminDashboard.tsx`.

---

### Wave 4 Step B3: Brands Catalog & Admin
- **Routes (`backend/routes/brandRoutes.js`)**:
  - `GET /api/brands/active-with-products`: Aggregate pipeline returning only active brands that have at least 1 non-deleted product attached.
  - Admin CRUD (`/api/brands/admin`, `POST`, `PUT`, `DELETE` with automatic soft deactivation if products are linked, plus `AuditLog` logging).
- **Client Integration**:
  - Web: Created `components/BrandsYouLove.tsx` mounted in `pages/Home.tsx`. Completely hidden if 0 brands return. Tapping navigates to `/shop?brand=<slug_or_id>`.
  - Web Shop: `pages/Shop.tsx` enhanced to read `?brand=` query parameter and filter products.
  - Mobile App: `shagun-native/app/(tabs)/index.tsx` unhides "Brands You Love" horizontal row when active brands exist; `shagun-native/app/(tabs)/shop.tsx` filters by brand.
  - Admin UI: Created `pages/admin/AdminBrands.tsx` mounted as tab in `AdminDashboard.tsx`.

---

## 3. Test Suites & Verification Results

### Backend Jest Test Suites (Waves 1 to 4)
```text
PASS tests/wave3_poster_layout.test.js
PASS tests/wave4_banners.test.js
PASS tests/wave4_brands.test.js
PASS tests/wave4_coupons.test.js
PASS tests/wave2_high_priority.test.js
PASS tests/wave1_blockers.test.js
PASS tests/wave3_features.test.js

Test Suites: 7 passed, 7 total
Tests:       43 passed, 43 total
Snapshots:   0 total
Time:        4.862 s
```

### Canonical Product Checksum
```text
Product Count: 28
Raw SHA-256: f792b316b6a0b6870085c483cdaf356d3c240ddaa8b66f581498a285cd816e9c
Canonical SHA-256: 53fa1d92b6381474ede7c1a94240f62fba4e928a5c0e23657b57e661643b1c60
STATUS: VERIFIED (100% Exact Match)
```

### Frontend Build
```text
vite v6.4.1 building for production...
✓ 1961 modules transformed.
dist/index.html                   2.69 kB │ gzip:   0.97 kB
dist/assets/index-DKm7BfXj.css   83.68 kB │ gzip:  14.00 kB
dist/assets/three-DXdpvkCx.js     1.16 kB │ gzip:   0.70 kB
dist/assets/vendor-LPPOjioc.js  163.72 kB │ gzip:  53.59 kB
dist/assets/index-dwVElNsb.js   508.43 kB │ gzip: 110.07 kB
✓ built in 8.16s
```

---

## 4. How to Send ONE Real Test Reset Email (User Action)

To test live dispatch with your Gmail App Password, run the dedicated test script:

### Windows PowerShell:
```powershell
$env:SMTP_HOST = "smtp.gmail.com"
$env:SMTP_PORT = "465"
$env:SMTP_USER = "your_actual_email@gmail.com"
$env:SMTP_PASS = "your_16_char_app_password"
$env:MAIL_FROM_NAME = "Shagun Mart"
node backend/scripts/send_test_email.js recipient_email@example.com
```

### Linux / macOS:
```bash
SMTP_HOST="smtp.gmail.com" \
SMTP_PORT="465" \
SMTP_USER="your_actual_email@gmail.com" \
SMTP_PASS="your_16_char_app_password" \
MAIL_FROM_NAME="Shagun Mart" \
node backend/scripts/send_test_email.js recipient_email@example.com
```

*Note: The script verifies SMTP authentication, delivers a real 6-digit verification code, and masks all email logs.*

---

## 5. Migration & Seed Scripts to Run

The following migration scripts must be executed on staging:
1. `node backend/scripts/seed_store_settings.js` — seeds default delivery thresholds (`freeDeliveryThreshold: 399`, `deliveryFee: 30`).
2. `node backend/scripts/seed_banners.js` — imports legacy hardcoded banners into the `banners` collection.

---

## 6. Git Diff Statistics

```text
 backend/models/Order.js            |   2 +
 backend/routes/brandRoutes.js      | 183 +++++++++++++++++++++++++++++---
 backend/routes/orderRoutes.js      |  57 +++++++++-
 backend/server.js                  |   4 +
 pages/Cart.tsx                     |  43 +++++---
 pages/Checkout.tsx                 |   6 +-
 pages/Home.tsx                     |  10 ++
 pages/Shop.tsx                     |  16 ++-
 pages/admin/AdminDashboard.tsx     |  17 ++-
 shagun-native/app/(tabs)/index.tsx | 210 +++++++++++++++++++++++++++++++------
 shagun-native/app/(tabs)/shop.tsx  |   4 +-
 shagun-native/services/api.ts      |  54 ++++++++++
 12 files changed, 540 insertions(+), 66 deletions(-)
```

### Untracked Files Added in Wave 4:
- `backend/models/Banner.js`
- `backend/models/Coupon.js`
- `backend/models/CouponRedemption.js`
- `backend/routes/bannerRoutes.js`
- `backend/routes/couponRoutes.js`
- `backend/scripts/seed_banners.js`
- `backend/scripts/send_test_email.js`
- `backend/tests/wave4_banners.test.js`
- `backend/tests/wave4_brands.test.js`
- `backend/tests/wave4_coupons.test.js`
- `components/BrandsYouLove.tsx`
- `components/WebBannerCarousel.tsx`
- `pages/admin/AdminBanners.tsx`
- `pages/admin/AdminBrands.tsx`
- `pages/admin/AdminCoupons.tsx`
- `QA_REPORT_WAVE4.md`

