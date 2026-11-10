import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import app, { connectDB } from '../app.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import AuditLog from '../models/AuditLog.js';
import StoreSetting from '../models/StoreSetting.js';
import { up as runMigration001 } from '../migrations/001_unique_indexes.js';
import { up as runMigration002 } from '../migrations/002_rate_limit_indexes.js';
import { up as runMigration003 } from '../migrations/003_upi_order_indexes.js';
import { up as runMigration004 } from '../migrations/004_sync_delivered_cod_status.js';

let mongod;
let request;
let customerUser;
let otherCustomerUser;
let adminUser;
let customerToken;
let otherToken;
let adminToken;
let sampleProduct;
let sampleCoupon;

process.env.JWT_SECRET = 'test_jwt_secret_wave5_upi_2026';
process.env.NODE_ENV = 'development';
jest.setTimeout(30000);

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await connectDB();

    await runMigration001();
    await runMigration002();
    await runMigration003();

    request = supertest(app);

    // Seed StoreSetting for UPI
    await StoreSetting.findOneAndUpdate(
        { key: 'upi_config' },
        {
            $set: {
                value: {
                    upi_vpa: '8827259023@sbi',
                    upi_name: 'Shagun mart',
                    timeout_minutes: 10
                }
            }
        },
        { upsert: true }
    );

    // Seed Users
    customerUser = await User.create({
        name: 'UPI Customer',
        email: 'upi_customer@example.com',
        phone: '9876543210',
        role: 'user'
    });
    customerToken = jwt.sign({ id: customerUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    otherCustomerUser = await User.create({
        name: 'Other Customer',
        email: 'other_customer@example.com',
        phone: '9876543211',
        role: 'user'
    });
    otherToken = jwt.sign({ id: otherCustomerUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    adminUser = await User.create({
        name: 'Store Admin',
        email: 'admin_upi@example.com',
        phone: '9876543212',
        role: 'admin'
    });
    adminToken = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);

    // Seed Product
    sampleProduct = await Product.create({
        name: 'Premium Basmati Rice 5kg',
        description: 'Finest aged aromatic basmati rice',
        image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        price: 450,
        stock: 20,
        category: 'Grocery'
    });

    // Seed Coupon
    sampleCoupon = await Coupon.create({
        code: 'UPI50',
        type: 'flat',
        value: 50,
        minOrderAmount: 300,
        usageLimit: 10,
        usedCount: 0,
        startDate: new Date(Date.now() - 3600000),
        endDate: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: adminUser._id
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    await Order.deleteMany({});
    await CouponRedemption.deleteMany({});
    await AuditLog.deleteMany({});
    await Product.findByIdAndUpdate(sampleProduct._id, { stock: 20 });
    await Coupon.findByIdAndUpdate(sampleCoupon._id, { usedCount: 0, redeemedUsers: [] });
});

describe('Wave 5: UPI Intent Payments (Option B) Backend & Security', () => {

    test('1. Amount tampering is ignored; server calculates authoritative total & generates UPI intent', async () => {
        const fakeTotal = 1.00; // Malicious client attempt
        const res = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: fakeTotal,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'UPI Customer',
                    mobile: '9876543210',
                    houseNo: '12',
                    street: 'Main Road',
                    city: 'Bamitha',
                    state: 'Madhya Pradesh',
                    pinCode: '471105'
                }
            });

        expect(res.status).toBe(201);
        expect(res.body.paymentMethod).toBe('UPI');
        expect(res.body.paymentStatus).toBe('pending');
        // Authoritative server calculation: 450 items + 0 delivery (>=399) = 450
        expect(res.body.totalAmount).toBe(450);

        // Verify UPI intent generated on server
        expect(res.body.upiIntent).toBeDefined();
        expect(res.body.upiIntent.pa).toBe('8827259023@sbi');
        expect(res.body.upiIntent.pn).toBe('Shagun mart');
        expect(res.body.upiIntent.am).toBe('450.00'); // Exactly two decimals
        expect(res.body.upiIntent.cu).toBe('INR');
        expect(res.body.upiIntent.tr).toMatch(/^SM[a-f0-9]{24}$/);
        expect(res.body.upiIntent.upiUri).toContain('pa=8827259023%40sbi');
        expect(res.body.upiIntent.upiUri).toContain('am=450.00');

        // Verify stock was reserved
        const prod = await Product.findById(sampleProduct._id);
        expect(prod.stock).toBe(19);
    });

    test('2. Submitting valid 12-digit UTR sets status to verifying; duplicate UTR across orders rejected', async () => {
        // Create Order 1
        const order1Res = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Customer 1',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const order1Id = order1Res.body._id;

        // Submit valid UTR
        const validUtr = '123456789012';
        const utr1Res = await request
            .post(`/api/orders/${order1Id}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: validUtr });

        expect(utr1Res.status).toBe(200);
        expect(utr1Res.body.order.paymentStatus).toBe('verifying');
        expect(utr1Res.body.order.upiUtr).toBe(validUtr);

        // Create Order 2 for other customer
        const order2Res = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${otherToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Customer 2',
                    mobile: '9876543211',
                    houseNo: '2',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const order2Id = order2Res.body._id;

        // Attempt to submit identical UTR on Order 2 must be rejected
        const dupUtrRes = await request
            .post(`/api/orders/${order2Id}/upi-utr`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ utr: validUtr });

        expect(dupUtrRes.status).toBe(400);
        expect(dupUtrRes.body.message).toMatch(/already been submitted/i);
    });

    test('3. Submitting UTR on someone else\'s order returns 403', async () => {
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });

        // Other customer attempts to submit UTR
        const res = await request
            .post(`/api/orders/${orderRes.body._id}/upi-utr`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ utr: '987654321098' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/only submit UTR for your own orders/i);
    });

    test('4. Expiry: Unpaid pending order restores stock and coupon redemption', async () => {
        // Create order with coupon
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 2 }], // 900
                totalAmount: 850,
                couponCode: 'UPI50',
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });

        const orderId = orderRes.body._id;
        expect((await Product.findById(sampleProduct._id)).stock).toBe(18); // 20 - 2
        expect((await Coupon.findById(sampleCoupon._id)).usedCount).toBe(1);

        // Manually simulate expiration: set paymentExpiresAt 5 minutes in the past
        await Order.findByIdAndUpdate(orderId, {
            paymentExpiresAt: new Date(Date.now() - 5 * 60 * 1000)
        });

        // Customer reads order -> triggers lazy expiry
        const getRes = await request
            .get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(getRes.status).toBe(200);
        expect(getRes.body.paymentStatus).toBe('expired');
        expect(getRes.body.status).toBe('Cancelled');

        // Stock restored back to 20
        expect((await Product.findById(sampleProduct._id)).stock).toBe(20);

        // Coupon released back to 0
        expect((await Coupon.findById(sampleCoupon._id)).usedCount).toBe(0);
    });

    test('5. Admin approve is idempotent; non-admin cannot self-approve (403)', async () => {
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const orderId = orderRes.body._id;

        // Customer attempts to self-approve -> 403
        const selfApproveRes = await request
            .post(`/api/orders/${orderId}/upi-approve`)
            .set('Authorization', `Bearer ${customerToken}`);
        expect(selfApproveRes.status).toBe(403);

        // Admin approves -> 200
        const adminApprove1 = await request
            .post(`/api/orders/${orderId}/upi-approve`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(adminApprove1.status).toBe(200);
        expect(adminApprove1.body.order.paymentStatus).toBe('paid');
        expect(adminApprove1.body.order.paidAt).toBeDefined();

        // Admin approves second time -> idempotent 200 without error
        const adminApprove2 = await request
            .post(`/api/orders/${orderId}/upi-approve`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(adminApprove2.status).toBe(200);
        expect(adminApprove2.body.message).toMatch(/already.*paid/i);
    });

    test('6. Old clients with COD still work identically without UPI flow', async () => {
        const codRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'COD',
                shippingAddress: {
                    fullName: 'COD Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });

        expect(codRes.status).toBe(201);
        expect(codRes.body.paymentMethod).toBe('COD');
        expect(codRes.body.paymentStatus).toBe('Pending');
        expect(codRes.body.status).toBe('Processing');
        expect(codRes.body.upiIntent).toBeNull();
    });

    test('7. No customer PII or private UPI IDs logged into AuditLog', async () => {
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'PII Test User',
                    mobile: '9876543210',
                    houseNo: '99',
                    street: 'Secret St',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });

        const orderId = orderRes.body._id;
        await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '555666777888' });

        await request
            .post(`/api/orders/${orderId}/upi-approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        const logs = await AuditLog.find({ entity_id: String(orderId) });
        expect(logs.length).toBeGreaterThan(0);

        for (const log of logs) {
            const rawDetails = JSON.stringify(log.before_snapshot || {});
            expect(rawDetails).not.toContain('PII Test User');
            expect(rawDetails).not.toContain('Secret St');
            expect(rawDetails).not.toContain('upi_customer@example.com');
            expect(rawDetails).not.toContain('9876543210');
        }
    });

    test('8. Invalid UTR formats rejected and max 5 attempts enforced', async () => {
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const orderId = orderRes.body._id;

        // Less than 12 digits
        const shortRes = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '12345' });
        expect(shortRes.status).toBe(400);

        // Alpha characters
        const alphaRes = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '12345678901a' });
        expect(alphaRes.status).toBe(400);

        // Submit 5 valid UTR attempts
        for (let i = 1; i <= 5; i++) {
            const utrAttempt = `10000000000${i}`;
            const res = await request
                .post(`/api/orders/${orderId}/upi-utr`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ utr: utrAttempt });
            expect(res.status).toBe(200);
        }

        // 6th attempt must be rejected
        const sixthRes = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '100000000006' });
        expect(sixthRes.status).toBe(400);
        expect(sixthRes.body.message).toMatch(/Maximum UTR submission attempts/i);
    });

    test('9. Concurrent expiry calls on the same order release stock exactly once', async () => {
        // Create an order
        const startStock = sampleProduct.stock;
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 2 }],
                totalAmount: 900,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Race Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const orderId = orderRes.body._id;

        // Force expiration time into the past
        await Order.findByIdAndUpdate(orderId, {
            $set: { paymentExpiresAt: new Date(Date.now() - 60000) }
        });

        // Trigger two concurrent expiry operations
        const [expireRes1, expireRes2] = await Promise.all([
            request.post('/api/orders/admin/expire-stale-upi').set('Authorization', `Bearer ${adminToken}`),
            request.post('/api/orders/admin/expire-stale-upi').set('Authorization', `Bearer ${adminToken}`)
        ]);

        expect(expireRes1.status).toBe(200);
        expect(expireRes2.status).toBe(200);

        // Product stock should have been restored by exactly 2 (the reserved quantity), never double-restored
        const updatedProd = await Product.findById(sampleProduct._id);
        expect(updatedProd.stock).toBe(startStock);

        const finalOrder = await Order.findById(orderId);
        expect(finalOrder.paymentStatus).toBe('expired');
        expect(finalOrder.status).toBe('Cancelled');
    });

    test('10. Pending order limits: max 2 pending UPI orders per user, 3rd is rejected', async () => {
        const createOrder = () =>
            request
                .post('/api/orders')
                .set('Authorization', `Bearer ${otherToken}`)
                .send({
                    items: [{ product: sampleProduct._id, quantity: 1 }],
                    totalAmount: 450,
                    paymentMethod: 'UPI',
                    shippingAddress: {
                        fullName: 'Other User',
                        mobile: '9876543211',
                        houseNo: '2',
                        street: 'Road',
                        city: 'Bamitha',
                        state: 'MP',
                        pinCode: '471105'
                    }
                });

        // 1st order: success
        const res1 = await createOrder();
        expect(res1.status).toBe(201);

        // 2nd order: success
        const res2 = await createOrder();
        expect(res2.status).toBe(201);

        // 3rd order: rejected with 400
        const res3 = await createOrder();
        expect(res3.status).toBe(400);
        expect(res3.body.message).toMatch(/pending UPI orders/i);
    });

    test('11. Unconfigured UPI in StoreSetting cleanly rejects UPI orders', async () => {
        // Temporarily clear upi_config
        await StoreSetting.findOneAndUpdate(
            { key: 'upi_config' },
            { $set: { value: { upi_vpa: '', upi_name: '' } } }
        );

        const res = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not configured/i);

        // Restore upi_config
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
            }
        );
    });

    test('12. Late payment flow: expired order accepts UTR as late_payment, allows Reinstate or Refund', async () => {
        // 1. Create an order and immediately expire it
        const orderRes = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Late Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const orderId = orderRes.body._id;

        // Force expiry
        await Order.findByIdAndUpdate(orderId, {
            $set: {
                paymentStatus: 'expired',
                status: 'Cancelled',
                paymentExpiresAt: new Date(Date.now() - 3600000)
            }
        });

        // 2. Customer submits UTR on expired order
        const lateUtrRes = await request
            .post(`/api/orders/${orderId}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '888899990001' });

        expect(lateUtrRes.status).toBe(200);
        expect(lateUtrRes.body.order.paymentStatus).toBe('late_payment');
        expect(lateUtrRes.body.message).toMatch(/expired|late/i);

        // 3. Admin reinstates order (stock is available)
        const reinstateRes = await request
            .post(`/api/orders/${orderId}/upi-reinstate`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(reinstateRes.status).toBe(200);
        expect(reinstateRes.body.order.paymentStatus).toBe('verifying');
        expect(reinstateRes.body.order.status).toBe('Processing');

        // 4. Now admin can approve
        const approveRes = await request
            .post(`/api/orders/${orderId}/upi-approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(approveRes.status).toBe(200);
        expect(approveRes.body.order.paymentStatus).toBe('paid');

        // 5. Test Refund-needed flow on a separate expired order
        const order2Res = await request
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                items: [{ product: sampleProduct._id, quantity: 1 }],
                totalAmount: 450,
                paymentMethod: 'UPI',
                shippingAddress: {
                    fullName: 'Refund Customer',
                    mobile: '9876543210',
                    houseNo: '1',
                    street: 'Road',
                    city: 'Bamitha',
                    state: 'MP',
                    pinCode: '471105'
                }
            });
        const order2Id = order2Res.body._id;

        await Order.findByIdAndUpdate(order2Id, {
            $set: {
                paymentStatus: 'expired',
                status: 'Cancelled',
                paymentExpiresAt: new Date(Date.now() - 3600000)
            }
        });

        await request
            .post(`/api/orders/${order2Id}/upi-utr`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ utr: '888899990002' });

        const refundRes = await request
            .post(`/api/orders/${order2Id}/upi-refund-needed`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Item out of stock' });

        expect(refundRes.status).toBe(200);
        expect(refundRes.body.order.paymentStatus).toBe('refund_needed');
    });

    test('13. Read routes (GET /api/orders and GET /api/orders/myorders) are side-effect free', async () => {
        // Create an order delivered with pending payment
        const order = await Order.create({
            user: customerUser._id,
            items: [{ product: sampleProduct._id, name: sampleProduct.name, price: 100, quantity: 1 }],
            totalAmount: 100,
            paymentMethod: 'COD',
            paymentStatus: 'Pending',
            status: 'Delivered',
            shippingAddress: { fullName: 'Side Effect Test', mobile: '9999999999', houseNo: '1', street: 'S', city: 'C', state: 'MP', pinCode: '471105' }
        });

        // Customer read
        const myRes = await request
            .get('/api/orders/myorders')
            .set('Authorization', `Bearer ${customerToken}`);
        expect(myRes.status).toBe(200);

        // Admin read
        const adminRes = await request
            .get('/api/orders')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(adminRes.status).toBe(200);

        // Verify database document was NOT mutated by GET requests
        const fresh = await Order.findById(order._id);
        expect(fresh.paymentStatus).toBe('Pending');
    });

    test('14. PUT /api/orders/:id/status transitions COD order paymentStatus to Completed on delivery', async () => {
        const order = await Order.create({
            user: customerUser._id,
            items: [{ product: sampleProduct._id, name: sampleProduct.name, price: 100, quantity: 1 }],
            totalAmount: 100,
            paymentMethod: 'COD',
            paymentStatus: 'pending',
            status: 'Out for Delivery',
            shippingAddress: { fullName: 'Delivery Sync Test', mobile: '9999999999', houseNo: '1', street: 'S', city: 'C', state: 'MP', pinCode: '471105' }
        });

        const updateRes = await request
            .put(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'Delivered' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.status).toBe('Delivered');
        expect(updateRes.body.paymentStatus).toBe('Completed');

        const inDb = await Order.findById(order._id);
        expect(inDb.paymentStatus).toBe('Completed');
    });

    test('15. Migration 004_sync_delivered_cod_status updates delivered COD/legacy orders', async () => {
        const o1 = await Order.create({
            user: customerUser._id,
            items: [{ product: sampleProduct._id, name: sampleProduct.name, price: 100, quantity: 1 }],
            totalAmount: 100,
            paymentMethod: 'COD',
            paymentStatus: 'Pending',
            status: 'Delivered',
            shippingAddress: { fullName: 'Mig 1', mobile: '9999999999', houseNo: '1', street: 'S', city: 'C', state: 'MP', pinCode: '471105' }
        });

        const o2 = await Order.create({
            user: customerUser._id,
            items: [{ product: sampleProduct._id, name: sampleProduct.name, price: 100, quantity: 1 }],
            totalAmount: 100,
            paymentMethod: 'COD',
            paymentStatus: 'pending',
            status: 'Delivered',
            shippingAddress: { fullName: 'Mig 2', mobile: '9999999999', houseNo: '1', street: 'S', city: 'C', state: 'MP', pinCode: '471105' }
        });

        // Dry-run default does not modify documents
        const dryRunResult = await runMigration004();
        expect(dryRunResult.isDryRun).toBe(true);
        const unmutated = await Order.findById(o1._id);
        expect(unmutated.paymentStatus).toBe('Pending');

        // Confirmed run modifies documents
        await runMigration004({ confirm: true });

        const refreshed1 = await Order.findById(o1._id);
        const refreshed2 = await Order.findById(o2._id);
        expect(refreshed1.paymentStatus).toBe('Completed');
        expect(refreshed2.paymentStatus).toBe('Completed');
    });
});
