import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shagun-staging';

// Safety check: require explicit confirmation if connecting to MongoDB Atlas live cluster
const isAtlas = mongoUri.includes('.mongodb.net');
if (isAtlas && process.env.APPROVE_LIVE_MIGRATION !== 'true') {
  console.error('ERROR: Live Atlas cluster detected. Run with APPROVE_LIVE_MIGRATION=true to proceed.');
  process.exit(1);
}

const emails = process.argv.slice(2).map(e => e.trim().toLowerCase()).filter(Boolean);

if (emails.length === 0) {
  console.log('Usage: node backend/scripts/set_tester_users.js email1@example.com email2@example.com ...');
  process.exit(0);
}

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected to database for tester flag update.`);

    const results = [];
    for (const email of emails) {
      const updated = await User.findOneAndUpdate(
        { email },
        { $set: { isTester: true } },
        { new: true }
      );
      if (updated) {
        results.push({ email, status: 'UPDATED', id: updated._id });
        console.log(`[PASS] Marked as tester: ${email} (${updated.name})`);
      } else {
        results.push({ email, status: 'NOT_FOUND' });
        console.warn(`[WARN] User not found with email: ${email}`);
      }
    }

    console.log(`\nCompleted: ${results.filter(r => r.status === 'UPDATED').length}/${emails.length} users marked as isTester=true.`);
  } catch (err) {
    console.error('Failed to update tester users:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
