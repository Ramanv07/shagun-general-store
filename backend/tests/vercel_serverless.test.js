import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import app, { connectDB } from '../app.js';
import vercelHandler from '../../api/index.js';
import { withTimeout } from '../utils/asyncHelper.js';
import { up as runMigration001 } from '../migrations/001_unique_indexes.js';
import { up as runMigration002 } from '../migrations/002_rate_limit_indexes.js';
import { _clearRateLimits } from '../middleware/mongoRateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.resolve(__dirname, '../routes');

let mongod;
let request;

process.env.JWT_SECRET = 'test_jwt_secret_vercel_2026';
process.env.ALLOW_TEST_OTP = 'true';
process.env.NODE_ENV = 'development';

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await connectDB();
    await runMigration001();
    await runMigration002();
    request = supertest(app);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    await _clearRateLimits();
});

describe('Vercel Serverless Architecture & Hardening Tests (All Points)', () => {

    test('Point 0: Every router file in backend/routes is mounted in app.js and served identically', () => {
        const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
        const appSource = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

        const unmounted = [];
        for (const file of routeFiles) {
            const base = file.replace('.js', '');
            if (!appSource.includes(file) && !appSource.includes(base)) {
                unmounted.push(file);
            }
        }

        expect(unmounted).toEqual([]);

        // Verify key routes exist in Express router stack
        const stackPaths = app._router.stack
            .filter(r => r.route || r.name === 'router')
            .map(r => r.regexp?.toString() || '');

        expect(stackPaths.some(p => p.includes('auth'))).toBe(true);
        expect(stackPaths.some(p => p.includes('products'))).toBe(true);
        expect(stackPaths.some(p => p.includes('orders'))).toBe(true);
        expect(stackPaths.some(p => p.includes('banners'))).toBe(true);
        expect(stackPaths.some(p => p.includes('coupons'))).toBe(true);
        expect(stackPaths.some(p => p.includes('brands'))).toBe(true);
    });

    test('Point 1: GET /api/health returns 200 with status ok and zero secrets/DB internals', async () => {
        const res = await request.get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.time).toBeDefined();

        // Must not leak connection strings or internal keys
        const bodyStr = JSON.stringify(res.body);
        expect(bodyStr).not.toContain('mongodb');
        expect(bodyStr).not.toContain('password');
        expect(bodyStr).not.toContain('secret');
    });

    test('Point 2: Cold start simulation & Mongoose connection pooling reuse', async () => {
        const conn1 = await connectDB();
        const conn2 = await connectDB();
        expect(conn1).toBeDefined();
        expect(conn2).toBeDefined();
        expect(conn1).toBe(conn2); // Exact same connection instance reused across invocations
    });

    test('Point 2 (Failing DB): Vercel handler returns 503 without process crash when DB is down', async () => {
        // Mock a scenario where connectDB returns null (e.g. Atlas unreachable)
        const mockReq = { method: 'GET', url: '/api/health', headers: {} };
        let responseStatus = 0;
        let responseJson = {};

        const mockRes = {
            setHeader: () => {},
            status: (code) => {
                responseStatus = code;
                return mockRes;
            },
            json: (payload) => {
                responseJson = payload;
                return mockRes;
            }
        };

        // Temporarily disconnect to simulate database failure
        const originalUri = process.env.MONGODB_URI;
        const originalStagingUri = process.env.STAGING_MONGODB_URI;
        delete process.env.STAGING_MONGODB_URI;
        process.env.MONGODB_URI = 'mongodb://127.0.0.1:9999/non_existent_db_fail?serverSelectionTimeoutMS=500';

        // Disconnect and invalidate cached promise
        await mongoose.disconnect();
        global.mongoose = { conn: null, promise: null };

        await vercelHandler(mockReq, mockRes);

        expect(responseStatus).toBe(503);
        expect(responseJson.message).toMatch(/Temporarily Unavailable/i);

        // Restore active connection
        process.env.MONGODB_URI = originalUri;
        if (originalStagingUri) process.env.STAGING_MONGODB_URI = originalStagingUri;
        global.mongoose = { conn: null, promise: null };
        await connectDB();
    }, 15000);

    test('Point 2 (Dev Guard): In non-production, connectDB refuses Atlas host unless ALLOW_LIVE_DB_LOCALLY=true', async () => {
        const savedUri = process.env.MONGODB_URI;
        const savedStagingUri = process.env.STAGING_MONGODB_URI;
        const savedVercel = process.env.VERCEL;
        const savedNodeEnv = process.env.NODE_ENV;
        const savedAllow = process.env.ALLOW_LIVE_DB_LOCALLY;

        delete process.env.STAGING_MONGODB_URI;
        delete process.env.VERCEL;
        delete process.env.ALLOW_LIVE_DB_LOCALLY;
        process.env.NODE_ENV = 'test';
        process.env.MONGODB_URI = 'mongodb://fake-cluster.mongodb.net/test';

        await mongoose.disconnect();
        global.mongoose = { conn: null, promise: null };

        await expect(connectDB()).rejects.toThrow(/Atlas connection refused in non-production/);

        // Restore
        process.env.MONGODB_URI = savedUri;
        if (savedStagingUri) process.env.STAGING_MONGODB_URI = savedStagingUri;
        if (savedVercel) process.env.VERCEL = savedVercel;
        process.env.NODE_ENV = savedNodeEnv;
        if (savedAllow) process.env.ALLOW_LIVE_DB_LOCALLY = savedAllow;
        global.mongoose = { conn: null, promise: null };
        await connectDB();
    });

    test('Point 3: Fire-and-forget alert timeout (withTimeout resolves safely after 5s limit)', async () => {
        const hangingPromise = new Promise((resolve) => {
            // Intentionally hangs for 10 seconds
            setTimeout(() => resolve('done_too_late'), 10000);
        });

        const start = Date.now();
        const result = await withTimeout(hangingPromise, 100, 'test_hanging_alert');
        const duration = Date.now() - start;

        expect(result).toBeNull();
        expect(duration).toBeLessThan(500); // Exited early via timeout, didn't block
    });

    test('Point 3 (Platform Header IP): Client sending spoofed X-Forwarded-For is rate limited by x-vercel-forwarded-for', async () => {
        const realVercelIp = '203.0.113.195';

        // Attacker rotates spoofed X-Forwarded-For on each request, but Vercel platform header identifies real IP
        for (let i = 0; i < 5; i++) {
            const res = await request
                .post('/api/auth/forgot-password')
                .set('X-Forwarded-For', `198.51.100.${i + 1}`) // Spoofed/rotated IP
                .set('x-vercel-forwarded-for', realVercelIp)    // Real edge platform header
                .send({ email: `target${i}@example.com` });
            expect(res.status).toBe(200);
        }

        // 6th request must be blocked by real Vercel IP regardless of a new spoofed X-Forwarded-For
        const blocked = await request
            .post('/api/auth/forgot-password')
            .set('X-Forwarded-For', '10.99.99.99')
            .set('x-vercel-forwarded-for', realVercelIp)
            .send({ email: 'target99@example.com' });

        expect(blocked.status).toBe(429);
        expect(blocked.body.message).toMatch(/Too many password reset attempts/i);
    });

    test('Point 4: Per-IP rate limiting honors Trust Proxy X-Forwarded-For and stores in MongoDB', async () => {
        const testClientIp = '198.51.100.77';

        // Make requests with custom X-Forwarded-For header
        for (let i = 0; i < 5; i++) {
            const res = await request
                .post('/api/auth/forgot-password')
                .set('X-Forwarded-For', testClientIp)
                .send({ email: 'unknown@example.com' });
            expect(res.status).toBe(200);
        }

        // 6th request within window from this IP must be blocked with HTTP 429
        const blockedRes = await request
            .post('/api/auth/forgot-password')
            .set('X-Forwarded-For', testClientIp)
            .send({ email: 'unknown@example.com' });

        expect(blockedRes.status).toBe(429);
        expect(blockedRes.body.message).toMatch(/Too many password reset attempts/i);

        // Another IP should NOT be blocked
        const otherIpRes = await request
            .post('/api/auth/forgot-password')
            .set('X-Forwarded-For', '203.0.113.88')
            .send({ email: 'other@example.com' });

        expect(otherIpRes.status).toBe(200);
    });

    test('Point 5: Uploads enforce 4 MB server limit with clear error message', async () => {
        // Generate an admin token
        const jwt = (await import('jsonwebtoken')).default;
        const User = (await import('../models/User.js')).default;
        const adminUser = await User.create({
            name: 'Upload Admin',
            email: 'upload_admin@test.com',
            role: 'admin'
        });
        const token = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

        // Create buffer exceeding 4 MB (4.5 MB)
        const largeBuffer = Buffer.alloc(4.5 * 1024 * 1024, 'a');

        const res = await request
            .post('/api/upload')
            .set('Authorization', `Bearer ${token}`)
            .attach('image', largeBuffer, 'huge_image.png');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/File too large/i);
    });

    test('Point 9: 50 concurrent requests handled cleanly without connection exhaustion', async () => {
        const promises = Array.from({ length: 50 }, () => request.get('/api/health'));
        const responses = await Promise.all(promises);

        expect(responses.length).toBe(50);
        for (const res of responses) {
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        }
    });

});
