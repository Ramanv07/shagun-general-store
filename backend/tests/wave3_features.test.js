import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import Review from '../models/Review.js';
import WishlistItem from '../models/WishlistItem.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import authRoutes from '../routes/authRoutes.js';
import bcrypt from 'bcryptjs';

jest.setTimeout(60000);
process.env.JWT_SECRET = 'test_jwt_secret_key_32_characters_long_min';
process.env.NODE_ENV = 'test';
process.env.ALLOW_TEST_OTP = 'true';

let mongod;
let app;
let request;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('W3-01: Timestamp alias createdAt on Review and Wishlist', () => {
  test('FAILS before fix: Review document exposes both created_at and createdAt', async () => {
    const dummyId = new mongoose.Types.ObjectId();
    const review = await Review.create({
      user_id: dummyId,
      product_id: dummyId,
      order_id: dummyId,
      rating: 4,
      comment: 'Timestamp alias test',
      status: 'approved',
      created_at: new Date('2026-11-01T10:00:00Z')
    });

    const json = review.toJSON();
    expect(json.created_at).toBeDefined();
    expect(json.createdAt).toBeDefined();
    expect(new Date(json.createdAt).toISOString()).toBe(new Date(json.created_at).toISOString());
  });

  test('FAILS before fix: WishlistItem document exposes both created_at and createdAt', async () => {
    const dummyId = new mongoose.Types.ObjectId();
    const item = await WishlistItem.create({
      user_id: dummyId,
      product_id: dummyId,
      created_at: new Date('2026-11-01T10:00:00Z')
    });

    const json = item.toJSON();
    expect(json.created_at).toBeDefined();
    expect(json.createdAt).toBeDefined();
    expect(new Date(json.createdAt).toISOString()).toBe(new Date(json.created_at).toISOString());
  });
});

describe('W3-03: In-app password reset OTP flow', () => {
  let registeredUser;
  const testPhone = '9876543210';
  const initialPassword = 'OldPassword123!';
  const newPassword = 'NewSecretPassword456!';

  beforeEach(async () => {
    await User.deleteMany({});
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(initialPassword, salt);
    registeredUser = await User.create({
      name: 'Password Reset Test User',
      email: 'reset_test@example.com',
      phone: testPhone,
      password: hashedPassword,
      tokenVersion: 1
    });
  });

  test('FAILS before fix: POST /api/auth/forgot-password sends OTP for registered phone', async () => {
    // 1. Unknown phone should return 404
    const unknownRes = await request.post('/api/auth/forgot-password').send({ phone: '9999999999' });
    expect(unknownRes.status).toBe(404);

    // 2. Registered phone should return 200 and dispatch OTP
    const validRes = await request.post('/api/auth/forgot-password').send({ phone: testPhone });
    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.testOtp).toBeDefined();

    const otp = validRes.body.testOtp;

    // 3. Reset password with wrong OTP returns 400
    const failRes = await request.post('/api/auth/reset-password').send({
      phone: testPhone,
      otp: '000000',
      newPassword
    });
    expect(failRes.status).toBe(400);

    // 4. Reset password with correct OTP returns 200, updates password and increments tokenVersion
    const successRes = await request.post('/api/auth/reset-password').send({
      phone: testPhone,
      otp,
      newPassword
    });
    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);

    // Verify user in DB has updated tokenVersion and new password
    const updated = await User.findById(registeredUser._id);
    expect(updated.tokenVersion).toBe(2);
    const isNewMatch = await bcrypt.compare(newPassword, updated.password);
    expect(isNewMatch).toBe(true);
  });
});
