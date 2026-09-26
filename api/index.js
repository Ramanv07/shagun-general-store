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

// CORS — allow requests from all origins (production, previews, localhost)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins (reflection)
      callback(null, true);
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
  res.json({ 
    status: 'Shagun General Store API is running ✅', 
    dbConnected: mongoose.connection.readyState === 1,
    ts: new Date().toISOString() 
  });
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
  if (!uri) {
    console.warn('⚠️ MONGODB_URI environment variable is not set. Database operations will fail.');
    return null;
  }
  try {
    cachedConn = await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected ✅');
    return cachedConn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    cachedConn = null;
    return null;
  }
}

// ─── Vercel Serverless Export ─────────────────────────────────────
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
