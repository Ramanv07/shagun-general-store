# Vercel Deployment & Staging Verification Guide

This guide details the single-project full-stack deployment architecture and the staging verification plan before production rollout.

---

## 1. Project Architecture (Unified Single Project)

The repository is configured as **one unified full-stack project** on Vercel:

- **Framework Preset**: Vite
- **Root Directory**: `.` (Repository root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **API Runtime (`/api`)**: Vercel automatically deploys [api/index.js](file:///c:/Users/raman/Downloads/shagun-general-store/api/index.js) as a serverless function (`maxDuration: 30`, `memory: 512MB`).
- **SPA Refresh Handling**: [vercel.json](file:///c:/Users/raman/Downloads/shagun-general-store/vercel.json) rewrites `/((?!api/|.*\\.apk$).*)` to `/index.html`. Browser refreshes on `/shop`, `/account`, `/admin`, `/beauty-parlor`, and `/bridal-lehenga` return `index.html` (HTTP 200) without 404 errors.
- **Client API URL**:
  - Web: `VITE_API_URL=/api` (Same-origin; zero CORS overhead and no preflight delays).
  - Mobile App: `EXPO_PUBLIC_API_URL=https://<your-domain>/api`.

---

## 2. Environment Variables Configuration

In Vercel Project Settings > Environment Variables, configure the following keys:

### Core Serverless Backend Variables
| Variable Name | Environments | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | Production, Preview | Set to `production` |
| `MONGODB_URI` | **Scoped by Env** | Staging URI for Preview; Production Atlas URI for Production |
| `JWT_SECRET` | Production, Preview | 64+ char random hex string (separate secrets per environment) |
| `FRONTEND_URL` | Production | Canonical site URL (e.g. `https://shagunmart.com`) |
| `ALLOWED_ORIGINS` | Production, Preview | Allowed CORS origins for preview or admin domains |
| `CLOUDINARY_CLOUD_NAME` | Production, Preview | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Production, Preview | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Production, Preview | Cloudinary API Secret |
| `SMTP_HOST` | Production, Preview | Transactional email SMTP host |
| `SMTP_PORT` | Production, Preview | Transactional email SMTP port (587) |
| `SMTP_USER` | Production, Preview | Authenticated email address |
| `SMTP_PASS` | Production, Preview | App-specific email password |
| `NTFY_TOPIC` | Production, Preview | High-entropy alert topic for store owner |
| `ADMIN_WHATSAPP` | Production, Preview | Admin phone number (e.g. `918827259023`) |
| `CALLMEBOT_API_KEY` | Production, Preview | WhatsApp alert gateway key |
| `GOOGLE_CLIENT_ID_WEB` | Production, Preview | Google OAuth Client ID |

### Frontend Build-Time Variables
| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Relative same-origin API endpoint |
| `VITE_GOOGLE_CLIENT_ID`| `<client-id>.apps.googleusercontent.com` | Google sign-in client ID |

> **Critical Boot Guard**: In Production, `ALLOW_TEST_OTP` and `ALLOW_TEST_GOOGLE_AUTH` must **NEVER** be defined. Startup will abort if either flag is active.

---

## 3. First Deploy Plan: Staging Database & Preview Verification

Before connecting production traffic or live customer data, perform a full staging verification on a Vercel Preview deployment:

### Step 1: Provision Isolated Staging Database on Atlas
1. Create a dedicated database named `shagun-staging` in your MongoDB Atlas cluster.
2. Create a dedicated database user (e.g. `shagun_staging_user`) with privileges restricted **strictly** to `readWrite` on `shagun-staging` only (no access to `admin` or other databases).
3. Restore the verified staging backup into `shagun-staging`:
   ```bash
   mongorestore --uri="mongodb+srv://shagun_staging_user:<password>@cluster0.mongodb.net/shagun-staging" --dir=<backup-dir>/shagun-staging
   ```
4. Verify catalog integrity:
   - Product count must equal 28.
   - Canonical SHA-256 checksum must match `53fa1d92b6381474ede7c1a94240f62fba4e928a5c0e23657b57e661643b1c60`.

### Step 2: Configure Vercel Preview Environment
1. In Vercel Project Settings > Environment Variables:
   - Add `MONGODB_URI` with the `shagun-staging` connection string.
   - **Crucial**: Select **Preview** and **Development** checkboxes only. **Uncheck Production**.
2. Set Preview Deployment Protection:
   - Enable Password Protection or Vercel Authentication on preview deployments so public visitors/bots cannot access staging.

### Step 3: Trigger & Test Preview Deployment
1. Push branch `release-v1.0.0` to GitHub. Vercel automatically creates a Preview deployment:
   `https://shagun-mart-git-release-v1-0-0-<username>.vercel.app`
2. Run database migrations against staging:
   - `node backend/migrations/001_unique_indexes.js`
   - `node backend/migrations/002_rate_limit_indexes.js`
3. Execute the 6-phase manual verification protocol against the Preview URL:
   - Follow [MANUAL_UI_TEST.md](file:///c:/Users/raman/Downloads/shagun-general-store/MANUAL_UI_TEST.md) (Customer browsing, Cart, Checkout COD/UPI, Admin login & order status update, Parlour appointment booking, Account deletion).
   - Test browser refresh on `/shop`, `/account`, and `/admin` to verify SPA routing.

### Step 4: Promote to Production
1. In Vercel Project Settings > Environment Variables:
   - Add `MONGODB_URI` with the production database connection string.
   - Select **Production** checkbox only.
2. Merge the approved release branch into `main` (or promote the Preview deployment to Production in Vercel Dashboard).
3. Verify production health:
   - Probe `GET https://<your-domain>/api/health` -> verify HTTP 200.
4. Build and release mobile application:
   - Configure `EXPO_PUBLIC_API_URL=https://<your-domain>/api` and trigger EAS build.
