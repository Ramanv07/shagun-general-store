# Shagun Mart: Production Release Runbook

**Target Systems:** Express + MongoDB Atlas Backend, Customer Web (Vite/Tailwind), Admin Dashboard, Mobile App (React Native Expo Router).  
**Document Status:** Ready for Production Deployment Planning.  
**Rule:** Strictly follow the phased steps below. Do not skip phases or run scripts out of order.

---

## Executive Summary: Exact Deployment Sequence
Follow this strict 6-step sequence for production release:
1. **Rotate Keys:** Rotate Atlas DB password, `JWT_SECRET`, Cloudinary secrets, and Gmail SMTP credentials.
2. **Scrub History on Fresh Mirror Clone:**
   - Hosting builds automatically from branch `main` (Vercel / EAS default).
   - **CRITICAL:** Do NOT merge `release-v1.0.0` into `main` until git history is scrubbed and key rotation is completed.
   - Run history scrub on a fresh mirror clone with a saved backup, removing all `.env*` and `backend/backups/`. Re-create tags afterwards.
3. **Force Push Sanitized History:** Push sanitized commit tree to private remote repository.
4. **Merge to Main:** Merge verified `release-v1.0.0` into `main`.
5. **Tag Release:** Create signed/annotated git release tag:
   ```bash
   git tag -a v1.0.0 -m "Production release v1.0.0 (Waves 1-4 hardened)"
   git push origin v1.0.0
   ```
6. **Deploy Services in Order:**
   - Step A: Deploy Backend service (run migrations & verify health checks).
   - Step B: Deploy Web Frontend to hosting (`npm run check:launch` passes, Vite build with production API URL).
   - Step C: Verify old mobile clients against backend endpoints (read-only / backward-compatible).
   - Step D: Build & submit mobile app via EAS (`eas build --platform all --profile production`).

---

## Phase 0: Security & Operational Pre-Flight

Before touching production infrastructure, complete and verify these 7 pre-flight tasks:

1. **Credentials & Secrets Rotation (Atlas & Host Settings)**:
   - Rotate MongoDB Atlas database password in Atlas Console to a strong 32-character random string.
   - **Atlas Network Access Decision:**
     - If backend host provides **static outbound IPs**, restrict Atlas Network Access strictly to those host IPs.
     - If host uses dynamic outbound IPs (e.g. Render/Railway default container pool), keep `0.0.0.0/0` with a dedicated least-privilege Atlas database user restricted to `readWrite` on `<DB_NAME>` only.
   - Rotate `JWT_SECRET` (logs out all existing sessions).
   - Rotate Cloudinary API Secret and external service keys.

2. **Git History Scrubbing & Repository Privacy (Fresh Mirror Clone Procedure)**:
   - Hosting builds from `main` by default. **DO NOT merge into `main` until history is scrubbed and keys rotated.**
   - Step 2a: Save a safety backup of the working directory outside git.
   - Step 2b: Create a fresh bare mirror clone in an external directory:
     ```bash
     cd C:\Users\raman\backups
     git clone --mirror https://github.com/Ramanv07/shagun-general-store.git repo-mirror.git
     cd repo-mirror.git
     ```
   - Step 2c: Scrub all `.env*` files and `backend/backups/` from all commits:
     ```bash
     # Using git-filter-repo (recommended):
     python -m git_filter_repo --invert-paths --path-glob ".env*" --path-glob "backend/backups/*" --path-glob "*.env" --force
     ```
   - Step 2d: Re-create any needed release tags and push sanitized history:
     ```bash
     git push --force --mirror origin
     ```
   - Confirm repo is set to **Private** on GitHub.

3. **Pre-Deployment Launch Readiness Check**:
   - Before compiling production web assets, verify all draft placeholders are resolved:
     ```bash
     node scripts/check_launch_ready.js
     ```
   - The build script fails if any `[FILL: ...]` placeholder or `"Draft —"` banner remains in `pages/` or `dist/`. Remove draft banners and replace all placeholders with actual legal/business parameters prior to launch.
3. **Database Identity & 28-Product Pre-Check**:
   - Extract and verify the database name from `$MONGODB_URI` before any operation:
     ```bash
     node -e "
       const uri = process.env.MONGODB_URI;
       if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }
       const dbName = new URL(uri.replace('mongodb+srv://', 'http://')).pathname.replace('/', '').split('?')[0];
       console.log('Target Database Name:', dbName);
       const mongoose = require('mongoose');
       mongoose.connect(uri).then(async () => {
         const count = await mongoose.connection.db.collection('products').countDocuments();
         console.log('Product Count in DB:', count);
         if (count !== 28) { console.error('ABORT: Expected exactly 28 products'); process.exit(1); }
         process.exit(0);
       });
     "
     ```
