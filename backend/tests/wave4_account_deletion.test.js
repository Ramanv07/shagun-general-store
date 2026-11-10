import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import OtpSession from '../models/OtpSession.js';
import WishlistItem from '../models/WishlistItem.js';
import Rental from '../models/Rental.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import authRoutes, { _testClearOtpStores } from '../routes/authRoutes.js';
import reviewRoutes from '../routes/reviewRoutes.js';
import { up as runMigration001 } from '../migrations/001_unique_indexes.js';

let mongod;
let app;
let request;

process.env.JWT_SECRET = 'test_jwt_secret_wave4_deletion';
process.env.ALLOW_TEST_OTP = 'true';
process.env.ALLOW_TEST_GOOGLE_AUTH = 'true';
process.env.NODE_ENV = 'development';

function createApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', authRoutes);
  a.use('/api/reviews', reviewRoutes);
  return a;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await runMigration001();
  app = createApp();
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await _testClearOtpStores();
  await User.deleteMany({});
  await Order.deleteMany({});
  await Review.deleteMany({});
  await Product.deleteMany({});
  await AuditLog.deleteMany({});
  await OtpSession.deleteMany({});
  await WishlistItem.deleteMany({});
  await Rental.deleteMany({});
  await Appointment.deleteMany({});
  await Notification.deleteMany({});
});

