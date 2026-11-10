# Shagun Mart: Manual UI & Integration Test Plan

This manual verification plan tests all frontend screens and backend integration flows on **Staging** before public launch.

---

## 0. Exact Commands to Run Staging Locally

### A. Run Staging Backend & Web
Open PowerShell in the project directory:
```powershell
# 1. Start Local Staging Server (Backend + Staging MongoDB + Seed Data)
cd c:\Users\raman\Downloads\shagun-general-store
$env:PORT = "5000"
$env:NODE_ENV = "development"
$env:ALLOW_TEST_OTP = "true"
$env:JWT_SECRET = "staging_jwt_secret_shagun_mart_2026_test"
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/shagun_staging"
node backend/server.js

# 2. In a NEW terminal, start Customer Web (Vite)
cd c:\Users\raman\Downloads\shagun-general-store
npm run dev
# Web opens at: http://localhost:5173
```

### B. Run Mobile App on Phone or Android Emulator
Open a third terminal:
```powershell
cd c:\Users\raman\Downloads\shagun-general-store\shagun-native
npx expo start
```
- Press `a` to open Android Emulator, or scan the QR code using Expo Go on your physical phone (ensure your phone is on the same local Wi-Fi).

---

## 1. Step-by-Step Manual Test Checklist

### 1.1 Admin Dashboard: Banners Management
- [ ] **Action:** Log into Web Admin at `http://localhost:5173/admin` -> Open **🖼️ Banners** tab.
- [ ] **Expected Result:**
  - Existing banners render with thumbnail, title, target, placement tags, and Active toggle.
  - Click **Add New Banner**: Form opens. Title (max 80 chars), target dropdown (`category`, `product`, `offers`, `none`), placement checkboxes (`app_home`, `web_home`, `offers`).
  - Upload an image (<5MB) or enter Cloudinary URL. Click **Save Banner**.
  - New banner appears immediately in list.
  - Click **Move Up / Down**: Ordering changes and persists across page refresh.
  - Toggle Active button: Status switches between Active / Inactive without reload.

### 1.2 Admin Dashboard: Coupons Management
- [ ] **Action:** In `/admin`, open **🏷️ Coupons** tab.
- [ ] **Expected Result:**
  - Click **Create Coupon**. Enter Code `WELCOME10`, Type `flat`, Value `50`, Min Order `200`, Usage Limit Total `10`, Per User `1`. Check `Active` and `Public Offer`.
  - Click **Save Coupon**: Coupon appears in the table.
  - Click **View Redemptions**: Shows current used count and redemption history.

### 1.3 Admin Dashboard: Brands Management
- [ ] **Action:** In `/admin`, open **✨ Brands** tab.
- [ ] **Expected Result:**
  - Click **Add New Brand**. Enter Name `Lakmé`, auto-generated slug `lakme`. Upload logo. Save.
  - If a brand is deleted while products are linked to it, system shows warning and deactivates it instead of hard deletion.

### 1.4 Web & App Home: Poster Carousel & "Brands You Love"
- [ ] **Action:** Open Web Home (`http://localhost:5173/`) and Mobile App Home screen.
- [ ] **Expected Result:**
  - **Poster Carousel:** Auto-scrolls smoothly; width is responsive (328dp on 360dp mobile phone, 1024px on desktop). Tapping an active banner navigates to its assigned target route.
  - **Brands You Love:**
    - If 0 active brands with products exist: section is **completely hidden** (no empty container or broken UI).
    - If active brands with products exist: horizontal row renders with logos and brand names.
    - Tapping a brand opens `/shop?brand=<slug>` with products pre-filtered for that brand.

### 1.5 Cart: Guest-to-Login Persistence & Coupon Application
- [ ] **Action:** Open Web or App as a **guest** (logged out).
- [ ] **Expected Result:**
  - Add 2 products to cart. Cart counter increases. Close tab/app and reopen: cart items persist locally.
  - Proceed to Checkout -> Redirected to Login with a prompt to authenticate.
  - Log in with account: redirected back to Checkout/Cart with the 2 guest items intact.
  - In Cart, enter coupon `WELCOME10` and click **Apply**:
    - If subtotal < minOrderAmount: Clean message `"Minimum order amount of ₹... required"`.
    - If valid: Instant green badge showing `"₹50 discount applied"`, subtotal and total update correctly.
  - Click **Remove Coupon**: Total restores to full price immediately.

