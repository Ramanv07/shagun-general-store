import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import settingRoutes from '../routes/settingRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';
import StoreSetting from '../models/StoreSetting.js';
import Notification from '../models/Notification.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const app = express();
app.use(express.json());
app.use('/api/settings', settingRoutes);
app.use('/api/notifications', notificationRoutes);

const TEST_SECRET = 'test_jwt_secret_12345';
process.env.JWT_SECRET = TEST_SECRET;

const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

describe('Phase A & B: Delivery Strip & Notifications Endpoints', () => {
  let conn;
  let mongod;
  const userAId = new mongoose.Types.ObjectId('66f000000000000000000001');
  const userBId = new mongoose.Types.ObjectId('66f000000000000000000002');
  const tokenA = jwt.sign({ id: userAId.toString() }, TEST_SECRET);
  const tokenB = jwt.sign({ id: userBId.toString() }, TEST_SECRET);

  beforeAll(async () => {
    try {
      conn = await mongoose.connect(STAGING_URI, { serverSelectionTimeoutMS: 1500 });
    } catch {
      mongod = await MongoMemoryServer.create();
      conn = await mongoose.connect(mongod.getUri());
    }
    const User = (await import('../models/User.js')).default;
    await User.updateOne(
      { _id: userAId },
      { $set: { _id: userAId, name: 'test_user_a', email: 'test_a@example.com', password: 'hash' } },
      { upsert: true }
    );
    await User.updateOne(
      { _id: userBId },
      { $set: { _id: userBId, name: 'test_user_b', email: 'test_b@example.com', password: 'hash' } },
      { upsert: true }
    );
  });

  afterAll(async () => {
    const User = (await import('../models/User.js')).default;
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    await Notification.deleteMany({ user_id: { $in: [userAId, userBId] } });
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  // --- Phase A: Delivery Strip ---
  test('GET /api/settings/delivery-strip returns valid config from DB', async () => {
    const res = await request(app).get('/api/settings/delivery-strip');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enabled');
    expect(res.body).toHaveProperty('eta_min');
    expect(res.body).toHaveProperty('eta_max');
    expect(res.body.enabled).toBe(true);
    expect(res.body.eta_min).toBe(10);
    expect(res.body.eta_max).toBe(20);
  });

  // --- Phase B: Unauthenticated check ---
  test('GET /api/notifications/unread-count returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });

  // --- Phase B: Notification Lifecycle & Ownership ---
  test('Notifications: list, unread count, and mark-read with user isolation', async () => {
    // 1. Seed notifications for user A and user B
    const notifA = await Notification.create({
      user_id: userAId,
      title: 'test_Order Confirmed',
      body: 'Your test order is confirmed',
      type: 'order',
      read: false,
    });

    const notifB = await Notification.create({
      user_id: userBId,
      title: 'test_Promo for B',
      body: 'Special promo for user B',
      type: 'promotion',
      read: false,
    });

    // 2. User A unread count should be 1
    const countA = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(countA.status).toBe(200);
    expect(countA.body.count).toBe(1);

    // 3. User A tries to mark User B's notification -> 404/unauthorized
    const tamper = await request(app)
      .put(`/api/notifications/${notifB._id}/mark-read`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(tamper.status).toBe(404);

    // 4. User A marks their own notification -> 200
    const markOwn = await request(app)
      .put(`/api/notifications/${notifA._id}/mark-read`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(markOwn.status).toBe(200);
    expect(markOwn.body.success).toBe(true);

    // 5. User A unread count should now be 0
    const countAAfter = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(countAAfter.body.count).toBe(0);

    // 6. User B unread count remains untouched (1)
    const countB = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(countB.body.count).toBe(1);
  });
});
