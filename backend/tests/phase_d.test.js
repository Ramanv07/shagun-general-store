import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import wishlistRoutes from '../routes/wishlistRoutes.js';
import WishlistItem from '../models/WishlistItem.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const app = express();
app.use(express.json());
app.use('/api/wishlist', wishlistRoutes);

const TEST_SECRET = 'test_jwt_secret_12345';
process.env.JWT_SECRET = TEST_SECRET;

const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

describe('Phase D: Wishlist Endpoints & User Isolation', () => {
  const userAId = new mongoose.Types.ObjectId('66f000000000000000000001');
  const userBId = new mongoose.Types.ObjectId('66f000000000000000000002');
  const tokenA = jwt.sign({ id: userAId.toString() }, TEST_SECRET);
  const tokenB = jwt.sign({ id: userBId.toString() }, TEST_SECRET);
  let sampleProduct;

  beforeAll(async () => {
    await mongoose.connect(STAGING_URI);
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
    sampleProduct = await Product.findOne({});
  });

  afterAll(async () => {
    await WishlistItem.deleteMany({ user_id: { $in: [userAId, userBId] } });
    await mongoose.disconnect();
  });

  test('GET /api/wishlist without auth returns 401', async () => {
    const res = await request(app).get('/api/wishlist');
    expect(res.status).toBe(401);
  });

  test('POST /api/wishlist adds item idempotently', async () => {
    // Add once
    const res1 = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: sampleProduct._id });
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Add again (idempotent)
    const res2 = await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: sampleProduct._id });
    expect(res2.status).toBe(200);

    // Count in DB for userA must be exactly 1
    const count = await WishlistItem.countDocuments({ user_id: userAId, product_id: sampleProduct._id });
    expect(count).toBe(1);
  });

  test('GET /api/wishlist returns populated products for authenticated user', async () => {
    const res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]._id.toString()).toBe(sampleProduct._id.toString());
  });

  test('DELETE /api/wishlist/:productId removes item safely with user isolation', async () => {
    // User B tries to delete User A's wishlist item
    const resB = await request(app)
      .delete(`/api/wishlist/${sampleProduct._id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.removed).toBe(false);

    // User A item still exists
    let itemA = await WishlistItem.findOne({ user_id: userAId, product_id: sampleProduct._id });
    expect(itemA).not.toBeNull();

    // User A deletes own item
    const resA = await request(app)
      .delete(`/api/wishlist/${sampleProduct._id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.removed).toBe(true);

    // Item should now be gone
    itemA = await WishlistItem.findOne({ user_id: userAId, product_id: sampleProduct._id });
    expect(itemA).toBeNull();
  });
});

