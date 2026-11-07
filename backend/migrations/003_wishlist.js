import { getStagingConnection } from '../scripts/db-safety.js';

export async function up() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 003 UP] Running wishlist_items migration...');

  const coll = db.collection('wishlist_items');
  await coll.createIndex({ user_id: 1, product_id: 1 }, { unique: true });
  await coll.createIndex({ user_id: 1, created_at: -1 });

  console.log('[MIGRATION 003 UP] Completed.');
  await conn.close();
}

export async function down() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 003 DOWN] Reverting wishlist_items migration...');
  await db.collection('wishlist_items').drop().catch(() => {});
  console.log('[MIGRATION 003 DOWN] Completed.');
  await conn.close();
}

if (process.argv[2] === 'down') {
  down().catch(console.error);
} else {
  up().catch(console.error);
}

