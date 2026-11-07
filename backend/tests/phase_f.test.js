import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import brandRoutes from '../routes/brandRoutes.js';
import productRoutes from '../routes/productRoutes.js';

const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

const app = express();
app.use(express.json());
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);

describe('Phase F: Brands Entity & Filtering Endpoints', () => {
  beforeAll(async () => {
    await mongoose.connect(STAGING_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
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

