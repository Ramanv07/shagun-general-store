import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import rentalRoutes from './routes/rentalRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import parlorServiceRoutes from './routes/parlorServiceRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import paymentPreferenceRoutes from './routes/paymentPreferenceRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import { createMongoRateLimiter } from './middleware/mongoRateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// ─── Boot Guard & Security Validations ─────────────────────────────
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set in environment variables.');
    if (!process.env.VERCEL) {
        process.exit(1);
    }
}

const currentEnv = process.env.NODE_ENV || 'development';
console.log(`[BOOT] Environment: ${currentEnv}`);

if (process.env.NODE_ENV === 'production') {
    if (process.env.STAGING_MONGODB_URI) {
        console.error('FATAL: STAGING_MONGODB_URI must not be set in production environment.');
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
    const dangerousFlags = [];
    if (process.env.ALLOW_TEST_OTP === 'true') dangerousFlags.push('ALLOW_TEST_OTP=true');
    if (process.env.ALLOW_TEST_GOOGLE_AUTH === 'true') dangerousFlags.push('ALLOW_TEST_GOOGLE_AUTH=true');
    if (process.env.OTP_CHANNEL === 'console') dangerousFlags.push('OTP_CHANNEL=console');

    if (dangerousFlags.length > 0) {
        console.error(`FATAL: Insecure flags detected in production boot: ${dangerousFlags.join(', ')}.`);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
}

// ─── Express App Initialization ────────────────────────────────────
const app = express();

// Trust reverse proxy for rate-limiting and client IP resolution (Vercel, Render, Railway, Nginx)
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// CORS Configuration (Origins from env only, no wildcards, native app allowed)
const rawAllowedOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : [])
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // Native apps (Expo/Capacitor), curl, and server-to-server have no Origin header
        if (!origin) return cb(null, true);

        // In production, reject arbitrary Vercel previews unless explicitly listed in ALLOWED_ORIGINS
        if (process.env.NODE_ENV === 'production') {
            if (rawAllowedOrigins.includes(origin)) {
                return cb(null, true);
            }
            return cb(new Error('Not allowed by CORS'));
        }

        // Development/staging fallback
        if (rawAllowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
            return cb(null, true);
        }
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// Gzip compression for all text and JSON responses
app.use(compression());

// Body parsing with safe size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Strip MongoDB operators from req.body/query/params
app.use(mongoSanitize());

// ─── Health Check Endpoint (No Secrets, No DB Details) ─────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString()
    });
});

// ─── Per-IP Distributed Rate Limiters (Mongo-Backed Store) ──────────
const loginLimiter = createMongoRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    prefix: 'rl:login',
    message: 'Too many login attempts. Please try again after 15 minutes.',
    failClosed: false // Login fails open with a warning log so legitimate users are not locked out during transient DB issues
});

const registerLimiter = createMongoRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    prefix: 'rl:register',
    message: 'Too many registration attempts. Please try again after 15 minutes.',
    failClosed: true // Fails closed to protect against mass registration attacks
});

const forgotPasswordLimiter = createMongoRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    prefix: 'rl:forgot',
    message: 'Too many password reset attempts. Please try again after 1 hour.',
    failClosed: true // Fails closed to protect against OTP spam
});

const couponValidateLimiter = createMongoRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    prefix: 'rl:coupon',
    message: 'Too many coupon validation requests. Please wait a moment.',
    failClosed: true // Fails closed to prevent brute forcing coupon codes
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/coupons/validate', couponValidateLimiter);

// ─── API Routes Mounting ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/parlor-services', parlorServiceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/payment-preferences', paymentPreferenceRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/coupons', couponRoutes);

// Root informational endpoint
app.get('/', (_req, res) => {
    res.send('Shagun Mart API is running...');
});

// Production Static File Serving
const distPath = path.resolve(__dirname, '../dist');
app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
}));
app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Global error handler — never leak internal traces to client
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({ message: 'Internal server error' });
});

// ─── Serverless Mongoose Connection Pooling & Caching ──────────────
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (mongoose.connection.readyState !== 1) {
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        const uri = process.env.MONGODB_URI || process.env.STAGING_MONGODB_URI;
        if (!uri) {
            console.error('CRITICAL: MONGODB_URI is not set in environment.');
            if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
                console.error('Fatal: Exiting process because database is required in non-Vercel production.');
                process.exit(1);
            }
            return null;
        }

        // Local development safety guard: refuse Atlas connections unless explicitly permitted
        if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
            if (uri.includes('mongodb.net') && process.env.ALLOW_LIVE_DB_LOCALLY !== 'true') {
                console.error('FATAL SAFETY TRIGGER: Local non-production environment cannot connect to Atlas (mongodb.net) unless ALLOW_LIVE_DB_LOCALLY=true is explicitly set. Aborting.');
                if (process.env.NODE_ENV === 'test') {
                    throw new Error('Atlas connection refused in non-production environment');
                }
                process.exit(1);
            }
        }

        // Masked host and database logging
        let maskedHost = 'unknown';
        let targetDb = 'unknown';
        try {
            const raw = uri.replace(/^mongodb(?:\+srv)?:\/\//i, 'http://');
            const parsed = new URL(raw);
            maskedHost = parsed.host.replace(/^([^@]+@)/, '***@');
            targetDb = parsed.pathname.replace(/^\//, '').split('?')[0] || 'default';
        } catch {
            maskedHost = 'masked-host';
        }
        console.log(`[DB CONNECT] Target Host: ${maskedHost}, Database: ${targetDb}`);

        const opts = {
            bufferCommands: false,
            maxPoolSize: 5,
            serverSelectionTimeoutMS: process.env.NODE_ENV === 'test' ? 1000 : 5000,
        };

        cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
            console.log('MongoDB connected successfully (pool size: 5, timeout: 5000ms)');
            return mongooseInstance;
        }).catch((err) => {
            console.error('CRITICAL: Database connection failed:', err.message);
            cached.promise = null;
            if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
                console.error('Fatal: Exiting process because database is required in non-Vercel production.');
                process.exit(1);
            }
            return null;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch {
        cached.promise = null;
        cached.conn = null;
        return null;
    }

    return cached.conn;
}

export default app;
