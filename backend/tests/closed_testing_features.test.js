import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

import authRoutes from '../routes/authRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import reviewRoutes from '../routes/reviewRoutes.js';
import feedbackRoutes from '../routes/feedbackRoutes.js';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import AuditLog from '../models/AuditLog.js';
import { sendAdminOrderNotification, sendCustomerOrderNotification } from '../services/notificationService.js';

jest.setTimeout(60000);
process.env.JWT_SECRET = 'test_jwt_secret_key_32_characters_long_min';

let mongod;
let app;
let request;

let adminUser;
let adminToken;
let normalUser;
let normalToken;
let testerUser;
let testerToken;
let testProduct;

const makeToken = (id) => jwt.sign({ id, tokenVersion: 0 }, process.env.JWT_SECRET);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/feedback', feedbackRoutes);
  request = supertest(app);

  adminUser = await User.create({
    name: 'Admin Test',
    email: 'admin@shagunmart.test',
    password: 'password123',
    role: 'admin',
    phone: '9876543210'
  });
  adminToken = makeToken(adminUser._id);

  normalUser = await User.create({
    name: 'Normal Customer',
    email: 'customer@shagunmart.test',
    password: 'password123',
    role: 'user',
    phone: '9876543211',
    isTester: false
  });
  normalToken = makeToken(normalUser._id);

  testerUser = await User.create({
    name: 'Play Tester',
    email: 'tester@shagunmart.test',
    password: 'password123',
    role: 'user',
    phone: '9876543212',
    isTester: true
  });
  testerToken = makeToken(testerUser._id);

  testProduct = await Product.create({
    name: 'Test Basmati Rice',
    price: 150,
    mrp: 200,
    stock: 20,
    category: 'General Use',
    image: 'https://example.com/rice.jpg',
    description: 'High quality premium basmati rice'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Step 1: Tester-Safe Mode & Order Rules', () => {
  test('Non-admin cannot set isTester flag via profile update', async () => {
    const res = await request
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${normalToken}`)
      .send({ name: 'Hacker Attempt', isTester: true });

    expect(res.status).toBe(200);
    const updated = await User.findById(normalUser._id);
    expect(updated.isTester).toBe(false);
  });

  test('Non-admin cannot toggle isTester via admin route', async () => {
    const res = await request
      .put(`/api/auth/admin/users/${normalUser._id}/tester`)
      .set('Authorization', `Bearer ${normalToken}`)
      .send({ isTester: true });

    expect(res.status).toBe(403);
  });

  test('Admin can toggle isTester on a user', async () => {
    const res = await request
      .put(`/api/auth/admin/users/${normalUser._id}/tester`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isTester: true });

    expect(res.status).toBe(200);
    expect(res.body.user.isTester).toBe(true);

    // Revert back for remaining tests
    await request
      .put(`/api/auth/admin/users/${normalUser._id}/tester`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isTester: false });
  });

  test('Tester placing UPI order is rejected (COD only, no real money)', async () => {
    const res = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        items: [{ product: testProduct._id, name: testProduct.name, price: testProduct.price, quantity: 2 }],
        totalAmount: 300,
        shippingAddress: {
          fullName: 'Tester Name',
          mobile: '9876543212',
          houseNo: '12',
          street: 'Main Road',
          city: 'Bamitha',
          state: 'MP',
          pinCode: '471105'
        },
        paymentMethod: 'UPI'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/disabled for tester/i);
  });

  test('Tester placing COD order: isTestOrder=true, STOCK IS NOT DEDUCTED', async () => {
    const initialProduct = await Product.findById(testProduct._id);
    const initialStock = initialProduct.stock;

    const res = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        items: [{ product: testProduct._id, name: testProduct.name, price: testProduct.price, quantity: 3 }],
        totalAmount: 450,
        shippingAddress: {
          fullName: 'Tester Name',
          mobile: '9876543212',
          houseNo: '12',
          street: 'Main Road',
          city: 'Bamitha',
          state: 'MP',
          pinCode: '471105'
        },
        paymentMethod: 'COD'
      });

    expect(res.status).toBe(201);
    expect(res.body.isTestOrder).toBe(true);

    // Verify stock is preserved
    const afterProduct = await Product.findById(testProduct._id);
    expect(afterProduct.stock).toBe(initialStock);

    // Verify admin received in-app notice
    const adminDoc = await User.findById(adminUser._id);
    const inAppNotice = adminDoc.notifications.find(n => n.title === 'Tester Order Placed');
    expect(inAppNotice).toBeDefined();
  });

  test('Normal user placing COD order: isTestOrder=false, stock IS deducted', async () => {
    const initialProduct = await Product.findById(testProduct._id);
    const initialStock = initialProduct.stock;

    const res = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${normalToken}`)
      .send({
        items: [{ product: testProduct._id, name: testProduct.name, price: testProduct.price, quantity: 2 }],
        totalAmount: 300,
        shippingAddress: {
          fullName: 'Customer Name',
          mobile: '9876543211',
          houseNo: '14',
          street: 'Market Road',
          city: 'Bamitha',
          state: 'MP',
          pinCode: '471105'
        },
        paymentMethod: 'COD'
      });

    expect(res.status).toBe(201);
    expect(res.body.isTestOrder).toBe(false);

    const afterProduct = await Product.findById(testProduct._id);
    expect(afterProduct.stock).toBe(initialStock - 2);
  });

  test('Notification service suppresses external alerts for test orders', async () => {
    const testOrder = await Order.findOne({ isTestOrder: true });
    expect(testOrder).toBeDefined();

    // Call notification service functions - should resolve cleanly with no external calls
    await expect(sendAdminOrderNotification(testOrder)).resolves.toBeUndefined();
    await expect(sendCustomerOrderNotification(testOrder, 'Placed')).resolves.toBeUndefined();
  });

  test('Admin test-order bulk deletion deletes test orders and creates AuditLog', async () => {
    const preCount = await Order.countDocuments({ isTestOrder: true });
    expect(preCount).toBeGreaterThan(0);

    const res = await request
      .delete('/api/orders/admin/test-orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBe(preCount);

    const postCount = await Order.countDocuments({ isTestOrder: true });
    expect(postCount).toBe(0);

    const audit = await AuditLog.findOne({ action: 'DELETE_TEST_ORDERS' });
    expect(audit).toBeDefined();
    expect(audit.admin_id.toString()).toBe(adminUser._id.toString());
  });
});

