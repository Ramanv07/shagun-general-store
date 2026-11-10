import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import app, { connectDB } from '../app.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import StoreSetting from '../models/StoreSetting.js';
import PaymentPreference from '../models/PaymentPreference.js';
import bcrypt from 'bcryptjs';
import { sanitizeRedirectUrl } from '../utils/urlSanitizer.js';
import { isLiveHost, getDisplayHost, getCheckoutUpiStatusMessage } from '../utils/hostSafety.js';
import { jest } from '@jest/globals';
import { v2 as cloudinary } from 'cloudinary';
import { up as runMigration001 } from '../migrations/001_unique_indexes.js';
import { up as runMigration002 } from '../migrations/002_rate_limit_indexes.js';
import { up as runMigration003 } from '../migrations/003_upi_order_indexes.js';

let mongod;
let request;
let customerUser;
let customerToken;
let sampleProduct;

process.env.JWT_SECRET = 'test_jwt_secret_wave5_checkout_2026';
process.env.NODE_ENV = 'development';

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await connectDB();

    await runMigration001();
    await runMigration002();
    await runMigration003();

    request = supertest(app);

    await StoreSetting.findOneAndUpdate(
        { key: 'upi_config' },
        {
            $set: {
                value: {
                    upi_vpa: '8827259023@sbi',
                    upi_name: 'Shagun mart',
                    timeout_minutes: 30
                }
            }
        },
        { upsert: true }
    );

    customerUser = await User.create({
        name: 'Checkout Customer',
        email: 'checkout_cust@example.com',
        phone: '9876543210',
        role: 'user'
    });
    customerToken = jwt.sign({ id: customerUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    sampleProduct = await Product.create({
        name: 'Cotton Silk Saree',
        description: 'Traditional wear',
        image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        price: 1200,
        stock: 15,
        category: 'Clothing'
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

describe('Wave 5 Group 2: UPI Checkout & Confirming Screen Integration', () => {
    test('1. Client builds nothing locally: server authoritatively returns upiIntent with canonical upi:// URI', async () => {
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 1200,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Client Test',
                    mobile: '9876543210',
                    houseNo: '10',
                    street: 'Market St',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });

        expect(orderRes.status).toBe(201);
        expect(orderRes.body.paymentMethod).toBe('UPI');
        expect(orderRes.body.paymentStatus).toBe('pending');
        expect(orderRes.body.upiIntent).toBeDefined();

        const { upiUri, pa, pn, am, tr } = orderRes.body.upiIntent;
        expect(pa).toBe('8827259023@sbi');
        expect(pn).toBe('Shagun mart');
        expect(am).toBe('1200.00');
        expect(upiUri).toContain('upi://pay?');
        expect(upiUri).toContain('pa=8827259023%40sbi');
        expect(upiUri).toContain('am=1200.00');
        expect(upiUri).toContain(`tr=${tr}`);
    });

    test('2. UTR validation: non-numeric, short, and long UTR formats return clear validation errors', async () => {
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 1200,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'UTR User',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const orderId = orderRes.body._id;

        // Non-numeric
        const nonNum = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: 'ABCD1234EFGH' });
        expect(nonNum.status).toBe(400);
        expect(nonNum.body.message).toMatch(/12 numeric digits/i);

        // Less than 12
        const shortUtr = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '12345678901' });
        expect(shortUtr.status).toBe(400);
        expect(shortUtr.body.message).toMatch(/12 numeric digits/i);

        // More than 12
        const longUtr = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '1234567890123' });
        expect(longUtr.status).toBe(400);
        expect(longUtr.body.message).toMatch(/12 numeric digits/i);
    });

    test('3. Expired order transition: fetches expired order with right status and allows late payment', async () => {
        // Create dedicated user to isolate from pending limits
        const expiryUser = await User.create({
            name: 'Expiry User',
            email: 'expiry_cust@example.com',
            phone: '9876543213',
            role: 'user'
        });
        const token = jwt.sign({ id: expiryUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 1200,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Expiry User',
                    mobile: '9876543213',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        expect(orderRes.status).toBe(201);
        const orderId = orderRes.body._id;

        // Force expiry in DB
        await Order.findByIdAndUpdate(orderId, {
            $set: { paymentExpiresAt: new Date(Date.now() - 10000) }
        });

        // Client fetches order -> lazy expiry triggers
        const getRes = await request
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(getRes.status).toBe(200);
        expect(getRes.body.paymentStatus).toBe('expired');
        expect(getRes.body.status).toBe('Cancelled');

        // Customer enters UTR after expiry -> transition to late_payment
        const lateUtrRes = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${token}`)
            .send({ utr: '999888777666' });

        expect(lateUtrRes.status).toBe(200);
        expect(lateUtrRes.body.order.paymentStatus).toBe('late_payment');
    });

    test('4. Reopening app / refreshing returns confirming screen for active order with exact same tr', async () => {
        const reopenUser = await User.create({
            name: 'Reopen User',
            email: 'reopen_cust@example.com',
            phone: '9876543214',
            role: 'user'
        });
        const token = jwt.sign({ id: reopenUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 1200,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Reopen User',
                    mobile: '9876543214',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        expect(orderRes.status).toBe(201);
        const orderId = orderRes.body._id;
        const originalTr = orderRes.body.upiTxnRef;

        // Simulate app kill & reopen: client queries the active order by ID
        const reopenedRes = await request
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(reopenedRes.status).toBe(200);
        expect(reopenedRes.body._id).toBe(orderId);
        expect(reopenedRes.body.paymentStatus).toBe('pending');
        expect(reopenedRes.body.upiTxnRef).toBe(originalTr);
        expect(reopenedRes.body.upiIntent.tr).toBe(originalTr);
    });

    test('5. Status values: model validation and route updates accept all valid enum values and reject invalid ones', async () => {
        const validPaymentStatuses = ['COD', 'pending', 'verifying', 'paid', 'failed', 'expired', 'late_payment', 'refund_needed', 'Pending', 'Completed', 'Failed'];
        const validOrderStatuses = ['Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

        // 5a. Direct model validation test for every status value
        for (const ps of validPaymentStatuses) {
            const testOrder = new Order({
                user: customerUser._id,
                items: [{ product: sampleProduct._id, name: 'Saree', price: 1200, quantity: 1 }],
                totalAmount: 1200,
                shippingAddress: {
                    fullName: 'Val User',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Street',
                    city: 'City',
                    state: 'State',
                    pinCode: '471105'
                },
                paymentMethod: 'UPI',
                paymentStatus: ps,
                status: 'Processing'
            });
            await expect(testOrder.validate()).resolves.toBeUndefined();
        }

        for (const os of validOrderStatuses) {
            const testOrder = new Order({
                user: customerUser._id,
                items: [{ product: sampleProduct._id, name: 'Saree', price: 1200, quantity: 1 }],
                totalAmount: 1200,
                shippingAddress: {
                    fullName: 'Val User',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Street',
                    city: 'City',
                    state: 'State',
                    pinCode: '471105'
                },
                paymentMethod: 'UPI',
                paymentStatus: 'pending',
                status: os
            });
            await expect(testOrder.validate()).resolves.toBeUndefined();
        }

        // 5b. Invalid status values are rejected by schema validation
        const invalidOrder = new Order({
            user: customerUser._id,
            items: [{ product: sampleProduct._id, name: 'Saree', price: 1200, quantity: 1 }],
            totalAmount: 1200,
            shippingAddress: {
                fullName: 'Val User',
                mobile: '9876543210',
                houseNo: '1',
                street: 'Street',
                city: 'City',
                state: 'State',
                pinCode: '471105'
            },
            paymentMethod: 'UPI',
            paymentStatus: 'invalid_status_xyz',
            status: 'Processing'
        });
        await expect(invalidOrder.validate()).rejects.toThrow();

        // 5c. findOneAndUpdate with runValidators rejects invalid status updates
        const orderDoc = await Order.create({
            user: customerUser._id,
            items: [{ product: sampleProduct._id, name: 'Saree', price: 1200, quantity: 1 }],
            totalAmount: 1200,
            shippingAddress: {
                fullName: 'Val User',
                mobile: '9876543210',
                houseNo: '1',
                street: 'Street',
                city: 'City',
                state: 'State',
                pinCode: '471105'
            },
            paymentMethod: 'UPI',
            paymentStatus: 'pending',
            status: 'Processing'
        });

        await expect(
            Order.findOneAndUpdate(
                { _id: orderDoc._id },
                { $set: { paymentStatus: 'illegal_status_value' } },
                { runValidators: true }
            )
        ).rejects.toThrow();
    });

    test('6. PaymentPreference API: does not accept or return customer UPI ID, and account deletion clears preferences', async () => {
        const hashedPassword = await bcrypt.hash('PrefSecret123', 10);
        const prefUser = await User.create({
            name: 'Pref User',
            email: 'pref_user@example.com',
            phone: '9876543299',
            password: hashedPassword,
            role: 'user'
        });
        const prefToken = jwt.sign({ id: prefUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

        // PUT request attempting to send upi_id: only preferred_method is accepted and returned
        const putRes = await request
            .put('/api/payment-preferences')
            .set('Authorization', `Bearer ${prefToken}`)
            .send({ preferred_method: 'UPI', upi_id: 'customer_secret@oksbi' });

        expect(putRes.status).toBe(200);
        expect(putRes.body.preferred_method).toBe('UPI');
        expect(putRes.body.upi_id).toBeUndefined();

        // GET request: returns preferred_method only, never exposes any upi_id
        const getRes = await request
            .get('/api/payment-preferences')
            .set('Authorization', `Bearer ${prefToken}`);

        expect(getRes.status).toBe(200);
        expect(getRes.body.preferred_method).toBe('UPI');
        expect(getRes.body.upi_id).toBeUndefined();

        // Verify in DB that account deletion removes the user preference
        const prefInDb = await PaymentPreference.findOne({ user_id: prefUser._id });
        expect(prefInDb).toBeTruthy();

        // Perform account deletion
        const deleteRes = await request
            .post('/api/auth/delete-account')
            .set('Authorization', `Bearer ${prefToken}`)
            .send({ currentPassword: 'PrefSecret123' });

        expect(deleteRes.status).toBe(200);

        const prefAfterDelete = await PaymentPreference.findOne({ user_id: prefUser._id });
        expect(prefAfterDelete).toBeNull();
    });

    test('7. Old-style legacy order: loads with status="Processing" & paymentStatus="Pending", passes validation, and updates cleanly', async () => {
        const legacyAdmin = await User.create({
            name: 'Legacy Admin',
            email: 'legacy_admin@example.com',
            phone: '9876543298',
            role: 'admin'
        });
        const adminTok = jwt.sign({ id: legacyAdmin._id, tokenVersion: 0 }, process.env.JWT_SECRET);

        // Seed old-style order (matching staging DB live records)
        const oldOrder = await Order.create({
            user: customerUser._id,
            items: [{ product: sampleProduct._id, name: 'Cotton Silk Saree', price: 1200, quantity: 1 }],
            totalAmount: 1200,
            shippingAddress: {
                fullName: 'Old Customer',
                mobile: '9876543210',
                houseNo: '2',
                street: 'Old Lane',
                city: 'Bamitha',
                state: 'MP',
                pinCode: '471105'
            },
            paymentMethod: 'COD',
            paymentStatus: 'Pending',
            status: 'Processing'
        });

        // 7a. Validate in Mongoose
        expect(oldOrder.validateSync()).toBeUndefined();
        expect(oldOrder.paymentStatus).toBe('Pending');
        expect(oldOrder.status).toBe('Processing');

        // 7b. Admin updates status to Delivered via PUT /api/orders/:id/status
        const updateRes = await request
            .put(`/api/orders/${oldOrder._id}/status`)
            .set('Authorization', `Bearer ${adminTok}`)
            .send({ status: 'Delivered' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.status).toBe('Delivered');
        expect(updateRes.body.paymentStatus).toBe('Completed');

        // 7c. Direct findOneAndUpdate with runValidators accepts old-style values
        const docAfter = await Order.findOneAndUpdate(
            { _id: oldOrder._id },
            { $set: { status: 'Packed' } },
            { new: true, runValidators: true }
        );
        expect(docAfter.status).toBe('Packed');
    });

    test('8. Open redirect defense: sanitizeRedirectUrl accepts only relative paths starting with single / and rejects bypasses', () => {
        // Valid paths
        expect(sanitizeRedirectUrl('/checkout')).toBe('/checkout');
        expect(sanitizeRedirectUrl('/beauty-parlor?service=makeup')).toBe('/beauty-parlor?service=makeup');
        expect(sanitizeRedirectUrl('/orders#active')).toBe('/orders#active');
        expect(sanitizeRedirectUrl('  /cart  ')).toBe('/cart');

        // Protocol-relative attempts (//evil.com)
        expect(sanitizeRedirectUrl('//evil.com')).toBe('/');
        expect(sanitizeRedirectUrl('//attacker.org/phishing')).toBe('/');
        expect(sanitizeRedirectUrl('///malicious.site')).toBe('/');

        // Backslash bypasses (/\evil.com, \evil.com, /checkout\evil)
        expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/');
        expect(sanitizeRedirectUrl('\\evil.com')).toBe('/');
        expect(sanitizeRedirectUrl('/path\\with\\backslash')).toBe('/');

        // Absolute full URLs and schemes
        expect(sanitizeRedirectUrl('https://evil.com/login')).toBe('/');
        expect(sanitizeRedirectUrl('http://attacker.com')).toBe('/');
        expect(sanitizeRedirectUrl('javascript:alert(document.cookie)')).toBe('/');
        expect(sanitizeRedirectUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('/');

        // Null, undefined, empty, non-string
        expect(sanitizeRedirectUrl(null)).toBe('/');
        expect(sanitizeRedirectUrl(undefined)).toBe('/');
        expect(sanitizeRedirectUrl('')).toBe('/');
        expect(sanitizeRedirectUrl(12345)).toBe('/');
        expect(sanitizeRedirectUrl({}, '/custom-fallback')).toBe('/custom-fallback');
    });

    test('9. Mocked Cloudinary upload: POST /api/upload uploads image buffer and returns secure_url', async () => {
        const uploadAdmin = await User.create({
            name: 'Upload Admin',
            email: 'upload_admin@example.com',
            phone: '9876543297',
            role: 'admin'
        });
        const uploadAdminTok = jwt.sign({ id: uploadAdmin._id, tokenVersion: 0 }, process.env.JWT_SECRET);

        const mockStream = {
            end: jest.fn(function(buffer) {
                if (this._callback) {
                    this._callback(null, {
                        secure_url: 'https://res.cloudinary.com/demo/image/upload/sample_mocked.webp'
                    });
                }
            })
        };

        const originalUploadStream = cloudinary.uploader.upload_stream;
        cloudinary.uploader.upload_stream = jest.fn((options, callback) => {
            mockStream._callback = callback;
            return mockStream;
        });

        const imageBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);

        const res = await request
            .post('/api/upload')
            .set('Authorization', `Bearer ${uploadAdminTok}`)
            .attach('image', imageBuffer, { filename: 'test_product.jpg', contentType: 'image/jpeg' });

        cloudinary.uploader.upload_stream = originalUploadStream;

        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toBe('https://res.cloudinary.com/demo/image/upload/sample_mocked.webp');
    });

    test('10. Host safety check: isLiveHost accurately identifies live/production hosts vs local dev', () => {
        // Live production hosts
        expect(isLiveHost('https://shagun-general-store.vercel.app')).toBe(true);
        expect(isLiveHost('https://shagun-general-store.vercel.app/api')).toBe(true);
        expect(isLiveHost('https://shagunmart.com/api')).toBe(true);
        expect(isLiveHost('https://preview-deploy.vercel.app')).toBe(true);
        expect(isLiveHost('cluster0.abcde.mongodb.net')).toBe(true);
        expect(isLiveHost('https://api.external-domain.com')).toBe(true);

        // Local dev and private LAN hosts
        expect(isLiveHost('http://localhost:5000/api')).toBe(false);
        expect(isLiveHost('http://127.0.0.1:5000')).toBe(false);
        expect(isLiveHost('http://0.0.0.0:5000/api')).toBe(false);
        expect(isLiveHost('http://192.168.1.100:5000/api')).toBe(false);
        expect(isLiveHost('http://10.0.2.2:5000/api')).toBe(false);
        expect(isLiveHost('http://172.20.10.5:5000')).toBe(false);
        expect(isLiveHost('')).toBe(false);
    });

    test('11. Display host formatter: getDisplayHost returns clean host:port for dev badge', () => {
        expect(getDisplayHost('http://localhost:5000/api')).toBe('localhost:5000');
        expect(getDisplayHost('http://192.168.1.45:5000/api')).toBe('192.168.1.45:5000');
        expect(getDisplayHost('https://shagun-general-store.vercel.app/api')).toBe('shagun-general-store.vercel.app');
        expect(getDisplayHost('localhost:5000')).toBe('localhost:5000');
    });

    test('12. Checkout UPI messages: distinct "UPI is not set up" vs "Could not reach the server", preserving COD', async () => {
        // Case A: Fetch succeeds, but StoreSetting has no UPI configured
        await StoreSetting.findOneAndUpdate(
            { key: 'upi_config' },
            { $set: { value: { upi_vpa: '', upi_name: '' } } }
        );
        const unconfiguredRes = await request.get('/api/settings/upi');
        expect(unconfiguredRes.status).toBe(200);
        expect(unconfiguredRes.body.enabled).toBe(false);

        const msgUnconfigured = getCheckoutUpiStatusMessage(unconfiguredRes.body, null);
        expect(msgUnconfigured).toBe('UPI is not set up');

        // Case B: Network failure or 404/500 status (simulated fetch error / null response)
        const msgNetworkError = getCheckoutUpiStatusMessage(null, new Error('Network request failed'));
        expect(msgNetworkError).toBe('Could not reach the server');

        // Case C: COD remains functional and can place order in both cases
        const codOrderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'COD',
                shippingAddress: {
                    fullName: 'COD Tester',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });

        expect(codOrderRes.status).toBe(201);
        expect(codOrderRes.body.paymentMethod).toBe('COD');
        expect(codOrderRes.body.paymentStatus).toBe('Pending');
    });
});
