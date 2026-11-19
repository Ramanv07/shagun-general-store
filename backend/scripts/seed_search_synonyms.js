import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StoreSetting from '../models/StoreSetting.js';
import { DEFAULT_SYNONYMS } from '../utils/searchEngine.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

// Safety check: require explicit confirmation if connecting to MongoDB Atlas live cluster
const isAtlas = mongoUri.includes('.mongodb.net');
if (isAtlas && process.env.APPROVE_LIVE_MIGRATION !== 'true') {
  console.error('ERROR: Live Atlas cluster detected. Run with APPROVE_LIVE_MIGRATION=true to proceed.');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to database for search synonyms initialization.');

    const existing = await StoreSetting.findOne({ key: 'search_synonyms' });
    let finalSynonyms = { ...DEFAULT_SYNONYMS };

    if (existing && existing.value) {
      if (process.argv.includes('--force')) {
        console.log('Existing synonyms found. Overwriting due to --force flag.');
      } else {
        console.log('Existing synonyms found. Merging with default starter list.');
        finalSynonyms = { ...finalSynonyms, ...existing.value };
      }
    }

    await StoreSetting.updateOne(
      { key: 'search_synonyms' },
      { $set: { key: 'search_synonyms', value: finalSynonyms } },
      { upsert: true }
    );

    console.log('Successfully seeded search_synonyms in StoreSetting.');
    console.log(`Configured ${Object.keys(finalSynonyms).length} synonym groups.`);
  } catch (err) {
    console.error('Failed to seed search synonyms:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
