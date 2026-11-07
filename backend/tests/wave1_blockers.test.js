import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/authRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

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
  app.use('/api/orders', orderRoutes);
  request = supertest(app);

  // Seed Admin
  await User.create({
    name: 'Real Admin',
    email: 'admin@shagun.com',
    password: 'hashed_admin_password',
    phone: '9876543210',
    role: 'admin'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('W1-02: Google Login Verification', () => {
  test('FAILS: Rejects unauthenticated request sending raw email without idToken', async () => {
    const res = await request
      .post('/api/auth/google')
      .send({ email: 'admin@shagun.com', name: 'Imposter' });

    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
    expect(res.body.message).toMatch(/idToken|Google token/i);
  });
});

describe('W1-03 & W1-04: OTP Backdoor & Secure Hashed Verification', () => {
  test('FAILS: Rejects hardcoded backdoor 123456 in production or default mode', async () => {
    delete process.env.ALLOW_TEST_OTP;
    const res = await request
      .post('/api/auth/verify-otp')
      .send({ phone: '9123456789', otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.verified).toBeUndefined();
  });

  test('FAILS: Blocks resend spamming within 60-second cooldown', async () => {
    delete process.env.ALLOW_TEST_OTP;
    const phone = '9876501234';
    await request.post('/api/auth/send-otp').send({ phone });
    const resend = await request.post('/api/auth/send-otp').send({ phone });

    expect(resend.status).toBe(429);
    expect(resend.body.message).toMatch(/wait|cooldown/i);
  });
});

describe('W1-05 & W1-06: Order Price Tampering & Overselling Prevention', () => {
  let testUserToken;
  let testProduct;

  beforeAll(async () => {
    const testUser = await User.create({
      name: 'Order Tester',
      email: 'order_test@shagun.com',
      password: 'hashed_password',
      phone: '9876500000',
      role: 'user'
    });
    testUserToken = jwt.sign({ id: testUser._id, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    testProduct = await Product.create({
      name: 'Expensive Silk Serum',
      price: 1500,
      mrp: 2000,
      stock: 5,
      category: 'Skin Care',
      description: 'Luxury serum',
      image: 'https://res.cloudinary.com/demo/image/upload/serum.jpg'
    });
  });

  test('FAILS: Overrides client-tampered price ₹1 and calculates correct DB price', async () => {
    const res = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        items: [{
          product: testProduct._id,
          name: 'Expensive Silk Serum',
          price: 1, // Attacker tamper attempt
          quantity: 2
        }],
        totalAmount: 2, // Attacker total
        shippingAddress: {
          fullName: 'Order Tester',
          mobile: '9876500000',
          houseNo: '10',
          street: 'Main Road',
          city: 'Bamitha',
          state: 'Madhya Pradesh',
          pinCode: '471105'
        }
      });

    // Currently server blindly saves price: 1 and totalAmount: 2!
    expect(res.status).toBe(201);
    expect(res.body.items[0].price).toBe(1500);
    expect(res.body.totalAmount).toBe(3000);
  });
});


describe('W1-07: Rental Price Tampering & Date Conflict Guards', () => {
  let testLehenga;
  let rentalApp;
  let rentalRequest;
  let rentalUserToken;

  beforeAll(async () => {
    rentalApp = express();
    rentalApp.use(express.json());
    const { default: rentalRoutes } = await import('../routes/rentalRoutes.js');
    rentalApp.use('/api/rentals', rentalRoutes);
    rentalRequest = supertest(rentalApp);

    const rentalUser = await User.create({
      name: 'Rental Tester',
      email: `rental_${Date.now()}@shagun.com`,
      password: 'hashed_password',
      phone: '9876543210',
      role: 'user'
    });
    rentalUserToken = jwt.sign({ id: rentalUser._id, role: rentalUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    testLehenga = await Product.create({
      name: 'Royal Crimson Bridal Lehenga',
      price: 5000, // Real rental price
      mrp: 25000,
      stock: 1,
      category: 'Bridal Lehenga',
      description: 'Handcrafted zardozi bridal lehenga',
      image: 'https://res.cloudinary.com/demo/image/upload/lehenga.jpg'
    });
  });

  test('FAILS: Rejects client-tampered rentalPrice ₹1 and enforces DB rental price', async () => {
    const today = new Date();
    const start = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const end = new Date(today.getTime() + 86400000 * 3).toISOString().split('T')[0];

    const res = await rentalRequest
      .post('/api/rentals')
      .set('Authorization', `Bearer ${rentalUserToken}`)
      .send({
        lehengaId: testLehenga._id,
        customerName: 'Priya Sharma',
        customerPhone: '9876543210',
        startDate: start,
        returnDate: end,
        rentalPrice: 1 // Attacker tampers to ₹1
      });

    expect(res.status).toBe(201);
    expect(res.body.rentalPrice).toBe(5000);
  });

  test('FAILS: Blocks overlapping rental bookings for same lehenga (returns 409)', async () => {
    const today = new Date();
    const start = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const end = new Date(today.getTime() + 86400000 * 3).toISOString().split('T')[0];

    // Attempt second booking for exact same dates
    const res = await rentalRequest
      .post('/api/rentals')
      .set('Authorization', `Bearer ${rentalUserToken}`)
      .send({
        lehengaId: testLehenga._id,
        customerName: 'Duplicate Customer',
        customerPhone: '9876500000',
        startDate: start,
        returnDate: end
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already booked|conflict/i);
  });
});

describe('W1-08: Parlour Appointment Past Date & Slot Collision Guards', () => {
  let apptApp;
  let apptRequest;
  let apptToken;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Appt User',
      email: 'appt_wave1@shagun.com',
      password: 'password_hash',
      phone: '9876543210',
      tokenVersion: 0
    });
    apptToken = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

    apptApp = express();
    apptApp.use(express.json());
    const { default: appointmentRoutes } = await import('../routes/appointmentRoutes.js');
    apptApp.use('/api/appointments', appointmentRoutes);
    apptRequest = supertest(apptApp);
  });

  test('FAILS: Rejects appointment booking for past dates (400)', async () => {
    const res = await apptRequest
      .post('/api/appointments')
      .set('Authorization', `Bearer ${apptToken}`)
      .send({
        serviceId: 'srv_facial',
        serviceName: 'Hydra Facial',
        price: 999,
        date: '2020-01-01', // Past date
        slot: '10:00 AM - 11:00 AM',
        customerName: 'Late Visitor',
        customerPhone: '9876543210'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/past/i);
  });

  test('FAILS: Blocks appointment double-booking for the exact same slot (409)', async () => {
    const today = new Date();
    const futureDate = new Date(today.getTime() + 86400000 * 5).toISOString().split('T')[0];
    const slot = '02:00 PM - 03:00 PM';

    // First booking succeeds
    const first = await apptRequest
      .post('/api/appointments')
      .set('Authorization', `Bearer ${apptToken}`)
      .send({
        serviceId: 'srv_facial',
        serviceName: 'Hydra Facial',
        price: 999,
        date: futureDate,
        slot,
        customerName: 'First Client',
        customerPhone: '9876543210'
      });
    expect(first.status).toBe(201);

    // Second booking on same slot must be rejected with 409
    const second = await apptRequest
      .post('/api/appointments')
      .set('Authorization', `Bearer ${apptToken}`)
      .send({
        serviceId: 'srv_facial',
        serviceName: 'Hydra Facial',
        price: 999,
        date: futureDate,
        slot,
        customerName: 'Second Client',
        customerPhone: '9876500000'
      });

    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already booked|unavailable/i);
  });
});


describe('W1-09: Compound Unique Indexes on Reviews & Wishlist', () => {
  test('Prevents duplicate reviews for same user and product', async () => {
    const { up } = await import('../migrations/001_unique_indexes.js');
    await up();

    const { default: Review } = await import('../models/Review.js');
    const { default: Order } = await import('../models/Order.js');

    const dummyUser = new mongoose.Types.ObjectId();
    const dummyProduct = new mongoose.Types.ObjectId();
    const dummyOrder = new mongoose.Types.ObjectId();

    await Review.create({
      user_id: dummyUser,
      product_id: dummyProduct,
      order_id: dummyOrder,
      rating: 5,
      comment: 'First great review',
      status: 'approved'
    });

    let duplicateFailed = false;
    try {
      await Review.create({
        user_id: dummyUser,
        product_id: dummyProduct,
        order_id: dummyOrder,
        rating: 4,
        comment: 'Second review attempt',
        status: 'approved'
      });
    } catch (e) {
      duplicateFailed = (e.code === 11000);
    }

    expect(duplicateFailed).toBe(true);
  });
});

describe('W1-10: Category Sections Read-Only Safety', () => {
  test('GET /api/categories/sections returns defaults without writing to collection', async () => {
    const { default: categoryRoutes } = await import('../routes/categoryRoutes.js');
    const { default: CategorySection } = await import('../models/CategorySection.js');

    await CategorySection.deleteMany({});
    const countBefore = await CategorySection.countDocuments();
    expect(countBefore).toBe(0);

    const catApp = express();
    catApp.use('/api/categories', categoryRoutes);
    const catReq = supertest(catApp);

    const res = await catReq.get('/api/categories/sections');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Collection must remain 0 (no write-on-read)
    const countAfter = await CategorySection.countDocuments();
    expect(countAfter).toBe(0);
  });
});

describe('W1-11: Mounted Routes Verification', () => {
  test('GET /api/brands is accessible and does not 404', async () => {
    const { default: brandRoutes } = await import('../routes/brandRoutes.js');
    const bApp = express();
    bApp.use('/api/brands', brandRoutes);
    const bReq = supertest(bApp);

    const res = await bReq.get('/api/brands');
    expect(res.status).not.toBe(404);
  });
});
