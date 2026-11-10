import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import Review from '../models/Review.js';
import WishlistItem from '../models/WishlistItem.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import authRoutes, { _testClearOtpStores } from '../routes/authRoutes.js';
import { sendOtp, setTestMockTransporter } from '../services/otpService.js';
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

describe('W3-03 & OTP Delivery: In-app password reset OTP hardening', () => {
  let registeredUser;
  const testEmail = 'reset_user@example.com';
  const testPhone = '9876543210';
  const initialPassword = 'OldPassword123!';
  const newPassword = 'NewSecretPassword456!';
  let dispatchedMails = [];

  beforeEach(async () => {
    await User.deleteMany({});
    if (typeof _testClearOtpStores === 'function') _testClearOtpStores();
    dispatchedMails = [];
    setTestMockTransporter({
      sendMail: async (opts) => {
        dispatchedMails.push(opts);
        return { success: true, messageId: 'test-mail-id' };
      }
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(initialPassword, salt);
    registeredUser = await User.create({
      name: 'Password Reset Test User',
      email: testEmail,
      phone: testPhone,
      password: hashedPassword,
      tokenVersion: 1
    });
  });

  afterAll(() => {
    setTestMockTransporter(null);
  });

  test('sendOtp email channel unit test with mock transporter (no real emails sent)', async () => {
    const res = await sendOtp({ channel: 'email', to: 'customer@example.com', code: '654321' });
    expect(res.success).toBe(true);
    expect(dispatchedMails.length).toBe(1);
    expect(dispatchedMails[0].to).toBe('customer@example.com');
  });

  test('Generic response returned whether account exists or not (prevents user enumeration)', async () => {
    // 1. Unknown user request
    const unknownRes = await request.post('/api/auth/forgot-password').send({ email: 'nonexistent@example.com' });
    expect(unknownRes.status).toBe(200);
    expect(unknownRes.body.success).toBe(true);
    expect(unknownRes.body.message).toContain('6-digit verification code has been sent');

    // 2. Known user request
    const knownRes = await request.post('/api/auth/forgot-password').send({ email: testEmail });
    expect(knownRes.status).toBe(200);
    expect(knownRes.body.success).toBe(true);
    expect(knownRes.body.message).toBe(unknownRes.body.message);
  });

  test('Full reset flow with 5 failed attempts triggering 15-minute lockout and OTP single use', async () => {
    const initRes = await request.post('/api/auth/forgot-password').send({ email: testEmail });
    expect(initRes.status).toBe(200);
    const otp = initRes.body.testOtp;
    expect(otp).toBeDefined();

    // 4 wrong attempts
    for (let i = 0; i < 4; i++) {
      const failRes = await request.post('/api/auth/reset-password').send({
        email: testEmail,
        otp: '000000',
        newPassword
      });
      expect(failRes.status).toBe(400);
      expect(failRes.body.message).toContain('remaining');
    }

    // 5th wrong attempt triggers lockout
    const lockRes = await request.post('/api/auth/reset-password').send({
      email: testEmail,
      otp: '000000',
      newPassword
    });
    expect(lockRes.status).toBe(429);
    expect(lockRes.body.message).toContain('15 minutes');

    // Even correct OTP is blocked during lockout
    const blockedRes = await request.post('/api/auth/reset-password').send({
      email: testEmail,
      otp,
      newPassword
    });
    expect(blockedRes.status).toBe(429);
  });

  test('Successful reset: password updated, tokenVersion incremented, OTP single-use', async () => {
    const user2 = await User.create({
      name: 'User 2',
      email: 'user2@example.com',
      phone: '9123456789',
      password: await bcrypt.hash('InitialPass123', 10),
      tokenVersion: 3
    });

    const initRes = await request.post('/api/auth/forgot-password').send({ email: 'user2@example.com' });
    const otp = initRes.body.testOtp;

    const resetRes = await request.post('/api/auth/reset-password').send({
      email: 'user2@example.com',
      otp,
      newPassword
    });
    expect(resetRes.status).toBe(200);

    // Verify tokenVersion incremented and password changed
    const updated = await User.findById(user2._id);
    expect(updated.tokenVersion).toBe(4);
    const isNew = await bcrypt.compare(newPassword, updated.password);
    expect(isNew).toBe(true);

    // Verify single-use: Reusing same OTP fails
    const reuseRes = await request.post('/api/auth/reset-password').send({
      email: 'user2@example.com',
      otp,
      newPassword: 'AnotherPassword999!'
    });
    expect(reuseRes.status).toBe(400);
  });
});
