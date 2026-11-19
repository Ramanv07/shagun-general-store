# Google Play Data Safety & Policy Declarations (Shagun Mart)

## 1. Overview & Encryption
- **Encrypted in Transit:** YES. All network traffic between the mobile application and the backend server uses HTTPS / TLS 1.3 encryption.
- **Independent Security Review:** [FILL: "No" for standard personal developer accounts, or "Yes" if an external MASA audit was performed].
- **Data Deletion Mechanism:** YES. 
  - In-App self-service deletion: **Account > Delete Account** (`POST /api/auth/delete-account` / `DELETE /api/auth/profile`).
  - Web deletion page: `https://www.shagunmart.shop/delete-account` (available without keeping the app installed).

---

## 2. Data Types Collected & Declared

| Data Category | Data Field | Collected / Shared | Purpose | Ephemeral / Stored | Deletion Available |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Personal Info** | Name | Collected, Not Shared | Account management, order delivery | Stored until account deletion | Yes |
| **Personal Info** | Email address | Collected, Shared with Email Provider (Nodemailer/SMTP) for OTP & password reset | Account management, authentication | Stored until account deletion | Yes |
| **Personal Info** | Phone number | Collected, Shared with CallMeBot/WhatsApp gateway for owner delivery dispatch | Order delivery verification, customer authentication | Stored until account deletion | Yes |
| **Personal Info** | Physical Address | Collected, Not Shared | Order fulfillment & doorstep delivery in Bamitha | Stored until account deletion | Yes |
| **Financial Info** | Purchase History | Collected, Not Shared | Order tracking, accounting & receipt history | Stored (accounting history retained anonymized) | Retention [FILL: 3 years for tax/accounting law] |
| **User Content** | Reviews & Ratings | Collected, Publicly Displayed | Customer feedback on products, moderation | Stored until deleted or hidden | Yes |
| **User Content** | In-App Feedback & Bug Reports | Collected, Not Shared | App improvement, customer support | Stored until handled by admin | Yes |
| **Device or Other Identifiers** | Push Notification Token (Expo / FCM) | Collected, Shared with Expo / Google FCM | Dispatching real-time order status notifications | Stored until logout or token rotation | Yes |
| **Device or Other Identifiers** | Device Model & OS Version | Collected (only when submitting in-app feedback), Not Shared | Diagnostics, troubleshooting customer bug reports | Stored with feedback record | Yes |

*Note on Third-Party SDKs / Payment Gateways:*
- **Credit / Debit Cards:** NOT COLLECTED. The app does not collect, process, or store credit card numbers, CVVs, or bank account PINs. 
- **UPI Payments:** The app uses UPI deep-linking intents. Only UPI transaction references (`tr` / `utr`) are stored for store payment reconciliation.
- **Images:** Image hosting uses Cloudinary (`backend/services/uploadService.js`) for product and banner assets.
- **Advertisements:** **NONE**. Package scan confirms 0 advertising SDKs (no AdMob, no Unity Ads, no Facebook Audience Network).

---

## 3. Google Play Policy Questionnaire Hints

### A. Ads Declaration
- Select: **"No, my app does not contain ads."**

### B. Target Audience and Content Rating (IARC)
- **Category:** Retail / Consumer Goods Shopping (E-Commerce).
- **Target Age Group:** General Audience (Adults / All ages 18+ recommended to avoid strict Google Play Families Policy requirements like COPPA/neutral age gating).
- **Content Rating Answers:**
  - Violence: No
  - Sexual Content: No
  - Profanity: No
  - Controlled Substances: No
  - User Interaction: Users can post reviews (moderated by store admins).
  - Physical Location Sharing: No (address is typed manually by customer).
  - Digital Goods: No (physical goods only).

### C. User Generated Content (UGC) Policy Declaration
- **Public Content:** Product reviews and star ratings.
- **UGC Safety Mechanisms Implemented:**
  1. Only verified customers with delivered orders can submit a review (`POST /api/reviews`).
  2. Every review has a visible **Report** button in the app and web frontend.
  3. One report per user per review with predefined reporting categories (Inappropriate content, Spam, Harassment, Misleading, Other).
  4. Admin Moderation Dashboard (`/api/reviews/admin`) sorts reported reviews first with real-time **Hide** and **Approve** controls.
  5. Reviews violating community guidelines are hidden from public view immediately upon admin action.

---

## 4. Pending Items Requiring Real Details Before Submission

- `[FILL: Legal Business / Store Name]` — Current: Shagun Mart / Shagun General Store
- `[FILL: Support Email]` — Confirmed: `ramanvishwari@gmail.com`
- `[FILL: Privacy Policy Public URL]` — `https://www.shagunmart.shop/privacy`
- `[FILL: Account Deletion Public URL]` — `https://www.shagunmart.shop/delete-account`
- `[FILL: Financial Data Retention Period]` — e.g. 180 days / 3 years for tax compliance records.