### 1.6 Password Reset Flow
- [ ] **Action:** On Login screen, click **Forgot Password?**.
- [ ] **Expected Result:**
  - Enter email address (e.g. `ramanvishwari+smoketest@gmail.com`).
  - Screen displays generic verification message (no account enumeration).
  - Check your real inbox: Single-use 6-digit OTP email arrives from "Shagun Mart" with clean HTML styling.
  - Enter 6-digit OTP and new password:
    - Entering 5 wrong OTPs shows account locked error for 15 minutes.
    - Entering valid OTP resets password, logs in user, and revokes prior JWT tokens.

### 1.7 Parlour Booking Flow
- [ ] **Action:** Navigate to Beauty Parlour screen (`/beauty-parlor` on web or app).
- [ ] **Expected Result:**
  - Select service (e.g. "Bridal Makeup") -> pick an upcoming date -> pick an available time slot.
  - Past dates are disabled.
  - Confirm booking: Appointment creates successfully.
  - Attempt to book the same service/date/slot in another tab: Rejected with 409 Conflict `"Slot just taken"`.

### 1.8 Bridal Lehenga Rental Flow
- [ ] **Action:** Navigate to Bridal Lehenga screen (`/bridal-lehenga`).
- [ ] **Expected Result:**
  - View lehenga catalog. Click a lehenga -> select rental date range (start date & return date).
  - Submit booking inquiry: Rental booking records in database and appears in Admin Dashboard under **Lehenga Rentals**.

### 1.9 Order Creation & Cancellation
- [ ] **Action:** Place a COD order with coupon `WELCOME10`.
- [ ] **Expected Result:**
  - Order creates with status `Processing`. Discount and delivery fee calculated authoritatively by server.
  - Store admin receives notification alert.
  - In Admin Dashboard (`/admin` -> Orders), update order status to `Cancelled`.
  - Product stock increments back, coupon `usedCount` decrements, and redemption record is cleared so user can re-use the coupon.

### 1.10 Account Deletion Flow (Customer Web & Mobile App)
- [ ] **Web Action:**
  - Log into Customer Web (`/account`).
  - Scroll down to the bottom **Danger Zone** card.
  - Observe link to `/delete-account` (Account Deletion Info page). Click link and verify retention policies display clearly with no broken styling.
  - Return to `/account`. Click **Delete Account** button. Modal appears prompting for current password.
  - Enter wrong password -> error `"Incorrect password. Account deletion aborted."` appears.
  - If user has active orders (Processing/Packed/Out for Delivery) or upcoming appointments: clean rejection message blocks deletion.
  - Enter correct password and confirm:
    - User is logged out immediately and redirected to `/`.
    - Refresh `/account` -> Redirected to `/login` (session tokenVersion invalidated).
- [ ] **App Action:**
  - Open Mobile App -> Account tab (`/(tabs)/account`).
  - Scroll to bottom and tap **Delete Account**.
  - Confirmation alert dialog appears explaining permanent removal.
  - Tap **Delete Permanently**: Account deleted, storage cleared, and returned to logged-out state.

### 1.11 Policy Pages & Footer Navigation Verification (Customer Web)
- [ ] **Action:** On Home page (`/`), scroll down to the 4-column footer.
- [ ] **Expected Result:**
  - Column 1: **SHAGUN MART** brand badge and mission.
  - Column 2: **Quick Links** (Home, Shop Products, Bridal Lehenga Rentals, Beauty Parlor, My Orders).
  - Column 3: **Policies & Legal** contains clickable links:
    - `Terms & Conditions` -> navigates to `/terms`
    - `Refund & Cancellation` -> navigates to `/refund-policy`
    - `Shipping & Delivery` -> navigates to `/shipping-policy`
    - `Rental Terms` -> navigates to `/rental-terms`
    - `Privacy Policy` -> navigates to `/privacy`
    - `Account Deletion Info` -> navigates to `/delete-account`
  - Column 4: **Contact Us** displays phone `+91 88272 59023`, address `Bamitha, Madhya Pradesh`, store hours `Mon–Sat: 9am – 9pm`, and link to `/contact-us`.
  - Each page displays the plain text draft disclaimer banner: `"Draft — pending final review by owner and legal counsel"`.

### 1.12 UPI Intent Payments Flow (Customer Web, Mobile App & Admin)
- [ ] **A. Web Desktop Checkout & QR Display:**
  - Add items to cart and proceed to Checkout (`/checkout`).
  - Select **UPI Instant Payment** radio option.
  - Click **Place Order**.
  - Navigates to `/confirming-payment/:orderId`.
  - Verify desktop view displays client-rendered QR code with `"Scan with any UPI App"`, amount, and order ID.
  - Verify countdown timer shows remaining window (30 minutes).
  - Verify warning banner: *"If money was debited, enter your UTR, do not pay again"*.
