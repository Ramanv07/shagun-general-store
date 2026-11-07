import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import reviewRoutes from '../routes/reviewRoutes.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewRoutes);

const TEST_SECRET = 'test_jwt_secret_12345';
process.env.JWT_SECRET = TEST_SECRET;

const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

describe('Phase E: Reviews & Ratings (Verified Purchase & Aggregation)', () => {
  const userAId = new mongoose.Types.ObjectId('66f000000000000000000001');
  const userBId = new mongoose.Types.ObjectId('66f000000000000000000002');
  const tokenA = jwt.sign({ id: userAId.toString() }, TEST_SECRET);
  const tokenB = jwt.sign({ id: userBId.toString() }, TEST_SECRET);
  let sampleProduct;
  let testOrder;

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

    // Create a delivered order for user A containing sampleProduct
    testOrder = await Order.create({
      user: userAId,
      items: [{
        product: sampleProduct._id,
        name: sampleProduct.name,
        quantity: 1,
        price: sampleProduct.price,
      }],
      totalAmount: sampleProduct.price,
      status: 'Delivered',
      shippingAddress: {
        fullName: 'Test A',
        mobile: '9999999999',
        houseNo: '1',
        street: 'Street',
        city: 'City',
        state: 'State',
        pinCode: '462026',
      },
    });
  });

  afterAll(async () => {
    await Review.deleteMany({ product_id: sampleProduct._id });
    if (testOrder) await Order.deleteOne({ _id: testOrder._id });
    await mongoose.disconnect();
  });

  test('POST /api/reviews fails with 403 if user did not purchase the product', async () => {
    // User B has no delivered order for sampleProduct
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        productId: sampleProduct._id,
        rating: 5,
        comment: 'test_Attempt without purchase',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verified purchaser/i);
  });

  test('POST /api/reviews succeeds (201) when user has a delivered order', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: sampleProduct._id,
        rating: 5,
        comment: 'test_Excellent quality! Highly recommended.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.rating).toBe(5);
  });

  test('GET /api/reviews/product/:id returns aggregate averageRating and reviewCount', async () => {
    const res = await request(app).get(`/api/reviews/product/${sampleProduct._id}`);
    expect(res.status).toBe(200);
    expect(res.body.reviewCount).toBe(1);
    expect(res.body.averageRating).toBe(5.0);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  test('PUT and DELETE /api/reviews/:id enforce ownership (user isolation)', async () => {
    const rev = await Review.findOne({ user_id: userAId, product_id: sampleProduct._id });
    expect(rev).not.toBeNull();

    // User B tries to edit User A's review -> 404
    const resTamper = await request(app)
      .put(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ rating: 1, comment: 'Hacked comment' });
    expect(resTamper.status).toBe(404);

    // User A edits own review -> 200
    const resEdit = await request(app)
      .put(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rating: 4, comment: 'Updated comment: very good' });
    expect(resEdit.status).toBe(200);
    expect(resEdit.body.review.rating).toBe(4);

    // User B tries to delete User A's review -> 404
    const resDelTamper = await request(app)
      .delete(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resDelTamper.status).toBe(404);

    // User A deletes own review -> 200
    const resDel = await request(app)
      .delete(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resDel.status).toBe(200);
  });
});

