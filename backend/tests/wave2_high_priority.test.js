import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/authRoutes.js';
import appointmentRoutes from '../routes/appointmentRoutes.js';
import settingRoutes from '../routes/settingRoutes.js';
import productRoutes from '../routes/productRoutes.js';
import reviewRoutes from '../routes/reviewRoutes.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import AuditLog from '../models/AuditLog.js';

jest.setTimeout(60000);
process.env.JWT_SECRET = 'test_jwt_secret_key_32_characters_long_min';

let mongod;
let app;
let request;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/settings', settingRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/reviews', reviewRoutes);
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('W2-01: 7-Day JWT + tokenVersion session invalidation', () => {
  let testUser;
  let userToken;

  beforeAll(async () => {
    testUser = await User.create({
      name: 'Session Test User',
      email: 'session@shagun.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE', // Dummy hash
      phone: '9888877777',
      role: 'user',
      tokenVersion: 0
    });
  });

  test('FAILS before fix: Legacy token without tokenVersion claim is accepted as version 0', async () => {
    const legacyToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${legacyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('session@shagun.com');
  });

  test('FAILS before fix: POST /api/auth/logout increments tokenVersion and invalidates token', async () => {
    // Generate valid v0 token
    const tokenV0 = jwt.sign({ id: testUser._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Should succeed before logout
    const preCheck = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenV0}`);
    expect(preCheck.status).toBe(200);

    // Call logout endpoint
    const logoutRes = await request
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenV0}`);
    expect(logoutRes.status).toBe(200);

    // Old token must now be rejected with 401
    const postCheck = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenV0}`);
    expect(postCheck.status).toBe(401);
  });
});

describe('W2-06: Beauty Parlor Server Slots & Auth Requirement', () => {
  let authUser;
  let authToken;

  beforeAll(async () => {
    authUser = await User.create({
      name: 'Parlor Customer',
      email: 'parlor@shagun.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE',
      phone: '9777766666',
      role: 'user',
      tokenVersion: 0
    });
    authToken = jwt.sign({ id: authUser._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  test('FAILS before fix: GET /api/appointments/slots returns standard time slots', async () => {
    const res = await request.get('/api/appointments/slots?serviceId=bridal&date=2026-12-01');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.allSlots)).toBe(true);
    expect(res.body.allSlots.length).toBeGreaterThan(0);
  });

  test('FAILS before fix: POST /api/appointments requires login (returns 401 without token)', async () => {
    const res = await request.post('/api/appointments').send({
      serviceId: 'bridal',
      serviceName: 'Bridal Makeup',
      price: 5000,
      date: '2026-12-01',
      slot: '10:00 AM - 11:00 AM',
      customerName: 'Test Guest',
      customerPhone: '9777766666'
    });
    expect(res.status).toBe(401);
  });
});

describe('W2-07: Configurable delivery fee & free delivery threshold', () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    adminUser = await User.create({
      name: 'Admin Settings',
      email: 'admin_settings@shagun.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE',
      role: 'admin',
      tokenVersion: 0
    });
    adminToken = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  test('FAILS before fix: GET /api/settings/delivery returns default fallback 399/30 without writing to DB', async () => {
    const res = await request.get('/api/settings/delivery');
    expect(res.status).toBe(200);
    expect(res.body.freeDeliveryThreshold).toBe(399);
    expect(res.body.deliveryFee).toBe(30);
  });

  test('FAILS before fix: PUT /api/settings/delivery validates numbers >= 0 and updates settings', async () => {
    // Rejects negative numbers
    const negRes = await request
      .put('/api/settings/delivery')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ freeDeliveryThreshold: -50, deliveryFee: 30 });
    expect(negRes.status).toBe(400);

    // Updates with valid values
    const updateRes = await request
      .put('/api/settings/delivery')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ freeDeliveryThreshold: 499, deliveryFee: 40 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.freeDeliveryThreshold).toBe(499);
    expect(updateRes.body.deliveryFee).toBe(40);
  });
});

describe('W2-08: Backward-compatible product pagination & search escaping', () => {
  beforeAll(async () => {
    // Seed 5 test products
    for (let i = 1; i <= 5; i++) {
      await Product.create({
        name: `Test Paging Product ${i}`,
        price: 100 * i,
        mrp: 120 * i,
        stock: 10,
        category: 'TestCat',
        description: `Description for product ${i}`,
        image: 'https://example.com/p.jpg',
        isDeleted: false
      });
    }
  });

  test('FAILS before fix: GET /api/products returns all products when no paging params sent', async () => {
    const res = await request.get('/api/products?category=TestCat');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5);
  });

  test('FAILS before fix: GET /api/products?page=1&limit=2 applies paging and adds X-Total-Count', async () => {
    const res = await request.get('/api/products?category=TestCat&page=1&limit=2');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.headers['x-total-count']).toBe('5');
  });

  test('FAILS before fix: Regex special characters in search do not crash server', async () => {
    const res = await request.get('/api/products?search=[invalid(regex');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('W2-09: Reviews moderation & dynamic rating aggregates', () => {
  let prod;
  let u1, u2;
  let adminU;
  let adminTok;

  beforeAll(async () => {
    prod = await Product.create({
      name: 'Review Test Prod',
      price: 200,
      mrp: 250,
      stock: 15,
      category: 'General',
      description: 'Reviewable product',
      image: 'https://example.com/rev.jpg',
      rating: 0,
      isDeleted: false
    });

    u1 = await User.create({
      name: 'Reviewer One',
      email: 'rev1@shagun.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE',
      tokenVersion: 0
    });

    u2 = await User.create({
      name: 'Reviewer Two',
      email: 'rev2@shagun.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE',
      tokenVersion: 0
    });

    adminU = await User.create({
      name: 'Review Moderator Admin',
      email: 'mod_admin@shagun.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE',
      role: 'admin',
      tokenVersion: 0
    });
    adminTok = jwt.sign({ id: adminU._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const dummyOrderId = new mongoose.Types.ObjectId();

    // Review 1 (Approved: 5 stars)
    await Review.create({
      user_id: u1._id,
      product_id: prod._id,
      order_id: dummyOrderId,
      rating: 5,
      comment: 'Excellent product!',
      status: 'approved'
    });

    // Review 2 (Hidden: 1 star)
    await Review.create({
      user_id: u2._id,
      product_id: prod._id,
      order_id: dummyOrderId,
      rating: 1,
      comment: 'Hidden spam review',
      status: 'hidden'
    });
  });

  test('FAILS before fix: GET /api/reviews/product/:id excludes hidden reviews from average & count', async () => {
    const res = await request.get(`/api/reviews/product/${prod._id}`);
    expect(res.status).toBe(200);
    expect(res.body.reviewCount).toBe(1);
    expect(res.body.averageRating).toBe(5);

    // Product document must not have rating written
    const dbProd = await Product.findById(prod._id);
    expect(dbProd.rating).toBe(0);
  });

  test('FAILS before fix: Admin can list all reviews and moderate status', async () => {
    const listRes = await request
      .get('/api/reviews/admin')
      .set('Authorization', `Bearer ${adminTok}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    const targetRev = listRes.body.find(r => r.comment === 'Excellent product!');
    expect(targetRev).toBeDefined();

    const hideRes = await request
      .put(`/api/reviews/admin/${targetRev._id}/status`)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ status: 'hidden' });
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.status).toBe('hidden');
  });
});

