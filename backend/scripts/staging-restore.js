import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

async function restoreToStaging(backupDir) {
  if (!backupDir) {
    // pick latest backup folder in backend/backups
    const baseBackups = path.resolve(__dirname, '../backups');
    if (!fs.existsSync(baseBackups)) throw new Error('No backups directory found');
    const folders = fs.readdirSync(baseBackups).filter(f => f.startsWith('atlas_backup_')).sort().reverse();
    if (folders.length === 0) throw new Error('No atlas_backup folders found');
    backupDir = path.join(baseBackups, folders[0]);
  }

  console.log(`[RESTORE] Restoring from: ${backupDir}`);
  console.log(`[RESTORE] Target database: ${STAGING_URI}`);

  const conn = await mongoose.createConnection(STAGING_URI).asPromise();
  const db = conn.db;

  const manifestPath = path.join(backupDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const localStats = {};

  for (const [collName, originalCount] of Object.entries(manifest.counts)) {
    const dataPath = path.join(backupDir, `${collName}.json`);
    const metaPath = path.join(backupDir, `${collName}.metadata.json`);

    if (!fs.existsSync(dataPath)) continue;

    const docs = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const collection = db.collection(collName);

    // Drop and re-create for clean copy
    await collection.drop().catch(() => {}); // ignore if does not exist

    if (docs.length > 0) {
      // Re-hydrate ObjectIds and Dates where needed
      const hydrated = docs.map(doc => {
        const copy = { ...doc };
        if (copy._id && typeof copy._id === 'string' && /^[0-9a-fA-F]{24}$/.test(copy._id)) {
          copy._id = new mongoose.Types.ObjectId(copy._id);
        }
        return copy;
      });
      await collection.insertMany(hydrated);
    }

    // Re-create indexes if present
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (meta.indexes && Array.isArray(meta.indexes)) {
        for (const idx of meta.indexes) {
          if (idx.name === '_id_') continue;
          try {
            await collection.createIndex(idx.key, { name: idx.name, unique: idx.unique || false });
          } catch (e) {
            // ignore index collision
          }
        }
      }
    }

    const localCount = await collection.countDocuments({});
    localStats[collName] = localCount;
    console.log(`  ✓ Restored ${collName}: ${localCount} / ${originalCount} docs`);
  }

  await conn.close();
  console.log('\n[RESTORE COMPLETE]');
  return { manifest, localStats };
}

// Read CLI arg if provided
const targetFolder = process.argv[2];
restoreToStaging(targetFolder).catch(err => {
  console.error('[RESTORE ERROR]:', err);
  process.exit(1);
});

