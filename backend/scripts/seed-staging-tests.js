import { getStagingConnection } from './db-safety.js';
import mongoose from 'mongoose';

export async function seedStagingTestFixtures() {
  const conn = await getStagingConnection();
  const db = conn.db;

  console.log('[SEED] Seeding test fixtures (prefix test_)...');

  // 1. Test User
  const testUserId = new mongoose.Types.ObjectId('66f000000000000000000001');
  await db.collection('users').updateOne(
    { _id: testUserId },
    {
      $set: {
        _id: testUserId,
        name: 'test_user_raman',
        email: 'test_user_raman@example.com',
        phone: '9999999999',
        role: 'user',
        addresses: [{
          fullName: 'Test User',
          mobile: '9999999999',
          houseNo: 'T-101',
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          pinCode: '462026',
          isDefault: true,
        }],
      },
    },
    { upsert: true }
  );

  // 2. Sample delivered product for reviews
  const sampleProduct = await db.collection('products').findOne({});
  if (!sampleProduct) throw new Error('No products available to seed order');

  // 3. Test Delivered Order for verified review test
  const testOrderId = new mongoose.Types.ObjectId('66f000000000000000000002');
  await db.collection('orders').updateOne(
    { _id: testOrderId },
    {
      $set: {
        _id: testOrderId,
        orderIdString: 'test_order_001',
        user: testUserId,
        items: [{
          product: sampleProduct._id,
          name: sampleProduct.name,
          quantity: 1,
          price: sampleProduct.price,
          image: sampleProduct.image,
        }],
        totalAmount: sampleProduct.price,
        status: 'Delivered',
        paymentMethod: 'COD',
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  console.log('[SEED] Test fixtures seeded:');
  console.log('  ✓ User: test_user_raman (_id: ' + testUserId + ')');
  console.log('  ✓ Order: test_order_001 (_id: ' + testOrderId + ') with product: ' + sampleProduct.name);

  await conn.close();
  return { testUserId, testOrderId, sampleProductId: sampleProduct._id };
}

export async function cleanupStagingTestFixtures() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[CLEANUP] Cleaning up test_ fixtures from staging...');
  await db.collection('users').deleteMany({ email: { $regex: /^test_/ } });
  await db.collection('orders').deleteMany({ orderIdString: { $regex: /^test_/ } });
  await db.collection('reviews').deleteMany({ comment: { $regex: /^test_/ } });
  await db.collection('wishlist_items').deleteMany({ user_id: new mongoose.Types.ObjectId('66f000000000000000000001') });
  await db.collection('notifications').deleteMany({ title: { $regex: /^test_/ } });
  console.log('[CLEANUP] Done.');
  await conn.close();
}

if (process.argv[2] === 'cleanup') {
  cleanupStagingTestFixtures().catch(console.error);
} else if (process.argv[2] === 'seed') {
  seedStagingTestFixtures().catch(console.error);
}