- [ ] **B. Mobile Web & App Intent Launch:**
  - Open on mobile browser or Expo app on physical device.
  - Select **UPI Instant Payment** -> Click Place Order.
  - Automatically triggers UPI intent (`upi://pay?...`) opening installed UPI apps (GPay, PhonePe, Paytm, BHIM).
  - If no UPI app installed: verify clear notice dialog displays without app crash and user remains on Confirming Payment screen.
- [ ] **C. Retry Payment:**
  - On Confirming Payment screen, click **Retry Payment**.
  - Verifies that it reopens the exact same order with the same transaction reference (`tr`).
- [ ] **D. UTR Entry & Verification:**
  - Enter invalid UTR (e.g., `12345` or letters) -> error message explains UTR must be exactly 12 numeric digits.
  - Enter valid 12-digit UTR (e.g., `512345678901`) -> submit.
  - Status updates immediately to **Verifying**.
  - Store admin receives notification alert (push / ntfy).
- [ ] **E. Admin Approval & Idempotency:**
  - Admin logs in at `/admin` -> Opens **UPI Payments** tab.
  - Order appears in `Needs Verification` filter list showing customer name, amount, order ID, and submitted UTR.
  - Click **Approve Payment** -> Confirmation modal displays -> Confirm.
  - Status transitions to **Paid**.
  - In Customer Confirming Screen or Orders list, status updates to **Paid** (green checkmark).
- [ ] **F. Expiry & Late Payment Flow:**
  - Place an order and allow/simulate the 30-minute timer expiration without submitting UTR.
  - Order status transitions to **Expired** and reserved stock is released.
  - Submit UTR on the expired order -> order updates to **Late Payment** with message: *"We received your reference and are checking it."*
  - In Admin `/admin` UPI Payments tab:
    - Admin sees order marked **Late Payment**.
    - If stock is still available: admin clicks **Reinstate** -> stock is re-reserved and order returns to **Verifying** for approval.
    - If item is out of stock: admin clicks **Refund Needed** -> prompts for refund note and marks order as **Refund Needed**.
- [ ] **G. UPI App Matrix Verification (Test Each App):**
  - **Google Pay:**
    - [ ] Result: `[Pass / Warning / Blocked]`
    - [ ] Exact message / behavior: `[FILL: note message or behavior, e.g. opened intent successfully / bank selector displayed]`
  - **PhonePe:**
    - [ ] Result: `[Pass / Warning / Blocked]`
    - [ ] Exact message / behavior: `[FILL: note message or behavior]`
  - **Paytm:**
    - [ ] Result: `[Pass / Warning / Blocked]`
    - [ ] Exact message / behavior: `[FILL: note message or behavior]`
  - **BHIM:**
    - [ ] Result: `[Pass / Warning / Blocked]`
    - [ ] Exact message / behavior: `[FILL: note message or behavior]`
- [ ] **H. Edge Case & Failure Mode Verification:**
  - [ ] **App Kill & Reopen:** Force kill mobile app while on Confirming Payment screen; reopen app -> verifies app/Orders restores confirming screen for the active order with the exact same `tr`.
  - [ ] **Back Navigation:** Tap device back button from Confirming Payment screen -> verifies order remains preserved in Orders list as Pending/Verifying.
  - [ ] **Two Phones / Single Account:** Log in on two devices simultaneously; submit UTR on Phone A -> Phone B reflects `Verifying` upon next poll/refresh.
  - [ ] **Slow / Flaky Network:** Throttle connection to 3G during UTR submission -> verify loading indicator prevents duplicate taps and retry succeeds.
  - [ ] **Invalid UTR Formats:** Enter UTR with letters (e.g., `1234ABCD5678`) or 11 digits (e.g., `12345678901`) -> verify client and server reject with *"12 numeric digits"* error.
  - [ ] **Live Expiry:** Keep Confirming screen open until timer reaches `0:00` -> screen updates to Expired state and reveals late payment handling.
  - [ ] **No UPI App on Phone:** On a device/emulator with no UPI apps installed, tap pay -> shows "No UPI app found" alert and offers COD or manual UTR route.
  - [ ] **Desktop Web View:** Open on desktop browser -> renders browser-side QR canvas cleanly without trying to launch an unhandled system `upi://` protocol.




