import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

// ─── Route Imports ───────────────────────────────────────────────
import authRoutes from '../backend/routes/authRoutes.js';
import productRoutes from '../backend/routes/productRoutes.js';
import orderRoutes from '../backend/routes/orderRoutes.js';

// ─── App Setup ───────────────────────────────────────────────────
const app = express();

// CORS — allow frontend origin(s) in production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL, // set this in Vercel env vars
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api', (_req, res) => {
  res.json({ status: 'Shagun General Store API is running ✅', ts: new Date().toISOString() });
});

// 404 catch-all for unmatched /api/* routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// ─── MongoDB Connection (cached for serverless) ──────────────────
let cachedConn = null;

async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) return cachedConn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI env variable is not set');
  cachedConn = await mongoose.connect(uri);
  console.log('MongoDB connected ✅');
  return cachedConn;
}

// ─── Vercel Serverless Export ─────────────────────────────────────
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
