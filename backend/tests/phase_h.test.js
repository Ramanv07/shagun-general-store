import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import paymentPreferenceRoutes from '../routes/paymentPreferenceRoutes.js';
import PaymentPreference from '../models/PaymentPreference.js';

const TEST_SECRET = 'test_jwt_secret_12345';
process.env.JWT_SECRET = TEST_SECRET;

const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

const app = express();
app.use(express.json());
app.use('/api/payment-preferences', paymentPreferenceRoutes);

describe('Phase H: Payment Preference Endpoints & User Isolation', () => {
  const userAId = new mongoose.Types.ObjectId('6ac6201521b7fb8a30761e01');
  const userBId = new mongoose.Types.ObjectId('6ac6201521b7fb8a30761e02');

  const tokenA = jwt.sign({ id: userAId.toString() }, TEST_SECRET);
  const tokenB = jwt.sign({ id: userBId.toString() }, TEST_SECRET);

  beforeAll(async () => {
    await mongoose.connect(STAGING_URI);
    const User = (await import('../models/User.js')).default;
    await User.updateOne(
      { _id: userAId },
      { $setOnInsert: { name: 'Test User A', email: 'test_user_a@example.com', password: 'hashedpassword', role: 'user' } },
      { upsert: true }
    );
    await User.updateOne(
      { _id: userBId },
      { $setOnInsert: { name: 'Test User B', email: 'test_user_b@example.com', password: 'hashedpassword', role: 'user' } },
      { upsert: true }
    );
  });

  afterAll(async () => {
    await PaymentPreference.deleteMany({ user_id: { $in: [userAId, userBId] } });
    await mongoose.disconnect();
  });

  it('GET /api/payment-preferences returns 401 without auth', async () => {
    const res = await request(app).get('/api/payment-preferences');
    expect(res.status).toBe(401);
  });

  it('GET /api/payment-preferences returns default COD preference for new user', async () => {
    const res = await request(app)
      .get('/api/payment-preferences')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.preferred_method).toBe('COD');
  });

  it('PUT /api/payment-preferences validates preferred_method', async () => {
    const res = await request(app)
      .put('/api/payment-preferences')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ preferred_method: 'BITCOIN' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/payment-preferences validates UPI ID when method is UPI', async () => {
    const res = await request(app)
      .put('/api/payment-preferences')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ preferred_method: 'UPI', upi_id: 'invalid-no-at-sign' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/payment-preferences saves valid UPI preference', async () => {
    const res = await request(app)
      .put('/api/payment-preferences')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ preferred_method: 'UPI', upi_id: 'raman@okaxis' });
    expect(res.status).toBe(200);
    expect(res.body.preferred_method).toBe('UPI');
    expect(res.body.upi_id).toBe('raman@okaxis');

    // Verify GET reflects the saved preference
    const check = await request(app)
      .get('/api/payment-preferences')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(check.status).toBe(200);
    expect(check.body.preferred_method).toBe('UPI');
    expect(check.body.upi_id).toBe('raman@okaxis');
  });

  it('User isolation: user B has independent payment preference', async () => {
    const resB = await request(app)
      .get('/api/payment-preferences')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.preferred_method).toBe('COD');
    expect(resB.body.upi_id).toBe('');
  });
});
