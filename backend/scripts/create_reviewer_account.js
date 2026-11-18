import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shagun-staging';

// Safety check 1: Atlas live host protection
const isAtlas = mongoUri.includes('.mongodb.net');
if (isAtlas && process.env.APPROVE_LIVE_MIGRATION !== 'true') {
  console.error('ERROR: Live Atlas cluster detected. Run with APPROVE_LIVE_MIGRATION=true to proceed.');
  process.exit(1);
}

// Safety check 2: Refuse accidental staging mix-up if caller claimed production
if (process.env.NODE_ENV === 'production' && mongoUri.toLowerCase().includes('staging')) {
  console.error('ERROR: NODE_ENV=production but MONGODB_URI points to a staging database. Aborting to avoid mix-up.');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected to database.`);

    const email = 'google-reviewer@shagunmart.shop';
    // Generate high-entropy 16-char random password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let randomPassword = '';
    const bytes = crypto.randomBytes(16);
    for (let i = 0; i < 16; i++) {
      randomPassword += chars[bytes[i] % chars.length];
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    let user = await User.findOne({ email });
    if (user) {
      user.password = hashedPassword;
      user.isTester = true;
      user.role = 'user';
      user.name = 'Google Play Reviewer';
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      console.log(`Updated existing reviewer user: ${email}`);
    } else {
      user = await User.create({
        name: 'Google Play Reviewer',
        email,
        phone: '9999999999',
        password: hashedPassword,
        role: 'user',
        isTester: true,
        addresses: [{
          fullName: 'Google Play Reviewer',
          mobile: '9999999999',
          houseNo: 'Shop 12',
          street: 'Main Market Road',
          city: 'Bamitha',
          state: 'Madhya Pradesh',
          pinCode: '471105',
          isDefault: true
        }]
      });
      console.log(`Created new reviewer user: ${email}`);
    }

    console.log('\n==============================================================');
    console.log(' GOOGLE PLAY REVIEWER CREDENTIALS (isTester: true)');
    console.log('==============================================================');
    console.log(` Email:        ${email}`);
    console.log(` Password:     ${randomPassword}`);
    console.log(' Note: This password is ONLY displayed here and NOT saved to disk.');
    console.log('==============================================================');
    console.log('\nPASTE INTO PLAY CONSOLE (App Access Section):');
    console.log(' 1. Go to Policy > App access in Google Play Console.');
    console.log(' 2. Select: "All or some functionality is restricted".');
    console.log(' 3. Click "Add new instructions":');
    console.log(`    - Name: Google Play Store Tester Access`);
    console.log(`    - Username / Phone / Email: ${email}`);
    console.log(`    - Password: ${randomPassword}`);
    console.log('    - Instructions:');
    console.log('      "Login with above credentials. Guest browsing is also available without');
    console.log('       logging in. This tester account uses Cash on Delivery (COD) for testing');
    console.log('       without real payments. Address is pre-saved."');
    console.log('==============================================================\n');
  } catch (err) {
    console.error('Failed to create reviewer account:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
