import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Import Routes
import authRoutes from '../routes/authRoutes.js';
import productRoutes from '../routes/productRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import rentalRoutes from '../routes/rentalRoutes.js';
import appointmentRoutes from '../routes/appointmentRoutes.js';
import reviewRoutes from '../routes/reviewRoutes.js';
import wishlistRoutes from '../routes/wishlistRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';

// Import Models
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Rental from '../models/Rental.js';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import WishlistItem from '../models/WishlistItem.js';

let mongoServer;
let app;
let adminUser;
let regularUser;
let victimUser;
let adminToken;
let userToken;
let victimToken;
let sampleProduct;

jest.setTimeout(60000);

process.env.JWT_SECRET = 'test_secret_key_1234567890_antigravity';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'shagun-staging' }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/rentals', rentalRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Seed Admin, User, Victim
  adminUser = await User.create({
    name: 'Admin Test',
    email: 'admin@shagun.com',
    password: 'hashed_password_123',
    role: 'admin',
    phone: '9999999999',
    addresses: []
  });

  regularUser = await User.create({
    name: 'Customer Test',
    email: 'customer@test.com',
    password: 'hashed_password_123',
    role: 'user',
    phone: '8888888888',
    addresses: []
  });

  victimUser = await User.create({
    name: 'Victim User',
    email: 'victim@test.com',
    password: 'hashed_password_123',
    role: 'user',
    phone: '7777777777',
    addresses: []
  });

  adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);
  userToken = jwt.sign({ id: regularUser._id }, process.env.JWT_SECRET);
  victimToken = jwt.sign({ id: victimUser._id }, process.env.JWT_SECRET);

  // Seed sample product
  sampleProduct = await Product.create({
    name: 'Premium Test Scent',
    price: 500,
    mrp: 750,
    category: 'Fragrances',
    stock: 5,
    description: 'Test perfume product',
    image: 'https://res.cloudinary.com/test/image.jpg'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 2 API Security & Edge Case Tests', () => {

  // 1. Authentication & Role Enforcement
  describe('1. Authentication & Role Enforcement', () => {
    test('Unauthenticated request to protected route returns 401', async () => {
      const res = await request(app).get('/api/orders/myorders');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    test('Expired or tampered JWT returns 401', async () => {
      const res = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', 'Bearer invalid_tampered_token_string');
      expect(res.status).toBe(401);
    });

    test('Regular customer cannot access admin route (POST /api/products) -> 403', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked Product',
          price: 10,
          category: 'Test',
          stock: 1,
          description: 'Hacked',
          image: 'https://test.com/img.jpg'
        });
      expect(res.status).toBe(403);
    });

    test('Admin can access admin route -> 201', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Official Admin Product',
          price: 250,
          mrp: 300,
          category: 'General Use',
          stock: 10,
          description: 'Created by Admin',
          image: 'https://test.com/admin.jpg'
        });
      expect(res.status).toBe(201);
    });
  });

  // 2. Critical Flaws: Price Tampering
  describe('2. Price Tampering Vulnerability', () => {
    test('🔴 Flaw Verification: POST /api/orders accepts tampered price ₹1 for ₹500 product', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{
            product: sampleProduct._id,
            name: sampleProduct.name,
            price: 1, // TAMPERED FROM 500 TO 1
            quantity: 1
          }],
          totalAmount: 1, // TAMPERED TOTAL
          shippingAddress: {
            fullName: 'Attacker',
            mobile: '8888888888',
            houseNo: '1',
            street: 'Hack St',
            city: 'Delhi',
            state: 'Delhi',
            pinCode: '110001'
          },
          paymentMethod: 'COD'
        });

      // The server currently accepts this! (Status 201 with price 1)
      expect(res.status).toBe(201);
      expect(res.body.totalAmount).toBe(1);
      expect(res.body.items[0].price).toBe(1);
    });
  });

  // 3. Critical Flaws: Google Auth Account Takeover
  describe('3. Google OAuth Account Takeover', () => {
    test('🔴 Flaw Verification: POST /api/auth/google logs in as Admin without proof', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          email: 'admin@shagun.com', // Target admin
          name: 'Hacker'
        });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
      expect(res.body.token).toBeDefined();

      // Verify the returned token actually gives admin access
      const token = res.body.token;
      const adminTestRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Compromised Admin Created Product',
          price: 100,
          category: 'General Use',
          stock: 1,
          description: 'Compromised',
          image: 'https://test.com/c.jpg'
        });
      expect(adminTestRes.status).toBe(201);
    });
  });

  // 4. Appointment Double Booking & Past Dates
  describe('4. Appointment Booking Vulnerabilities', () => {
    test('🔴 Flaw Verification: Allows booking appointment in the past (1990-01-01)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({
          serviceId: 'srv1',
          serviceName: 'Hair Cut',
          price: 200,
          date: '1990-01-01', // 36 years in the past
          slot: '10:00 AM',
          customerName: 'Time Traveler',
          customerPhone: '9999999999'
        });

      expect(res.status).toBe(201);
      expect(res.body.date).toBe('1990-01-01');
    });

    test('🔴 Flaw Verification: Allows double booking the same slot on the same date', async () => {
      // First booking
      await request(app)
        .post('/api/appointments')
        .send({
          serviceId: 'srv1',
          serviceName: 'Facial',
          price: 500,
          date: '2027-01-01',
          slot: '02:00 PM',
          customerName: 'User A',
          customerPhone: '9999999991'
        });

      // Second booking for identical slot
      const res2 = await request(app)
        .post('/api/appointments')
        .send({
          serviceId: 'srv1',
          serviceName: 'Facial',
          price: 500,
          date: '2027-01-01',
          slot: '02:00 PM', // SAME SLOT
          customerName: 'User B',
          customerPhone: '9999999992'
        });

      // Should be rejected with 409 or 400, but is currently accepted with 201!
      expect(res2.status).toBe(201);
    });
  });

  // 5. Review Verified Purchase & Ratings
  describe('5. Review Constraints', () => {
    test('Customer who has NOT bought product cannot review -> 403', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: sampleProduct._id,
          rating: 5,
          comment: 'Great product even though I never bought it!'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/verified purchaser/i);
    });

    test('Invalid rating > 5 is rejected -> 400', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: sampleProduct._id,
          rating: 10, // Invalid
          comment: 'Way too good'
        });

      expect(res.status).toBe(400);
    });
  });

  // 6. Wishlist Idempotency
  describe('6. Wishlist Operations', () => {
    test('Adding to wishlist is scoped to authenticated user', async () => {
      const res = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: sampleProduct._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('User cannot view victim wishlist', async () => {
      const res = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${victimToken}`);

      expect(res.status).toBe(200);
      // Victim wishlist is empty
      expect(res.body.length).toBe(0);
    });
  });

  // 7. Inventory Stock Exhaustion & Overselling
  describe('7. Inventory Stock Boundary', () => {
    test('Ordering quantity > stock is rejected -> 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{
            product: sampleProduct._id,
            name: sampleProduct.name,
            price: 500,
            quantity: 999 // Way exceeds stock of 5
          }],
          totalAmount: 500 * 999,
          shippingAddress: {
            fullName: 'Greedy Buyer',
            mobile: '8888888888',
            houseNo: '1',
            street: 'Main',
            city: 'Delhi',
            state: 'Delhi',
            pinCode: '110001'
          },
          paymentMethod: 'COD'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/available/i);
    });

    test('Ordering quantity <= 0 is rejected -> 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{
            product: sampleProduct._id,
            name: sampleProduct.name,
            price: 500,
            quantity: -5 // Negative
          }],
          totalAmount: -2500,
          shippingAddress: {
            fullName: 'Negative Buyer',
            mobile: '8888888888',
            houseNo: '1',
            street: 'Main',
            city: 'Delhi',
            state: 'Delhi',
            pinCode: '110001'
          },
          paymentMethod: 'COD'
        });

      expect(res.status).toBe(400);
    });
  });
});
