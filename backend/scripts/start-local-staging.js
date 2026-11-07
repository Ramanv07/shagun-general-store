import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../staging-data');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

async function startStagingServer() {
  console.log('[STAGING] Starting local MongoDB server on port 27017...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath: dbPath,
      storageEngine: 'wiredTiger',
      dbName: 'shagun-staging',
    },
  });

  const uri = mongod.getUri();
  console.log(`[STAGING] Running at: ${uri}`);
  console.log(`[STAGING] Direct URI: mongodb://127.0.0.1:27017/shagun-staging`);

  process.on('SIGINT', async () => {
    console.log('[STAGING] Stopping server...');
    await mongod.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[STAGING] Stopping server...');
    await mongod.stop();
    process.exit(0);
  });
}

startStagingServer().catch(err => {
  console.error('[STAGING ERROR]:', err);
  process.exit(1);
});