describe('Step 3: Review Reporting (UGC Policy)', () => {
  let createdReview;

  beforeAll(async () => {
    // Deliver an order so normal user is eligible
    const deliveredOrder = await Order.create({
      user: normalUser._id,
      items: [{ product: testProduct._id, name: testProduct.name, price: testProduct.price, quantity: 1 }],
      totalAmount: 150,
      shippingAddress: { fullName: 'A', mobile: '9999999999', houseNo: '1', street: 'S', city: 'C', state: 'S', pinCode: '471105' },
      status: 'Delivered',
      paymentMethod: 'COD'
    });

    createdReview = await Review.create({
      user_id: normalUser._id,
      product_id: testProduct._id,
      order_id: deliveredOrder._id,
      rating: 5,
      comment: 'Super fast delivery and fresh quality!'
    });
  });

  test('Anonymous user cannot report a review (login required)', async () => {
    const res = await request
      .post(`/api/reviews/${createdReview._id}/report`)
      .send({ reason: 'Spam / Advertising' });

    expect(res.status).toBe(401);
  });

  test('Authenticated user can report review with valid reason', async () => {
    const res = await request
      .post(`/api/reviews/${createdReview._id}/report`)
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        reason: 'Spam / Advertising',
        details: 'Self promotion link in text'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Review.findById(createdReview._id);
    expect(updated.reportCount).toBe(1);
    expect(updated.reports.length).toBe(1);
  });

  test('User cannot report the same review twice', async () => {
    const res = await request
      .post(`/api/reviews/${createdReview._id}/report`)
      .set('Authorization', `Bearer ${testerToken}`)
      .send({ reason: 'Inappropriate content' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already reported/i);
  });

  test('Admin review list returns reported reviews with reportCount and can hide them', async () => {
    const res = await request
      .get('/api/reviews/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const r = res.body.find(x => x._id.toString() === createdReview._id.toString());
    expect(r).toBeDefined();
    expect(r.reportCount).toBe(1);

    // Admin hides review
    const hideRes = await request
      .put(`/api/reviews/admin/${createdReview._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'hidden' });

    expect(hideRes.status).toBe(200);
    expect(hideRes.body.status).toBe('hidden');
  });
});

describe('Step 4: In-App Feedback Mechanism', () => {
  test('Anonymous user cannot submit feedback', async () => {
    const res = await request
      .post('/api/feedback')
      .send({ category: 'Bug', message: 'Test bug description' });

    expect(res.status).toBe(401);
  });

  test('Authenticated user submits feedback with auto-attached version & device model', async () => {
    const res = await request
      .post('/api/feedback')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        category: 'Bug',
        message: 'Cart total does not update immediately when removing an item',
        appVersion: '1.0.0',
        deviceModel: 'Pixel 7',
        platform: 'android'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.feedbackId).toBeDefined();

    const stored = await FeedbackMessage.findById(res.body.feedbackId);
    expect(stored.user_id.toString()).toBe(testerUser._id.toString());
    expect(stored.category).toBe('Bug');
    expect(stored.appVersion).toBe('1.0.0');
    expect(stored.deviceModel).toBe('Pixel 7');
  });

  test('Admin can list feedback, update status, and export CSV', async () => {
    const listRes = await request
      .get('/api/feedback/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);
    const feedbackItem = listRes.body[0];

    const updateRes = await request
      .put(`/api/feedback/admin/${feedbackItem._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reviewed', adminNotes: 'Fix scheduled in next build' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.feedback.status).toBe('reviewed');

    const csvRes = await request
      .get('/api/feedback/admin/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    expect(csvRes.text).toContain('ID,Date,User Name');
  });
});
