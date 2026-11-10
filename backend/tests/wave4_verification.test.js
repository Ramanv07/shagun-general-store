import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import OtpSession from '../models/OtpSession.js';
import authRoutes, { _testClearOtpStores } from '../routes/authRoutes.js';
import { up as runMigration001 } from '../migrations/001_unique_indexes.js';

let mongod;
let app;
let request;

process.env.JWT_SECRET = 'test_jwt_secret_wave4_2026';
process.env.ALLOW_TEST_OTP = 'true';
process.env.NODE_ENV = 'development';

function createApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', authRoutes);
  return a;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Run migration to establish all unique indexes (including case-insensitive email and OtpSession)
  await runMigration001();
  app = createApp();
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await _testClearOtpStores();
  await User.deleteMany({});
  await OtpSession.deleteMany({});
});

describe('Wave 4 Verification: DB-Backed OTP, Server Restart Resilience, Case-Insensitive Email', () => {

  test('Forgot-password returns identical response for existing and non-existing accounts', async () => {
    // 1. Create registered user
    const salt = await bcrypt.genSalt(10);
    await User.create({
      name: 'Existing User',
      email: 'registered@shagunmart.com',
      password: await bcrypt.hash('Secret123!', salt),
      role: 'user'
    });

    // Request for existing user
    const resExisting = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'registered@shagunmart.com' });

    // Request for non-existent user
    const resNonExistent = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown_ghost_user@shagunmart.com' });

    expect(resExisting.status).toBe(200);
    expect(resNonExistent.status).toBe(200);
    expect(resExisting.body.message).toBe(resNonExistent.body.message);
    expect(resExisting.body.success).toBe(true);
    expect(resNonExistent.body.success).toBe(true);
  });

  test('Cooldown persists across simulated server restart (new app instance, same DB)', async () => {
    const salt = await bcrypt.genSalt(10);
    await User.create({
      name: 'Cooldown Tester',
      email: 'cooldown@shagunmart.com',
      password: await bcrypt.hash('Secret123!', salt),
      role: 'user'
    });

    // 1. Send OTP via initial server instance
    const res1 = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'cooldown@shagunmart.com' });
    expect(res1.status).toBe(200);

    // 2. Simulate server restart: spin up a brand new Express app & supertest instance without in-memory state
    const restartedApp = createApp();
    const restartedRequest = supertest(restartedApp);

    // 3. Immediately request again on restarted server -> should hit 60s cooldown from DB
    const res2 = await restartedRequest
      .post('/api/auth/forgot-password')
      .send({ email: 'cooldown@shagunmart.com' });

    expect(res2.status).toBe(429);
    expect(res2.body.message).toMatch(/Please wait \d+ seconds before requesting another/);
  });

  test('Lockout after 5 wrong attempts persists after simulated server restart', async () => {
    const salt = await bcrypt.genSalt(10);
    await User.create({
      name: 'Lockout Tester',
      email: 'lockout@shagunmart.com',
      password: await bcrypt.hash('Secret123!', salt),
      role: 'user'
    });

    // 1. Initiate reset to create OTP in DB
    await request
      .post('/api/auth/forgot-password')
      .send({ email: 'lockout@shagunmart.com' });

    // 2. Fail 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await request
        .post('/api/auth/reset-password')
        .send({ email: 'lockout@shagunmart.com', otp: '000000', newPassword: 'NewPassword123!' });
    }

    // 3. Simulate server restart: create fresh app instance
    const restartedApp = createApp();
    const restartedRequest = supertest(restartedApp);

    // 4. Verification attempt on restarted server must still be locked out from DB state
    const resLocked = await restartedRequest
      .post('/api/auth/reset-password')
      .send({ email: 'lockout@shagunmart.com', otp: '111111', newPassword: 'NewPassword123!' });

    expect(resLocked.status).toBe(429);
    expect(resLocked.body.message).toMatch(/Account is temporarily locked/);
  });

  test('Reset OTP is strictly single-use and cannot be replayed', async () => {
    const salt = await bcrypt.genSalt(10);
    await User.create({
      name: 'Single Use User',
      email: 'singleuse@shagunmart.com',
      password: await bcrypt.hash('OldSecret123!', salt),
      role: 'user'
    });

    await request
      .post('/api/auth/forgot-password')
      .send({ email: 'singleuse@shagunmart.com' });

    // In test mode, test OTP '999999' is permitted
    const resFirst = await request
      .post('/api/auth/reset-password')
      .send({ email: 'singleuse@shagunmart.com', otp: '999999', newPassword: 'BrandNewPassword123!' });
    expect(resFirst.status).toBe(200);

    // Replay attack: attempt to use the same OTP again immediately
    const resReplay = await request
      .post('/api/auth/reset-password')
      .send({ email: 'singleuse@shagunmart.com', otp: '999999', newPassword: 'AnotherPassword123!' });
    expect(resReplay.status).toBe(400);
    expect(resReplay.body.message).toMatch(/Invalid or expired verification code/);
  });

  test('Case-insensitive email index rejects duplicate mixed-case email, and login allows mixed-case input', async () => {
    const salt = await bcrypt.genSalt(10);
    // 1. Create user with lowercase email
    await User.create({
      name: 'Case Sensitive User',
      email: 'a@x.com',
      password: await bcrypt.hash('CorrectPassword123!', salt),
      role: 'user'
    });

    // 2. Direct collection insert of "A@x.com" must be rejected by unique collation index
    let duplicateRejected = false;
    try {
      await User.collection.insertOne({
        name: 'Uppercase Impostor',
        email: 'A@x.com',
        password: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      duplicateRejected = err.code === 11000;
    }
    expect(duplicateRejected).toBe(true);

    // 3. Login with mixed-case "A@X.com" succeeds because authentication normalizes email
    const loginRes = await request
      .post('/api/auth/login')
      .send({ email: 'A@X.COM', password: 'CorrectPassword123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.email.toLowerCase()).toBe('a@x.com');
  });

});