describe('Wave 4 Account Deletion & Anonymization Compliance', () => {

  test('1. Wrong password returns 401', async () => {
    const salt = await bcrypt.genSalt(10);
    const user = await User.create({
      name: 'Test Customer',
      email: 'customer1@test.com',
      password: await bcrypt.hash('CorrectPass123', salt),
      role: 'user',
      tokenVersion: 0
    });

    const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    const res = await request
      .post('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword999' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/incorrect password/i);

    // Verify user is NOT deleted
    const stillExists = await User.findById(user._id);
    expect(stillExists.email).toBe('customer1@test.com');
  });

  test('2. Last admin blocked from self-deletion', async () => {
    const salt = await bcrypt.genSalt(10);
    const adminUser = await User.create({
      name: 'Master Admin',
      email: 'admin@shagunmart.com',
      password: await bcrypt.hash('AdminSecret123', salt),
      role: 'admin',
      tokenVersion: 0
    });

    const token = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    const res = await request
      .post('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'AdminSecret123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/last remaining administrator/i);
  });

  test('3. Active order blocks account deletion', async () => {
    const salt = await bcrypt.genSalt(10);
    const user = await User.create({
      name: 'Active Order Customer',
      email: 'activeorder@test.com',
      password: await bcrypt.hash('Pass12345', salt),
      role: 'user',
      tokenVersion: 0
    });

    const order = await Order.create({
      user: user._id,
      items: [{ name: 'Bridal Bangle Set', price: 499, quantity: 1 }],
      totalAmount: 499,
      shippingAddress: {
        fullName: 'Active Order Customer',
        mobile: '9876543210',
        houseNo: '12',
        street: 'Main Road',
        city: 'Bamitha',
        state: 'MP',
        pinCode: '471105'
      },
      status: 'Processing'
    });

    const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    const res = await request
      .post('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Pass12345' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/active order/i);
  });

  test('4. Google-only user deletion with test token and OTP', async () => {
    const googleUser = await User.create({
      name: 'Google Customer',
      email: 'googleuser@test.com',
      password: '',
      googleId: 'google_oauth_12345',
      role: 'user',
      tokenVersion: 0
    });

    const token = jwt.sign({ id: googleUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    // Attempt without credential should fail
    const resNoCred = await request
      .post('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(resNoCred.status).toBe(401);

    // Attempt with valid Google test token
    const resSuccess = await request
      .post('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ googleIdToken: 'test_google_token' });

    expect(resSuccess.status).toBe(200);
    expect(resSuccess.body.success).toBe(true);
  });

  test('5. Successful deletion: anonymization, old JWT rejected (401), reviews preserved as Deleted User, order totals intact, re-registration works, no PII in AuditLog', async () => {
    const salt = await bcrypt.genSalt(10);
    const originalEmail = 'john.doe@example.com';
    const originalPhone = '9876543210';

    const user = await User.create({
      name: 'John Doe',
      email: originalEmail,
      phone: originalPhone,
      password: await bcrypt.hash('JohnPass123', salt),
      role: 'user',
      addresses: [{
        fullName: 'John Doe',
        mobile: originalPhone,
        houseNo: 'House 55',
        street: 'Market St',
        city: 'Bamitha',
        state: 'MP',
        pinCode: '471105'
      }],
      tokenVersion: 0
    });

    const product = await Product.create({
      name: 'Luxury Silk Saree',
      price: 2500,
      category: 'Clothing',
      image: '/images/saree.jpg',
      description: 'Elegant silk saree with gold border',
      stock: 5
    });

    // Delivered past order
    const pastOrder = await Order.create({
      user: user._id,
      items: [{ product: product._id, name: 'Luxury Silk Saree', price: 2500, quantity: 1 }],
      totalAmount: 2500,
      shippingAddress: {
        fullName: 'John Doe',
        mobile: originalPhone,
        houseNo: 'House 55',
        street: 'Market St',
        city: 'Bamitha',
        state: 'MP',
        pinCode: '471105'
      },
      status: 'Delivered'
    });

    // Review on the delivered product
    const review = await Review.create({
      user_id: user._id,
      product_id: product._id,
      order_id: pastOrder._id,
      rating: 5,
      comment: 'Absolutely stunning quality and craftsmanship!',
      status: 'approved'
    });

    // Active token
    const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    // Call DELETE ACCOUNT
    const res = await request
      .post('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'JohnPass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 1. Check user record is anonymized
    const anonymizedUser = await User.findById(user._id);
    expect(anonymizedUser.name).toBe('Deleted User');
    expect(anonymizedUser.email).toBe(`deleted_${user._id}@deleted.invalid`);
    expect(anonymizedUser.phone).toBe('');
    expect(anonymizedUser.password).toBe('');
    expect(anonymizedUser.addresses.length).toBe(0);
    expect(anonymizedUser.tokenVersion).toBe(1);

    // 2. Old JWT must be rejected (401)
    const resOldToken = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(resOldToken.status).toBe(401);

    // 3. Review text kept, author shows 'Deleted User'
    const reviewRes = await request.get(`/api/reviews/product/${product._id}`);
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.reviews.length).toBe(1);
    expect(reviewRes.body.reviews[0].comment).toBe('Absolutely stunning quality and craftsmanship!');
    expect(reviewRes.body.reviews[0].user).toBe('Deleted User');

    // 4. Order totals intact, PII scrubbed
    const savedOrder = await Order.findById(pastOrder._id);
    expect(savedOrder.totalAmount).toBe(2500);
    expect(savedOrder.items[0].price).toBe(2500);
    expect(savedOrder.shippingAddress.fullName).toBe('Deleted User');
    expect(savedOrder.shippingAddress.mobile).toBe('0000000000');
    expect(savedOrder.shippingAddress.houseNo).toBe('Redacted');
    expect(savedOrder.shippingAddress.street).toBe('Redacted');
    expect(savedOrder.shippingAddress.city).toBe('Bamitha'); // Non-PII locality retained for aggregate metrics

    // 5. Re-registration with the same original email works cleanly
    const registerRes = await request
      .post('/api/auth/register')
      .send({
        name: 'New John Doe',
        email: originalEmail,
        password: 'BrandNewPassword123'
      });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.email).toBe(originalEmail.toLowerCase());

    // 6. AuditLog created with NO PII
    const logs = await AuditLog.find({ action: 'account_deleted' });
    expect(logs.length).toBe(1);
    expect(String(logs[0].entity_id)).toBe(String(user._id));
    expect(logs[0].before_snapshot).toBeNull();
    // Verify no PII in log record
    const logStr = JSON.stringify(logs[0]);
    expect(logStr).not.toContain(originalEmail);
    expect(logStr).not.toContain(originalPhone);
    expect(logStr).not.toContain('John Doe');
  });

  test('6. DELETE /api/auth/profile parity: rejects request without password/proof, succeeds with valid password', async () => {
    const salt = await bcrypt.genSalt(10);
    const user = await User.create({
      name: 'Mobile Profile User',
      email: 'mobile.profile@test.com',
      password: await bcrypt.hash('MobilePass123', salt),
      role: 'user',
      tokenVersion: 0
    });

    const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    // 1. Valid JWT alone without password/proof -> MUST be rejected (400)
    const resNoProof = await request
      .delete('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(resNoProof.status).toBe(400);
    expect(resNoProof.body.message).toMatch(/password is required/i);

    // 2. Wrong password -> 401
    const resWrongPass = await request
      .delete('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword' });
    expect(resWrongPass.status).toBe(401);

    // 3. Valid password -> 200 and anonymization
    const resSuccess = await request
      .delete('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'MobilePass123' });
    expect(resSuccess.status).toBe(200);
    expect(resSuccess.body.success).toBe(true);

    const deletedUser = await User.findById(user._id);
    expect(deletedUser.name).toBe('Deleted User');
    expect(deletedUser.email).toBe(`deleted_${user._id}@deleted.invalid`);
  });

  test('7. Exhaustive DB scan: after deletion, original email, phone, name and address appear in ZERO raw documents across ALL collections', async () => {
    const salt = await bcrypt.genSalt(10);
    const targetName = 'Aarav Sharma';
    const targetEmail = 'aarav.sharma@domain.in';
    const targetPhone = '9811223344';
    const targetHouse = 'Villa 77';
    const targetStreet = 'Silver Oak Lane';

    const user = await User.create({
      name: targetName,
      email: targetEmail,
      phone: targetPhone,
      password: await bcrypt.hash('AaravSecret123', salt),
      role: 'user',
      addresses: [{
        fullName: targetName,
        mobile: targetPhone,
        houseNo: targetHouse,
        street: targetStreet,
        city: 'Bamitha',
        state: 'MP',
        pinCode: '471105'
      }],
      tokenVersion: 0
    });

    const product = await Product.create({
      name: 'Designer Lehenga Red',
      price: 5000,
      category: 'Clothing',
      image: '/images/lehenga.jpg',
      description: 'Handcrafted wedding lehenga',
      stock: 3
    });

    // 1. Seed Order
    await Order.create({
      user: user._id,
      items: [{ product: product._id, name: 'Designer Lehenga Red', price: 5000, quantity: 1 }],
      totalAmount: 5000,
      shippingAddress: {
        fullName: targetName,
        mobile: targetPhone,
        houseNo: targetHouse,
        street: targetStreet,
        city: 'Bamitha',
        state: 'MP',
        pinCode: '471105'
      },
      status: 'Delivered'
    });

    // 2. Seed Rental
    await Rental.create({
      lehenga: product._id,
      lehengaName: 'Designer Lehenga Red',
      user: user._id,
      customerName: targetName,
      customerPhone: targetPhone,
      customerEmail: targetEmail,
      startDate: new Date('2026-10-01'),
      returnDate: new Date('2026-10-04'),
      rentalPrice: 2000,
      totalAmount: 2000,
      status: 'Returned',
      notes: `Special delivery for ${targetName} at ${targetHouse}`
    });

    // 3. Seed Appointment
    await Appointment.create({
      user: user._id,
      serviceId: 'srv_bridal_makeup',
      serviceName: 'Bridal Makeup',
      price: 2500,
      date: '2026-10-02',
      slot: '10:00 AM',
      customerName: targetName,
      customerPhone: targetPhone,
      notes: `Contact ${targetName} on ${targetPhone}`,
      status: 'Completed'
    });

    // 4. Seed Review
    await Review.create({
      user_id: user._id,
      product_id: product._id,
      order_id: new mongoose.Types.ObjectId(),
      rating: 5,
      comment: 'Excellent bridal wear and great fit',
      status: 'approved'
    });

    // 5. Seed Notification
    await Notification.create({
      user_id: user._id,
      title: 'Order Delivered',
      body: `Order delivered to ${targetName} at ${targetHouse}, ${targetStreet}`
    });

    // 6. Seed OtpSession
    await OtpSession.create({
      identifier: targetEmail,
      hashedOtp: 'some_hashed_otp_value',
      expiresAt: new Date(Date.now() + 600000)
    });

    // 7. Seed WishlistItem
    await WishlistItem.create({
      user_id: user._id,
      product_id: product._id
    });

    const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    // Perform deletion
    const delRes = await request
      .post('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'AaravSecret123' });

    expect(delRes.status).toBe(200);

    // Deep inspect ALL collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    expect(collections.length).toBeGreaterThan(5);

    const sensitiveTerms = [targetName, targetEmail, targetPhone, targetHouse, targetStreet];

    for (const col of collections) {
      const rawDocs = await mongoose.connection.db.collection(col.name).find({}).toArray();
      const rawJson = JSON.stringify(rawDocs);

      for (const term of sensitiveTerms) {
        const found = rawJson.includes(term);
        if (found) {
          console.error(`Leak detected in collection "${col.name}" for term "${term}":`, rawJson);
        }
        expect(found).toBe(false);
      }
    }
  });

});
