import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Review from '../models/Review.js';
import WishlistItem from '../models/WishlistItem.js';
import Appointment from '../models/Appointment.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test('Read-only duplicate checks accurately detect seeded collisions', async () => {
  const userA = new mongoose.Types.ObjectId();
  const prodA = new mongoose.Types.ObjectId();

  // 1. Seed duplicate Reviews
  await Review.create([
    { user_id: userA, product_id: prodA, order_id: new mongoose.Types.ObjectId(), rating: 5, comment: 'First review' },
    { user_id: userA, product_id: prodA, order_id: new mongoose.Types.ObjectId(), rating: 4, comment: 'Duplicate review' }
  ]);

  // 2. Seed duplicate WishlistItems
  await WishlistItem.create([
    { user_id: userA, product_id: prodA },
    { user_id: userA, product_id: prodA }
  ]);

  // 3. Seed duplicate Appointments
  await Appointment.create([
    { serviceId: 'bridal-glow', serviceName: 'Bridal Glow', price: 999, date: '2026-11-20', slot: '10:00 AM', customerName: 'Riya', customerPhone: '9876543210', status: 'Confirmed' },
    { serviceId: 'bridal-glow', serviceName: 'Bridal Glow', price: 999, date: '2026-11-20', slot: '10:00 AM', customerName: 'Neha', customerPhone: '9876543211', status: 'Pending' },
    // Cancelled duplicate should NOT count as active collision
    { serviceId: 'bridal-glow', serviceName: 'Bridal Glow', price: 999, date: '2026-11-20', slot: '10:00 AM', customerName: 'Pooja', customerPhone: '9876543212', status: 'Cancelled' }
  ]);

  const db = mongoose.connection.db;

  // Query 1: Reviews
  const dupReviews = await db.collection('reviews').aggregate([
    { $group: { _id: { user_id: '$user_id', product_id: '$product_id' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  expect(dupReviews.length).toBe(1);
  expect(dupReviews[0].count).toBe(2);

  // Query 2: Wishlist
  const dupWishlist = await db.collection('wishlist_items').aggregate([
    { $group: { _id: { user_id: '$user_id', product_id: '$product_id' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  expect(dupWishlist.length).toBe(1);
  expect(dupWishlist[0].count).toBe(2);

  // Query 3: Appointments (Active only)
  const dupAppointments = await db.collection('appointments').aggregate([
    { $match: { status: { $in: ['Pending', 'Confirmed', 'Completed'] } } },
    { $group: { _id: { serviceId: '$serviceId', date: '$date', slot: '$slot' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  expect(dupAppointments.length).toBe(1);
  expect(dupAppointments[0].count).toBe(2); // Only the 2 active ones, ignoring Cancelled
});
