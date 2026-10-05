# 📱 Shagun General Store — Native App

React Native (Expo) mobile app for Shagun General Store.
Shares the same **MongoDB Atlas** backend with the web app.

---

## 🚀 Getting Started

### 1. Configure the Backend URL

Open `constants.ts` and update `API_BASE_URL` to your machine's local IP
(so your phone can reach the Express server when running on the same WiFi):

```ts
// constants.ts
export const API_BASE_URL = "http://192.168.X.X:5000"; // ← Your local IP
```

To find your IP:
- Windows: run `ipconfig` → look for IPv4 Address

### 2. Start the Backend

```bash
# From the shagun-general-store root folder:
node backend/server.js
```

### 3. Install Dependencies

```bash
cd shagun-native
npm install
```

### 4. Start the Native App

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

---

## 📁 Project Structure

```
shagun-native/
├── app/                    # expo-router file-based screens
│   ├── (tabs)/
│   │   ├── index.tsx       # Home
│   │   ├── shop.tsx        # Shop
│   │   ├── cart.tsx        # Cart
│   │   ├── orders.tsx      # Orders
│   │   └── account.tsx     # Account
│   ├── login.tsx           # Login & Register
│   ├── checkout.tsx        # Checkout
│   ├── beauty-parlor.tsx   # Beauty Parlor
│   ├── bridal-lehenga.tsx  # Bridal Lehenga
│   └── admin/
│       └── dashboard.tsx   # Admin Dashboard
├── components/
│   └── ProductCard.tsx     # Reusable product card
├── context/                # React contexts (adapted from web)
│   ├── AuthContext.tsx     # JWT auth via SecureStore
│   ├── CartContext.tsx     # Cart via AsyncStorage
│   └── OrderContext.tsx    # Orders via API
├── services/
│   └── api.ts              # All backend API calls
├── types.ts                # Shared types (identical to web)
├── constants.ts            # App constants + API_BASE_URL
└── app.json                # Expo config
```

---

## 🔑 Test Credentials

| Role  | Email             | Password |
|-------|-------------------|----------|
| Admin | admin@shagun.com  | (set in your DB via seed.js) |
| User  | user@shagun.com   | (set in your DB via seed.js) |

---

## 📦 Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build Android APK
eas build --platform android --profile preview

# Build iOS
eas build --platform ios
```

---

## 🗄️ Database

MongoDB Atlas — shared with the web app. No changes to the backend needed.
The native app talks to the same `/api/auth`, `/api/products`, `/api/orders` routes.
