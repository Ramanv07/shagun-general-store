import { getStagingConnection } from '../scripts/db-safety.js';

export async function up() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 002 UP] Running notifications migration...');

  const coll = db.collection('notifications');
  await coll.createIndex({ user_id: 1, read: 1, created_at: -1 });

  console.log('[MIGRATION 002 UP] Completed.');
  await conn.close();
}

export async function down() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 002 DOWN] Reverting notifications migration...');
  await db.collection('notifications').drop().catch(() => {});
  console.log('[MIGRATION 002 DOWN] Completed.');
  await conn.close();
}

if (process.argv[2] === 'down') {
  down().catch(console.error);
} else {
  up().catch(console.error);
}

