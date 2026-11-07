import { getStagingConnection } from '../scripts/db-safety.js';

export async function up() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 004 UP] Running reviews migration...');

  const coll = db.collection('reviews');
  await coll.createIndex({ user_id: 1, product_id: 1 }, { unique: true });
  await coll.createIndex({ product_id: 1, status: 1 });
  await coll.createIndex({ user_id: 1, created_at: -1 });

  console.log('[MIGRATION 004 UP] Completed.');
  await conn.close();
}

export async function down() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 004 DOWN] Reverting reviews migration...');
  await db.collection('reviews').drop().catch(() => {});
  console.log('[MIGRATION 004 DOWN] Completed.');
  await conn.close();
}

if (process.argv[2] === 'down') {
  down().catch(console.error);
} else {
  up().catch(console.error);
}

