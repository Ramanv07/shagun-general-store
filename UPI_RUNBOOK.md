# Shagun Mart: UPI Payment Verification & Operational Runbook

This operational runbook explains how store administrators verify, approve, and manage customer UPI intent payments securely before packing or dispatching orders.

---

## 1. Cardinal Operational Rule

> **SHIP ONLY AFTER PAID**  
> Never pack, dispatch, or hand over goods to a courier or customer when an order is in `Pending`, `Verifying`, or `Late Payment` status. Only ship when the order status is explicitly **`Paid`** (green badge in the Admin Dashboard).

---

## 2. Store UPI Configuration

Your store UPI settings are stored securely in the database (`StoreSetting` collection) and are **never hardcoded in source code**:
- **UPI VPA / ID:** `<UPI_ID>`
- **Payee Display Name:** `<PAYEE_NAME>`
- **Payment Timeout:** `30 minutes` (configurable)

To configure or update these credentials safely on the server, execute the script with your confirmed values:
```powershell
node backend/scripts/setup_upi_settings.js "<UPI_ID>" "<PAYEE_NAME>" 30 --confirm
```

---

## 3. How to Verify a Payment in Your Bank App (Step-by-Step)

When a customer submits their 12-digit UTR, the store admin receives an instant alert notification (via NTFY / WhatsApp / Admin Dashboard) and the order enters **`Needs Verification`** in the Admin Dashboard at `/admin` (UPI Payments tab).

Before clicking **Approve Payment**, open your SBI YONO / SBI UPI / Google Pay / BHIM business app and check your transaction history:

1. **Match Exact Amount:**
   - Compare the net credited amount in your bank statement with the **Expected Amount** shown on the order.
   - Example: If the order total is ₹450.00, your bank statement must reflect exactly **+₹450.00**.
2. **Match 12-Digit UTR (Unique Transaction Reference):**
   - Locate the 12-digit numeric RRN / UTR number on your bank credit entry.
   - Match this digit-by-digit against the **Customer UTR** displayed in the Admin Dashboard.
3. **Match Timestamp:**
   - Verify that the credit timestamp in your bank account matches the order creation/UTR submission window (within the payment timeout window of order placement).
4. **Match Payer Name & Order ID Remark:**
   - Confirm that the remitter/payer name corresponds to the customer name on the order, or that the payment note / remark contains the order reference number (`SM-...`).

---

## 4. Operational Handling for Edge Cases

### A. Wrong Amount Received (Underpayment or Overpayment)
- **Scenario:** Customer paid ₹500 instead of ₹850 (underpayment) or paid ₹1,000 instead of ₹850 (overpayment).
- **Action:**
  1. Do NOT click Approve. Do NOT click Reject.
  2. In `/admin` UPI Payments, mark the order as **`refund_needed`**.
  3. Enter clear operational note: *"Underpayment/Overpayment received (₹X credited vs ₹Y expected). Refund required."*
  4. The store manager issues a refund directly to the customer's account (see Section 6).

### B. Duplicate Payment / Reused UTR
- **Scenario:** Customer submits a UTR that was already used on an earlier order.
- **Protection:** The system enforces a unique database index on `upiUtr` across all orders. Submitting an already used UTR is immediately rejected by the database.
- **Action:** If customer claims they paid twice, inspect bank statement credits. If a duplicate credit is present, mark for refund via Section 6.

### C. Late Payment (UTR Submitted After Expiry)
- **Scenario:** The customer took longer than 30 minutes to pay. The order expired and reserved stock was automatically released to avoid holding inventory hostage.
- **System Behavior:** When the customer submits their UTR, the order is accepted and marked **`Late Payment`**.
- **Admin Action:**
  1. Open `/admin` -> UPI Payments -> Filter by **All** or **Late Payment**.
  2. Verify that the payment actually reached your bank account.
  3. **Option 1 (Stock Available):** Click **Reinstate**. The system checks inventory; if items are still in stock, it re-reserves the items, applies the coupon, and moves the order to `Verifying`. You can now click **Approve Payment**.
  4. **Option 2 (Stock Out of Stock / Cannot Fulfill):** Click **Refund Needed**. Enter a note (e.g., *"Item sold out during payment delay"*). The order moves to `refund_needed` and the customer is contacted for refund details.

### D. Rejection (Money Not Received / Fraudulent UTR)
- **Scenario:** Customer submits a fabricated 12-digit UTR, but no matching credit exists in your SBI statement.
- **Action:**
  1. Click **Reject Payment** in the Admin Dashboard.
  2. Enter reason: *"UTR not found in bank statement"*.
  3. Keep the checkbox checked to release any reserved product stock.

---

## 5. Daily Reconciliation Process

At the end of every business day:
1. **Export Bank Credits:** Pull the list of all inbound UPI credits from SBI YONO / banking portal for the day.
2. **Match Orders:** Match every inbound credit by UTR to an approved `paid` order in `/admin`.
3. **List Unmatched Credits:** Record any credit that has no matching order in a dedicated spreadsheet:
   - Date & Time
   - Amount
   - Bank UTR / RRN
   - Remitter Name / UPI ID
   - Status (Claimed / Pending Inquiry / Refunded)
4. **Follow Up:** Contact customers with pending inquiries or issue refunds for unmatched deposits within the SLA.

---

## 6. Refund Policy & Execution

- **Who Refunds:** The store finance manager / owner executes refunds directly from the primary SBI account.
- **How:** Direct bank transfer (IMPS / UPI) to the customer's verified bank account or VPA.
- **Timeline:** [FILL: refund timeline, e.g., within 2-3 business days of verification].
- **Audit:** Record transaction reference number in the order audit notes upon completion.

---

## 7. Live Payment Verification Test (Step-by-Step)

Before launching to public customers, verify the complete loop on **Vercel Preview with the staging DB**, or with a hidden test product removed immediately afterwards (never on the live public catalog):

1. **Test Environment / Product Setup:**
   - On the Vercel Preview deployment connected to the staging database, create or use a test product.
2. **Place Real Test Order:**
   - On your mobile phone, visit checkout.
   - Pay the **exact total shown** (item price + delivery fee, unless item exceeds free delivery threshold).
   - Select **UPI Instant Payment** -> Click Place Order.
3. **Complete UPI Transfer:**
   - Tap **Pay with UPI App** -> Select Google Pay, PhonePe, Paytm, or BHIM.
   - Complete transfer of the exact order total to `<UPI_ID>`.
4. **Copy UTR:**
   - In your payment app receipt, copy the **12-digit UPI Transaction ID / UTR**.
5. **Submit UTR in Store App:**
   - Return to the Shagun Mart Confirming Payment screen.
   - Enter the 12-digit UTR -> Click **Submit UTR**.
   - Verify status transitions to **Verifying**.
6. **Verify in Bank & Approve in Admin:**
   - Open your SBI YONO / banking app and verify the incoming credit with the matching UTR and order ID.
   - In `/admin`, verify order appears under **Needs Verification** and click **Approve Payment**.
   - Confirm status updates to **Paid** and order proceeds to fulfillment.