describe('W2-10: Soft Delete & Audit Logging', () => {
  let adminUser;
  let adminToken;
  let targetProduct;

  beforeAll(async () => {
    adminUser = await User.create({
      name: 'Audit Admin',
      email: 'audit_admin@shagun.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDE',
      role: 'admin',
      tokenVersion: 0
    });
    adminToken = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

    targetProduct = await Product.create({
      name: 'Product to Soft Delete',
      price: 350,
      mrp: 400,
      stock: 20,
      category: 'General',
      description: 'Will be soft deleted',
      image: 'https://example.com/delete.jpg',
      isDeleted: false
    });
  });

  afterAll(async () => {
    // Restore product as per safety requirements
    if (targetProduct) {
      await Product.findByIdAndUpdate(targetProduct._id, { $set: { isDeleted: false } });
    }
  });

  test('FAILS before fix: DELETE /api/products/:id soft-deletes and writes AuditLog', async () => {
    const delRes = await request
      .delete(`/api/products/${targetProduct._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    // Verify soft-deleted in DB
    const dbProd = await Product.findById(targetProduct._id);
    expect(dbProd).not.toBeNull();
    expect(dbProd.isDeleted).toBe(true);

    // Verify excluded from public detail
    const getRes = await request.get(`/api/products/${targetProduct._id}`);
    expect(getRes.status).toBe(404);

    // Verify AuditLog record
    const log = await AuditLog.findOne({ entity: 'Product', entity_id: targetProduct._id.toString() });
    expect(log).not.toBeNull();
    expect(log.action).toBe('PRODUCT_SOFT_DELETE');
    expect(log.admin_id.toString()).toBe(adminUser._id.toString());

    // Restore immediately after verification
    await Product.findByIdAndUpdate(targetProduct._id, { $set: { isDeleted: false } });
  });
});
