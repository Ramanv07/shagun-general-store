import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import brandRoutes from '../routes/brandRoutes.js';
import productRoutes from '../routes/productRoutes.js';

const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

const app = express();
app.use(express.json());
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);

let mongod;

describe('Phase F: Brands Entity & Filtering Endpoints', () => {
  beforeAll(async () => {
    try {
      await mongoose.connect(STAGING_URI, { serverSelectionTimeoutMS: 1500 });
    } catch {
      mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
    }

    // Ensure test brands and products exist
    const Brand = (await import('../models/Brand.js')).default;
    const Product = (await import('../models/Product.js')).default;

    const brandCount = await Brand.countDocuments();
    if (brandCount < 10) {
      const seedBrands = [
        { name: 'Vaseline', slug: 'vaseline', active: true, order: 0 },
        { name: 'Lakme', slug: 'lakme', active: true, order: 1 },
        { name: 'Nivea', slug: 'nivea', active: true, order: 2 },
        { name: 'Ponds', slug: 'ponds', active: true, order: 3 },
        { name: 'Dove', slug: 'dove', active: true, order: 4 },
        { name: 'Garnier', slug: 'garnier', active: true, order: 5 },
        { name: 'Loreal', slug: 'loreal', active: true, order: 6 },
        { name: 'Himalaya', slug: 'himalaya', active: true, order: 7 },
        { name: 'Biotique', slug: 'biotique', active: true, order: 8 },
        { name: 'Mamaearth', slug: 'mamaearth', active: true, order: 9 }
      ];
      await Brand.insertMany(seedBrands);
    }

    const vasBrand = await Brand.findOne({ slug: 'vaseline' });
    const vasProd = await Product.findOne({ name: /vaseline/i });
    if (!vasProd && vasBrand) {
      await Product.create({
        name: 'Vaseline Healthy Bright Body Lotion',
        price: 280,
        category: 'Personal Care',
        brand: 'Vaseline',
        brand_id: vasBrand._id,
        stock: 15,
        description: 'Deep hydration body lotion',
        image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      });
    } else if (vasProd && vasBrand && !vasProd.brand_id) {
      vasProd.brand_id = vasBrand._id;
      await vasProd.save();
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('GET /api/brands returns list of active brands', async () => {
    const res = await request(app).get('/api/brands');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(10);
    const vaseline = res.body.find(b => b.slug === 'vaseline');
    expect(vaseline).toBeDefined();
    expect(vaseline.name).toBe('Vaseline');
  });

  it('GET /api/brands/:slug returns specific brand or 404', async () => {
    const res = await request(app).get('/api/brands/vaseline');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('vaseline');

    const notFound = await request(app).get('/api/brands/nonexistent-brand-xyz');
    expect(notFound.status).toBe(404);
  });

  it('GET /api/products?brand=vaseline filters products by brand', async () => {
    const res = await request(app).get('/api/products?brand=vaseline');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const p of res.body) {
      expect(p.name.toLowerCase()).toContain('vas');
    }
  });

  it('GET /api/products?brand=nonexistent returns empty array', async () => {
    const res = await request(app).get('/api/products?brand=nonexistent-brand-xyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