4. **Database Cold Backup (Stored OUTSIDE the Repository)**:
   - Run mongodump using the environment variable (never typing secrets inline) into an external directory (e.g. `C:\Users\raman\backups\shagun-prod-prelaunch`):
     ```bash
     # PowerShell:
     mongodump --uri="$env:MONGODB_URI" --out="C:\Users\raman\backups\pre-launch-$(Get-Date -Format 'yyyyMMddHHmmss')"
     
     # Linux / macOS:
     mongodump --uri="$MONGODB_URI" --out="/path/to/external/backups/pre-launch-$(date +%Y%m%d%H%M%S)"
     ```
   - Verify the backup directory is non-empty and stored completely outside the project repository.
5. **Confirm STAGING_MONGODB_URI is Unset**:
   - Ensure `STAGING_MONGODB_URI` is NOT present in production host environment settings.

---

## Phase 1: Read-Only Duplicate Collision Checks & Migration Execution

Run migrations strictly via explicit scripts. Every unique index creation is preceded by a read-only query to detect collisions.

### Step 1.1: Single Source Collision Check
Run the automated check script against production database before running migrations:
```bash
node backend/scripts/check_collisions.js
```
This script checks the exact models and collections:
- `db.reviews`: fields `user_id` + `product_id`
- `db.wishlist_items`: fields `user_id` + `product_id`
- `db.appointments`: fields `serviceId` + `date` + `slot` (filtered on active `status: { $in: ['Pending', 'Confirmed', 'Completed'] }`)
- `db.users`: case-insensitive `email`

*Requirement:* All 4 checks must report `0` collisions before proceeding to Step 1.2.

### Step 1.2: Execute Migrations in Order
Run against production DB (with `APPROVE_LIVE_MIGRATION=true`):
1. **Unique Indexes Migration (`backend/migrations/001_unique_indexes.js`)**:
   ```bash
   APPROVE_LIVE_MIGRATION=true node backend/migrations/001_unique_indexes.js
   ```
   - *Verification:* Check index presence:
     - `db.reviews.getIndexes()` contains `user_id_1_product_id_1`
     - `db.wishlist_items.getIndexes()` contains `user_id_1_product_id_1`
     - `db.appointments.getIndexes()` contains `serviceId_1_date_1_slot_1`
     - `db.users.getIndexes()` contains `email_case_insensitive`
   - *Safe Rollback (drop by name):*
     - `db.reviews.dropIndex("user_id_1_product_id_1")`
     - `db.wishlist_items.dropIndex("user_id_1_product_id_1")`
     - `db.appointments.dropIndex("serviceId_1_date_1_slot_1")`
     - `db.users.dropIndex("email_case_insensitive")`
2. **Store Settings Seed (`backend/scripts/seed_store_settings.js`)**:
   ```bash
   node backend/scripts/seed_store_settings.js
   ```
   - *Verification:* `db.storesettings.find({ key: { $in: ["freeDeliveryThreshold", "deliveryFee"] } })` returns `399` and `30`.
   - *Safe Rollback:* `db.storesettings.deleteMany({ key: { $in: ["freeDeliveryThreshold", "deliveryFee"] } })`.
3. **Banners Production Setup (Do NOT run seed_banners.js in production)**:
   - `seed_banners.js` is for local staging only.
   - For production, log into Admin Web (`/admin` -> Banners) immediately after backend release.
   - Create the 3 promotional banners using the image upload tool (which stores hosted HTTPS URLs on Cloudinary).
   - *Verification:* `curl https://<YOUR_API_DOMAIN>/api/banners?placement=app_home` returns active banners with `https://res.cloudinary.com/...` URLs.
4. **Product Baseline Checksum Verification**:
   ```bash
   node backend/scripts/verify-checksum.cjs
   ```
   - *Mandatory verification:* Must match canonical SHA-256 `53fa1d92b6381474ede7c1a94240f62fba4e928a5c0e23657b57e661643b1c60` (28 products).

---

## Phase 2: Production Environment Variables & Server Hardening

