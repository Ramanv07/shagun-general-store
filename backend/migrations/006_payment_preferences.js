import { getStagingConnection } from '../scripts/db-safety.js';

export async function up() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 006 UP] Running payment_preferences migration...');

  const coll = db.collection('payment_preferences');
  await coll.createIndex({ user_id: 1 }, { unique: true });

  console.log('[MIGRATION 006 UP] Completed.');
  await conn.close();
}

export async function down() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 006 DOWN] Reverting payment_preferences migration...');

  await db.collection('payment_preferences').drop().catch(() => {});

  console.log('[MIGRATION 006 DOWN] Completed.');
  await conn.close();
}

if (process.argv[2] === 'down') {
  down().catch(console.error);
} else {
  up().catch(console.error);
}

