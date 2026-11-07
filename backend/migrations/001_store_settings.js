import { getStagingConnection } from '../scripts/db-safety.js';

export async function up() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 001 UP] Running store_settings migration...');

  const coll = db.collection('store_settings');
  await coll.createIndex({ key: 1 }, { unique: true });

  await coll.updateOne(
    { key: 'delivery_config' },
    {
      $setOnInsert: {
        key: 'delivery_config',
        delivery_eta_min: 10,
        delivery_eta_max: 20,
        delivery_strip_enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log('[MIGRATION 001 UP] Completed.');
  await conn.close();
}

export async function down() {
  const conn = await getStagingConnection();
  const db = conn.db;
  console.log('[MIGRATION 001 DOWN] Reverting store_settings migration...');
  await db.collection('store_settings').drop().catch(() => {});
  console.log('[MIGRATION 001 DOWN] Completed.');
  await conn.close();
}

if (process.argv[2] === 'down') {
  down().catch(console.error);
} else {
  up().catch(console.error);
}