### Required Production Environment Variables (Names Only)
- `PORT`
- `NODE_ENV` (`production` - server crashes at boot if unset)
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `VITE_SITE_URL`
- `VITE_API_URL` (web build-time API base URL)
- `GOOGLE_CLIENT_ID_WEB`
- `GOOGLE_CLIENT_ID_ANDROID`
- `GOOGLE_CLIENT_ID_IOS`
- `ADMIN_WHATSAPP`
- `NTFY_TOPIC`
- `CALLMEBOT_API_KEY`
- `TRUST_PROXY` (`1` or `true`)
- `OTP_CHANNEL` (`email` or `sms`)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM_NAME`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `FAST2SMS_API_KEY` (only if `OTP_CHANNEL=sms`)

### Flags That MUST Be Unset or False in Production
- `ALLOW_TEST_OTP`
- `ALLOW_TEST_GOOGLE_AUTH`
- `FORCE_SMS_DISPATCH`
- `OTP_CHANNEL=console`
- `STAGING_MONGODB_URI`

*Automated Boot Guard:* `backend/server.js` logs `[BOOT] Environment: production` and immediately halts (`process.exit(1)`) if any test flag is active or if `STAGING_MONGODB_URI` is detected.

### Proxy Configuration & Rate Limiting
- `app.set('trust proxy', 1)` is enabled in `backend/server.js` when `NODE_ENV=production` or `TRUST_PROXY=1`.
- If the host is a persistent container (e.g. Render Web Service, Railway, VPS, EC2), in-memory rate limiting operates correctly per instance. If deployed across multiple scaled instances or serverless functions, rate limits and OTP storage must be backed by Redis or MongoDB counters.

---

## Phase 3: Deployment Order & Backwards Compatibility

Deploy in strict sequence:
1. **Backend Server First**:
   - Zero breaking changes: all schema additions (`couponCode`, `discountAmount`, `isDeleted`, `brand`) are optional.
   - Verified backwards-compatible endpoints:
     - `GET /api/products` (without query params returns all products as legacy clients expect)
     - `POST /api/orders` (accepts legacy orders without coupons)
     - `GET /api/banners` (returns JSON array; app caches last known response)
     - `GET /api/brands/active-with-products` (additive endpoint)
2. **Web Frontend (Customer Web + Admin Dashboard)**:
   - Deploy build bundle generated via `npm run build` with `VITE_API_URL` set to production API.
   - Verify assets served with 1-year immutable cache headers, and `index.html` with `no-cache`.
3. **Mobile App**:
   - **Crucial Check:** Confirm `shagun-native` build bundle points to the **Production API URL** (never `localhost` or staging).
   - Release via EAS Build (Play Store AAB/APK) or EAS Update OTA.

---

## Phase 4: Production Smoke Test Checklist

Execute using an isolated test user account with a plus-address (e.g. `ramanvishwari+smoketest@gmail.com`).
*Note: Real admin WhatsApp alerts, ntfy push notifications, and emails will fire during order placement and password resets.*

1. **Pre-requisite Admin Setup**:
   - Log into Admin Web Dashboard (`/admin`).
   - Create coupon `WELCOME10` (`flat`, value `10`, min order `100`, limit per user `1`).
   - Confirm Admin Banners, Coupons, and Brands tabs render without errors.
2. **Authentication & Session**:
   - Register or log in with test plus-address email.
   - Verify 7-day JWT received with `tokenVersion`.
3. **Catalog Browsing & Assets**:
   - Browse Home, Shop, and Makeup spotlight.
   - Verify "Brands You Love" unhides only if active brands with products exist.
   - Verify banners display Cloudinary HTTPS images and navigate to in-app targets.
4. **Cart & Coupons**:
   - Add product to cart as guest -> verify cart persists -> log in -> cart preserved.
   - Apply coupon `WELCOME10` -> verify server-calculated discount reflects on checkout.
5. **Order Placement (Test COD Mode)**:
   - Complete order in COD mode -> verify `totalAmount` matches server prices + delivery fee.
   - Verify `CouponRedemption` created and `usedCount` incremented.
6. **Order Cancellation & Stock Restoration**:
   - Cancel the test order from user account or admin dashboard.
   - Verify coupon redemption is deleted, `usedCount` decremented, and product stock restored.
7. **Password Reset Dispatch**:
   - Trigger forgot-password for test account -> verify single-use OTP email arrives in your inbox.
   - Reset password -> verify login succeeds with new password and legacy sessions invalidated.
8. **Cleanup & Coupon Deactivation**:
   - Delete test order and test user from admin panel.
   - **Immediately deactivate or set `WELCOME10` usage limit to 1 and uncheck `Public Offer`** so public customers cannot claim the test coupon.

---

## Phase 5: Rollback Plan (<5 Minutes) & Post-Launch Safety

### Safe Rollback Procedure:
- **Target Git Tag:** Roll back host deployment to the last good git tag (e.g. `git checkout v1.0.0-release` or prior release tag).
- **Hard Rule:** **NEVER roll back to code from before Wave 1 (commit `9c1e7c8` or earlier), as doing so re-exposes known critical security bypasses and vulnerabilities.**
- **If No Good Tag Operates:** Serve a static maintenance page (`503 Service Unavailable`) while debugging rather than deploying unpatched legacy code.
- **Database Index Rollback (Safe Multi-User Procedure)**:
  - **Do NOT drop banners, coupons, or user collections** (old code safely ignores additive fields and collections).
  - Only drop newly created unique indexes by name if they cause conflicts with legacy clients:
    1. `db.reviews.dropIndex("user_id_1_product_id_1")`
    2. `db.wishlist_items.dropIndex("user_id_1_product_id_1")`
    3. `db.appointments.dropIndex("serviceId_1_date_1_slot_1")`
    4. `db.users.dropIndex("email_case_insensitive")`
  - *(Only during the first 5 minutes before public customer traffic:* `mongorestore --drop` of the Phase 0 cold backup is permissible if critical boot failure occurs.)

### 24-Hour Post-Launch Monitoring
1. Monitor server error logs for unhandled 500s or MongoDB connection spikes.
2. Monitor SMTP delivery failure alerts or rate-limiting from Gmail.
3. Check `AuditLog` records for admin mutations (product edits, status updates, settings).
4. Monitor customer checkout error rates and abandoned cart metrics.
