import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backupDir = path.resolve(__dirname, `../backups/atlas_backup_${timestamp}`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function runBackup() {
  console.log(`[BACKUP] Connecting to Atlas (Read-Only)...`);
  const conn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
  const db = conn.db;

  const collections = await db.listCollections().toArray();
  console.log(`[BACKUP] Target collections (${collections.length}):`, collections.map(c => c.name).join(', '));

  const stats = {};

  for (const coll of collections) {
    const collName = coll.name;
    const collection = db.collection(collName);
    
    // Read documents and indexes
    const docs = await collection.find({}).toArray();
    const indexes = await collection.indexes();

    const dataPath = path.join(backupDir, `${collName}.json`);
    const metaPath = path.join(backupDir, `${collName}.metadata.json`);

    fs.writeFileSync(dataPath, JSON.stringify(docs, null, 2), 'utf-8');
    fs.writeFileSync(metaPath, JSON.stringify({ name: collName, indexes }, null, 2), 'utf-8');

    stats[collName] = docs.length;
    console.log(`  ✓ ${collName}: ${docs.length} documents dumped`);
  }

  await conn.close();
  console.log(`\n[BACKUP COMPLETE] Output folder: ${backupDir}`);
  console.log(`[BACKUP STATS]:`, JSON.stringify(stats, null, 2));

  // Write manifest file
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify({ timestamp, counts: stats, folder: backupDir }, null, 2),
    'utf-8'
  );

  return { backupDir, stats };
}

runBackup().catch(err => {
  console.error('[BACKUP ERROR]:', err);
  process.exit(1);
});

