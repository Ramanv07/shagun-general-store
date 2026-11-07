import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ATLAS_URI = process.env.MONGODB_URI;
const STAGING_URI = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

async function compareCounts() {
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const stagingConn = await mongoose.createConnection(STAGING_URI).asPromise();

  const collectionsToCheck = ['products', 'orders', 'users', 'carts', 'parlorservices', 'categorysections', 'rentals', 'appointments'];

  console.log('Collection Counts Comparison (Atlas Production vs Local Staging):');
  console.log('-------------------------------------------------------------------');
  console.log('| Collection         | Atlas (Prod) Count | Local Staging Count | Match? |');
  console.log('-------------------------------------------------------------------');

  for (const coll of collectionsToCheck) {
    const atlasExists = (await atlasConn.db.listCollections({ name: coll }).toArray()).length > 0;
    const stagingExists = (await stagingConn.db.listCollections({ name: coll }).toArray()).length > 0;

    const atlasCount = atlasExists ? await atlasConn.db.collection(coll).countDocuments({}) : 0;
    const stagingCount = stagingExists ? await stagingConn.db.collection(coll).countDocuments({}) : 0;

    const match = atlasCount === stagingCount ? '✓ PASS' : '✗ FAIL';
    console.log(`| ${coll.padEnd(18)} | ${String(atlasCount).padStart(18)} | ${String(stagingCount).padStart(19)} | ${match.padEnd(6)} |`);
  }
  console.log('-------------------------------------------------------------------');

  await atlasConn.close();
  await stagingConn.close();
}

compareCounts().catch(err => {
  console.error(err);
  process.exit(1);
});

