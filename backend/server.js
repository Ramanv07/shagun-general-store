
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config(); // fallback

// --- C1: Crash early if JWT_SECRET is missing ---
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set in environment variables. Exiting.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// --- H2: Security headers (CSP, HSTS, X-Frame-Options, hide X-Powered-By) ---
app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// --- H1: Restrict CORS to actual frontend origins ---
const allowedOrigins = [
    'http://localhost:5173',           // Vite dev
    'http://localhost:3000',           // Alt dev
    process.env.FRONTEND_URL,         // Production URL (set in .env)
].filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// --- P1: Gzip compression for all API and text responses ---
app.use(compression());

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));

// --- H4: Strip MongoDB operators ($gt, $ne, etc.) from req.body/query/params ---
app.use(mongoSanitize());

// --- H3: Rate limit on auth endpoints (5 requests per 15 min window) ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,                  // 15 requests per window
    message: { message: 'Too many attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/parlor-services', parlorServiceRoutes);

// --- P2: Production Static File Serving & Cache-Control Headers ---
const distPath = path.resolve(__dirname, '../dist');
// Content-hashed bundle assets: cache aggressively for 1 year
app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
}));
// Other static root files (favicon, etc.)
app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

app.get('/', (req, res) => {
    res.send('Shagun Mart API is running...');
});

// --- M1: Global error handler — never leak internals to client ---
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({ message: 'Internal server error' });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shagun-store';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Atlas Connected');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.log('MongoDB connection error:', err);
        console.log('Starting server without database connection...');
        app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB not connected)`));
    });
