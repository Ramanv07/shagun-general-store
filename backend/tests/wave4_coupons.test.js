import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import couponRoutes from '../routes/couponRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import jwt from 'jsonwebtoken';

jest.setTimeout(60000);
process.env.JWT_SECRET = 'test_jwt_secret_key_32_characters_long_min';

let mongod;
let app;
let request;
let user1, user2, adminUser;
let user1Token, user2Token, adminToken;
let testProduct;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = express();
  app.use(express.json());
  app.use('/api/coupons', couponRoutes);
  app.use('/api/orders', orderRoutes);
  request = supertest(app);

  user1 = await User.create({
    name: 'Coupon User 1',
    email: 'cuser1@test.com',
    password: 'Password123!',
    role: 'user',
    tokenVersion: 0
  });
  user2 = await User.create({
    name: 'Coupon User 2',
    email: 'cuser2@test.com',
    password: 'Password123!',
    role: 'user',
    tokenVersion: 0
  });
  adminUser = await User.create({
    name: 'Coupon Admin',
    email: 'cadmin@test.com',
    password: 'Password123!',
    role: 'admin',
    tokenVersion: 0
  });

  user1Token = jwt.sign({ id: user1._id, tokenVersion: 0 }, process.env.JWT_SECRET);
  user2Token = jwt.sign({ id: user2._id, tokenVersion: 0 }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

  testProduct = await Product.create({
    name: 'Test Shampoo Bottle',
    description: 'Quality shampoo bottle for thorough hair care and cleansing.',
    price: 500,
    mrp: 600,
    stock: 50,
    category: 'Hair Care',
    image: 'https://res.cloudinary.com/shagun/image/upload/v1/shampoo.jpg'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('B2: Coupons Validation, Edge Cases & Atomic Order Flow', () => {
  beforeEach(async () => {
    await Coupon.deleteMany({});
    await CouponRedemption.deleteMany({});
    await Order.deleteMany({});
  });

  test('FAILS: Rejects expired, not_started, below_minimum, and inactive coupons', async () => {
    // 1. Inactive coupon
    await Coupon.create({
      code: 'INACTIVE50',
      type: 'flat',
      value: 50,
      active: false
    });
    const inactiveRes = await request
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ code: 'INACTIVE50', items: [{ product: testProduct._id, quantity: 1 }] });
    expect(inactiveRes.status).toBe(400);
    expect(inactiveRes.body.reason).toBe('inactive');

    // 2. Expired coupon
    await Coupon.create({
      code: 'EXPIRED20',
      type: 'percent',
      value: 20,
      endAt: new Date(Date.now() - 3600000),
      active: true
    });
    const expiredRes = await request
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ code: 'EXPIRED20', items: [{ product: testProduct._id, quantity: 1 }] });
    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.reason).toBe('expired');

    // 3. Not started coupon
    await Coupon.create({
      code: 'FUTURE10',
      type: 'percent',
      value: 10,
      startAt: new Date(Date.now() + 3600000),
      active: true
    });
    const futureRes = await request
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ code: 'FUTURE10', items: [{ product: testProduct._id, quantity: 1 }] });
    expect(futureRes.status).toBe(400);
    expect(futureRes.body.reason).toBe('not_started');

    // 4. Below minimum order amount
    await Coupon.create({
      code: 'MIN1000',
      type: 'flat',
      value: 100,
      minOrderAmount: 1000,
      active: true
    });
    const minRes = await request
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ code: 'MIN1000', items: [{ product: testProduct._id, quantity: 1 }] }); // 500 < 1000
    expect(minRes.status).toBe(400);
    expect(minRes.body.reason).toBe('below_minimum');
  });

  test('Validates coupon discount authoritatively and enforces maxDiscount cap on percent', async () => {
    // 50% discount with max cap of ₹100
    await Coupon.create({
      code: 'HALFMAX100',
      type: 'percent',
      value: 50,
      maxDiscount: 100,
      minOrderAmount: 200,
      active: true
    });

    const res = await request
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ code: 'HALFMAX100', items: [{ product: testProduct._id, quantity: 1 }] }); // 500 -> 50% = 250, capped at 100
    expect(res.status).toBe(200);
    expect(res.body.discount).toBe(100);
    expect(res.body.valid).toBe(true);
  });

  test('Enforces per-user limit and total usage limit', async () => {
    const coupon = await Coupon.create({
      code: 'ONETIMEONLY',
      type: 'flat',
      value: 50,
      usageLimitTotal: 1,
      usageLimitPerUser: 1,
      active: true
    });

    // Simulate redemption by user 1
    await CouponRedemption.create({
      coupon: coupon._id,
      user: user1._id,
      order: new mongoose.Types.ObjectId(),
      amount: 50
    });
    coupon.usedCount = 1;
    await coupon.save();

    // User 1 tries again -> already_used
    const user1Res = await request
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ code: 'ONETIMEONLY', items: [{ product: testProduct._id, quantity: 1 }] });
    expect(user1Res.status).toBe(400);
    expect(user1Res.body.reason).toBe('already_used');

    // User 2 tries -> limit_reached
    const user2Res = await request
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ code: 'ONETIMEONLY', items: [{ product: testProduct._id, quantity: 1 }] });
    expect(user2Res.status).toBe(400);
    expect(user2Res.body.reason).toBe('limit_reached');
  });

  test('Order flow ignores client discount, validates couponCode atomically, and saves discount', async () => {
    await Coupon.create({
      code: 'SAVE100',
      type: 'flat',
      value: 100,
      minOrderAmount: 300,
      active: true,
      usageLimitTotal: 10,
      usageLimitPerUser: 1
    });

    // User orders with couponCode 'SAVE100' and tampered client discount of ₹9999
    const orderRes = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        items: [{ product: testProduct._id, quantity: 1 }], // ₹500
        shippingAddress: {
          fullName: 'Coupon Tester',
          mobile: '9876543210',
          houseNo: '12B',
          street: 'Main Road',
          city: 'Bamitha',
          state: 'Madhya Pradesh',
          pinCode: '471105'
        },
        paymentMethod: 'COD',
        totalAmount: 9999, // Tampered client total! Server will override
        couponCode: 'SAVE100',
        discount: 9999 // Client tampering attempt!
      });

    if (orderRes.status !== 201) {
      console.log('Order creation failed with:', orderRes.body);
    }
    expect(orderRes.status).toBe(201);
    const order = orderRes.body;
    expect(order.couponCode).toBe('SAVE100');
    expect(order.discountAmount).toBe(100);
    // Subtotal 500 >= 399 threshold -> free delivery (0)
    // Total = 500 - 100 = 400
    expect(order.totalAmount).toBe(400);

    // Verify atomic usedCount increment
    const couponAfter = await Coupon.findOne({ code: 'SAVE100' });
    expect(couponAfter.usedCount).toBe(1);

    // Verify redemption record exists
    const redemption = await CouponRedemption.findOne({ order: order._id });
    expect(redemption).toBeDefined();
    expect(redemption.amount).toBe(100);
  });
});
