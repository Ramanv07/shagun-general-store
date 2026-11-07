import mongoose from 'mongoose';
import Review from '../models/Review.js';
import WishlistItem from '../models/WishlistItem.js';
import Appointment from '../models/Appointment.js';

export async function up() {
  console.log('Running migration: 001_unique_indexes...');

  // 1. Deduplicate reviews if any
  const dupReviews = await Review.aggregate([
    { $group: { _id: { user_id: '$user_id', product_id: '$product_id' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $filter: { input: '$$ROOT', as: 'g', cond: { $gt: ['$$g.count', 1] } } }
  ]).catch(() => []);

  for (const group of dupReviews) {
    if (group.ids && group.ids.length > 1) {
      const [keep, ...remove] = group.ids;
      await Review.deleteMany({ _id: { $in: remove } });
      console.log(`Deduplicated ${remove.length} reviews for user ${group._id.user_id} and product ${group._id.product_id}`);
    }
  }

  // 2. Create compound unique index on Review
  await Review.collection.createIndex({ user_id: 1, product_id: 1 }, { unique: true });
  console.log('Created unique compound index on Review (user_id + product_id)');

  // 3. Deduplicate wishlist items if any
  const dupWishlist = await WishlistItem.aggregate([
    { $group: { _id: { user_id: '$user_id', product_id: '$product_id' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $filter: { input: '$$ROOT', as: 'g', cond: { $gt: ['$$g.count', 1] } } }
  ]).catch(() => []);

  for (const group of dupWishlist) {
    if (group.ids && group.ids.length > 1) {
      const [keep, ...remove] = group.ids;
      await WishlistItem.deleteMany({ _id: { $in: remove } });
      console.log(`Deduplicated ${remove.length} wishlist items for user ${group._id.user_id}`);
    }
  }

  // 4. Create compound unique index on WishlistItem
  await WishlistItem.collection.createIndex({ user_id: 1, product_id: 1 }, { unique: true });
  console.log('Created unique compound index on WishlistItem (user_id + product_id)');

  // 5. Create partial unique index on Appointment (W1-08)
  await Appointment.collection.createIndex(
    { serviceId: 1, date: 1, slot: 1 },
    {
      unique: true,
      partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'Completed'] } }
    }
  );
  console.log('Created partial unique index on Appointment (serviceId + date + slot)');
}

if (process.argv[1]?.endsWith('001_unique_indexes.js')) {
  const uri = process.env.STAGING_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No DB URI provided');
    process.exit(1);
  }
  if (uri.includes('mongodb.net') && process.env.APPROVE_LIVE_MIGRATION !== 'true') {
    console.error('ABORT: Live Atlas DB requires explicit APPROVE_LIVE_MIGRATION=true');
    process.exit(1);
  }
  mongoose.connect(uri)
    .then(() => up())
    .then(() => {
      console.log('Migration 001 finished successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
